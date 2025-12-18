"""
抽奖系统 API
"""
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.core.rate_limit import limiter, RateLimits
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user, get_current_user_optional
from app.models.user import User
from app.services.lottery_service import LotteryService

router = APIRouter()


# ========== Schema ==========

class DrawRequest(BaseModel):
    request_id: Optional[str] = None


class DrawResponse(BaseModel):
    success: bool
    is_duplicate: bool = False
    prize_id: Optional[int] = None
    prize_name: str
    prize_type: str
    prize_value: Optional[str] = None
    is_rare: bool = False
    message: Optional[str] = None
    cost_points: Optional[int] = None
    balance: Optional[int] = None


class PrizeInfo(BaseModel):
    id: int
    name: str
    type: str
    is_rare: bool
    has_stock: bool


class LotteryInfoResponse(BaseModel):
    active: bool
    config_id: Optional[int] = None
    name: Optional[str] = None
    cost_points: Optional[int] = None
    daily_limit: Optional[int] = None
    prizes: Optional[List[PrizeInfo]] = None
    starts_at: Optional[str] = None
    ends_at: Optional[str] = None
    today_count: Optional[int] = None
    remaining_today: Optional[int] = None
    balance: Optional[int] = None
    can_draw: Optional[bool] = None
    message: Optional[str] = None


class DrawHistoryItem(BaseModel):
    id: int
    prize_name: str
    prize_type: str
    prize_value: Optional[str] = None
    is_rare: bool
    cost_points: int
    created_at: str


class WinnerInfo(BaseModel):
    user_id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    prize_name: str
    created_at: str


class UserItemInfo(BaseModel):
    item_type: str
    quantity: int


class ApiKeyInfo(BaseModel):
    id: int
    code: str
    status: str
    assigned_at: Optional[str] = None
    expires_at: Optional[str] = None


# ========== 抽奖接口 ==========

@router.get("/info", response_model=LotteryInfoResponse)
async def get_lottery_info(
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """获取抽奖活动信息"""
    user_id = current_user.id if current_user else None
    info = await LotteryService.get_lottery_info(db, user_id)
    return LotteryInfoResponse(**info)


@router.post("/draw", response_model=DrawResponse)
@limiter.limit(RateLimits.LOTTERY)
async def draw(
    request: Request,
    body: DrawRequest = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """执行抽奖"""
    try:
        request_id = body.request_id if body else None
        result = await LotteryService.draw(db, current_user.id, request_id)

        # 记录日志
        from app.services.log_service import log_lottery
        await log_lottery(
            db, current_user.id,
            prize_name=result.get("prize_name", "未知奖品"),
            is_rare=result.get("is_rare", False),
            request=request
        )
        await db.commit()

        return DrawResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history", response_model=List[DrawHistoryItem])
@limiter.limit(RateLimits.READ)
async def get_draw_history(
    request: Request,
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取抽奖历史"""
    history = await LotteryService.get_draw_history(db, current_user.id, limit, offset)
    return [DrawHistoryItem(**h) for h in history]


@router.get("/winners", response_model=List[WinnerInfo])
async def get_recent_winners(
    limit: int = Query(10, ge=1, le=100, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取最近中奖记录（稀有奖品）"""
    winners = await LotteryService.get_recent_winners(db, limit)
    return [WinnerInfo(**w) for w in winners]


@router.get("/leaderboard")
async def get_lucky_leaderboard(
    limit: int = Query(50, ge=1, le=200, description="返回数量"),
    db: AsyncSession = Depends(get_db)
):
    """获取欧皇榜 - 按稀有奖品中奖次数排行"""
    leaderboard = await LotteryService.get_lucky_leaderboard(db, limit)
    return {"items": leaderboard, "total": len(leaderboard)}


# ========== 用户物品接口 ==========

@router.get("/items", response_model=List[UserItemInfo])
async def get_user_items(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户道具列表"""
    items = await LotteryService.get_user_items(db, current_user.id)
    return [UserItemInfo(**item) for item in items]


@router.get("/api-keys", response_model=List[ApiKeyInfo])
async def get_user_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的API Key"""
    keys = await LotteryService.get_user_api_keys(db, current_user.id)
    return [ApiKeyInfo(**k) for k in keys]


# ========== 刮刮乐接口 ==========

class ScratchInfoResponse(BaseModel):
    active: bool
    config_id: Optional[int] = None
    name: Optional[str] = None
    cost_points: int = 30
    daily_limit: Optional[int] = None
    today_count: int = 0
    remaining_today: Optional[int] = None
    balance: int = 0
    can_draw: bool = False
    message: Optional[str] = None


class ScratchBuyResponse(BaseModel):
    success: bool
    card_id: int
    cost_points: int
    remaining_balance: int


class ScratchRevealResponse(BaseModel):
    success: bool
    prize_name: str
    prize_type: str
    prize_value: Optional[str] = None
    is_rare: bool = False
    message: Optional[str] = None


@router.get("/scratch/info", response_model=ScratchInfoResponse)
async def get_scratch_info(
    current_user: User = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """获取刮刮乐信息"""
    info = await LotteryService.get_scratch_info(db, current_user.id if current_user else None)
    return ScratchInfoResponse(**info)


@router.post("/scratch/buy", response_model=ScratchBuyResponse)
@limiter.limit(RateLimits.LOTTERY)
async def buy_scratch_card(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """购买刮刮乐（购买时确定奖品，但不返回给前端）"""
    try:
        result = await LotteryService.buy_scratch_card(db, current_user.id)
        return ScratchBuyResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/scratch/{card_id}/reveal", response_model=ScratchRevealResponse)
@limiter.limit(RateLimits.LOTTERY)
async def reveal_scratch_card(
    request: Request,
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """刮开彩票，揭晓奖品"""
    try:
        result = await LotteryService.reveal_scratch_card(db, card_id, current_user.id)

        # 记录日志
        from app.services.log_service import log_lottery
        await log_lottery(
            db, current_user.id,
            prize_name=f"刮刮乐: {result.get('prize_name', '未知')}",
            is_rare=result.get("is_rare", False),
            request=request
        )
        await db.commit()

        return ScratchRevealResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
