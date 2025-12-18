"""
彩蛋兑换码数据模型
"""
from datetime import datetime
from enum import Enum
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class EasterEggRewardType(str, Enum):
    """彩蛋奖励类型（小写值与数据库 ENUM 一致）"""
    POINTS = "points"      # 积分
    ITEM = "item"          # 道具
    BADGE = "badge"        # 徽章
    API_KEY = "api_key"    # API Key


class EasterEggStatus(str, Enum):
    """彩蛋兑换码状态（小写值与数据库 ENUM 一致）"""
    ACTIVE = "active"      # 可用
    CLAIMED = "claimed"    # 已领取
    DISABLED = "disabled"  # 已禁用
    EXPIRED = "expired"    # 已过期


class EasterEggCode(BaseModel):
    """彩蛋兑换码"""
    __tablename__ = "easter_egg_codes"

    code = Column(String(64), unique=True, nullable=False, index=True, comment="兑换码")
    # 使用 String 存储枚举值，与数据库 ENUM 兼容
    reward_type = Column(String(32), nullable=False, comment="奖励类型")
    reward_value = Column(JSON, nullable=False, comment="奖励值（JSON格式）")
    status = Column(String(16), nullable=False, default="active", comment="状态")
    description = Column(String(255), nullable=True, comment="兑换码描述（管理员可见）")
    hint = Column(String(255), nullable=True, comment="提示语（兑换成功后显示）")
    claimed_by = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, comment="领取用户ID")
    claimed_at = Column(DateTime, nullable=True, comment="领取时间")
    expires_at = Column(DateTime, nullable=True, comment="过期时间")

    # 关系
    claimer = relationship("User", foreign_keys=[claimed_by], backref="claimed_easter_eggs")

    @property
    def reward_type_enum(self) -> EasterEggRewardType:
        """获取奖励类型枚举"""
        return EasterEggRewardType(self.reward_type)

    @property
    def status_enum(self) -> EasterEggStatus:
        """获取状态枚举"""
        return EasterEggStatus(self.status)


class EasterEggRedemption(BaseModel):
    """彩蛋兑换记录（审计流水）"""
    __tablename__ = "easter_egg_redemptions"

    code_id = Column(Integer, ForeignKey("easter_egg_codes.id", ondelete="CASCADE"), nullable=False, comment="兑换码ID")
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, comment="用户ID")
    reward_type = Column(String(32), nullable=False, comment="奖励类型")
    reward_value = Column(JSON, nullable=False, comment="奖励值")
    ip_address = Column(String(45), nullable=True, comment="兑换时IP")
    user_agent = Column(String(500), nullable=True, comment="User Agent")

    # 关系
    code = relationship("EasterEggCode", backref="redemptions")
    user = relationship("User", backref="easter_egg_redemptions")
