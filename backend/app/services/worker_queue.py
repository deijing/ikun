"""
Worker 队列服务
"""
import json
import logging

from fastapi import HTTPException, status

from app.core.config import settings
from app.core.redis import close_redis, get_redis


logger = logging.getLogger(__name__)


async def enqueue_worker_action(action: str, submission_id: int) -> None:
    """提交 Worker 任务"""
    payload = json.dumps(
        {"action": action, "submission_id": submission_id},
        ensure_ascii=False,
    )
    redis_client = None
    try:
        redis_client = await get_redis()
        await redis_client.rpush(settings.WORKER_QUEUE_KEY, payload)
    except Exception as exc:
        logger.warning(
            "任务入队失败: action=%s, submission_id=%s, error=%s",
            action,
            submission_id,
            exc,
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="任务入队失败，请稍后重试",
        ) from exc
    finally:
        await close_redis(redis_client)
