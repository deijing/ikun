"""
作品评审分配模型
"""
from sqlalchemy import Column, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class ProjectReviewAssignment(BaseModel):
    """作品评审分配表"""
    __tablename__ = "project_review_assignments"
    __table_args__ = (
        UniqueConstraint("project_id", "reviewer_id", name="uk_project_review_assignment"),
    )

    project_id = Column(Integer, ForeignKey("projects.id"), nullable=False, comment="关联作品ID")
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="评审员用户ID")

    project = relationship("Project", backref="review_assignments")
    reviewer = relationship("User", foreign_keys=[reviewer_id])
