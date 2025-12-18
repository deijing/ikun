"""
系统操作日志模型
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class SystemLog(BaseModel):
    """系统操作日志"""
    __tablename__ = "system_logs"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(50), nullable=False, comment="操作类型")
    description = Column(Text, nullable=True, comment="操作描述")
    ip_address = Column(String(50), nullable=True, comment="IP地址")
    user_agent = Column(String(500), nullable=True, comment="用户代理")
    extra_data = Column(Text, nullable=True, comment="额外数据(JSON)")

    # 关系
    user = relationship("User", backref="system_logs")

    __table_args__ = (
        Index("idx_action", "action"),
        Index("idx_created_at", "created_at"),
    )


# 操作类型常量
class LogAction:
    LOGIN = "LOGIN"
    LOGOUT = "LOGOUT"
    REGISTER = "REGISTER"
    SIGNIN = "SIGNIN"
    LOTTERY = "LOTTERY"
    BET = "BET"
    SUBMIT = "SUBMIT"
    VOTE = "VOTE"
    ADMIN = "ADMIN"
    CHEER = "CHEER"
    CLAIM_ACHIEVEMENT = "CLAIM_ACHIEVEMENT"
