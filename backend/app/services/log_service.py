"""
系统日志记录服务
"""
import json
import logging
from typing import Optional, Any
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Request

from app.models.system_log import SystemLog, LogAction


logger = logging.getLogger(__name__)


async def log_action(
    db: AsyncSession,
    action: str,
    user_id: Optional[int] = None,
    description: Optional[str] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    extra_data: Optional[dict] = None,
    request: Optional[Request] = None,
) -> SystemLog:
    """
    记录用户操作日志

    Args:
        db: 数据库会话
        action: 操作类型 (LOGIN, SIGNIN, LOTTERY 等)
        user_id: 用户ID
        description: 操作描述
        ip_address: IP地址
        user_agent: 用户代理
        extra_data: 额外数据
        request: FastAPI请求对象（用于自动获取IP和UA）
    """
    try:
        # 从 request 中获取 IP 和 UA
        if request:
            if not ip_address:
                # 尝试获取真实 IP（考虑代理）
                forwarded = request.headers.get("X-Forwarded-For")
                if forwarded:
                    ip_address = forwarded.split(",")[0].strip()
                else:
                    ip_address = request.client.host if request.client else None

            if not user_agent:
                user_agent = request.headers.get("User-Agent", "")[:500]

        log = SystemLog(
            user_id=user_id,
            action=action,
            description=description,
            ip_address=ip_address,
            user_agent=user_agent,
            extra_data=json.dumps(extra_data) if extra_data else None,
        )
        db.add(log)
        await db.flush()

        logger.debug(f"Logged action: {action} for user {user_id}")
        return log

    except Exception as e:
        logger.error(f"Failed to log action {action}: {e}")
        # 日志记录失败不应影响主流程
        return None


# 便捷方法
async def log_login(db: AsyncSession, user_id: int, request: Request = None, success: bool = True):
    """记录登录"""
    desc = "登录成功" if success else "登录失败"
    return await log_action(db, LogAction.LOGIN, user_id, desc, request=request)


async def log_register(db: AsyncSession, user_id: int, username: str, request: Request = None):
    """记录注册"""
    return await log_action(db, LogAction.REGISTER, user_id, f"新用户注册: {username}", request=request)


async def log_signin(db: AsyncSession, user_id: int, points: int, streak: int, request: Request = None):
    """记录签到"""
    return await log_action(
        db, LogAction.SIGNIN, user_id,
        f"每日签到成功，获得 {points} 积分，连续签到 {streak} 天",
        request=request
    )


async def log_lottery(db: AsyncSession, user_id: int, prize_name: str, is_rare: bool = False, request: Request = None):
    """记录抽奖"""
    desc = f"抽奖获得: {prize_name}" + (" (稀有)" if is_rare else "")
    return await log_action(db, LogAction.LOTTERY, user_id, desc, request=request)


async def log_bet(db: AsyncSession, user_id: int, market_title: str, option_label: str, points: int, request: Request = None):
    """记录下注"""
    return await log_action(
        db, LogAction.BET, user_id,
        f"在「{market_title}」下注 {points} 积分，选择: {option_label}",
        request=request
    )


async def log_submit(db: AsyncSession, user_id: int, title: str, request: Request = None):
    """记录提交作品"""
    return await log_action(db, LogAction.SUBMIT, user_id, f"提交作品: {title}", request=request)


async def log_vote(db: AsyncSession, user_id: int, submission_title: str, request: Request = None):
    """记录投票"""
    return await log_action(db, LogAction.VOTE, user_id, f"为作品投票: {submission_title}", request=request)


async def log_admin_action(db: AsyncSession, user_id: int, action_desc: str, request: Request = None):
    """记录管理员操作"""
    return await log_action(db, LogAction.ADMIN, user_id, action_desc, request=request)


async def log_cheer(db: AsyncSession, user_id: int, target_name: str, points: int, request: Request = None):
    """记录应援"""
    return await log_action(
        db, LogAction.CHEER, user_id,
        f"为「{target_name}」应援 {points} 积分",
        request=request
    )
