"""
彩蛋兑换码 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional, Any, List
from pydantic import BaseModel, Field


# ========== 请求 Schema ==========

class RedeemCodeRequest(BaseModel):
    """兑换码兑换请求"""
    code: str = Field(..., min_length=1, max_length=64, description="兑换码")


# ========== 响应 Schema ==========

class RewardInfo(BaseModel):
    """奖励信息"""
    type: str = Field(..., description="奖励类型: points/item/badge/api_key")
    value: Any = Field(..., description="奖励值")


class RedeemCodeResponse(BaseModel):
    """兑换码兑换响应"""
    success: bool = Field(..., description="是否成功")
    code: str = Field(..., description="兑换码")
    reward: RewardInfo = Field(..., description="奖励信息")
    hint: Optional[str] = Field(None, description="提示语")
    claimed_at: datetime = Field(..., description="兑换时间")


class RedemptionHistoryItem(BaseModel):
    """兑换历史项"""
    id: int
    code: str
    reward: RewardInfo
    hint: Optional[str] = None
    claimed_at: datetime

    class Config:
        from_attributes = True


class RedemptionHistoryResponse(BaseModel):
    """兑换历史响应"""
    items: List[RedemptionHistoryItem]
    total: int


class EasterEggCodeInfo(BaseModel):
    """彩蛋码信息（管理员视角）"""
    id: int
    code: str
    reward_type: str
    reward_value: Any
    status: str
    description: Optional[str] = None
    hint: Optional[str] = None
    claimed_by: Optional[int] = None
    claimer_username: Optional[str] = None
    claimed_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class EasterEggStatsResponse(BaseModel):
    """彩蛋统计响应"""
    total_codes: int
    active_codes: int
    claimed_codes: int
    disabled_codes: int
    expired_codes: int


class CreateEasterEggRequest(BaseModel):
    """创建彩蛋码请求（管理员）"""
    code: str = Field(..., min_length=1, max_length=64, description="兑换码")
    reward_type: str = Field(..., description="奖励类型: points/item/badge/api_key")
    reward_value: Any = Field(..., description="奖励值（JSON）")
    description: Optional[str] = Field(None, max_length=255, description="描述")
    hint: Optional[str] = Field(None, max_length=255, description="兑换成功提示")
    expires_at: Optional[datetime] = Field(None, description="过期时间")


# ========== 扭蛋机 Schema ==========

class GachaPlayResponse(BaseModel):
    """扭蛋机抽奖响应"""
    success: bool = Field(..., description="是否成功")
    code: str = Field(..., description="获得的彩蛋码")
    reward: RewardInfo = Field(..., description="彩蛋码对应的奖励预览")
    hint: Optional[str] = Field(None, description="提示语")
    cost: int = Field(..., description="消耗的积分")
    remaining_balance: int = Field(..., description="剩余积分")


class GachaStatusResponse(BaseModel):
    """扭蛋机状态响应"""
    cost: int = Field(..., description="单次消耗积分")
    available_codes: int = Field(..., description="剩余可抽取的彩蛋码数量")
    user_balance: int = Field(..., description="用户当前积分")
    can_play: bool = Field(..., description="是否可以抽奖")
