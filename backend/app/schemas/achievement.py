"""
成就系统 Schema
"""
from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel


class AchievementDefinitionOut(BaseModel):
    """成就定义输出"""
    achievement_key: str
    name: str
    description: str
    category: str
    badge_icon: str
    badge_tier: str
    points: int
    target_value: int

    class Config:
        from_attributes = True


class UserAchievementOut(BaseModel):
    """用户成就状态输出"""
    achievement_key: str
    name: str
    description: str
    category: str
    badge_icon: str
    badge_tier: str
    points: int
    target_value: int
    status: str
    progress_value: int
    progress_percent: int
    unlocked_at: Optional[datetime] = None
    claimed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserStatsOut(BaseModel):
    """用户统计输出"""
    total_cheers_given: int
    total_cheers_with_message: int
    cheer_types_used: list[str] = []
    consecutive_days: int
    max_consecutive_days: int
    last_cheer_date: Optional[date] = None
    total_points: int
    achievements_unlocked: int

    class Config:
        from_attributes = True


class BadgeSlotOut(BaseModel):
    """徽章槽位输出"""
    slot: int
    achievement_key: str
    name: str
    badge_icon: str
    badge_tier: str

    class Config:
        from_attributes = True


class BadgeShowcaseUpdate(BaseModel):
    """更新徽章展示"""
    slot: int
    achievement_key: str


class ClaimAchievementOut(BaseModel):
    """领取成就输出"""
    achievement_key: str
    status: str
    claimed_at: datetime
    points_awarded: int


class AchievementProgressEvent(BaseModel):
    """成就进度事件（内部使用）"""
    user_id: int
    event_type: str  # cheer_created, message_sent, daily_visit
    cheer_type: Optional[str] = None
    has_message: bool = False
    project_id: Optional[int] = None
