"""
作品提交相关 Pydantic Schemas

定义作品提交的请求体、响应体和数据验证规则。
支持5种材料：项目源码、演示视频（可选）、项目文档、API调用证明、参赛报名表。
"""
from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator, HttpUrl

from app.models.submission import AttachmentType, SubmissionStatus, StorageProvider


# ============================================================================
# 附件相关 Schemas
# ============================================================================

class AttachmentResponse(BaseModel):
    """附件响应体（完整版，仅对所有者/评审可见）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    type: str
    storage_provider: str
    storage_key: str  # 注意：仅对所有者/评审返回
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    sha256: Optional[str] = None
    duration_seconds: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    is_uploaded: bool = False
    uploaded_at: Optional[datetime] = None
    is_valid: Optional[bool] = None
    validation_error: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class AttachmentPublicResponse(BaseModel):
    """附件响应体（公开版，隐藏敏感信息）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    type: str
    filename: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    duration_seconds: Optional[int] = None
    is_uploaded: bool = False
    created_at: datetime


class AttachmentInitRequest(BaseModel):
    """初始化附件上传请求体"""
    type: AttachmentType = Field(
        ...,
        description="附件类型: demo_video=演示视频, api_screenshot=API截图, api_log=API日志"
    )
    filename: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="原始文件名"
    )
    content_type: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="MIME类型"
    )
    size_bytes: int = Field(
        ...,
        gt=0,
        description="文件大小（字节）"
    )

    @field_validator("filename")
    @classmethod
    def sanitize_filename(cls, v: str) -> str:
        """清理文件名，移除危险字符"""
        import re
        # 移除路径分隔符和其他危险字符
        v = v.strip().replace("\\", "_").replace("/", "_")
        v = re.sub(r"[^\w\-.\u4e00-\u9fff]+", "_", v)
        return v[:120] if v else "file"


class AttachmentInitResponse(BaseModel):
    """初始化附件上传响应体"""
    attachment_id: int = Field(..., description="附件ID，用于后续上传")
    upload_url: str = Field(..., description="上传URL")
    max_size_bytes: int = Field(..., description="该类型附件的最大允许大小（字节）")


class AttachmentCompleteRequest(BaseModel):
    """完成附件上传请求体（可选，用于非 multipart 场景）"""
    storage_key: Optional[str] = Field(None, description="对象存储Key（对象存储场景使用）")


# ============================================================================
# 作品提交相关 Schemas
# ============================================================================

class SubmissionCreate(BaseModel):
    """创建作品提交（草稿）请求体"""
    contest_id: int = Field(..., description="比赛ID")
    title: str = Field(
        ...,
        min_length=2,
        max_length=200,
        description="作品标题"
    )
    description: Optional[str] = Field(
        None,
        max_length=5000,
        description="作品描述（可选）"
    )
    repo_url: str = Field(
        ...,
        min_length=10,
        max_length=500,
        description="项目源码仓库URL（GitHub/Gitee，必须Public）"
    )
    demo_url: Optional[str] = Field(
        None,
        max_length=500,
        description="在线演示地址（可选）"
    )
    video_url: Optional[str] = Field(
        None,
        max_length=500,
        description="视频URL（兼容字段，可选）"
    )
    project_doc_md: Optional[str] = Field(
        None,
        description="项目文档（Markdown格式，最终提交时必填）"
    )

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: str) -> str:
        """验证仓库URL格式"""
        v = v.strip()
        if not v:
            raise ValueError("仓库URL不能为空")

        # 必须是 HTTPS 协议
        if not v.startswith("https://"):
            raise ValueError("仓库URL必须使用HTTPS协议")

        # 必须是 GitHub 或 Gitee
        valid_hosts = ("https://github.com/", "https://gitee.com/")
        if not any(v.startswith(host) for host in valid_hosts):
            raise ValueError("仓库URL仅支持 GitHub (https://github.com/) 或 Gitee (https://gitee.com/)")

        # 简单格式校验：至少包含用户名和仓库名
        parts = v.rstrip("/").split("/")
        if len(parts) < 5:
            raise ValueError("仓库URL格式不正确，应为 https://github.com/用户名/仓库名")

        return v


