"""
作品与部署提交相关 Schemas
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.project import ProjectStatus
from app.models.project_submission import ProjectSubmissionStatus
from app.schemas.review_center import MyReviewResponse, ReviewStatsResponse
from app.schemas.submission import UserBrief


class ProjectCreate(BaseModel):
    """创建作品请求体"""
    contest_id: int = Field(..., description="比赛ID")
    title: str = Field(..., min_length=2, max_length=200, description="作品名称")
    summary: Optional[str] = Field(None, max_length=500, description="作品简介")
    description: Optional[str] = Field(None, max_length=5000, description="作品详情")
    repo_url: Optional[str] = Field(None, max_length=500, description="开源仓库地址")
    cover_image_url: Optional[str] = Field(None, max_length=500, description="封面图")
    screenshot_urls: Optional[list[str]] = Field(None, description="截图列表")
    readme_url: Optional[str] = Field(None, max_length=500, description="README 链接")
    demo_url: Optional[str] = Field(None, max_length=500, description="演示地址")

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: Optional[str]) -> Optional[str]:
        """验证仓库URL格式（可选）"""
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if not v.startswith("https://"):
            raise ValueError("仓库URL必须使用HTTPS协议")
        return v


class ProjectUpdate(BaseModel):
    """更新作品请求体"""
    title: Optional[str] = Field(None, min_length=2, max_length=200)
    summary: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=5000)
    repo_url: Optional[str] = Field(None, max_length=500)
    cover_image_url: Optional[str] = Field(None, max_length=500)
    screenshot_urls: Optional[list[str]] = None
    readme_url: Optional[str] = Field(None, max_length=500)
    demo_url: Optional[str] = Field(None, max_length=500)

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: Optional[str]) -> Optional[str]:
        """验证仓库URL格式（可选）"""
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if not v.startswith("https://"):
            raise ValueError("仓库URL必须使用HTTPS协议")
        return v


class ProjectResponse(BaseModel):
    """作品响应体"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    contest_id: int
    user_id: int
    title: str
    summary: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    cover_image_url: Optional[str] = None
    screenshot_urls: Optional[list[str]] = None
    readme_url: Optional[str] = None
    demo_url: Optional[str] = None
    status: ProjectStatus
    current_submission_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    owner: Optional[UserBrief] = None
    like_count: int = 0
    favorite_count: int = 0
    liked: bool = False
    favorited: bool = False


class ProjectListResponse(BaseModel):
    """作品列表响应体"""
    items: list[ProjectResponse]
    total: int


class ProjectInteractionResponse(BaseModel):
    """作品互动响应体"""
    project_id: int
    like_count: int
    favorite_count: int
    liked: bool
    favorited: bool


class ProjectAccessResponse(BaseModel):
    """作品访问入口响应体"""
    project_id: int
    status: ProjectStatus
    submission_id: Optional[int] = None
    domain: Optional[str] = None
    message: Optional[str] = None


class ProjectSubmissionCreate(BaseModel):
    """创建部署提交请求体"""
    image_ref: str = Field(..., min_length=10, max_length=500, description="镜像引用（含 digest）")
    repo_url: Optional[str] = Field(None, max_length=500, description="开源仓库地址（可选）")

    @field_validator("image_ref")
    @classmethod
    def validate_image_ref(cls, v: str) -> str:
        """验证镜像引用必须包含 digest"""
        v = v.strip()
        if "@sha256:" not in v:
            raise ValueError("镜像引用必须包含 @sha256 digest")
        ref = v.split("@", 1)[0].strip()
        if ref.lower().endswith(":latest"):
            raise ValueError("镜像标签禁止使用 :latest")
        return v

    @field_validator("repo_url")
    @classmethod
    def validate_repo_url(cls, v: Optional[str]) -> Optional[str]:
        """验证仓库URL格式（可选）"""
        if v is None:
            return v
        v = v.strip()
        if not v:
            return None
        if not v.startswith("https://"):
            raise ValueError("仓库URL必须使用HTTPS协议")
        return v


class ProjectSubmissionResponse(BaseModel):
    """部署提交响应体"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    project_id: int
    contest_id: int
    user_id: int
    image_ref: str
    image_registry: Optional[str] = None
    image_repo: Optional[str] = None
    image_digest: Optional[str] = None
    status: ProjectSubmissionStatus
    status_message: Optional[str] = None
    error_code: Optional[str] = None
    log: Optional[str] = None
    domain: Optional[str] = None
    status_history: Optional[list[dict]] = None
    submitted_at: Optional[datetime] = None
    online_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class ProjectSubmissionListResponse(BaseModel):
    """提交列表响应体"""
    items: list[ProjectSubmissionResponse]
    total: int


class ProjectSubmissionStatusUpdate(BaseModel):
    """状态回写请求体（Worker）"""
    status: ProjectSubmissionStatus = Field(..., description="新的提交状态")
    status_message: Optional[str] = Field(None, max_length=500, description="状态说明")
    error_code: Optional[str] = Field(None, max_length=100, description="错误码")
    log_append: Optional[str] = Field(None, description="追加日志内容")
    domain: Optional[str] = Field(None, max_length=255, description="访问域名")


class ProjectAdminActionRequest(BaseModel):
    """管理员操作请求体"""
    message: Optional[str] = Field(None, max_length=500, description="操作说明")


class ProjectReviewAssignRequest(BaseModel):
    """管理员分配评委请求体"""
    reviewer_ids: list[int] = Field(..., description="评审员用户ID列表")


class ProjectReviewerItem(BaseModel):
    """作品评审员信息"""
    model_config = ConfigDict(from_attributes=True)

    reviewer_id: int
    reviewer: Optional[UserBrief] = None
    created_at: datetime
    updated_at: datetime


class ProjectReviewerListResponse(BaseModel):
    """作品评审员列表响应体"""
    items: list[ProjectReviewerItem]
    total: int


class ProjectReviewItem(BaseModel):
    """评审中心作品信息"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    summary: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    readme_url: Optional[str] = None
    status: ProjectStatus
    current_submission_id: Optional[int] = None
    domain: Optional[str] = None
    created_at: datetime
    owner: Optional[UserBrief] = None
    my_review: Optional[MyReviewResponse] = None
    stats: ReviewStatsResponse


class ProjectReviewListResponse(BaseModel):
    """评审中心作品列表响应体"""
    items: list[ProjectReviewItem]
    total: int
    page: int
    page_size: int
