"""
上传配额控制
"""
from __future__ import annotations

from datetime import datetime, timedelta
import logging

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.redis import get_redis, close_redis


logger = logging.getLogger(__name__)


def _build_quota_key(scope: str, user_id: int, now: datetime) -> tuple[str, int]:
    day_key = now.strftime("%Y%m%d")
    key = f"quota:upload:{scope}:user:{user_id}:{day_key}"
    next_day = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    ttl_seconds = max(60, int((next_day - now).total_seconds()))
    return key, ttl_seconds


async def ensure_upload_quota(user_id: int, scope: str, size_bytes: int) -> None:
    """检查配额是否足够（不占用配额）。"""
    if not user_id or size_bytes <= 0:
        return
    limit = settings.UPLOAD_DAILY_BYTES_LIMIT
    if not limit or limit <= 0:
        return

    client = await get_redis()
    try:
        key, _ = _build_quota_key(scope, user_id, datetime.utcnow())
        used = int(await client.get(key) or 0)
        if used + size_bytes > limit:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="上传额度不足，请减少文件大小或稍后再试",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("上传配额检查失败: %s", exc)
    finally:
        await close_redis(client)


async def commit_upload_quota(user_id: int, scope: str, size_bytes: int) -> None:
    """提交配额占用（原子递增），超过上限则回滚。"""
    if not user_id or size_bytes <= 0:
        return
    limit = settings.UPLOAD_DAILY_BYTES_LIMIT
    if not limit or limit <= 0:
        return

    client = await get_redis()
    try:
        key, ttl_seconds = _build_quota_key(scope, user_id, datetime.utcnow())
        total = await client.incrby(key, size_bytes)
        if total == size_bytes:
            await client.expire(key, ttl_seconds)
        if total > limit:
            await client.decrby(key, size_bytes)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="上传额度已用尽，请稍后再试",
            )
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("上传配额扣减失败: %s", exc)
    finally:
        await close_redis(client)
