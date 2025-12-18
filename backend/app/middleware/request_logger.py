"""
请求日志中间件
记录所有 API 请求的详细信息
"""
import json
import time
import logging
from typing import Optional, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.database import AsyncSessionLocal
from app.core.security import decode_token
from app.models.request_log import RequestLog

logger = logging.getLogger(__name__)

# 不记录日志的路径 (健康检查、静态资源等)
EXCLUDED_PATHS = {
    "/health",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
}

# 不记录日志的路径前缀
EXCLUDED_PREFIXES = (
    "/static/",
    "/_next/",
)


class RequestLoggerMiddleware(BaseHTTPMiddleware):
    """
    请求日志记录中间件

    记录每个 API 请求的：
    - HTTP 方法和路径
    - 用户信息（如果已认证）
    - 客户端 IP 和 User-Agent
    - 响应状态码和耗时
    - 错误信息（如果有）
    """

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # 检查是否需要跳过日志记录
        path = request.url.path
        if self._should_skip(path):
            return await call_next(request)

        # 记录开始时间
        start_time = time.time()

        # 提取用户信息
        user_id, username = await self._extract_user_info(request)

        # 提取客户端信息
        ip_address = self._get_client_ip(request)
        user_agent = request.headers.get("User-Agent", "")[:500]

        # 提取查询参数
        query_params = dict(request.query_params) if request.query_params else None

        # 执行请求
        error_message = None
        status_code = 500  # 默认错误状态

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception as e:
            error_message = str(e)[:1000]
            logger.error(f"Request error: {path} - {e}")
            raise

        # 计算响应时间
        response_time_ms = int((time.time() - start_time) * 1000)

        # 异步写入日志
        try:
            await self._save_log(
                method=request.method,
                path=path,
                query_params=json.dumps(query_params, ensure_ascii=False) if query_params else None,
                user_id=user_id,
                username=username,
                ip_address=ip_address,
                user_agent=user_agent,
                status_code=status_code,
                response_time_ms=response_time_ms,
                error_message=error_message,
            )
        except Exception as e:
            logger.warning(f"Failed to save request log: {e}")

        return response

    def _should_skip(self, path: str) -> bool:
        """判断是否跳过日志记录"""
        if path in EXCLUDED_PATHS:
            return True
        if path.startswith(EXCLUDED_PREFIXES):
            return True
        # 跳过 OpenAPI 相关路径
        if "/openapi.json" in path:
            return True
        return False

    def _get_client_ip(self, request: Request) -> Optional[str]:
        """获取客户端真实 IP"""
        # 优先从代理头获取
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()

        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip

        # 从连接获取
        if request.client:
            return request.client.host

        return None

    async def _extract_user_info(self, request: Request) -> tuple[Optional[int], Optional[str]]:
        """从请求中提取用户信息"""
        user_id = None
        username = None

        # 尝试从 Authorization header 获取 token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_token(token)
            if payload:
                user_id = payload.get("sub")
                if user_id:
                    try:
                        user_id = int(user_id)
                    except (ValueError, TypeError):
                        user_id = None
                username = payload.get("username")

        return user_id, username

    async def _save_log(
        self,
        method: str,
        path: str,
        query_params: Optional[str],
        user_id: Optional[int],
        username: Optional[str],
        ip_address: Optional[str],
        user_agent: Optional[str],
        status_code: int,
        response_time_ms: int,
        error_message: Optional[str],
    ):
        """保存日志到数据库"""
        try:
            async with AsyncSessionLocal() as session:
                log = RequestLog(
                    method=method,
                    path=path,
                    query_params=query_params,
                    user_id=user_id,
                    username=username,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    status_code=status_code,
                    response_time_ms=response_time_ms,
                    error_message=error_message,
                )
                session.add(log)
                await session.commit()
        except Exception as e:
            # 日志记录失败不应影响主请求
            logger.warning(f"Failed to save request log: {e}")
