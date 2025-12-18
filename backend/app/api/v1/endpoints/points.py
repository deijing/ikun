"""
积分系统 API
包含：签到、积分查询、积分历史
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User
from app.services.points_service import PointsService, SigninService

router = APIRouter()


# ========== Schema ==========

class PointsBalanceResponse(BaseModel):
    balance: int
    total_earned: int
    total_spent: int


class SigninResponse(BaseModel):
    success: bool
    signin_date: str
    streak_day: int
    base_points: int
    bonus_points: int
    total_points: int
    balance: int
    is_milestone: bool
    milestone_message: Optional[str] = None


class SigninStatusResponse(BaseModel):
    signed_today: bool
    streak_days: int
    streak_display: int
    monthly_signins: List[str]
    monthly_count: int
    next_milestone: Optional[int] = None
    next_milestone_bonus: Optional[int] = None
    days_to_milestone: Optional[int] = None
    milestones: List[dict]


class PointsHistoryItem(BaseModel):
    id: int
    amount: int
    balance_after: int
    reason: str
    description: Optional[str] = None
    created_at: str


# ========== 积分接口 ==========

@router.get("/balance", response_model=PointsBalanceResponse)
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取积分余额"""
    user_points = await PointsService.get_or_create_user_points(db, current_user.id)
    return PointsBalanceResponse(
        balance=user_points.balance,
        total_earned=user_points.total_earned,
        total_spent=user_points.total_spent
    )


@router.get("/history")
@limiter.limit(RateLimits.READ)
async def get_points_history(
    request: Request,
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取积分变动历史"""
    history = await PointsService.get_points_history(db, current_user.id, limit, offset)
    return {
        "items": [
            {
                "id": h.id,
                "amount": h.amount,
                "balance_after": h.balance_after,
                "reason": h.reason.value,
                "description": h.description,
                "created_at": h.created_at.isoformat()
            }
            for h in history
        ]
    }


# ========== 签到接口 ==========

@router.post("/signin", response_model=SigninResponse)
@limiter.limit(RateLimits.SIGNIN)
async def signin(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """每日签到"""
    try:
        result = await SigninService.signin(db, current_user.id)

        # 记录日志
        from app.services.log_service import log_signin
        await log_signin(
            db, current_user.id,
            points=result.get("points_earned", 0),
            streak=result.get("streak_day", 1),
            request=request
        )
        await db.commit()

        return SigninResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/signin/status", response_model=SigninStatusResponse)
async def get_signin_status(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取签到状态"""
    status = await SigninService.get_signin_status(db, current_user.id)
    return SigninStatusResponse(**status)
