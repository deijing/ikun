"""
作品点赞模型
"""
from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProjectLike(BaseModel):
    """作品点赞表"""
    __tablename__ = "project_likes"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_like"),
        Index("ix_project_likes_project", "project_id"),
        Index("ix_project_likes_user", "user_id"),
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联作品ID",
    )
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        comment="点赞用户ID",
    )

    project = relationship("Project", backref="like_records")
    user = relationship("User", backref="project_likes")
