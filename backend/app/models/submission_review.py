"""
作品评分模型

评审员对参赛作品的评分记录，支持多评审员评分，
最终成绩采用去掉最高分和最低分后取平均的计算方式。
"""
from sqlalchemy import Column, Integer, String, ForeignKey, SmallInteger, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SubmissionReview(BaseModel):
    """评审员评分表"""
    __tablename__ = "submission_reviews"

    # 确保每个评审员对每个作品只能有一条评分记录
    __table_args__ = (
        UniqueConstraint('submission_id', 'reviewer_id', name='uk_submission_reviewer'),
    )

    submission_id = Column(
        Integer,
        ForeignKey("submissions.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False,
        index=True,
        comment="作品ID"
    )
    reviewer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
        index=True,
        comment="评审员用户ID"
    )
    score = Column(
        SmallInteger,
        nullable=False,
        comment="评分(1-100)"
    )
    comment = Column(
        String(2000),
        nullable=True,
        comment="评审意见(可选)"
    )

    # 关系
    submission = relationship("Submission", back_populates="reviews")
    reviewer = relationship("User", foreign_keys=[reviewer_id])

    def __repr__(self):
        return f"<SubmissionReview(id={self.id}, submission_id={self.submission_id}, reviewer_id={self.reviewer_id}, score={self.score})>"
