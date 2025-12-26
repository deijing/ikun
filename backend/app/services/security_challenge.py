"""
触发式挑战（验证码/JS Challenge/PoW）
"""
from __future__ import annotations

import hashlib
import json
import logging
import secrets
from typing import Any, Optional

from fastapi import HTTPException, Request, status
import httpx

from app.core.config import settings
from app.core.rate_limit import get_client_ip
from app.core.redis import get_redis, close_redis


logger = logging.getLogger(__name__)

CHALLENGE_HEADER_ID = "X-Challenge-Id"
CHALLENGE_HEADER_ANSWER = "X-Challenge-Answer"
CAPTCHA_HEADER = "X-Captcha-Token"


def _challenge_mode() -> str:
    return (settings.SECURITY_CHALLENGE_MODE or "off").strip().lower()


def _challenge_provider() -> str:
    provider = (settings.SECURITY_CHALLENGE_PROVIDER or "pow").strip().lower()
    if provider == "behavior":
        return "captcha"
    return provider


def _is_enabled() -> bool:
    return _challenge_mode() in {"monitor", "enforce"}


def _is_enforce() -> bool:
    return _challenge_mode() == "enforce"


def _build_identifier(request: Request, user_id: Optional[int]) -> str:
    if user_id:
        return f"user:{user_id}"
    return f"ip:{get_client_ip(request)}"


def _counter_key(scope: str, identifier: str) -> str:
    return f"security:challenge:counter:{scope}:{identifier}"


def _pass_key(scope: str, identifier: str) -> str:
    return f"security:challenge:pass:{scope}:{identifier}"


def _challenge_key(challenge_id: str) -> str:
    return f"security:challenge:data:{challenge_id}"


async def _increment_counter(scope: str, identifier: str) -> int:
    client = await get_redis()
    try:
        key = _counter_key(scope, identifier)
        count = await client.incr(key)
        if count == 1:
            await client.expire(key, settings.SECURITY_CHALLENGE_WINDOW_SECONDS)
        return int(count)
    finally:
        await close_redis(client)


async def _mark_passed(scope: str, identifier: str) -> None:
    client = await get_redis()
    try:
        await client.setex(_pass_key(scope, identifier), settings.SECURITY_CHALLENGE_PASS_TTL_SECONDS, "1")
        await client.delete(_counter_key(scope, identifier))
    finally:
        await close_redis(client)


async def _has_passed(scope: str, identifier: str) -> bool:
    client = await get_redis()
    try:
        return bool(await client.get(_pass_key(scope, identifier)))
    finally:
        await close_redis(client)


async def _issue_pow_challenge(scope: str, identifier: str) -> dict[str, Any]:
    challenge_id = secrets.token_urlsafe(16)
    prefix = secrets.token_hex(16)
    difficulty = max(1, int(settings.SECURITY_POW_DIFFICULTY))
    payload = {
        "type": "pow",
        "scope": scope,
        "identifier": identifier,
        "prefix": prefix,
        "difficulty": difficulty,
    }
    client = await get_redis()
    try:
        await client.setex(
            _challenge_key(challenge_id),
            settings.SECURITY_CHALLENGE_TTL_SECONDS,
            json.dumps(payload, ensure_ascii=False),
        )
    finally:
        await close_redis(client)
    return {
        "type": "pow",
        "challenge_id": challenge_id,
        "expires_in": settings.SECURITY_CHALLENGE_TTL_SECONDS,
        "prefix": prefix,
        "difficulty": difficulty,
    }


async def _issue_js_challenge(scope: str, identifier: str) -> dict[str, Any]:
    # TODO: 接入真实 JS Challenge（此处为占位实现）
    challenge_id = secrets.token_urlsafe(16)
    token = secrets.token_urlsafe(24)
    payload = {
        "type": "js",
        "scope": scope,
        "identifier": identifier,
        "token": token,
    }
    client = await get_redis()
    try:
        await client.setex(
            _challenge_key(challenge_id),
            settings.SECURITY_CHALLENGE_TTL_SECONDS,
            json.dumps(payload, ensure_ascii=False),
        )
    finally:
        await close_redis(client)
    return {
        "type": "js",
        "challenge_id": challenge_id,
        "expires_in": settings.SECURITY_CHALLENGE_TTL_SECONDS,
        "hint": "需在前端完成 JS Challenge 后回传答案",
    }


