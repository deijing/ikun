"""
作品模型
"""
from typing import TYPE_CHECKING

from sqlalchemy import Column, Enum as SQLEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.contest import Contest
    from app.models.user import User
    from app.models.project_submission import ProjectSubmission


class ProjectStatus(str, enum.Enum):
    """作品状态枚举"""
    DRAFT = "draft"        # 草稿
    SUBMITTED = "submitted"  # 已提交（等待部署）
    ONLINE = "online"      # 已上线
    OFFLINE = "offline"    # 已下线


class Project(BaseModel):
    """作品表"""
    __tablename__ = "projects"

    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False, comment="关联比赛ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="创建者ID")

    title = Column(String(200), nullable=False, comment="作品名称")
    summary = Column(String(500), nullable=True, comment="作品简介")
    description = Column(Text, nullable=True, comment="作品详情")

    repo_url = Column(String(500), nullable=True, comment="开源仓库地址")
    cover_image_url = Column(String(500), nullable=True, comment="封面图")
    screenshot_urls = Column(JSON, nullable=True, comment="截图列表")
    readme_url = Column(String(500), nullable=True, comment="README 链接")
    demo_url = Column(String(500), nullable=True, comment="演示地址")

    status = Column(
        SQLEnum('draft', 'submitted', 'online', 'offline', name='projectstatus'),
        default='draft',
        nullable=False,
        comment="作品状态"
    )
    current_submission_id = Column(Integer, nullable=True, comment="当前线上 submission_id")

    contest = relationship("Contest", backref="projects")
    user = relationship("User", backref="projects")
    submissions = relationship(
        "ProjectSubmission",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="selectin"
    )

    @property
    def status_enum(self) -> ProjectStatus:
        """获取状态枚举值"""
        return ProjectStatus(self.status) if self.status else ProjectStatus.DRAFT
