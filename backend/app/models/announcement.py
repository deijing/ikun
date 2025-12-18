"""
公告模型
"""
from enum import Enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from app.models.base import BaseModel


class AnnouncementType(str, Enum):
    """公告类型"""
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"


class Announcement(BaseModel):
    """公告模型"""
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, autoincrement=True)
    title = Column(String(200), nullable=False, comment="公告标题")
    content = Column(Text, nullable=False, comment="公告内容")
    type = Column(
        SQLEnum('info', 'warning', 'success', 'error', name='announcement_type_enum'),
        nullable=False,
        default='info',
        comment="公告类型"
    )
    is_pinned = Column(Boolean, nullable=False, default=False, comment="是否置顶")
    is_active = Column(Boolean, nullable=False, default=True, comment="是否启用")
    author_id = Column(Integer, ForeignKey("users.id"), nullable=False, comment="发布者ID")
    view_count = Column(Integer, nullable=False, default=0, comment="查看次数")
    published_at = Column(DateTime, nullable=True, comment="发布时间")
    expires_at = Column(DateTime, nullable=True, comment="过期时间")

    # 关联
    author = relationship("User", backref="announcements")

    def __repr__(self):
        return f"<Announcement {self.id}: {self.title}>"
