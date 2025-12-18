"""
认证相关 API
"""
import base64
import json
from secrets import token_urlsafe
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import create_access_token
from app.models.user import User
from app.services.linux_do_oauth import (
    LinuxDoOAuthError,
    exchange_code_for_token,
    fetch_linuxdo_userinfo,
    normalize_avatar_url,
)
from app.services.github_oauth import (
    GitHubOAuthError,
    exchange_code_for_token as github_exchange_code,
    fetch_github_userinfo,
    fetch_github_emails,
    get_primary_email,
)

router = APIRouter()


def _b64url_json(data: dict) -> str:
    """将字典编码为 base64url JSON"""
    raw = json.dumps(data, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8").rstrip("=")


async def _generate_unique_username(
    db: AsyncSession,
    base_username: str,
    linux_do_id: str,
    max_len: int = 50,
) -> str:
    """
    生成唯一用户名

    如果 base_username 已被占用，则添加 linux_do_id 后缀
    """
    base_username = (base_username or "").strip()
    if not base_username:
        base_username = f"linuxdo_{linux_do_id}"

    candidate = base_username[:max_len]
    result = await db.execute(select(User).where(User.username == candidate))
    existing = result.scalar_one_or_none()

    if existing is None or existing.linux_do_id == linux_do_id:
        return candidate

    # 用户名已被占用，添加后缀
    suffix = f"_{linux_do_id}"
    candidate = (base_username[: max_len - len(suffix)] + suffix)[:max_len]
    return candidate


async def _upsert_linuxdo_user(db: AsyncSession, userinfo: dict) -> User:
    """
    创建或更新 Linux.do 用户

    Args:
        db: 数据库会话
        userinfo: Linux.do 返回的用户信息

    Returns:
        用户对象
    """
    linux_do_id = str(userinfo.get("id"))
    if not linux_do_id or linux_do_id == "None":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Linux.do 用户信息缺少 id",
        )

    # 查找现有用户
    result = await db.execute(select(User).where(User.linux_do_id == linux_do_id))
    user = result.scalar_one_or_none()

    # 解析用户信息
    linux_username = (userinfo.get("username") or "").strip()
    display_name = (userinfo.get("name") or "").strip() or None
    avatar_template = userinfo.get("avatar_template") or None
    avatar_url = normalize_avatar_url(avatar_template)
    active = bool(userinfo.get("active", True))
    trust_level = userinfo.get("trust_level")
    silenced = bool(userinfo.get("silenced", False))

    if user is None:
        # 创建新用户
        username = await _generate_unique_username(db, linux_username, linux_do_id)
        user = User(
            email=None,
            username=username,
            hashed_password=None,
            linux_do_id=linux_do_id,
            linux_do_username=linux_username or None,
            display_name=display_name,
            linux_do_avatar_template=avatar_template,
            avatar_url=avatar_url,
            is_active=active,
            trust_level=int(trust_level) if trust_level is not None else None,
            is_silenced=silenced,
        )
        db.add(user)
    else:
        # 更新现有用户
        user.linux_do_username = linux_username or user.linux_do_username
        user.display_name = display_name or user.display_name
        user.linux_do_avatar_template = avatar_template or user.linux_do_avatar_template
        user.avatar_url = avatar_url or user.avatar_url
        user.is_active = active
        user.trust_level = int(trust_level) if trust_level is not None else user.trust_level
        user.is_silenced = silenced

        # 如果 Linux.do 用户名变更，同步更新
        if linux_username and user.username != linux_username:
            user.username = await _generate_unique_username(db, linux_username, linux_do_id)

    await db.commit()
    await db.refresh(user)
    return user


async def _generate_unique_username_for_github(
    db: AsyncSession,
    base_username: str,
    github_id: str,
    max_len: int = 50,
) -> str:
    """
    为 GitHub 用户生成唯一用户名

    如果 base_username 已被占用，则添加 github_id 后缀
    """
    base_username = (base_username or "").strip()
    if not base_username:
        base_username = f"github_{github_id}"

    candidate = base_username[:max_len]
    result = await db.execute(select(User).where(User.username == candidate))
    existing = result.scalar_one_or_none()

    if existing is None or existing.github_id == github_id:
        return candidate

    # 用户名已被占用，添加后缀
    suffix = f"_{github_id}"
    candidate = (base_username[: max_len - len(suffix)] + suffix)[:max_len]
    return candidate


