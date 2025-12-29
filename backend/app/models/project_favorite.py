"""
作品收藏模型
"""
from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProjectFavorite(BaseModel):
    """作品收藏表"""
    __tablename__ = "project_favorites"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_favorite"),
        Index("ix_project_favorites_project", "project_id"),
        Index("ix_project_favorites_user", "user_id"),
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
        comment="收藏用户ID",
    )

    project = relationship("Project", backref="favorite_records")
    user = relationship("User", backref="project_favorites")
