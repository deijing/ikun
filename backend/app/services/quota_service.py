"""
额度查询服务

通过调用第三方 API 查询用户的额度消耗情况。
支持 OpenAI 兼容 billing 接口与 NewAPI 接口，自动降级。
"""
import asyncio
import hashlib
import httpx
import logging
import time
from datetime import date, timedelta
from typing import Optional, Literal
from dataclasses import dataclass

from app.core.config import settings


logger = logging.getLogger(__name__)

# 缓存缺失标记
_MISSING = object()


@dataclass
class QuotaInfo:
    """额度信息"""
    remaining: float      # 剩余额度（美元）
    used: float           # 已使用额度（美元）
    total: float          # 总额度（美元）
    today_used: float = 0.0  # 今日消耗（美元）
    is_unlimited: bool = False  # 是否无限额度
    username: Optional[str] = None  # 用户名
    group: Optional[str] = None     # 用户组


class QuotaQueryError(Exception):
    """额度查询基础异常"""
    pass


class QuotaNotSupported(QuotaQueryError):
    """接口不支持（404/405）"""
    pass


class QuotaAuthFailed(QuotaQueryError):
    """认证失败（401/403）"""
    pass


class QuotaTransientError(QuotaQueryError):
    """临时性错误（超时、网络错误等）"""
    pass


@dataclass
class _CacheEntry:
    """缓存条目"""
    value: Optional[QuotaInfo]
    fresh_until: float       # 新鲜期截止时间
    stale_until: float       # 陈旧期截止时间
    last_error: Optional[str] = None


