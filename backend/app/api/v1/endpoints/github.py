"""
GitHub 数据相关 API 端点

提供 GitHub 统计数据的查询和手动同步功能：
- 获取选手的 GitHub 统计数据
- 获取排行榜数据
- 手动触发同步
"""
import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.models.registration import Registration, RegistrationStatus
from app.models.github_stats import GitHubStats, GitHubSyncLog
from app.services.github_service import github_service, GitHubService

router = APIRouter()
logger = logging.getLogger(__name__)


# ============================================================================
# API 端点
# ============================================================================

@router.get(
    "/contests/{contest_id}/github-stats",
    summary="获取比赛所有选手的 GitHub 统计",
    description="获取指定比赛所有参赛选手的 GitHub 统计数据汇总。",
)
async def list_github_stats(
    contest_id: int,
    target_date: Optional[date] = Query(None, description="指定日期，默认今天"),
    db: AsyncSession = Depends(get_db),
):
    """获取所有选手的 GitHub 统计"""
    if target_date is None:
        target_date = date.today()

    # 获取所有已通过/已提交的报名
    reg_query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.contest_id == contest_id,
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value,
            ])
        )
    )
    reg_result = await db.execute(reg_query)
    registrations = reg_result.scalars().all()

    # 获取指定日期的统计数据
    stats_query = select(GitHubStats).where(
        GitHubStats.registration_id.in_([r.id for r in registrations]),
        GitHubStats.stat_date == target_date,
    )
    stats_result = await db.execute(stats_query)
    stats_map = {s.registration_id: s for s in stats_result.scalars().all()}

    items = []
    for reg in registrations:
        stat = stats_map.get(reg.id)
        items.append({
            "registration_id": reg.id,
            "title": reg.title,
            "user": {
                "id": reg.user.id,
                "username": reg.user.username,
                "display_name": reg.user.display_name,
                "avatar_url": reg.user.avatar_url,
            } if reg.user else None,
            "stat_date": str(target_date),
            "commits_count": stat.commits_count if stat else 0,
            "additions": stat.additions if stat else 0,
            "deletions": stat.deletions if stat else 0,
            "total_commits": stat.total_commits if stat else 0,
            "total_additions": stat.total_additions if stat else 0,
            "total_deletions": stat.total_deletions if stat else 0,
        })

    # 按当日提交数排序
    items.sort(key=lambda x: x["commits_count"], reverse=True)

    return {
        "items": items,
        "total": len(items),
        "stat_date": str(target_date),
    }


@router.get(
    "/registrations/{registration_id}/github-stats",
    summary="获取单个选手的 GitHub 统计",
    description="获取指定选手的 GitHub 统计数据，支持按日期范围查询。",
)
async def get_registration_github_stats(
    registration_id: int,
    start_date: Optional[date] = Query(None, description="开始日期"),
    end_date: Optional[date] = Query(None, description="结束日期"),
    db: AsyncSession = Depends(get_db),
):
    """获取单个选手的 GitHub 统计"""
    # 验证报名存在
    reg_result = await db.execute(
        select(Registration)
        .options(selectinload(Registration.user))
        .where(Registration.id == registration_id)
    )
    registration = reg_result.scalar_one_or_none()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报名记录不存在"
        )

    # 默认查询最近7天
    if end_date is None:
        end_date = date.today()
    if start_date is None:
        start_date = end_date - timedelta(days=6)

    # 查询统计数据
    stats_query = (
        select(GitHubStats)
        .where(
            GitHubStats.registration_id == registration_id,
            GitHubStats.stat_date >= start_date,
            GitHubStats.stat_date <= end_date,
        )
        .order_by(GitHubStats.stat_date.desc())
    )
    stats_result = await db.execute(stats_query)
    stats = stats_result.scalars().all()

    # 计算汇总
    total_commits = sum(s.commits_count for s in stats)
    total_additions = sum(s.additions for s in stats)
    total_deletions = sum(s.deletions for s in stats)

    return {
        "registration": {
            "id": registration.id,
            "title": registration.title,
            "user": {
                "id": registration.user.id,
                "username": registration.user.username,
                "display_name": registration.user.display_name,
                "avatar_url": registration.user.avatar_url,
            } if registration.user else None,
        },
        "date_range": {
            "start": str(start_date),
            "end": str(end_date),
        },
        "summary": {
            "total_commits": total_commits,
            "total_additions": total_additions,
            "total_deletions": total_deletions,
            "days_active": len([s for s in stats if s.commits_count > 0]),
        },
        "daily_stats": [
            {
                "date": str(s.stat_date),
                "commits_count": s.commits_count,
                "additions": s.additions,
                "deletions": s.deletions,
                "files_changed": s.files_changed,
                "commits_detail": s.commits_detail,
                "hourly_activity": s.hourly_activity,
            }
            for s in stats
        ],
    }


