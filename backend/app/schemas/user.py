"""
用户相关 Pydantic Schemas
"""
from datetime import datetime
from typing import Optional
import re

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class UserPublicResponse(BaseModel):
    """公开用户信息"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str


class UserResponse(UserPublicResponse):
    """用户完整信息"""
    email: Optional[str] = None
    original_role: Optional[str] = None
    role_selected: bool = False
    role_selected_at: Optional[datetime] = None
    is_active: bool
    linux_do_id: Optional[str] = None
    linux_do_username: Optional[str] = None
    github_id: Optional[str] = None
    github_username: Optional[str] = None
    trust_level: Optional[int] = None
    is_silenced: bool = False
    has_password: bool = False


class UserUpdateRequest(BaseModel):
    """更新用户请求"""
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    email: Optional[EmailStr] = None
    display_name: Optional[str] = Field(None, max_length=100)

    @field_validator("username")
    @classmethod
    def validate_username(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if not value:
            raise ValueError("用户名不能为空")
        if re.search(r"\s", value):
            raise ValueError("用户名不能包含空白字符")
        return value

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        return value or None
