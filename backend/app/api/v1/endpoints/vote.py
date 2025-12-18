"""
投票相关 API
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User

router = APIRouter()


@router.post("/{submission_id}")
async def vote_submission(submission_id: int):
    """为作品投票"""
    return {"message": f"为作品 {submission_id} 投票"}


@router.delete("/{submission_id}")
async def cancel_vote(submission_id: int):
    """取消投票"""
    return {"message": f"取消作品 {submission_id} 投票"}


@router.get("/my")
async def get_my_votes():
    """获取我的投票记录"""
    return {"message": "我的投票记录"}


@router.get("/leaderboard")
async def get_heat_leaderboard(
    contest_id: int = Query(1, description="比赛ID"),
    limit: int = Query(50, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取热力榜 - 按用户打赏消耗的积分（热力值）排行，展示最热心的吃瓜群众"""
    from app.models.registration import Registration, RegistrationStatus
    from app.models.cheer import Cheer, CheerType

    # 道具分数配置
    ITEM_POINTS = {
        CheerType.CHEER: 1,
        CheerType.COFFEE: 2,
        CheerType.ENERGY: 3,
        CheerType.PIZZA: 4,
        CheerType.STAR: 5,
    }

    # 获取比赛的所有报名ID
    reg_query = select(Registration.id).where(
        Registration.contest_id == contest_id,
        Registration.status.in_([
            RegistrationStatus.SUBMITTED.value,
            RegistrationStatus.APPROVED.value,
        ])
    )
    reg_result = await db.execute(reg_query)
    registration_ids = [r for r in reg_result.scalars().all()]

    if not registration_ids:
        return {"items": [], "total": 0}

    # 统计每个用户的打气次数（按类型分组）
    stats_query = (
        select(
            Cheer.user_id,
            Cheer.cheer_type,
            func.count(Cheer.id).label("count")
        )
        .where(Cheer.registration_id.in_(registration_ids))
        .group_by(Cheer.user_id, Cheer.cheer_type)
    )
    stats_result = await db.execute(stats_query)
    raw_stats = stats_result.all()

    # 汇总每个用户的热力值
    user_stats = {}
    for user_id, cheer_type, count in raw_stats:
        if user_id not in user_stats:
            user_stats[user_id] = {
                "cheer": 0, "coffee": 0, "energy": 0, "pizza": 0, "star": 0,
                "total_count": 0,  # 总打气次数
                "heat_value": 0,   # 总热力值（积分）
            }
        type_key = cheer_type.value
        user_stats[user_id][type_key] = count
        user_stats[user_id]["total_count"] += count
        user_stats[user_id]["heat_value"] += count * ITEM_POINTS.get(cheer_type, 1)

    if not user_stats:
        return {"items": [], "total": 0}

    # 按热力值排序
    sorted_users = sorted(user_stats.items(), key=lambda x: x[1]["heat_value"], reverse=True)[:limit]

    # 获取用户详情
    user_ids = [u[0] for u in sorted_users]
    user_query = select(User).where(User.id.in_(user_ids))
    user_result = await db.execute(user_query)
    user_map = {u.id: u for u in user_result.scalars().all()}

    items = []
    for rank, (user_id, stats) in enumerate(sorted_users, 1):
        user = user_map.get(user_id)
        if user:
            items.append({
                "rank": rank,
                "user_id": user_id,
                "username": user.username,
                "display_name": user.display_name,
                "avatar_url": user.avatar_url,
                "heat_value": stats["heat_value"],
                "total_count": stats["total_count"],
                "stats": {
                    "cheer": stats["cheer"],
                    "coffee": stats["coffee"],
                    "energy": stats["energy"],
                    "pizza": stats["pizza"],
                    "star": stats["star"],
                },
            })

    return {"items": items, "total": len(items)}
