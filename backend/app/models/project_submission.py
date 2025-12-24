"""
作品部署提交模型
"""
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Column, DateTime, Enum as SQLEnum, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.contest import Contest
    from app.models.user import User


class ProjectSubmissionStatus(str, enum.Enum):
    """提交状态枚举"""
    CREATED = "created"           # 已创建
    QUEUED = "queued"             # 排队中
    PULLING = "pulling"           # 拉取镜像
    DEPLOYING = "deploying"       # 部署中
    HEALTHCHECKING = "healthchecking"  # 健康检查中
    ONLINE = "online"             # 已上线
    FAILED = "failed"             # 失败


class ProjectSubmission(BaseModel):
    """作品部署提交表"""
    __tablename__ = "project_submissions"

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, comment="关联作品ID")
    contest_id = Column(Integer, ForeignKey("contests.id"), nullable=False, comment="关联比赛ID")
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="提交者ID")

    image_ref = Column(String(500), nullable=False, comment="镜像引用（含 digest）")
    image_registry = Column(String(100), nullable=True, comment="镜像仓库域名")
    image_repo = Column(String(300), nullable=True, comment="镜像仓库路径")
    image_digest = Column(String(128), nullable=True, comment="镜像 digest")

    status = Column(
        SQLEnum(
            'created', 'queued', 'pulling', 'deploying', 'healthchecking', 'online', 'failed',
            name='projectsubmissionstatus'
        ),
        default='created',
        nullable=False,
        comment="提交状态"
    )
    status_message = Column(String(500), nullable=True, comment="状态说明")
    error_code = Column(String(100), nullable=True, comment="错误码")
    log = Column(Text, nullable=True, comment="部署日志")
    domain = Column(String(255), nullable=True, comment="访问域名")
    status_history = Column(JSON, nullable=True, comment="状态历史")

    submitted_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="提交时间")
    online_at = Column(DateTime, nullable=True, comment="上线时间")
    failed_at = Column(DateTime, nullable=True, comment="失败时间")

    project = relationship("Project", back_populates="submissions")
    contest = relationship("Contest")
    user = relationship("User")

    @property
    def status_enum(self) -> ProjectSubmissionStatus:
        """获取状态枚举值"""
        return ProjectSubmissionStatus(self.status) if self.status else ProjectSubmissionStatus.CREATED
