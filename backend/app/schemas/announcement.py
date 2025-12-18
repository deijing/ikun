"""
公告相关的 Pydantic Schema
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field
from enum import Enum


class AnnouncementType(str, Enum):
    """公告类型"""
    INFO = "info"
    WARNING = "warning"
    SUCCESS = "success"
    ERROR = "error"


class AnnouncementCreate(BaseModel):
    """创建公告请求"""
    title: str = Field(..., min_length=1, max_length=200, description="公告标题")
    content: str = Field(..., min_length=1, description="公告内容")
    type: AnnouncementType = Field(default=AnnouncementType.INFO, description="公告类型")
    is_pinned: bool = Field(default=False, description="是否置顶")
    is_active: bool = Field(default=True, description="是否启用")
    expires_at: Optional[datetime] = Field(default=None, description="过期时间")


class AnnouncementUpdate(BaseModel):
    """更新公告请求"""
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="公告标题")
    content: Optional[str] = Field(None, min_length=1, description="公告内容")
    type: Optional[AnnouncementType] = Field(None, description="公告类型")
    is_pinned: Optional[bool] = Field(None, description="是否置顶")
    is_active: Optional[bool] = Field(None, description="是否启用")
    expires_at: Optional[datetime] = Field(None, description="过期时间")


class AuthorInfo(BaseModel):
    """作者信息"""
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class AnnouncementResponse(BaseModel):
    """公告响应"""
    id: int
    title: str
    content: str
    type: AnnouncementType
    is_pinned: bool
    is_active: bool
    author: AuthorInfo
    view_count: int
    published_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AnnouncementListResponse(BaseModel):
    """公告列表响应"""
    items: List[AnnouncementResponse]
    total: int
