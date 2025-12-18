"""
积分兑换商城 API
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional, List

from app.core.database import get_db
from app.api.v1.endpoints.user import get_current_user_dep as get_current_user
from app.models.user import User
from app.services.exchange_service import ExchangeService

router = APIRouter()


# ========== Schema ==========

class ExchangeItemInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    item_type: str
    cost_points: int
    stock: Optional[int] = None
    daily_limit: Optional[int] = None
    total_limit: Optional[int] = None
    icon: Optional[str] = None
    is_hot: bool = False
    has_stock: bool = True


class UserExchangeInfo(BaseModel):
    balance: int
    lottery_tickets: int = 0
    scratch_tickets: int = 0
    gacha_tickets: int = 0


class ExchangeRequest(BaseModel):
    item_id: int
    quantity: int = 1


class ExchangeResponse(BaseModel):
    success: bool
    item_name: str
    quantity: int
    cost_points: int
    reward_value: Optional[str] = None
    message: Optional[str] = None
    balance: int


class ExchangeHistoryItem(BaseModel):
    id: int
    item_name: str
    item_type: str
    cost_points: int
    quantity: int
    reward_value: Optional[str] = None
    created_at: str


# ========== 接口 ==========

@router.get("/items", response_model=List[ExchangeItemInfo])
async def get_exchange_items(
    db: AsyncSession = Depends(get_db)
):
    """获取兑换商品列表"""
    items = await ExchangeService.get_exchange_items(db)
    return [ExchangeItemInfo(**item) for item in items]


@router.get("/info", response_model=UserExchangeInfo)
async def get_user_exchange_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户兑换信息（余额、券数量）"""
    info = await ExchangeService.get_user_exchange_info(db, current_user.id)
    return UserExchangeInfo(**info)


@router.post("/redeem", response_model=ExchangeResponse)
async def exchange_item(
    request: ExchangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """兑换商品"""
    try:
        result = await ExchangeService.exchange(
            db, current_user.id, request.item_id, request.quantity
        )
        return ExchangeResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/history", response_model=List[ExchangeHistoryItem])
async def get_exchange_history(
    limit: int = Query(20, ge=1, le=100, description="每页数量"),
    offset: int = Query(0, ge=0, description="偏移量"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取兑换历史"""
    history = await ExchangeService.get_exchange_history(
        db, current_user.id, limit, offset
    )
    return [ExchangeHistoryItem(**h) for h in history]


@router.get("/tickets")
async def get_user_tickets(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """获取用户的券数量"""
    tickets = await ExchangeService.get_user_tickets(db, current_user.id)
    return {
        "lottery_tickets": tickets.get("LOTTERY_TICKET", 0),
        "scratch_tickets": tickets.get("SCRATCH_TICKET", 0),
        "gacha_tickets": tickets.get("GACHA_TICKET", 0),
    }
