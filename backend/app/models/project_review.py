"""
作品评审评分模型
"""
from sqlalchemy import Column, ForeignKey, Integer, SmallInteger, String, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProjectReview(BaseModel):
    """作品评审评分表"""
    __tablename__ = "project_reviews"
    __table_args__ = (
        UniqueConstraint("project_id", "reviewer_id", name="uk_project_reviewer"),
    )

    project_id = Column(
        Integer,
        ForeignKey("projects.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        comment="关联作品ID",
    )
    reviewer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        comment="评审员用户ID",
    )
    score = Column(SmallInteger, nullable=False, comment="评分(1-100)")
    comment = Column(String(2000), nullable=True, comment="评审意见(可选)")

    project = relationship("Project", backref="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
