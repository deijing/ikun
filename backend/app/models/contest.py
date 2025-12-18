"""
比赛模型
"""
from sqlalchemy import Column, String, Text, DateTime, Enum as SQLEnum
import enum

from app.models.base import BaseModel


class ContestPhase(str, enum.Enum):
    UPCOMING = "upcoming"      # 即将开始
    SIGNUP = "signup"          # 报名中
    SUBMISSION = "submission"  # 提交作品
    VOTING = "voting"          # 投票中
    ENDED = "ended"            # 已结束


class Contest(BaseModel):
    """比赛表"""
    __tablename__ = "contests"

    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    phase = Column(
        SQLEnum(
            'upcoming', 'signup', 'submission', 'voting', 'ended',
            name='contestphase'
        ),
        default='upcoming'
    )
    signup_start = Column(DateTime, nullable=True)
    signup_end = Column(DateTime, nullable=True)
    submit_start = Column(DateTime, nullable=True)
    submit_end = Column(DateTime, nullable=True)
    vote_start = Column(DateTime, nullable=True)
    vote_end = Column(DateTime, nullable=True)

    @property
    def phase_enum(self) -> ContestPhase:
        """获取 phase 的枚举类型"""
        return ContestPhase(self.phase) if self.phase else ContestPhase.UPCOMING
