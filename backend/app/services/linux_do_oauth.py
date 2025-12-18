"""
Linux.do OAuth2 服务
"""
from typing import Any, Dict, Optional

import httpx

from app.core.config import settings


class LinuxDoOAuthError(RuntimeError):
    """Linux.do OAuth2 错误"""
    pass


def normalize_avatar_url(avatar_template: Optional[str], size: int = 120) -> Optional[str]:
    """
    将 avatar_template 转换为完整的头像 URL

    Args:
        avatar_template: Linux.do 返回的头像模板，如 "/user_avatar/linux.do/xxx/{size}/xxx.png"
        size: 头像尺寸，默认 120

    Returns:
        完整的头像 URL
    """
    if not avatar_template:
        return None

    url = avatar_template.replace("{size}", str(size))

    if url.startswith("//"):
        return "https:" + url
    if url.startswith("/"):
        return "https://linux.do" + url
    return url


async def exchange_code_for_token(code: str) -> str:
    """
    用授权码换取 access_token

    Args:
        code: OAuth2 授权码

    Returns:
        access_token

    Raises:
        LinuxDoOAuthError: 换取失败时抛出
    """
    if not settings.LINUX_DO_CLIENT_ID or not settings.LINUX_DO_CLIENT_SECRET:
        raise LinuxDoOAuthError(
            "Linux.do OAuth2 Client 未配置（LINUX_DO_CLIENT_ID/LINUX_DO_CLIENT_SECRET）"
        )
    if not settings.LINUX_DO_REDIRECT_URI:
        raise LinuxDoOAuthError(
            "Linux.do OAuth2 回调未配置（LINUX_DO_REDIRECT_URI）"
        )

    # 使用 HTTP Basic Auth 传递 client credentials（OAuth2 标准方式）
    payload = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": settings.LINUX_DO_REDIRECT_URI,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            settings.LINUX_DO_TOKEN_URL,
            data=payload,
            headers={"Accept": "application/json"},
            auth=(settings.LINUX_DO_CLIENT_ID, settings.LINUX_DO_CLIENT_SECRET),
        )

    if resp.status_code >= 400:
        raise LinuxDoOAuthError(
            f"Token 交换失败：HTTP {resp.status_code} {resp.text}"
        )

    data = resp.json()
    access_token = data.get("access_token")
    if not access_token:
        raise LinuxDoOAuthError(f"Token 响应缺少 access_token：{data}")

    return access_token


async def fetch_linuxdo_userinfo(access_token: str) -> Dict[str, Any]:
    """
    获取 Linux.do 用户信息

    Args:
        access_token: OAuth2 access_token

    Returns:
        用户信息字典，包含 id/username/name/avatar_template/active/trust_level/silenced 等字段

    Raises:
        LinuxDoOAuthError: 获取失败时抛出
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            settings.LINUX_DO_USERINFO_URL,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {access_token}",
            },
        )

    if resp.status_code >= 400:
        raise LinuxDoOAuthError(
            f"获取用户信息失败：HTTP {resp.status_code} {resp.text}"
        )

    data = resp.json()
    if not isinstance(data, dict):
        raise LinuxDoOAuthError(f"用户信息响应格式不正确：{data}")

    return data
