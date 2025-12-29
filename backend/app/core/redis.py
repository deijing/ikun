"""
Redis 客户端封装
"""
from typing import Optional

from redis.asyncio import Redis

from app.core.config import settings


async def get_redis() -> Redis:
    """创建 Redis 客户端（异步）"""
    return Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def close_redis(client: Optional[Redis]) -> None:
    """关闭 Redis 客户端"""
    if client is not None:
        await client.close()
