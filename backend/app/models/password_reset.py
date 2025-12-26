"""
密码重置令牌模型
"""
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from app.models.base import BaseModel


class PasswordResetToken(BaseModel):
    """密码重置令牌"""
    __tablename__ = "password_reset_tokens"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String(64), nullable=False, unique=True, comment="重置令牌哈希")
    expires_at = Column(DateTime, nullable=False, comment="过期时间")
    used_at = Column(DateTime, nullable=True, comment="使用时间")
    requested_ip = Column(String(50), nullable=True, comment="请求IP")
