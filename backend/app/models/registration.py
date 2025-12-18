"""
报名模型

用于存储用户参赛报名信息，包含项目介绍、计划、技术栈和联系方式。
每个用户在每个比赛中只能有一条报名记录。
"""
from datetime import datetime
import enum

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    Enum as SQLEnum,
    JSON,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class RegistrationStatus(str, enum.Enum):
    """报名状态枚举"""
    DRAFT = "draft"          # 草稿（未提交）
    SUBMITTED = "submitted"  # 已提交（待审核）
    APPROVED = "approved"    # 已通过审核
    REJECTED = "rejected"    # 已拒绝
    WITHDRAWN = "withdrawn"  # 已撤回


class Registration(BaseModel):
    """
    报名表

    存储用户参赛报名的所有信息，包括项目详情、技术栈和联系方式。
    通过 (contest_id, user_id) 唯一约束确保每人每赛只能报名一次。
    """
    __tablename__ = "registrations"

    # 关联字段
    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False, comment="关联比赛ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="关联用户ID")

    # 项目信息
    title = Column(String(200), nullable=False, comment="项目名称")
    summary = Column(String(500), nullable=False, comment="一句话简介")
    description = Column(Text, nullable=False, comment="项目详细介绍")
    plan = Column(Text, nullable=False, comment="实现计划/里程碑")
    tech_stack = Column(JSON, nullable=False, comment="技术栈（JSON格式）")
    repo_url = Column(String(500), nullable=True, comment="GitHub 仓库地址")
    api_key = Column(String(255), nullable=True, comment="API Key（用于额度消耗排行榜）")

    # 联系方式
    contact_email = Column(String(255), nullable=False, comment="联系邮箱")
    contact_wechat = Column(String(100), nullable=True, comment="微信号（可选）")
    contact_phone = Column(String(30), nullable=True, comment="手机号（可选）")

    # 状态管理
    status = Column(
        SQLEnum('draft', 'submitted', 'approved', 'rejected', 'withdrawn', name='registrationstatus'),
        default='submitted',
        nullable=False,
        comment="报名状态"
    )
    submitted_at = Column(DateTime, nullable=True, comment="提交时间")

    # 表级约束和索引
    __table_args__ = (
        UniqueConstraint("contest_id", "user_id", name="uq_registration_contest_user"),
        Index("ix_registration_contest_status", "contest_id", "status"),
        Index("ix_registration_user", "user_id"),
    )

    # ORM 关系
    user = relationship("User", backref="registrations")
    contest = relationship("Contest", backref="registrations")

    def __repr__(self):
        return f"<Registration(id={self.id}, user_id={self.user_id}, contest_id={self.contest_id}, status={self.status})>"