async def _issue_captcha_challenge(scope: str, identifier: str) -> dict[str, Any]:
    challenge_id = secrets.token_urlsafe(16)
    payload = {
        "type": "captcha",
        "scope": scope,
        "identifier": identifier,
    }
    client = await get_redis()
    try:
        await client.setex(
            _challenge_key(challenge_id),
            settings.SECURITY_CHALLENGE_TTL_SECONDS,
            json.dumps(payload, ensure_ascii=False),
        )
    finally:
        await close_redis(client)
    return {
        "type": "captcha",
        "challenge_id": challenge_id,
        "expires_in": settings.SECURITY_CHALLENGE_TTL_SECONDS,
        "site_key": settings.CAPTCHA_SITE_KEY,
    }


async def _issue_challenge(scope: str, identifier: str) -> dict[str, Any]:
    provider = _challenge_provider()
    if provider == "captcha":
        return await _issue_captcha_challenge(scope, identifier)
    if provider == "js":
        return await _issue_js_challenge(scope, identifier)
    return await _issue_pow_challenge(scope, identifier)


async def _load_challenge(challenge_id: str) -> Optional[dict[str, Any]]:
    if not challenge_id:
        return None
    client = await get_redis()
    try:
        raw = await client.get(_challenge_key(challenge_id))
        if not raw:
            return None
        return json.loads(raw)
    finally:
        await close_redis(client)


async def _consume_challenge(challenge_id: str) -> None:
    if not challenge_id:
        return
    client = await get_redis()
    try:
        await client.delete(_challenge_key(challenge_id))
    finally:
        await close_redis(client)


async def _verify_pow(challenge: dict[str, Any], answer: str) -> bool:
    prefix = challenge.get("prefix") or ""
    difficulty = int(challenge.get("difficulty") or 0)
    if not prefix or not answer or difficulty <= 0:
        return False
    digest = hashlib.sha256(f"{prefix}{answer}".encode("utf-8")).hexdigest()
    return digest.startswith("0" * difficulty)


async def _verify_js(challenge: dict[str, Any], answer: str) -> bool:
    expected = challenge.get("token") or ""
    return bool(expected and answer and answer == expected)


async def _verify_captcha(request: Request) -> bool:
    token = request.headers.get(CAPTCHA_HEADER, "")
    if not token:
        return False
    if not settings.CAPTCHA_VERIFY_URL or not settings.CAPTCHA_SECRET_KEY:
        logger.warning("验证码未配置，无法校验")
        return False
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(
                settings.CAPTCHA_VERIFY_URL,
                data={
                    "secret": settings.CAPTCHA_SECRET_KEY,
                    "response": token,
                    "remoteip": get_client_ip(request),
                },
            )
        data = resp.json() if resp.status_code == 200 else {}
        return bool(data.get("success"))
    except Exception as exc:
        logger.warning("验证码校验失败: %s", exc)
        return False


async def _verify_challenge(
    request: Request,
    scope: str,
    identifier: str,
) -> bool:
    provider = _challenge_provider()
    if provider == "captcha":
        return await _verify_captcha(request)

    challenge_id = request.headers.get(CHALLENGE_HEADER_ID, "")
    answer = request.headers.get(CHALLENGE_HEADER_ANSWER, "")
    challenge = await _load_challenge(challenge_id)
    if not challenge:
        return False
    if challenge.get("scope") != scope or challenge.get("identifier") != identifier:
        return False

    if provider == "js":
        ok = await _verify_js(challenge, answer)
    else:
        ok = await _verify_pow(challenge, answer)

    if ok:
        await _consume_challenge(challenge_id)
    return ok


async def guard_challenge(request: Request, scope: str, user_id: Optional[int] = None) -> None:
    """触发式挑战入口（按需调用）。"""
    if not _is_enabled():
        return

    identifier = _build_identifier(request, user_id)
    try:
        if await _has_passed(scope, identifier):
            return
        count = await _increment_counter(scope, identifier)
        if count < settings.SECURITY_CHALLENGE_THRESHOLD:
            return
        if not _is_enforce():
            logger.warning("挑战触发（监控模式）: scope=%s, id=%s", scope, identifier)
            return
        if await _verify_challenge(request, scope, identifier):
            await _mark_passed(scope, identifier)
            return
        challenge = await _issue_challenge(scope, identifier)
    except HTTPException:
        raise
    except Exception as exc:
        logger.warning("挑战机制异常: %s", exc)
        return

    raise HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail={
            "code": "challenge_required",
            "scope": scope,
            **challenge,
        },
    )