@router.get(
    "/contests/{contest_id}/github-leaderboard",
    summary="获取 GitHub 排行榜",
    description="获取多维度 GitHub 排行榜数据。",
)
async def get_github_leaderboard(
    contest_id: int,
    leaderboard_type: str = Query("commits", description="排行榜类型: commits/additions/streak"),
    limit: int = Query(10, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取 GitHub 排行榜"""
    # 获取所有报名ID
    reg_query = select(Registration.id).where(
        Registration.contest_id == contest_id,
        Registration.status.in_([
            RegistrationStatus.SUBMITTED.value,
            RegistrationStatus.APPROVED.value,
        ])
    )
    reg_result = await db.execute(reg_query)
    registration_ids = [r for r in reg_result.scalars().all()]

    if not registration_ids:
        return {"items": [], "total": 0, "type": leaderboard_type}

    if leaderboard_type == "commits":
        # 按累计提交数排行
        query = (
            select(
                GitHubStats.registration_id,
                func.sum(GitHubStats.commits_count).label("total")
            )
            .where(GitHubStats.registration_id.in_(registration_ids))
            .group_by(GitHubStats.registration_id)
            .order_by(desc("total"))
            .limit(limit)
        )
    elif leaderboard_type == "additions":
        # 按代码增量排行
        query = (
            select(
                GitHubStats.registration_id,
                func.sum(GitHubStats.additions).label("total")
            )
            .where(GitHubStats.registration_id.in_(registration_ids))
            .group_by(GitHubStats.registration_id)
            .order_by(desc("total"))
            .limit(limit)
        )
    else:
        # 默认按提交数
        query = (
            select(
                GitHubStats.registration_id,
                func.sum(GitHubStats.commits_count).label("total")
            )
            .where(GitHubStats.registration_id.in_(registration_ids))
            .group_by(GitHubStats.registration_id)
            .order_by(desc("total"))
            .limit(limit)
        )

    result = await db.execute(query)
    rankings = result.all()

    # 获取报名详情
    if rankings:
        detail_query = (
            select(Registration)
            .options(selectinload(Registration.user))
            .where(Registration.id.in_([r[0] for r in rankings]))
        )
        detail_result = await db.execute(detail_query)
        reg_map = {r.id: r for r in detail_result.scalars().all()}
    else:
        reg_map = {}

    items = []
    for rank, (reg_id, total) in enumerate(rankings, 1):
        reg = reg_map.get(reg_id)
        if reg:
            items.append({
                "rank": rank,
                "registration_id": reg_id,
                "title": reg.title,
                "value": total or 0,
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
            })

    return {
        "items": items,
        "total": len(items),
        "type": leaderboard_type,
    }


@router.post(
    "/registrations/{registration_id}/github-sync",
    summary="手动同步 GitHub 数据",
    description="手动触发指定选手的 GitHub 数据同步，支持同步最近N天数据。",
)
async def sync_github_stats(
    registration_id: int,
    target_date: Optional[date] = Query(None, description="同步日期，默认今天"),
    days: int = Query(1, ge=1, le=7, description="同步天数（1-7天）"),
    db: AsyncSession = Depends(get_db),
):
    """手动同步 GitHub 数据"""
    if target_date is None:
        target_date = date.today()

    # 获取报名信息
    reg_result = await db.execute(
        select(Registration).where(Registration.id == registration_id)
    )
    registration = reg_result.scalar_one_or_none()

    if not registration:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="报名记录不存在"
        )

    # 从报名信息中获取 repo_url
    repo_url = registration.repo_url
    if not repo_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="该选手未设置 GitHub 仓库地址"
        )

    parsed = GitHubService.parse_repo_url(repo_url)
    if not parsed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="无效的 GitHub 仓库地址"
        )

    owner, repo = parsed
    results = []
    total_api_calls = 0

    # 同步多天数据
    for i in range(days):
        sync_date = target_date - timedelta(days=i)

        try:
            daily_stats = await github_service.get_daily_stats(owner, repo, sync_date)
        except Exception as e:
            logger.error(f"GitHub API 调用失败 ({sync_date}): {e}")
            results.append({
                "date": str(sync_date),
                "success": False,
                "error": str(e),
            })
            continue

        # 更新或创建统计记录
        existing_query = select(GitHubStats).where(
            GitHubStats.registration_id == registration_id,
            GitHubStats.stat_date == sync_date,
        )
        existing_result = await db.execute(existing_query)
        existing = existing_result.scalar_one_or_none()

        if existing:
            existing.commits_count = daily_stats["commits_count"]
            existing.additions = daily_stats["additions"]
            existing.deletions = daily_stats["deletions"]
            existing.files_changed = daily_stats["files_changed"]
            existing.commits_detail = daily_stats["commits_detail"]
            existing.hourly_activity = daily_stats["hourly_activity"]
        else:
            new_stat = GitHubStats(
                registration_id=registration_id,
                stat_date=sync_date,
                repo_url=repo_url,
                repo_owner=owner,
                repo_name=repo,
                commits_count=daily_stats["commits_count"],
                additions=daily_stats["additions"],
                deletions=daily_stats["deletions"],
                files_changed=daily_stats["files_changed"],
                commits_detail=daily_stats["commits_detail"],
                hourly_activity=daily_stats["hourly_activity"],
            )
            db.add(new_stat)

        api_calls = 1 + daily_stats["commits_count"]
        total_api_calls += api_calls

        results.append({
            "date": str(sync_date),
            "success": True,
            "commits_count": daily_stats["commits_count"],
            "additions": daily_stats["additions"],
            "deletions": daily_stats["deletions"],
        })

    # 记录同步日志
    sync_log = GitHubSyncLog(
        registration_id=registration_id,
        sync_type="manual",
        status="success" if any(r.get("success") for r in results) else "failed",
        api_calls_used=total_api_calls,
    )
    db.add(sync_log)

    await db.commit()

    return {
        "success": True,
        "registration_id": registration_id,
        "days_synced": days,
        "results": results,
        "total_api_calls": total_api_calls,
    }


@router.get(
    "/github/rate-limit",
    summary="获取 GitHub API 限额",
    description="获取当前 GitHub API 的调用限额状态。",
)
async def get_rate_limit():
    """获取 GitHub API 限额状态"""
    rate_limit = await github_service.get_rate_limit()

    return {
        "limit": rate_limit.get("limit", 60),
        "remaining": rate_limit.get("remaining", 0),
        "reset": rate_limit.get("reset", 0),
        "used": rate_limit.get("used", 0),
    }


@router.get(
    "/contests/{contest_id}/github-commits/recent",
    summary="获取最近的 Git 提交动态",
    description="获取所有选手最近的 Git 提交记录，用于首页动态展示。",
)
async def get_recent_commits(
    contest_id: int,
    limit: int = Query(20, ge=1, le=50, description="返回数量"),
    db: AsyncSession = Depends(get_db),
):
    """获取最近的 Git 提交动态"""
    # 获取所有已通过/已提交的报名
    reg_query = (
        select(Registration)
        .options(selectinload(Registration.user))
        .where(
            Registration.contest_id == contest_id,
            Registration.status.in_([
                RegistrationStatus.SUBMITTED.value,
                RegistrationStatus.APPROVED.value,
            ])
        )
    )
    reg_result = await db.execute(reg_query)
    registrations = reg_result.scalars().all()
    reg_map = {r.id: r for r in registrations}

    if not registrations:
        return {"items": [], "total": 0}

    # 获取最近7天的统计数据（包含提交详情）
    today = date.today()
    start_date = today - timedelta(days=7)

    stats_query = (
        select(GitHubStats)
        .where(
            GitHubStats.registration_id.in_([r.id for r in registrations]),
            GitHubStats.stat_date >= start_date,
            GitHubStats.commits_detail.isnot(None),
        )
        .order_by(GitHubStats.stat_date.desc())
    )
    stats_result = await db.execute(stats_query)
    all_stats = stats_result.scalars().all()

    # 展开所有提交记录
    commits = []
    for stat in all_stats:
        reg = reg_map.get(stat.registration_id)
        if not reg or not stat.commits_detail:
            continue

        for commit in stat.commits_detail:
            commits.append({
                "registration_id": stat.registration_id,
                "title": reg.title,
                "repo_name": stat.repo_name,
                "repo_owner": stat.repo_owner,
                "user": {
                    "id": reg.user.id,
                    "username": reg.user.username,
                    "display_name": reg.user.display_name,
                    "avatar_url": reg.user.avatar_url,
                } if reg.user else None,
                "sha": commit.get("sha", "")[:7],
                "message": commit.get("message", ""),
                "timestamp": commit.get("timestamp"),
                "additions": commit.get("additions", 0),
                "deletions": commit.get("deletions", 0),
            })

    # 按时间排序
    commits.sort(key=lambda x: x.get("timestamp") or "", reverse=True)

    # 限制返回数量
    commits = commits[:limit]

    return {
        "items": commits,
        "total": len(commits),
    }