class QuotaService:
    """
    额度查询服务

    支持多种查询策略（OpenAI billing API / NewAPI /api/user/self），
    自动降级、缓存和错误处理。
    """

    # 无限额度阈值（大于等于此值视为无限）
    UNLIMITED_THRESHOLD = 10_000_000  # 1000万美元

    def __init__(self):
        """初始化额度查询服务，从 settings 读取配置"""
        # 基础配置
        self.timeout = settings.QUOTA_TIMEOUT_SECONDS
        self.max_concurrency = max(1, settings.QUOTA_MAX_CONCURRENCY)

        # API 地址列表
        self.base_urls = [
            self._normalize_url(url)
            for url in settings.QUOTA_BASE_URLS
            if url
        ]
        if not self.base_urls:
            self.base_urls = ["https://api.ikuncode.cc"]

        # 查询策略顺序
        self.query_order = list(settings.QUOTA_QUERY_ORDER)
        if not self.query_order:
            self.query_order = ["openai", "newapi"]

        # 缓存配置
        self.cache_ttl_ok = settings.QUOTA_CACHE_TTL_OK_SECONDS
        self.cache_ttl_stale = settings.QUOTA_CACHE_TTL_STALE_SECONDS
        self.cache_ttl_error = settings.QUOTA_CACHE_TTL_ERROR_SECONDS
        self.cache_ttl_auth_error = settings.QUOTA_CACHE_TTL_AUTH_ERROR_SECONDS

        # 其他配置
        self.usage_lookback_days = settings.QUOTA_USAGE_LOOKBACK_DAYS
        self.quota_per_usd = settings.QUOTA_PER_USD

        # 内部状态
        self._cache: dict[str, _CacheEntry] = {}
        self._preferred_base_url: dict[str, str] = {}  # 记录每个 key 上次成功的 base_url

    @staticmethod
    def _normalize_url(url: str) -> str:
        """标准化 URL，移除末尾斜杠"""
        return url.rstrip("/")

    # 缓存最大条目数（防止内存无限增长）
    MAX_CACHE_ENTRIES = 1000

    @staticmethod
    def _fingerprint(api_key: str) -> str:
        """生成 API Key 的指纹（用于缓存键，使用完整 sha256 避免碰撞）"""
        return hashlib.sha256(api_key.encode("utf-8")).hexdigest()

    @staticmethod
    def _key_suffix(api_key: str) -> str:
        """获取 API Key 后 4 位（用于日志）"""
        return api_key[-4:] if len(api_key) >= 4 else "****"

    def _cache_get(self, key_fp: str) -> _CacheEntry | object:
        """从缓存获取结果"""
        entry = self._cache.get(key_fp)
        if entry is None:
            return _MISSING

        now = time.monotonic()
        if now >= entry.stale_until:
            # 超过陈旧期，删除缓存
            self._cache.pop(key_fp, None)
            return _MISSING

        return entry

    def _evict_oldest_cache(self) -> None:
        """清理最旧的 10% 缓存条目"""
        if not self._cache:
            return
        # 按 stale_until 排序，删除最旧的 10%
        sorted_keys = sorted(
            self._cache.keys(),
            key=lambda k: self._cache[k].stale_until
        )
        to_remove = max(1, len(sorted_keys) // 10)
        for key in sorted_keys[:to_remove]:
            self._cache.pop(key, None)

    def _cache_set(
        self,
        key_fp: str,
        value: Optional[QuotaInfo],
        *,
        ok: bool,
        last_error: Optional[str] = None,
    ) -> None:
        """设置缓存"""
        now = time.monotonic()

        # 缓存达到上限时清理最旧的条目
        if len(self._cache) >= self.MAX_CACHE_ENTRIES:
            self._evict_oldest_cache()

        if ok:
            # 成功：设置新鲜期和陈旧期
            fresh_ttl = max(1, self.cache_ttl_ok)
            stale_ttl = fresh_ttl + max(1, self.cache_ttl_stale)
            self._cache[key_fp] = _CacheEntry(
                value=value,
                fresh_until=now + fresh_ttl,
                stale_until=now + stale_ttl,
                last_error=None,
            )
        else:
            # 失败：只设置短期缓存
            ttl = max(1, self.cache_ttl_error)
            self._cache[key_fp] = _CacheEntry(
                value=value,
                fresh_until=now + ttl,
                stale_until=now + ttl,
                last_error=last_error,
            )

    async def _query_openai_billing(
        self,
        api_key: str,
        *,
        base_url: str,
        client: httpx.AsyncClient
    ) -> QuotaInfo:
        """
        使用 OpenAI 兼容的 billing API 查询额度

        调用：
        - /v1/dashboard/billing/subscription - 获取总额度
        - /v1/dashboard/billing/usage - 获取使用量
        """
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        }

        # 1. 查询订阅信息获取总额度
        sub_url = f"{base_url}/v1/dashboard/billing/subscription"
        try:
            sub_resp = await client.get(sub_url, headers=headers)
        except httpx.TimeoutException as e:
            raise QuotaTransientError(f"subscription timeout: {e}") from e
        except httpx.RequestError as e:
            raise QuotaTransientError(f"subscription request error: {e}") from e

        if sub_resp.status_code in (404, 405):
            raise QuotaNotSupported(f"subscription not supported: {sub_resp.status_code}")
        if sub_resp.status_code in (401, 403):
            raise QuotaAuthFailed(f"subscription auth failed: {sub_resp.status_code}")
        if sub_resp.status_code != 200:
            raise QuotaTransientError(f"subscription non-200: {sub_resp.status_code}")

        try:
            sub_data = sub_resp.json()
        except ValueError as e:
            raise QuotaTransientError(f"subscription bad json: {e}") from e

        # 解析总额度（兼容多种字段名）
        hard_limit = (
            sub_data.get("hard_limit_usd")
            or sub_data.get("system_hard_limit_usd")
            or sub_data.get("soft_limit_usd")
            or 0
        )
        try:
            total = float(hard_limit) if hard_limit is not None else 0.0
        except (TypeError, ValueError):
            total = 0.0

        # 2. 查询使用量
        today = date.today()
        start_date = (today - timedelta(days=max(1, self.usage_lookback_days))).isoformat()
        end_date = today.isoformat()

        usage_url = f"{base_url}/v1/dashboard/billing/usage"
        try:
            usage_resp = await client.get(
                usage_url,
                headers=headers,
                params={"start_date": start_date, "end_date": end_date},
            )
        except httpx.TimeoutException as e:
            raise QuotaTransientError(f"usage timeout: {e}") from e
        except httpx.RequestError as e:
            raise QuotaTransientError(f"usage request error: {e}") from e

        if usage_resp.status_code in (404, 405):
            raise QuotaNotSupported(f"usage not supported: {usage_resp.status_code}")
        if usage_resp.status_code in (401, 403):
            raise QuotaAuthFailed(f"usage auth failed: {usage_resp.status_code}")
        if usage_resp.status_code != 200:
            raise QuotaTransientError(f"usage non-200: {usage_resp.status_code}")

        try:
            usage_data = usage_resp.json()
        except ValueError as e:
            raise QuotaTransientError(f"usage bad json: {e}") from e

        # 解析使用量（单位是美分，需要除以 100）
        total_usage_cents = usage_data.get("total_usage", 0)
        try:
            used = float(total_usage_cents) / 100.0
        except (TypeError, ValueError):
            used = 0.0

        remaining = max(total - used, 0.0) if total > 0 else 0.0
        computed_total = total if total > 0 else used
        is_unlimited = computed_total >= self.UNLIMITED_THRESHOLD

        return QuotaInfo(
            remaining=remaining,
            used=used,
            total=computed_total,
            today_used=0.0,  # 稍后通过日志 API 查询
            is_unlimited=is_unlimited,
            username=None,
            group=None,
        )

    async def _query_newapi_self(
        self,
        api_key: str,
        *,
        base_url: str,
        client: httpx.AsyncClient
    ) -> QuotaInfo:
        """
        使用 NewAPI 的 /api/user/self 接口查询额度
        """
        url = f"{base_url}/api/user/self"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Accept": "application/json",
        }

        try:
            resp = await client.get(url, headers=headers)
        except httpx.TimeoutException as e:
            raise QuotaTransientError(f"newapi timeout: {e}") from e
        except httpx.RequestError as e:
            raise QuotaTransientError(f"newapi request error: {e}") from e

        if resp.status_code in (404, 405):
            raise QuotaNotSupported(f"newapi not supported: {resp.status_code}")
        if resp.status_code in (401, 403):
            raise QuotaAuthFailed(f"newapi auth failed: {resp.status_code}")
        if resp.status_code != 200:
            raise QuotaTransientError(f"newapi non-200: {resp.status_code}")

        try:
            data = resp.json()
        except ValueError as e:
            raise QuotaTransientError(f"newapi bad json: {e}") from e

        if not data.get("success") or "data" not in data:
            raise QuotaTransientError("newapi unexpected payload")

        user_data = data.get("data") or {}
        quota = user_data.get("quota", 0)
        used_quota = user_data.get("used_quota", 0)
        total = quota + used_quota

        try:
            remaining = float(quota) / float(self.quota_per_usd)
            used = float(used_quota) / float(self.quota_per_usd)
            total_usd = float(total) / float(self.quota_per_usd)
        except (TypeError, ValueError, ZeroDivisionError) as e:
            raise QuotaTransientError(f"newapi parse error: {e}") from e

        is_unlimited = total_usd >= self.UNLIMITED_THRESHOLD

        return QuotaInfo(
            remaining=remaining,
            used=used,
            total=total_usd,
            today_used=0.0,  # 稍后通过日志 API 查询
            is_unlimited=is_unlimited,
            username=user_data.get("username"),
            group=user_data.get("group"),
        )

    async def _query_today_usage(
        self,
        api_key: str,
        *,
        base_url: str,
        client: httpx.AsyncClient
    ) -> float:
        """
        通过日志 API 查询今日消耗

        Returns:
            今日消耗金额（美元），查询失败返回 0.0
        """
        url = f"{base_url}/api/log/token"
        headers = {"Accept": "application/json"}
        params = {"key": api_key}

        try:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                return 0.0

            data = resp.json()
            if not data.get("success") or not isinstance(data.get("data"), list):
                return 0.0

            logs = data["data"]

            # 获取今天 0 点的时间戳（秒）
            from datetime import datetime, timezone
            now = datetime.now(timezone.utc)
            today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)
            today_start_ts = today_start.timestamp()

            # 筛选今日日志并累加 quota
            today_quota = sum(
                log.get("quota", 0)
                for log in logs
                if log.get("created_at", 0) >= today_start_ts
            )

            return today_quota / self.quota_per_usd

        except Exception as e:
            logger.debug("Query today usage failed: %s", e)
            return 0.0

    async def get_quota(
        self,
        api_key: str,
        *,
        client: Optional[httpx.AsyncClient] = None
    ) -> Optional[QuotaInfo]:
        """
        查询 API Key 的额度信息

        Args:
            api_key: 用户的 API Key
            client: 可复用的 HTTP 客户端

        Returns:
            QuotaInfo 对象，查询失败返回 None
        """
        if not api_key:
            return None

        key_fp = self._fingerprint(api_key)
        key_suffix = self._key_suffix(api_key)

        # 检查缓存
        cached = self._cache_get(key_fp)
        if cached is not _MISSING:
            entry = cached
            now = time.monotonic()
            if now < entry.fresh_until:
                # 缓存仍新鲜，直接返回
                return entry.value

        owns_client = client is None
        try:
            if client is None:
                client = httpx.AsyncClient(
                    timeout=self.timeout,
                    limits=httpx.Limits(
                        max_connections=self.max_concurrency,
                        max_keepalive_connections=self.max_concurrency
                    ),
                    follow_redirects=False,
                )

            # base_url 尝试顺序：优先上次成功的
            preferred = self._preferred_base_url.get(key_fp)
            base_urls = list(self.base_urls)
            if preferred and preferred in base_urls:
                base_urls.remove(preferred)
                base_urls.insert(0, preferred)

            any_auth_failed = False
            last_error: Optional[str] = None

            # 遍历所有 base_url 和查询策略
            for base_url in base_urls:
                for strategy in self.query_order:
                    try:
                        if strategy == "openai":
                            info = await self._query_openai_billing(
                                api_key, base_url=base_url, client=client
                            )
                        elif strategy == "newapi":
                            info = await self._query_newapi_self(
                                api_key, base_url=base_url, client=client
                            )
                        else:
                            continue

                        # 查询成功，尝试获取今日消耗
                        today_used = await self._query_today_usage(
                            api_key, base_url=base_url, client=client
                        )
                        # 更新 info 的 today_used
                        info = QuotaInfo(
                            remaining=info.remaining,
                            used=info.used,
                            total=info.total,
                            today_used=today_used,
                            is_unlimited=info.is_unlimited,
                            username=info.username,
                            group=info.group,
                        )

                        self._preferred_base_url[key_fp] = base_url
                        self._cache_set(key_fp, info, ok=True)
                        logger.debug(
                            "Quota query success (key=***%s, base_url=%s, strategy=%s, today=$%.2f)",
                            key_suffix, base_url, strategy, today_used
                        )
                        return info

                    except QuotaNotSupported as e:
                        last_error = str(e)
                        logger.debug(
                            "Quota not supported (key=***%s, base_url=%s, strategy=%s): %s",
                            key_suffix, base_url, strategy, e
                        )
                        continue

                    except QuotaAuthFailed as e:
                        any_auth_failed = True
                        last_error = str(e)
                        logger.debug(
                            "Quota auth failed (key=***%s, base_url=%s, strategy=%s): %s",
                            key_suffix, base_url, strategy, e
                        )
                        continue

                    except QuotaTransientError as e:
                        last_error = str(e)
                        logger.debug(
                            "Quota transient error (key=***%s, base_url=%s, strategy=%s): %s",
                            key_suffix, base_url, strategy, e
                        )
                        continue

            # 全部失败：仅在非认证失败时尝试使用陈旧缓存
            # 认证失败说明 key 已失效，不应返回旧数据
            if not any_auth_failed and cached is not _MISSING:
                entry = cached
                now = time.monotonic()
                if now < entry.stale_until and entry.value is not None:
                    logger.info(
                        "Quota query failed, using stale cache (key=***%s, error=%s)",
                        key_suffix, last_error or entry.last_error or "unknown"
                    )
                    return entry.value

            # 写入负缓存
            if any_auth_failed:
                # 认证失败使用更长的缓存时间
                self._cache_set(key_fp, None, ok=False, last_error=last_error)
                self._cache[key_fp].fresh_until = time.monotonic() + self.cache_ttl_auth_error
                self._cache[key_fp].stale_until = self._cache[key_fp].fresh_until
            else:
                self._cache_set(key_fp, None, ok=False, last_error=last_error)

            logger.debug(
                "Quota query failed for key=***%s: %s",
                key_suffix, last_error or "all strategies exhausted"
            )
            return None

        except httpx.TimeoutException:
            logger.warning("Quota API timeout (key=***%s)", key_suffix)
            self._cache_set(key_fp, None, ok=False, last_error="timeout")
            return None
        except httpx.RequestError as e:
            logger.warning("Quota API request error (key=***%s): %s", key_suffix, e)
            self._cache_set(key_fp, None, ok=False, last_error=str(e))
            return None
        except Exception as e:
            logger.exception("Quota API unexpected error (key=***%s): %s", key_suffix, e)
            self._cache_set(key_fp, None, ok=False, last_error=str(e))
            return None
        finally:
            if owns_client and client is not None:
                await client.aclose()

    async def batch_get_quota(
        self,
        api_keys: list[tuple[int, str]]
    ) -> dict[int, Optional[QuotaInfo]]:
        """
        批量查询多个 API Key 的额度信息

        Args:
            api_keys: [(registration_id, api_key), ...] 列表

        Returns:
            {registration_id: QuotaInfo | None} 字典
        """
        # key 去重：避免同一个 key 被重复查询
        key_to_reg_ids: dict[str, list[int]] = {}
        for reg_id, key in api_keys:
            if not key:
                continue
            key_to_reg_ids.setdefault(key, []).append(reg_id)

        if not key_to_reg_ids:
            return {}

        # 并发控制
        semaphore = asyncio.Semaphore(self.max_concurrency)
        limits = httpx.Limits(
            max_connections=self.max_concurrency,
            max_keepalive_connections=self.max_concurrency
        )

        async with httpx.AsyncClient(
            timeout=self.timeout,
            limits=limits,
            follow_redirects=False
        ) as client:
            async def query_key(key: str) -> tuple[str, Optional[QuotaInfo]]:
                async with semaphore:
                    return key, await self.get_quota(key, client=client)

            tasks = [query_key(key) for key in key_to_reg_ids.keys()]
            results = await asyncio.gather(*tasks, return_exceptions=True)

        # 构建结果映射
        quota_map: dict[int, Optional[QuotaInfo]] = {}
        for result in results:
            if isinstance(result, Exception):
                logger.warning("Batch quota query exception: %s", result)
                continue
            key, info = result
            for reg_id in key_to_reg_ids.get(key, []):
                quota_map[reg_id] = info

        return quota_map


# 全局服务实例
quota_service = QuotaService()
