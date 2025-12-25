"""
比赛相关 API

提供比赛信息的查询功能。
"""
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.endpoints.submission import get_current_user
from app.core.database import get_db
from app.models.contest import Contest, ContestPhase
from app.models.project import Project, ProjectStatus
from app.models.project_favorite import ProjectFavorite
from app.models.project_like import ProjectLike
from app.models.project_review import ProjectReview
from app.models.user import User
from app.schemas.review_center import ReviewStatsResponse
from app.schemas.submission import UserBrief

router = APIRouter()


class ContestResponse(BaseModel):
    """比赛响应体"""
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    description: Optional[str] = None
    phase: ContestPhase
    signup_start: Optional[datetime] = None
    signup_end: Optional[datetime] = None
    submit_start: Optional[datetime] = None
    submit_end: Optional[datetime] = None
    vote_start: Optional[datetime] = None
    vote_end: Optional[datetime] = None


class ContestListResponse(BaseModel):
    """比赛列表响应"""
    items: list[ContestResponse]
    total: int


class ContestCreateRequest(BaseModel):
    """创建比赛请求体"""
    title: str
    description: Optional[str] = None
    phase: Optional[ContestPhase] = None
    signup_start: Optional[datetime] = None
    signup_end: Optional[datetime] = None
    submit_start: Optional[datetime] = None
    submit_end: Optional[datetime] = None
    vote_start: Optional[datetime] = None
    vote_end: Optional[datetime] = None


class ContestUpdateRequest(BaseModel):
    """更新比赛请求体"""
    title: Optional[str] = None
    description: Optional[str] = None
    phase: Optional[ContestPhase] = None
    signup_start: Optional[datetime] = None
    signup_end: Optional[datetime] = None
    submit_start: Optional[datetime] = None
    submit_end: Optional[datetime] = None
    vote_start: Optional[datetime] = None
    vote_end: Optional[datetime] = None


class ContestPhaseUpdateRequest(BaseModel):
    """比赛阶段更新请求体"""
    phase: ContestPhase


class ProjectRankingItem(BaseModel):
    """作品排行榜条目"""
    rank: int
    project_id: int
    title: str
    status: ProjectStatus
    user: Optional[UserBrief] = None
    stats: ReviewStatsResponse


class ContestRankingResponse(BaseModel):
    """比赛排行榜响应"""
    items: list[ProjectRankingItem]
    total: int


class ProjectRankingDetailResponse(BaseModel):
    """比赛排行榜详情响应"""
    rank: int
    project_id: int
    title: str
    summary: Optional[str] = None
    description: Optional[str] = None
    repo_url: Optional[str] = None
    demo_url: Optional[str] = None
    readme_url: Optional[str] = None
    status: ProjectStatus
    user: Optional[UserBrief] = None
    stats: ReviewStatsResponse


class ProjectInteractionLeaderboardItem(BaseModel):
    """作品互动排行榜条目"""
    rank: int
    project_id: int
    title: str
    status: ProjectStatus
    user: Optional[UserBrief] = None
    count: int


class ContestInteractionLeaderboardResponse(BaseModel):
    """作品互动排行榜响应"""
    items: list[ProjectInteractionLeaderboardItem]
    total: int
    type: str


def require_admin(user: User) -> None:
    """检查管理员权限"""
    if not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="需要管理员权限")


def build_empty_review_stats() -> ReviewStatsResponse:
    """构建空的评分统计"""
    return ReviewStatsResponse(
        review_count=0,
        final_score=None,
        avg_score=None,
        min_score=None,
        max_score=None,
    )


def build_review_stats(
    review_count: int,
    total_score: Optional[int],
    avg_score: Optional[float],
    min_score: Optional[int],
    max_score: Optional[int],
) -> ReviewStatsResponse:
    """构建评分统计"""
    if review_count == 0:
        return build_empty_review_stats()

    avg_value = Decimal(str(avg_score)).quantize(Decimal("0.01")) if avg_score is not None else None
    if review_count >= 3 and total_score is not None and min_score is not None and max_score is not None:
        final_score = Decimal(str(total_score - max_score - min_score)) / Decimal(review_count - 2)
        final_score = final_score.quantize(Decimal("0.01"))
    else:
        final_score = avg_value

    return ReviewStatsResponse(
        review_count=review_count,
        final_score=final_score,
        avg_score=avg_value,
        min_score=min_score,
        max_score=max_score,
    )


