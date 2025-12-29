"""
媒体文件访问
"""
from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.services.media_service import MEDIA_CATEGORIES, _build_storage_path

router = APIRouter()


@router.get("/{category}/{filename}", summary="获取媒体文件")
async def get_media_file(category: str, filename: str):
    """获取媒体文件"""
    if category not in MEDIA_CATEGORIES:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文件不存在")
    path = _build_storage_path(category, filename)
    if not Path(path).exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="文件不存在")
    return FileResponse(path)
