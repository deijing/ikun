"""
媒体文件服务

统一处理图片上传、下载与本地路径解析。
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Optional
from uuid import uuid4

import aiofiles
import httpx
from fastapi import HTTPException, UploadFile, status

from app.core.config import settings
from app.services.upload_quota import commit_upload_quota


MEDIA_CATEGORIES = {
    "avatars": "avatars",
    "contest-banners": "contest-banners",
    "project-covers": "project-covers",
    "project-screenshots": "project-screenshots",
}

IMAGE_CONTENT_TYPES = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/webp": ".webp",
    "image/gif": ".gif",
}

AVATAR_MAX_BYTES = 2 * 1024 * 1024


@dataclass(frozen=True)
class MediaFile:
    url: str
    size_bytes: int
    storage_path: Path


def _media_root() -> Path:
    return Path(settings.MEDIA_ROOT).resolve()


def _media_url_prefix() -> str:
    return f"{settings.API_V1_PREFIX}/media"


def is_local_media_url(url: Optional[str]) -> bool:
    if not url:
        return False
    return url.startswith(_media_url_prefix() + "/")


def ensure_local_media_url(url: Optional[str], field_label: str) -> Optional[str]:
    if not url:
        return None
    if is_local_media_url(url):
        return url
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"{field_label} 必须通过上传获取",
    )


def ensure_local_media_urls(urls: Optional[list[str]], field_label: str) -> Optional[list[str]]:
    if not urls:
        return urls
    cleaned: list[str] = []
    for url in urls:
        normalized = ensure_local_media_url(url, field_label)
        if normalized:
            cleaned.append(normalized)
    return cleaned


def _safe_category(category: str) -> str:
    if category not in MEDIA_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不支持的图片类别")
    return MEDIA_CATEGORIES[category]


def _safe_filename(filename: str) -> str:
    return Path(filename).name


def _build_storage_path(category: str, filename: str) -> Path:
    root = _media_root()
    path = (root / _safe_category(category) / _safe_filename(filename)).resolve()
    if not str(path).startswith(str(root)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="非法文件路径")
    return path


def _build_public_url(category: str, filename: str) -> str:
    return f"{_media_url_prefix()}/{_safe_category(category)}/{_safe_filename(filename)}"


def _resolve_extension(content_type: Optional[str], filename: Optional[str]) -> str:
    if content_type and content_type.lower() in IMAGE_CONTENT_TYPES:
        return IMAGE_CONTENT_TYPES[content_type.lower()]
    if filename:
        ext = Path(filename).suffix.lower()
        if ext in IMAGE_CONTENT_TYPES.values():
            return ext
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="不支持的图片格式")


async def save_upload_file(
    file: UploadFile,
    category: str,
    max_bytes: int,
    owner_id: int | None = None,
    quota_scope: str = "media",
) -> MediaFile:
    extension = _resolve_extension(file.content_type, file.filename)
    filename = f"{uuid4().hex}{extension}"
    dest_path = _build_storage_path(category, filename)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    total_bytes = 0
    try:
        async with aiofiles.open(dest_path, "wb") as out_file:
            while True:
                chunk = await file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > max_bytes:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"图片过大，最大允许 {max_bytes // (1024 * 1024)} MB",
                    )
                await out_file.write(chunk)
    finally:
        await file.close()

    if owner_id:
        try:
            await commit_upload_quota(owner_id, quota_scope, total_bytes)
        except HTTPException:
            try:
                dest_path.unlink()
            except Exception:
                pass
            raise

    return MediaFile(
        url=_build_public_url(category, filename),
        size_bytes=total_bytes,
        storage_path=dest_path,
    )


async def download_image_to_media(
    url: str,
    category: str,
    max_bytes: int,
) -> Optional[MediaFile]:
    if not url:
        return None
    timeout = httpx.Timeout(10.0, read=10.0)
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
        try:
            resp = await client.get(url)
        except httpx.HTTPError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"头像下载失败: {exc}",
            ) from exc

    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"头像下载失败: HTTP {resp.status_code}",
        )

    content_type = resp.headers.get("content-type", "").split(";")[0].strip().lower()
    extension = _resolve_extension(content_type, url)
    filename = f"{uuid4().hex}{extension}"
    dest_path = _build_storage_path(category, filename)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    content = resp.content or b""
    if not content:
        return None
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"头像过大，最大允许 {max_bytes // (1024 * 1024)} MB",
        )

    async with aiofiles.open(dest_path, "wb") as out_file:
        await out_file.write(content)

    return MediaFile(
        url=_build_public_url(category, filename),
        size_bytes=len(content),
        storage_path=dest_path,
    )


def resolve_media_path(url: str) -> Optional[Path]:
    if not is_local_media_url(url):
        return None
    prefix = _media_url_prefix() + "/"
    rel = url[len(prefix):]
    root = _media_root()
    path = (root / rel).resolve()
    if not str(path).startswith(str(root)):
        return None
    return path


def delete_media_file(url: Optional[str]) -> None:
    path = resolve_media_path(url or "")
    if not path or not path.exists():
        return
    try:
        path.unlink()
    except Exception:
        pass
