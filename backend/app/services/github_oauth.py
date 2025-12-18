"""
GitHub OAuth2 服务
"""
from typing import Any, Dict, List, Optional

import httpx

from app.core.config import settings


class GitHubOAuthError(RuntimeError):
    """GitHub OAuth2 错误"""
    pass


async def exchange_code_for_token(code: str) -> str:
    """
    用授权码换取 access_token

    Args:
        code: OAuth2 授权码

    Returns:
        access_token

    Raises:
        GitHubOAuthError: 换取失败时抛出
    """
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise GitHubOAuthError(
            "GitHub OAuth2 Client 未配置（GITHUB_CLIENT_ID/GITHUB_CLIENT_SECRET）"
        )

    payload = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "client_secret": settings.GITHUB_CLIENT_SECRET,
        "code": code,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.post(
            settings.GITHUB_TOKEN_URL,
            data=payload,
            headers={"Accept": "application/json"},
        )

    if resp.status_code >= 400:
        raise GitHubOAuthError(
            f"Token 交换失败：HTTP {resp.status_code} {resp.text}"
        )

    data = resp.json()

    # GitHub 返回错误时也是 200，需要检查 error 字段
    if "error" in data:
        raise GitHubOAuthError(
            f"Token 交换失败：{data.get('error_description', data.get('error'))}"
        )

    access_token = data.get("access_token")
    if not access_token:
        raise GitHubOAuthError(f"Token 响应缺少 access_token：{data}")

    return access_token


async def fetch_github_userinfo(access_token: str) -> Dict[str, Any]:
    """
    获取 GitHub 用户信息

    Args:
        access_token: OAuth2 access_token

    Returns:
        用户信息字典，包含 id/login/name/avatar_url/email 等字段

    Raises:
        GitHubOAuthError: 获取失败时抛出
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            settings.GITHUB_USERINFO_URL,
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    if resp.status_code >= 400:
        raise GitHubOAuthError(
            f"获取用户信息失败：HTTP {resp.status_code} {resp.text}"
        )

    data = resp.json()
    if not isinstance(data, dict):
        raise GitHubOAuthError(f"用户信息响应格式不正确：{data}")

    return data


async def fetch_github_emails(access_token: str) -> List[Dict[str, Any]]:
    """
    获取 GitHub 用户邮箱列表

    Args:
        access_token: OAuth2 access_token

    Returns:
        邮箱列表，每个元素包含 email/primary/verified 字段

    Raises:
        GitHubOAuthError: 获取失败时抛出
    """
    async with httpx.AsyncClient(timeout=15.0) as client:
        resp = await client.get(
            "https://api.github.com/user/emails",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    if resp.status_code >= 400:
        # 邮箱获取失败不是致命错误，返回空列表
        return []

    data = resp.json()
    if not isinstance(data, list):
        return []

    return data


def get_primary_email(emails: List[Dict[str, Any]]) -> Optional[str]:
    """
    从邮箱列表中获取主邮箱

    Args:
        emails: fetch_github_emails 返回的邮箱列表

    Returns:
        主邮箱地址，如果没有则返回第一个已验证的邮箱
    """
    if not emails:
        return None

    # 优先返回主邮箱
    for email in emails:
        if email.get("primary") and email.get("verified"):
            return email.get("email")

    # 其次返回任意已验证的邮箱
    for email in emails:
        if email.get("verified"):
            return email.get("email")

    # 最后返回第一个邮箱
    return emails[0].get("email") if emails else None
