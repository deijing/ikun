"""
API 速率限制配置

使用 slowapi 实现请求频率限制，防止：
- 接口被暴力刷取
- DoS 攻击
- 恶意脚本滥用
"""
import ipaddress

from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.core.config import settings


def _extract_ip(value: str) -> str | None:
    parts = [item.strip() for item in value.split(",") if item.strip()]
    if not parts:
        return None
    candidate = parts[0]
    try:
        ipaddress.ip_address(candidate)
        return candidate
    except ValueError:
        return None


def get_client_ip(request: Request) -> str:
    """
    获取客户端 IP。

    TODO: 接入 CDN/WAF 后启用可信代理解析，否则容易被伪造。
    """
    if settings.TRUSTED_PROXY_ENABLED:
        headers = settings.TRUSTED_PROXY_HEADERS
        if isinstance(headers, str):
            headers = [item.strip() for item in headers.split(",") if item.strip()]
        for header in headers:
            value = request.headers.get(header)
            if not value:
                continue
            ip_value = _extract_ip(value)
            if ip_value:
                return ip_value
    return get_remote_address(request)


def get_user_identifier(request: Request) -> str:
    """
    获取用户标识符，用于速率限制的 key
    优先使用用户 ID（从 JWT 解析），否则使用 IP 地址
    """
    # 尝试从 Authorization header 获取用户信息
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        try:
            from app.core.security import decode_token
            token = auth_header.split(" ", 1)[1].strip()
            payload = decode_token(token)
            if payload and "sub" in payload:
                return f"user:{payload['sub']}"
        except Exception:
            pass

    # 回退到 IP 地址
    return get_client_ip(request)


# 创建限制器实例
storage_uri = settings.RATE_LIMIT_STORAGE_URI or settings.REDIS_URL or "memory://"
limiter = Limiter(
    key_func=get_user_identifier,
    default_limits=["200/minute"],  # 默认限制
    storage_uri=storage_uri,
)


def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """速率限制超出时的处理器"""
    return JSONResponse(
        status_code=429,
        content={
            "detail": "请求过于频繁，请稍后再试",
            "retry_after": exc.detail
        }
    )


# 常用的限制配置
class RateLimits:
    """预定义的速率限制配置"""

    # 认证相关 - 严格限制防止暴力破解
    AUTH = "10/minute"

    # 签到 - 每分钟最多 5 次
    SIGNIN = "5/minute"

    # 抽奖/扭蛋 - 每分钟最多 30 次
    LOTTERY = "30/minute"

    # 竞猜下注 - 每分钟最多 20 次
    BET = "20/minute"

    # 彩蛋兑换 - 每分钟最多 10 次
    REDEEM = "10/minute"

    # 打气互动 - 每分钟最多 60 次
    CHEER = "60/minute"

    # 文件上传 - 每分钟最多 10 次
    UPLOAD = "10/minute"

    # 普通读取 - 每分钟最多 100 次
    READ = "100/minute"

    # 管理员操作 - 每分钟最多 60 次
    ADMIN = "60/minute"

    # 点赞/收藏 - 每分钟最多 30 次
    INTERACTION = "30/minute"

    # 投票 - 每分钟最多 30 次
    VOTE = "30/minute"
