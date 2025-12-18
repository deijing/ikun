"""
评审中心 Schemas

用于评审员评分功能的请求/响应数据结构定义。
"""
from datetime import datetime
from typing import Optional, List
from decimal import Decimal

from pydantic import BaseModel, Field, field_validator


# ============================================================================
# 评分相关 Schemas
# ============================================================================

class ReviewScoreRequest(BaseModel):
    """提交/更新评分请求"""
    score: int = Field(..., ge=1, le=100, description="评分(1-100)")
    comment: Optional[str] = Field(None, max_length=2000, description="评审意见(可选)")

    @field_validator('comment')
    @classmethod
    def strip_comment(cls, v):
        if v:
            return v.strip()
        return v


class MyReviewResponse(BaseModel):
    """我的评分响应"""
    score: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReviewStatsResponse(BaseModel):
    """评分统计响应"""
    review_count: int = Field(description="评分数量")
    final_score: Optional[Decimal] = Field(None, description="最终得分")
    avg_score: Optional[Decimal] = Field(None, description="平均分")
    min_score: Optional[int] = Field(None, description="最低分")
    max_score: Optional[int] = Field(None, description="最高分")


# ============================================================================
# 作品列表相关 Schemas
# ============================================================================

class ContestantInfo(BaseModel):
    """参赛者信息"""
    id: int
    username: str
    display_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}


class SubmissionForReview(BaseModel):
    """评审中心作品列表项"""
    id: int
    title: str
    description: Optional[str] = None
    repo_url: str
    demo_url: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime

    # 参赛者信息
    contestant: Optional[ContestantInfo] = None

    # 我的评分（当前评审员）
    my_review: Optional[MyReviewResponse] = None

    # 评分统计
    stats: ReviewStatsResponse

    model_config = {"from_attributes": True}


class SubmissionListForReviewResponse(BaseModel):
    """评审中心作品列表响应"""
    items: List[SubmissionForReview]
    total: int
    page: int
    page_size: int


# ============================================================================
# 作品详情相关 Schemas
# ============================================================================

class SubmissionDetailForReview(BaseModel):
    """评审中心作品详情"""
    id: int
    title: str
    description: Optional[str] = None
    repo_url: str
    demo_url: Optional[str] = None
    video_url: Optional[str] = None
    project_doc_md: Optional[str] = None
    submitted_at: Optional[datetime] = None
    created_at: datetime

    # 参赛者信息
    contestant: Optional[ContestantInfo] = None

    # 我的评分
    my_review: Optional[MyReviewResponse] = None

    # 评分统计
    stats: ReviewStatsResponse

    model_config = {"from_attributes": True}


# ============================================================================
# 评审员统计 Schemas
# ============================================================================

class ReviewerStatsResponse(BaseModel):
    """评审员工作统计"""
    total_submissions: int = Field(description="待审作品总数")
    reviewed_count: int = Field(description="已评分数量")
    pending_count: int = Field(description="未评分数量")
    avg_score_given: Optional[Decimal] = Field(None, description="我给出的平均分")


# ============================================================================
# 管理员查看评分明细 Schemas
# ============================================================================

class ReviewDetailItem(BaseModel):
    """单条评分明细"""
    id: int
    score: int
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    reviewer: ContestantInfo

    model_config = {"from_attributes": True}


class SubmissionReviewsResponse(BaseModel):
    """作品的所有评分明细响应"""
    submission_id: int
    reviews: List[ReviewDetailItem]
    stats: ReviewStatsResponse
