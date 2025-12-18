"""
成就系统 API 端点

提供成就相关功能：
- 获取成就列表
- 获取用户成就
- 领取成就奖励
- 管理徽章展示
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.user import User
from app.models.achievement import AchievementDefinition, UserStats
from app.services import achievement_service
from app.api.v1.endpoints.registration import get_current_user, get_optional_user

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# 请求/响应模型
# ============================================================================

class BadgeShowcaseRequest(BaseModel):
    """设置徽章展示请求"""
    slot: int
    achievement_key: str


# ============================================================================
# API 端点
# ============================================================================

@router.get(
    "/achievements",
    summary="获取所有成就定义",
    description="获取所有可用成就的定义信息。",
)
async def get_achievement_definitions(
    db: AsyncSession = Depends(get_db),
):
    """获取所有成就定义"""
    result = await db.execute(
        select(AchievementDefinition)
        .where(AchievementDefinition.is_active == True)
        .order_by(AchievementDefinition.sort_order)
    )
    definitions = result.scalars().all()

    return {
        "items": [
            {
                "achievement_key": d.achievement_key,
                "name": d.name,
                "description": d.description,
                "category": d.category,
                "badge_icon": d.badge_icon,
                "badge_tier": d.badge_tier,
                "points": d.points,
                "target_value": d.target_value,
            }
            for d in definitions
        ],
        "total": len(definitions),
    }


@router.get(
    "/users/me/achievements",
    summary="获取当前用户的成就",
    description="获取当前登录用户的所有成就及进度。",
)
async def get_my_achievements(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的成就"""
    achievements = await achievement_service.get_user_achievements(db, current_user.id)

    # 按分类分组
    by_category = {}
    for ach in achievements:
        cat = ach["category"]
        if cat not in by_category:
            by_category[cat] = []
        by_category[cat].append(ach)

    # 统计
    total = len(achievements)
    unlocked = sum(1 for a in achievements if a["status"] in ["unlocked", "claimed"])
    claimed = sum(1 for a in achievements if a["status"] == "claimed")

    return {
        "items": achievements,
        "by_category": by_category,
        "stats": {
            "total": total,
            "unlocked": unlocked,
            "claimed": claimed,
            "progress_percent": int((unlocked / total) * 100) if total > 0 else 0,
        },
    }


@router.get(
    "/users/me/stats",
    summary="获取当前用户的统计数据",
    description="获取当前登录用户的打气统计等数据。",
)
async def get_my_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户的统计数据"""
    stats = await achievement_service.get_or_create_user_stats(db, current_user.id)

    return {
        "total_cheers_given": stats.total_cheers_given,
        "total_cheers_with_message": stats.total_cheers_with_message,
        "cheer_types_used": stats.cheer_types_used or [],
        "consecutive_days": stats.consecutive_days,
        "max_consecutive_days": stats.max_consecutive_days,
        "last_cheer_date": str(stats.last_cheer_date) if stats.last_cheer_date else None,
        "total_points": stats.total_points,
        "achievements_unlocked": stats.achievements_unlocked,
    }


@router.post(
    "/users/me/achievements/{achievement_key}/claim",
    summary="领取成就奖励",
    description="领取已解锁成就的积分奖励。",
)
async def claim_achievement(
    achievement_key: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """领取成就奖励"""
    success, points = await achievement_service.claim_achievement(
        db, current_user.id, achievement_key
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法领取该成就，可能尚未解锁或已领取"
        )

    await db.commit()

    return {
        "success": True,
        "achievement_key": achievement_key,
        "points_awarded": points,
        "message": f"恭喜获得 {points} 积分！",
    }


@router.get(
    "/users/me/badges",
    summary="获取当前用户展示的徽章",
    description="获取当前用户在个人页展示的徽章列表。",
)
async def get_my_badges(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """获取当前用户展示的徽章"""
    badges = await achievement_service.get_user_badge_showcase(db, current_user.id)

    return {
        "items": badges,
        "max_slots": 3,
    }


@router.put(
    "/users/me/badges",
    summary="设置展示徽章",
    description="将已获得的成就设置为展示徽章。",
)
async def set_my_badge(
    payload: BadgeShowcaseRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """设置展示徽章"""
    if payload.slot < 1 or payload.slot > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="槽位只能是 1-3"
        )

    success = await achievement_service.set_badge_showcase(
        db, current_user.id, payload.slot, payload.achievement_key
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无法设置该徽章，可能尚未获得该成就"
        )

    await db.commit()

    return {
        "success": True,
        "slot": payload.slot,
        "achievement_key": payload.achievement_key,
    }


@router.delete(
    "/users/me/badges/{slot}",
    summary="移除展示徽章",
    description="移除指定槽位的展示徽章。",
)
async def remove_my_badge(
    slot: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """移除展示徽章"""
    if slot < 1 or slot > 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="槽位只能是 1-3"
        )

    success = await achievement_service.remove_badge_showcase(db, current_user.id, slot)

    await db.commit()

    return {
        "success": success,
        "slot": slot,
    }


@router.get(
    "/users/{user_id}/achievements",
    summary="获取指定用户的成就",
    description="获取指定用户的已解锁成就（公开信息）。",
)
async def get_user_achievements(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户的成就"""
    achievements = await achievement_service.get_user_achievements(db, user_id)

    # 只返回已解锁/已领取的成就（公开信息）
    public_achievements = [
        a for a in achievements if a["status"] in ["unlocked", "claimed"]
    ]

    return {
        "items": public_achievements,
        "total_unlocked": len(public_achievements),
    }


@router.get(
    "/users/{user_id}/badges",
    summary="获取指定用户展示的徽章",
    description="获取指定用户展示的徽章（公开信息）。",
)
async def get_user_badges(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户展示的徽章"""
    badges = await achievement_service.get_user_badge_showcase(db, user_id)

    return {
        "items": badges,
    }


@router.get(
    "/users/{user_id}/stats",
    summary="获取指定用户的公开统计",
    description="获取指定用户的公开统计数据。",
)
async def get_user_stats(
    user_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取指定用户的公开统计"""
    result = await db.execute(
        select(UserStats).where(UserStats.user_id == user_id)
    )
    stats = result.scalar_one_or_none()

    if not stats:
        return {
            "total_cheers_given": 0,
            "total_points": 0,
            "achievements_unlocked": 0,
            "max_consecutive_days": 0,
        }

    return {
        "total_cheers_given": stats.total_cheers_given,
        "total_points": stats.total_points,
        "achievements_unlocked": stats.achievements_unlocked,
        "max_consecutive_days": stats.max_consecutive_days,
    }
