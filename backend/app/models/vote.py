"""
投票模型
"""
from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class Vote(BaseModel):
    """投票表"""
    __tablename__ = "votes"

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    submission_id = Column(Integer, ForeignKey("submissions.id"), nullable=False)

    # 唯一约束：每个用户只能给每个作品投一票
    __table_args__ = (
        UniqueConstraint("user_id", "submission_id", name="unique_user_submission_vote"),
    )

    # 关系
    user = relationship("User", backref="votes")
    submission = relationship("Submission", backref="votes")