async def build_project_ranking_items(
    db: AsyncSession,
    contest_id: int,
) -> list[ProjectRankingItem]:
    """构建比赛作品排行榜列表"""
    project_result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(
            Project.contest_id == contest_id,
            Project.status.in_({ProjectStatus.SUBMITTED.value, ProjectStatus.ONLINE.value}),
        )
    )
    projects = project_result.scalars().all()
    if not projects:
        return []

    project_ids = [project.id for project in projects]
    stats_result = await db.execute(
        select(
            ProjectReview.project_id.label("project_id"),
            func.count(ProjectReview.id).label("count"),
            func.sum(ProjectReview.score).label("sum"),
            func.avg(ProjectReview.score).label("avg"),
            func.min(ProjectReview.score).label("min"),
            func.max(ProjectReview.score).label("max"),
        )
        .where(ProjectReview.project_id.in_(project_ids))
        .group_by(ProjectReview.project_id)
    )
    stats_map = {row.project_id: row for row in stats_result}

    entries = []
    for project in projects:
        row = stats_map.get(project.id)
        stats = build_review_stats(
            review_count=row.count if row else 0,
            total_score=row.sum if row else None,
            avg_score=row.avg if row else None,
            min_score=row.min if row else None,
            max_score=row.max if row else None,
        )
        owner = UserBrief.model_validate(project.user) if project.user else None
        entries.append({
            "project": project,
            "stats": stats,
            "owner": owner,
        })

    def sort_key(entry: dict) -> tuple[float, int, int]:
        stats = entry["stats"]
        score_value = float(stats.final_score) if stats.final_score is not None else -1.0
        project = entry["project"]
        return (score_value, stats.review_count, project.id)

    entries.sort(key=sort_key, reverse=True)
    ranked_items: list[ProjectRankingItem] = []
    for rank, entry in enumerate(entries, 1):
        project = entry["project"]
        ranked_items.append(
            ProjectRankingItem(
                rank=rank,
                project_id=project.id,
                title=project.title,
                status=project.status_enum,
                user=entry["owner"],
                stats=entry["stats"],
            )
        )

    return ranked_items


@router.get("/", response_model=ContestListResponse)
async def list_contests(db: AsyncSession = Depends(get_db)):
    """获取比赛列表"""
    result = await db.execute(select(Contest).order_by(Contest.id.desc()))
    contests = result.scalars().all()

    return ContestListResponse(
        items=[ContestResponse.model_validate(c) for c in contests],
        total=len(contests)
    )


@router.get("/{contest_id}", response_model=ContestResponse)
async def get_contest(contest_id: int, db: AsyncSession = Depends(get_db)):
    """获取比赛详情"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    return ContestResponse.model_validate(contest)


@router.get("/{contest_id}/ranking", response_model=ContestRankingResponse, summary="获取排行榜")
async def get_ranking(
    contest_id: int,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """获取排行榜"""
    # 验证比赛存在
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()

    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    if limit < 1 or limit > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit 必须在 1-200 之间")
    ranked_items = await build_project_ranking_items(db, contest_id)
    total = len(ranked_items)
    return ContestRankingResponse(items=ranked_items[:limit], total=total)


@router.get(
    "/{contest_id}/ranking/{project_id}",
    response_model=ProjectRankingDetailResponse,
    summary="获取排行榜详情",
)
async def get_ranking_detail(
    contest_id: int,
    project_id: int,
    db: AsyncSession = Depends(get_db),
):
    """获取排行榜详情"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    project_result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(
            Project.id == project_id,
            Project.contest_id == contest_id,
            Project.status.in_({ProjectStatus.SUBMITTED.value, ProjectStatus.ONLINE.value}),
        )
    )
    project = project_result.scalar_one_or_none()
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品不存在")

    ranked_items = await build_project_ranking_items(db, contest_id)
    target_item = next((item for item in ranked_items if item.project_id == project_id), None)
    if target_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="作品未进入排行榜")

    return ProjectRankingDetailResponse(
        rank=target_item.rank,
        project_id=project.id,
        title=project.title,
        summary=project.summary,
        description=project.description,
        repo_url=project.repo_url,
        demo_url=project.demo_url,
        readme_url=project.readme_url,
        status=project.status_enum,
        user=target_item.user,
        stats=target_item.stats,
    )


