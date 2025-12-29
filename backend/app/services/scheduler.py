"""
定时任务调度器

使用 APScheduler 实现定时任务：
- 每小时同步所有选手的 GitHub 数据
- 每日生成战报
"""
import logging
from datetime import date, datetime
from typing import Optional

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session_maker
from app.models.contest import Contest, ContestPhase
from app.models.registration import Registration, RegistrationStatus
from app.models.github_stats import GitHubStats, GitHubSyncLog
from app.services.github_service import github_service, GitHubService

logger = logging.getLogger(__name__)

# 全局调度器实例
scheduler: Optional[AsyncIOScheduler] = None


async def sync_all_github_stats():
    """
    同步所有选手的 GitHub 数据

    遍历所有已提交/已通过的报名，拉取他们的 GitHub 统计数据。
    """
    logger.info("开始同步所有选手的 GitHub 数据...")

    async with async_session_maker() as db:
        try:
            # 获取所有需要同步的报名
            query = select(Registration).where(
                Registration.status.in_([
                    RegistrationStatus.SUBMITTED.value,
                    RegistrationStatus.APPROVED.value,
                ])
            )
            result = await db.execute(query)
            registrations = result.scalars().all()

            logger.info(f"找到 {len(registrations)} 个需要同步的报名")

            today = date.today()
            success_count = 0
            fail_count = 0

            for reg in registrations:
                try:
                    # 从报名信息中获取 repo_url
                    repo_url = reg.repo_url
                    if not repo_url:
                        logger.debug(f"报名 {reg.id} 没有设置 repo_url，跳过")
                        continue

                    parsed = GitHubService.parse_repo_url(repo_url)
                    if not parsed:
                        logger.warning(f"报名 {reg.id} 的 repo_url 无效: {repo_url}")
                        continue

                    owner, repo = parsed

                    # 获取每日统计
                    daily_stats = await github_service.get_daily_stats(owner, repo, today)

                    # 检查是否已存在记录
                    existing_query = select(GitHubStats).where(
                        GitHubStats.registration_id == reg.id,
                        GitHubStats.stat_date == today,
                    )
                    existing_result = await db.execute(existing_query)
                    existing = existing_result.scalar_one_or_none()

                    if existing:
                        # 更新现有记录
                        existing.commits_count = daily_stats["commits_count"]
                        existing.additions = daily_stats["additions"]
                        existing.deletions = daily_stats["deletions"]
                        existing.files_changed = daily_stats["files_changed"]
                        existing.commits_detail = daily_stats["commits_detail"]
                        existing.hourly_activity = daily_stats["hourly_activity"]
                    else:
                        # 创建新记录
                        new_stat = GitHubStats(
                            registration_id=reg.id,
                            stat_date=today,
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

                    # 记录同步日志
                    sync_log = GitHubSyncLog(
                        registration_id=reg.id,
                        sync_type="hourly",
                        status="success",
                        api_calls_used=1 + daily_stats["commits_count"],
                    )
                    db.add(sync_log)

                    success_count += 1
                    logger.debug(f"报名 {reg.id} 同步成功: {daily_stats['commits_count']} commits")

                except Exception as e:
                    fail_count += 1
                    logger.error(f"报名 {reg.id} 同步失败: {e}")

                    # 记录失败日志
                    sync_log = GitHubSyncLog(
                        registration_id=reg.id,
                        sync_type="hourly",
                        status="failed",
                        error_message=str(e)[:500],
                    )
                    db.add(sync_log)

            await db.commit()
            logger.info(f"GitHub 数据同步完成: 成功 {success_count}, 失败 {fail_count}")

        except Exception as e:
            logger.error(f"GitHub 数据同步任务异常: {e}")
            await db.rollback()


async def generate_daily_report():
    """
    生成每日战报

    统计当日的各项数据，可以用于推送或展示。
    """
    logger.info("开始生成每日战报...")

    async with async_session_maker() as db:
        try:
            today = date.today()

            # 查询今日统计数据
            stats_query = select(GitHubStats).where(GitHubStats.stat_date == today)
            stats_result = await db.execute(stats_query)
            stats = stats_result.scalars().all()

            if not stats:
                logger.info("今日暂无统计数据")
                return

            # 找出各项第一名
            most_commits = max(stats, key=lambda s: s.commits_count, default=None)
            most_additions = max(stats, key=lambda s: s.additions, default=None)

            report = {
                "date": str(today),
                "total_contestants": len(stats),
                "total_commits": sum(s.commits_count for s in stats),
                "total_additions": sum(s.additions for s in stats),
                "total_deletions": sum(s.deletions for s in stats),
                "highlights": {
                    "most_commits": {
                        "registration_id": most_commits.registration_id if most_commits else None,
                        "value": most_commits.commits_count if most_commits else 0,
                    },
                    "most_additions": {
                        "registration_id": most_additions.registration_id if most_additions else None,
                        "value": most_additions.additions if most_additions else 0,
                    },
                },
            }

            logger.info(f"每日战报: {report}")

            # TODO: 可以将战报存储到数据库或推送到前端
            # TODO: 可以发送通知（邮件、微信等）

        except Exception as e:
            logger.error(f"生成每日战报异常: {e}")


def resolve_contest_phase(contest: Contest, now: datetime) -> Optional[str]:
    """根据时间配置计算比赛阶段（无时间配置则返回 None）"""
    if not any([
        contest.signup_start,
        contest.signup_end,
        contest.submit_start,
        contest.submit_end,
        contest.vote_start,
        contest.vote_end,
    ]):
        return None

    if contest.vote_end and now >= contest.vote_end:
        return ContestPhase.ENDED.value

    if contest.vote_start and now >= contest.vote_start:
        if contest.vote_end is None or now < contest.vote_end:
            return ContestPhase.VOTING.value

    if contest.submit_start and now >= contest.submit_start:
        if contest.submit_end is None or now < contest.submit_end:
            return ContestPhase.SUBMISSION.value

    if contest.signup_start and now >= contest.signup_start:
        if contest.signup_end is None or now < contest.signup_end:
            return ContestPhase.SIGNUP.value

    if contest.submit_end and now >= contest.submit_end and contest.vote_start is None:
        return ContestPhase.ENDED.value

    if contest.signup_end and now >= contest.signup_end and contest.submit_start is None and contest.vote_start is None:
        return ContestPhase.ENDED.value

    starts = [value for value in [contest.signup_start, contest.submit_start, contest.vote_start] if value]
    if starts and now < min(starts):
        return ContestPhase.UPCOMING.value

    return ContestPhase.UPCOMING.value


async def sync_contest_phases():
    """
    同步比赛阶段

    根据比赛配置的时间窗口自动更新阶段。
    """
    logger.info("开始同步比赛阶段...")

    async with async_session_maker() as db:
        try:
            result = await db.execute(select(Contest))
            contests = result.scalars().all()
            if not contests:
                logger.info("没有需要同步的比赛")
                return

            now = datetime.now()
            updated = 0
            for contest in contests:
                if hasattr(contest, "auto_phase_enabled") and not contest.auto_phase_enabled:
                    continue
                target_phase = resolve_contest_phase(contest, now)
                if not target_phase:
                    continue
                if contest.phase != target_phase:
                    logger.info(
                        "比赛 %s 阶段变更：%s -> %s",
                        contest.id,
                        contest.phase,
                        target_phase,
                    )
                    contest.phase = target_phase
                    updated += 1

            if updated:
                await db.commit()
            logger.info("比赛阶段同步完成：更新 %s 个", updated)

        except Exception as e:
            logger.error(f"比赛阶段同步异常: {e}")
            await db.rollback()


def init_scheduler():
    """初始化定时任务调度器"""
    global scheduler

    scheduler = AsyncIOScheduler()

    # 每小时整点同步 GitHub 数据
    scheduler.add_job(
        sync_all_github_stats,
        CronTrigger(minute=0),  # 每小时的第0分钟
        id="sync_github_stats",
        name="同步GitHub数据",
        replace_existing=True,
    )

    # 每天 23:55 生成每日战报
    scheduler.add_job(
        generate_daily_report,
        CronTrigger(hour=23, minute=55),
        id="daily_report",
        name="生成每日战报",
        replace_existing=True,
    )

    # 每分钟同步比赛阶段
    scheduler.add_job(
        sync_contest_phases,
        CronTrigger(minute="*/1"),
        id="sync_contest_phases",
        name="同步比赛阶段",
        replace_existing=True,
    )

    logger.info("定时任务调度器初始化完成")
    return scheduler


def start_scheduler():
    """启动定时任务调度器"""
    global scheduler

    if scheduler is None:
        scheduler = init_scheduler()

    if not scheduler.running:
        scheduler.start()
        logger.info("定时任务调度器已启动")


def shutdown_scheduler():
    """关闭定时任务调度器"""
    global scheduler

    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("定时任务调度器已关闭")
