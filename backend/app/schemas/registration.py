"""
报名相关 Pydantic Schemas

定义报名功能的请求体、响应体和数据验证规则。
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from app.models.registration import RegistrationStatus


class UserPublic(BaseModel):
    """公开用户信息（嵌入报名响应中使用）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str = "spectator"  # admin / contestant / spectator


class TechStackSchema(BaseModel):
    """技术栈结构（可选使用，也可直接用 dict）"""
    frontend: list[str] = Field(default_factory=list, description="前端技术")
    backend: list[str] = Field(default_factory=list, description="后端技术")
    database: list[str] = Field(default_factory=list, description="数据库")
    devops: list[str] = Field(default_factory=list, description="运维/部署")
    other: list[str] = Field(default_factory=list, description="其他技术")


class RegistrationCreate(BaseModel):
    """创建报名请求体"""
    title: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="项目名称",
        examples=["智能聊天助手"]
    )
    summary: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="一句话简介",
        examples=["基于 AI 的智能对话系统，支持多轮对话和上下文理解"]
    )
    description: str = Field(
        ...,
        min_length=50,
        description="项目详细介绍（支持 Markdown）"
    )
    plan: str = Field(
        ...,
        min_length=20,
        description="实现计划/里程碑（支持 Markdown）"
    )
    tech_stack: dict[str, Any] = Field(
        ...,
        description="技术栈（JSON 格式，如 {frontend: ['React'], backend: ['FastAPI']}）"
    )
    repo_url: Optional[str] = Field(
        None,
        max_length=500,
        description="GitHub 仓库地址",
        examples=["https://github.com/username/repo"]
    )
    api_key: Optional[str] = Field(
        None,
        max_length=255,
        description="ikuncode API Key（用于额度消耗排行榜）"
    )
    contact_email: EmailStr = Field(
        ...,
        description="联系邮箱"
    )
    contact_wechat: Optional[str] = Field(
        None,
        max_length=100,
        description="微信号（可选）"
    )
    contact_phone: Optional[str] = Field(
        None,
        max_length=30,
        description="手机号（可选）"
    )

    @field_validator("tech_stack")
    @classmethod
    def validate_tech_stack(cls, v: dict[str, Any]) -> dict[str, Any]:
        """验证技术栈格式"""
        if not v:
            raise ValueError("技术栈不能为空")
        # 支持 { content: "文本内容" } 格式
        if "content" in v and isinstance(v["content"], str):
            if not v["content"].strip():
                raise ValueError("技术栈不能为空")
            return v
        # 支持 { frontend: [...], backend: [...] } 格式
        has_tech = False
        for key, value in v.items():
            if isinstance(value, list) and len(value) > 0:
                has_tech = True
                break
        if not has_tech:
            raise ValueError("请至少填写一项技术栈")
        return v


class RegistrationUpdate(BaseModel):
    """更新报名请求体（支持部分更新）"""
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    summary: Optional[str] = Field(None, min_length=10, max_length=500)
    description: Optional[str] = Field(None, min_length=50)
    plan: Optional[str] = Field(None, min_length=20)
    tech_stack: Optional[dict[str, Any]] = None
    repo_url: Optional[str] = Field(None, max_length=500)
    api_key: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[EmailStr] = None
    contact_wechat: Optional[str] = Field(None, max_length=100)
    contact_phone: Optional[str] = Field(None, max_length=30)

    @field_validator("tech_stack")
    @classmethod
    def validate_tech_stack(cls, v: Optional[dict[str, Any]]) -> Optional[dict[str, Any]]:
        """验证技术栈格式（仅当提供时）"""
        if v is None:
            return v
        if not v:
            raise ValueError("技术栈不能为空")
        # 支持 { content: "文本内容" } 格式
        if "content" in v and isinstance(v["content"], str):
            if not v["content"].strip():
                raise ValueError("技术栈不能为空")
            return v
        # 支持 { frontend: [...], backend: [...] } 格式
        has_tech = False
        for key, value in v.items():
            if isinstance(value, list) and len(value) > 0:
                has_tech = True
                break
        if not has_tech:
            raise ValueError("请至少填写一项技术栈")
        return v


class RegistrationResponse(BaseModel):
    """报名响应体"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    contest_id: int
    user_id: int
    title: str
    summary: str
    description: str
    plan: str
    tech_stack: dict[str, Any]
    repo_url: Optional[str] = None
    api_key: Optional[str] = None
    contact_email: str
    contact_wechat: Optional[str] = None
    contact_phone: Optional[str] = None
    status: RegistrationStatus
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    user: Optional[UserPublic] = None


class RegistrationListResponse(BaseModel):
    """报名列表响应体"""
    items: list[RegistrationResponse]
    total: int
    page: int
    page_size: int