class SubmissionUpdate(BaseModel):
    """更新作品提交请求体（支持部分更新）"""
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    description: Optional[str] = Field(None, max_length=5000)
    repo_url: Optional[str] = Field(None, max_length=500)
    demo_url: Optional[str] = Field(None, max_length=500)
    video_url: Optional[str] = Field(None, max_length=500)
    project_doc_md: Optional[str] = None

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: Optional[str]) -> Optional[str]:
        """验证仓库URL格式（仅当提供时）"""
        if v is None:
            return v
        return SubmissionCreate.validate_repo_url(v)


class UserBrief(BaseModel):
    """用户简要信息（嵌入响应中使用）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None


class SubmissionResponse(BaseModel):
    """作品提交响应体（完整版，仅对所有者/评审可见）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    contest_id: int
    registration_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    repo_url: str
    demo_url: Optional[str] = None
    video_url: Optional[str] = None
    project_doc_md: Optional[str] = None
    status: str
    vote_count: int = 0
    validation_summary: Optional[dict[str, Any]] = None
    validated_at: Optional[datetime] = None
    submitted_at: Optional[datetime] = None
    reviewer_id: Optional[int] = None
    review_comment: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentResponse] = Field(default_factory=list)
    user: Optional[UserBrief] = None


class SubmissionPublicResponse(BaseModel):
    """作品提交响应体（公开版，隐藏敏感信息）"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    contest_id: int
    title: str
    description: Optional[str] = None
    repo_url: str
    demo_url: Optional[str] = None
    video_url: Optional[str] = None
    status: str
    vote_count: int = 0
    submitted_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    attachments: list[AttachmentPublicResponse] = Field(default_factory=list)
    user: Optional[UserBrief] = None


class SubmissionListResponse(BaseModel):
    """作品列表响应体（管理员/所有者使用完整版）"""
    items: list[SubmissionResponse]
    total: int
    page: int = 1
    page_size: int = 20


class SubmissionPublicListResponse(BaseModel):
    """作品列表响应体（公开版）"""
    items: list[SubmissionPublicResponse]
    total: int
    page: int = 1
    page_size: int = 20


# ============================================================================
# 校验相关 Schemas
# ============================================================================

class ValidationError(BaseModel):
    """校验错误项"""
    field: str = Field(..., description="字段名")
    code: str = Field(..., description="错误代码")
    message: str = Field(..., description="错误信息")


class ValidationResult(BaseModel):
    """校验结果"""
    ok: bool = Field(..., description="是否全部通过")
    errors: list[ValidationError] = Field(default_factory=list, description="错误列表")
    summary: dict[str, Any] = Field(default_factory=dict, description="校验摘要")


class SubmissionValidateResponse(BaseModel):
    """触发校验响应体"""
    ok: bool = Field(..., description="是否全部通过")
    errors: list[ValidationError] = Field(default_factory=list, description="错误列表")
    summary: dict[str, Any] = Field(default_factory=dict, description="校验摘要")
    # 各项校验状态
    repo_check: Optional[dict[str, Any]] = Field(None, description="仓库校验结果")
    video_check: Optional[dict[str, Any]] = Field(None, description="视频校验结果")
    doc_check: Optional[dict[str, Any]] = Field(None, description="文档校验结果")
    api_proof_check: Optional[dict[str, Any]] = Field(None, description="API证明校验结果")
    registration_check: Optional[dict[str, Any]] = Field(None, description="报名信息校验结果")


# ============================================================================
# 审核相关 Schemas
# ============================================================================

class SubmissionReviewRequest(BaseModel):
    """审核作品请求体"""
    action: str = Field(
        ...,
        pattern="^(approve|reject)$",
        description="审核操作: approve=通过, reject=拒绝"
    )
    comment: Optional[str] = Field(
        None,
        max_length=1000,
        description="审核意见"
    )