async def _upsert_github_user(db: AsyncSession, userinfo: dict, email: Optional[str] = None) -> User:
    """
    创建或更新 GitHub 用户

    Args:
        db: 数据库会话
        userinfo: GitHub 返回的用户信息
        email: 用户主邮箱

    Returns:
        用户对象
    """
    github_id = str(userinfo.get("id"))
    if not github_id or github_id == "None":
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="GitHub 用户信息缺少 id",
        )

    # 查找现有用户（优先通过 github_id 查找）
    result = await db.execute(select(User).where(User.github_id == github_id))
    user = result.scalar_one_or_none()

    # 解析用户信息
    github_username = (userinfo.get("login") or "").strip()
    display_name = (userinfo.get("name") or "").strip() or None
    avatar_url = userinfo.get("avatar_url") or None
    github_email = email or userinfo.get("email")

    if user is None:
        # 创建新用户
        username = await _generate_unique_username_for_github(db, github_username, github_id)
        user = User(
            email=github_email,
            username=username,
            hashed_password=None,
            github_id=github_id,
            github_username=github_username or None,
            github_avatar_url=avatar_url,
            github_email=github_email,
            display_name=display_name,
            avatar_url=avatar_url,
            is_active=True,
        )
        db.add(user)
    else:
        # 更新现有用户
        user.github_username = github_username or user.github_username
        user.github_avatar_url = avatar_url or user.github_avatar_url
        user.github_email = github_email or user.github_email
        user.display_name = display_name or user.display_name
        user.avatar_url = avatar_url or user.avatar_url

        # 如果 GitHub 用户名变更，同步更新
        if github_username and user.username != github_username:
            user.username = await _generate_unique_username_for_github(db, github_username, github_id)

    await db.commit()
    await db.refresh(user)
    return user


@router.post("/register")
async def register():
    """用户注册"""
    # TODO: 实现本地注册逻辑
    return {"message": "注册接口"}


@router.post("/login")
async def login():
    """用户登录"""
    # TODO: 实现本地登录逻辑
    return {"message": "登录接口"}


@router.post("/refresh")
async def refresh_token():
    """刷新 Token"""
    # TODO: 实现 Token 刷新
    return {"message": "Token 刷新接口"}


@router.get("/linuxdo/login")
async def linuxdo_login(request: Request, next: Optional[str] = None):
    """
    跳转到 Linux.do 授权页

    Args:
        next: 登录成功后跳转的路径
    """
    if not settings.LINUX_DO_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINUX_DO_CLIENT_ID 未配置",
        )
    if not settings.LINUX_DO_REDIRECT_URI:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINUX_DO_REDIRECT_URI 未配置",
        )

    # 生成 state 防止 CSRF
    state = token_urlsafe(32)

    params = {
        "response_type": "code",
        "client_id": settings.LINUX_DO_CLIENT_ID,
        "redirect_uri": settings.LINUX_DO_REDIRECT_URI,
        "state": state,
        "scope": settings.LINUX_DO_SCOPE,
    }
    url = f"{settings.LINUX_DO_AUTHORIZE_URL}?{urlencode(params)}"

    resp = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)

    # 存储 state 到 cookie 用于后续验证
    # 生产环境必须使用 secure=True，开发环境允许 HTTP
    is_secure = not settings.DEBUG
    resp.set_cookie(
        "linuxdo_oauth_state",
        state,
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )

    # 存储 next 路径
    if next:
        resp.set_cookie(
            "linuxdo_oauth_next",
            next,
            httponly=True,
            samesite="none" if settings.DEBUG else "lax",
            secure=is_secure,
            max_age=600,
        )

    return resp