@router.get(
    "/{contest_id}/interaction-leaderboard",
    response_model=ContestInteractionLeaderboardResponse,
    summary="获取互动排行榜",
)
async def get_interaction_leaderboard(
    contest_id: int,
    type: str = "like",
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """获取作品点赞/收藏排行榜"""
    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="比赛不存在"
        )

    if type not in {"like", "favorite"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="type 仅支持 like 或 favorite")

    if limit < 1 or limit > 200:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="limit 必须在 1-200 之间")

    if type == "like":
        model = ProjectLike
    else:
        model = ProjectFavorite

    stats_result = await db.execute(
        select(model.project_id.label("project_id"), func.count(model.id).label("count"))
        .join(Project, Project.id == model.project_id)
        .where(
            Project.contest_id == contest_id,
            Project.status == ProjectStatus.ONLINE.value,
        )
        .group_by(model.project_id)
    )
    stats_rows = stats_result.all()
    if not stats_rows:
        return ContestInteractionLeaderboardResponse(items=[], total=0, type=type)

    count_map = {row.project_id: int(row.count or 0) for row in stats_rows}
    project_ids = list(count_map.keys())

    project_result = await db.execute(
        select(Project)
        .options(selectinload(Project.user))
        .where(Project.id.in_(project_ids))
    )
    projects = project_result.scalars().all()
    project_map = {project.id: project for project in projects}

    entries = []
    for project_id, count in count_map.items():
        project = project_map.get(project_id)
        if not project:
            continue
        owner = UserBrief.model_validate(project.user) if project.user else None
        entries.append({
            "project": project,
            "owner": owner,
            "count": count,
        })

    entries.sort(key=lambda item: (item["count"], item["project"].id), reverse=True)
    ranked_items: list[ProjectInteractionLeaderboardItem] = []
    for rank, entry in enumerate(entries, 1):
        project = entry["project"]
        ranked_items.append(
            ProjectInteractionLeaderboardItem(
                rank=rank,
                project_id=project.id,
                title=project.title,
                status=project.status_enum,
                user=entry["owner"],
                count=entry["count"],
            )
        )

    total = len(ranked_items)
    return ContestInteractionLeaderboardResponse(
        items=ranked_items[:limit],
        total=total,
        type=type,
    )


@router.post(
    "/",
    response_model=ContestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="创建比赛（管理员）",
)
async def create_contest(
    payload: ContestCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """创建比赛"""
    require_admin(current_user)

    contest = Contest(
        title=payload.title,
        description=payload.description,
        phase=(payload.phase.value if payload.phase else ContestPhase.UPCOMING.value),
        signup_start=payload.signup_start,
        signup_end=payload.signup_end,
        submit_start=payload.submit_start,
        submit_end=payload.submit_end,
        vote_start=payload.vote_start,
        vote_end=payload.vote_end,
    )
    db.add(contest)
    await db.commit()
    await db.refresh(contest)
    return ContestResponse.model_validate(contest)


@router.patch(
    "/{contest_id}",
    response_model=ContestResponse,
    summary="更新比赛（管理员）",
)
async def update_contest(
    contest_id: int,
    payload: ContestUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新比赛"""
    require_admin(current_user)

    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if isinstance(value, ContestPhase):
            value = value.value
        setattr(contest, field, value)

    await db.commit()
    await db.refresh(contest)
    return ContestResponse.model_validate(contest)


@router.put(
    "/{contest_id}/phase",
    response_model=ContestResponse,
    summary="更新比赛阶段（管理员）",
)
async def update_contest_phase(
    contest_id: int,
    payload: ContestPhaseUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """更新比赛阶段"""
    require_admin(current_user)

    result = await db.execute(select(Contest).where(Contest.id == contest_id))
    contest = result.scalar_one_or_none()
    if contest is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="比赛不存在")

    contest.phase = payload.phase.value
    await db.commit()
    await db.refresh(contest)
    return ContestResponse.model_validate(contest)
