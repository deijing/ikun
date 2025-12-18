"""
API 请求日志模型
"""
from datetime import datetime
from sqlalchemy import Column, BigInteger, Integer, String, Text, DateTime, Index

from app.models.base import Base


class RequestLog(Base):
    """
    API 请求日志

    不继承 BaseModel，因为请求日志不需要 updated_at 字段
    """
    __tablename__ = "request_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)

    # 请求基本信息
    method = Column(String(10), nullable=False, comment="HTTP 方法")
    path = Column(String(500), nullable=False, comment="请求路径")
    query_params = Column(Text, nullable=True, comment="查询参数 (JSON)")

    # 用户信息
    user_id = Column(Integer, nullable=True, index=True, comment="用户ID")
    username = Column(String(50), nullable=True, comment="用户名")

    # 请求详情
    ip_address = Column(String(50), nullable=True, comment="客户端IP")
    user_agent = Column(String(500), nullable=True, comment="用户代理")

    # 响应信息
    status_code = Column(Integer, nullable=False, comment="HTTP 响应状态码")
    response_time_ms = Column(Integer, nullable=False, comment="响应时间(毫秒)")

    # 错误信息
    error_message = Column(Text, nullable=True, comment="错误信息")

    # 时间戳 - 只需要 created_at
    created_at = Column(DateTime, default=datetime.utcnow, comment="请求时间")

    __table_args__ = (
        Index("idx_method", "method"),
        Index("idx_path", "path", mysql_length=100),
        Index("idx_status_code", "status_code"),
        Index("idx_ip_address", "ip_address"),
        Index("idx_time_status", "created_at", "status_code"),
        Index("idx_user_time", "user_id", "created_at"),
    )