@router.get("/linuxdo/callback")
async def linuxdo_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Linux.do OAuth2 回调

    处理流程：
    1. 验证 state 防止 CSRF
    2. 用授权码换取 access_token
    3. 获取用户信息
    4. 创建/更新本地用户
    5. 签发本系统 JWT
    6. 重定向到前端
    """
    # 验证 state（开发环境下允许跳过，因为 cookie 在跨站跳转时可能丢失）
    cookie_state = request.cookies.get("linuxdo_oauth_state")
    if not settings.DEBUG:
        if not cookie_state or state != cookie_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state 校验失败",
            )
    elif cookie_state and state != cookie_state:
        # 开发环境：state 不匹配时只记录警告，不阻止
        import logging
        logging.warning(f"OAuth state mismatch: cookie={cookie_state}, param={state}")

    try:
        # 换取 access_token
        access_token = await exchange_code_for_token(code=code)

        # 获取用户信息
        userinfo = await fetch_linuxdo_userinfo(access_token=access_token)
    except LinuxDoOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    # 创建/更新用户
    user = await _upsert_linuxdo_user(db, userinfo)

    # 记录登录日志
    from app.services.log_service import log_login
    await log_login(db, user.id, request=request, success=True)
    await db.commit()

    # 签发 JWT（包含用户名和 Linux.do ID，用于日志记录）
    jwt_token = create_access_token({
        "sub": str(user.id),
        "provider": "linuxdo",
        "username": user.username,
        "linux_do_id": user.linux_do_id,
    })

    # 构建重定向 URL
    next_path = request.cookies.get("linuxdo_oauth_next") or ""
    frontend = settings.FRONTEND_URL.rstrip("/")
    redirect_to = f"{frontend}/login#token={jwt_token}"

    if next_path:
        redirect_to += f"&next={next_path}"

    # 附加用户信息（base64 编码）
    redirect_to += "&user=" + _b64url_json({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "role": user.role,  # admin / contestant / spectator
        "linux_do_id": user.linux_do_id,
        "trust_level": user.trust_level,
        "is_silenced": user.is_silenced,
    })

    resp = RedirectResponse(url=redirect_to, status_code=status.HTTP_302_FOUND)

    # 清除 OAuth cookie
    resp.delete_cookie("linuxdo_oauth_state")
    resp.delete_cookie("linuxdo_oauth_next")

    return resp


# ==================== GitHub OAuth2 ====================

@router.get("/github/login")
async def github_login(request: Request, next: Optional[str] = None):
    """
    跳转到 GitHub 授权页

    Args:
        next: 登录成功后跳转的路径
    """
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID 未配置",
        )

    # 生成 state 防止 CSRF
    state = token_urlsafe(32)

    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": settings.GITHUB_REDIRECT_URI,
        "state": state,
        "scope": settings.GITHUB_SCOPE,
    }
    url = f"{settings.GITHUB_AUTHORIZE_URL}?{urlencode(params)}"

    resp = RedirectResponse(url=url, status_code=status.HTTP_302_FOUND)

    # 存储 state 到 cookie 用于后续验证
    # 生产环境必须使用 secure=True
    is_secure = not settings.DEBUG
    resp.set_cookie(
        "github_oauth_state",
        state,
        httponly=True,
        samesite="none" if settings.DEBUG else "lax",
        secure=is_secure,
        max_age=600,
    )

    # 存储 next 路径
    if next:
        resp.set_cookie(
            "github_oauth_next",
            next,
            httponly=True,
            samesite="none" if settings.DEBUG else "lax",
            secure=is_secure,
            max_age=600,
        )

    return resp


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str,
    state: str,
    db: AsyncSession = Depends(get_db),
):
    """
    GitHub OAuth2 回调

    处理流程：
    1. 验证 state 防止 CSRF
    2. 用授权码换取 access_token
    3. 获取用户信息和邮箱
    4. 创建/更新本地用户
    5. 签发本系统 JWT
    6. 重定向到前端
    """
    # 验证 state
    cookie_state = request.cookies.get("github_oauth_state")
    if not settings.DEBUG:
        if not cookie_state or state != cookie_state:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OAuth state 校验失败",
            )
    elif cookie_state and state != cookie_state:
        import logging
        logging.warning(f"GitHub OAuth state mismatch: cookie={cookie_state}, param={state}")

    try:
        # 换取 access_token
        access_token = await github_exchange_code(code=code)

        # 获取用户信息
        userinfo = await fetch_github_userinfo(access_token=access_token)

        # 获取用户邮箱
        emails = await fetch_github_emails(access_token=access_token)
        primary_email = get_primary_email(emails)
    except GitHubOAuthError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(e),
        )

    # 创建/更新用户
    user = await _upsert_github_user(db, userinfo, primary_email)

    # 记录登录日志
    from app.services.log_service import log_login
    await log_login(db, user.id, request=request, success=True)
    await db.commit()

    # 签发 JWT（包含用户名，用于日志记录）
    jwt_token = create_access_token({
        "sub": str(user.id),
        "provider": "github",
        "username": user.username,
    })

    # 构建重定向 URL
    next_path = request.cookies.get("github_oauth_next") or ""
    frontend = settings.FRONTEND_URL.rstrip("/")
    redirect_to = f"{frontend}/login#token={jwt_token}"

    if next_path:
        redirect_to += f"&next={next_path}"

    # 附加用户信息（base64 编码）
    redirect_to += "&user=" + _b64url_json({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "role": user.role,
        "email": user.email or user.github_email,
        "github_id": user.github_id,
        "github_username": user.github_username,
    })

    resp = RedirectResponse(url=redirect_to, status_code=status.HTTP_302_FOUND)

    # 清除 OAuth cookie
    resp.delete_cookie("github_oauth_state")
    resp.delete_cookie("github_oauth_next")

    return resp
