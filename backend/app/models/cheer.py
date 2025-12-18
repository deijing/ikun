"""
互动模型 - 打气与道具

存储用户对选手的打气和道具赠送记录。
打气功能不参与评奖，纯粹是社区互动功能。
"""
import enum
from sqlalchemy import (
    Column,
    String,
    Integer,
    ForeignKey,
    UniqueConstraint,
    Index,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class CheerType(str, enum.Enum):
    """打气/道具类型"""
    CHEER = "cheer"       # 普通打气 👊
    COFFEE = "coffee"     # 咖啡 ☕
    ENERGY = "energy"     # 能量饮料 ⚡
    PIZZA = "pizza"       # 披萨 🍕
    STAR = "star"         # 星星 ⭐


class Cheer(BaseModel):
    """
    打气记录表

    记录用户对选手的打气和道具赠送。
    每个用户每天可以给每个选手打气一次（按类型区分）。
    """
    __tablename__ = "cheers"

    # 关联字段
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="打气用户ID"
    )
    registration_id = Column(
        Integer,
        ForeignKey("registrations.id", ondelete="CASCADE"),
        nullable=False,
        comment="被打气的报名ID"
    )

    # 打气类型
    cheer_type = Column(
        SQLEnum(CheerType, values_callable=lambda x: [e.value for e in x]),
        default=CheerType.CHEER,
        nullable=False,
        comment="打气类型"
    )

    # 留言（可选）
    message = Column(String(200), nullable=True, comment="打气留言")

    # 表级约束和索引
    __table_args__ = (
        # 同一用户同一天只能给同一选手打气一次（相同类型）
        # 注意：这里用 created_at 的日期部分做唯一约束比较复杂，
        # 实际实现中可以在业务层控制，或者添加 cheer_date 字段
        Index("ix_cheers_user", "user_id"),
        Index("ix_cheers_registration", "registration_id"),
        Index("ix_cheers_created", "created_at"),
    )

    # ORM 关系
    user = relationship("User", backref="cheers_given")
    registration = relationship("Registration", backref="cheers_received")

    def __repr__(self):
        return f"<Cheer(user_id={self.user_id}, registration_id={self.registration_id}, type={self.cheer_type})>"


class CheerStats(BaseModel):
    """
    打气统计表（聚合表）

    按报名ID聚合统计各类型打气数量，避免每次都 COUNT。
    由触发器或定时任务更新。
    """
    __tablename__ = "cheer_stats"

    # 关联字段
    registration_id = Column(
        Integer,
        ForeignKey("registrations.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        comment="关联报名ID"
    )

    # 各类型统计
    cheer_count = Column(Integer, default=0, comment="普通打气数")
    coffee_count = Column(Integer, default=0, comment="咖啡数")
    energy_count = Column(Integer, default=0, comment="能量饮料数")
    pizza_count = Column(Integer, default=0, comment="披萨数")
    star_count = Column(Integer, default=0, comment="星星数")

    # 总计
    total_count = Column(Integer, default=0, comment="总打气数")

    # ORM 关系
    registration = relationship("Registration", backref="cheer_stats_rel")

    def __repr__(self):
        return f"<CheerStats(registration_id={self.registration_id}, total={self.total_count})>"
