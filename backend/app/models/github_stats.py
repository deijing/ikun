"""
GitHub 统计数据模型

存储选手每日的 GitHub 活动数据，包括 commits 数量、代码增删行数等。
支持按日期聚合统计，用于展示选手开发进度和活跃度。
"""
from datetime import date
from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Date,
    ForeignKey,
    UniqueConstraint,
    Index,
    JSON,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel


class GitHubStats(BaseModel):
    """
    GitHub 每日统计表

    按日期存储每个报名选手的 GitHub 活动数据。
    通过 (registration_id, stat_date) 唯一约束确保每人每天只有一条记录。
    """
    __tablename__ = "github_stats"

    # 关联字段
    registration_id = Column(
        Integer,
        ForeignKey("registrations.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联报名ID"
    )

    # 统计日期
    stat_date = Column(Date, nullable=False, comment="统计日期")

    # GitHub 仓库信息
    repo_url = Column(String(500), nullable=False, comment="仓库地址")
    repo_owner = Column(String(100), nullable=False, comment="仓库所有者")
    repo_name = Column(String(100), nullable=False, comment="仓库名称")

    # 当日统计数据
    commits_count = Column(Integer, default=0, comment="当日提交次数")
    additions = Column(Integer, default=0, comment="当日新增行数")
    deletions = Column(Integer, default=0, comment="当日删除行数")
    files_changed = Column(Integer, default=0, comment="当日修改文件数")

    # 累计统计数据（截至当日）
    total_commits = Column(Integer, default=0, comment="累计提交次数")
    total_additions = Column(Integer, default=0, comment="累计新增行数")
    total_deletions = Column(Integer, default=0, comment="累计删除行数")

    # 提交详情（JSON数组，存储当日每次提交的信息）
    commits_detail = Column(
        JSON,
        nullable=True,
        comment="当日提交详情 [{sha, message, timestamp, additions, deletions}]"
    )

    # 活跃时段统计（JSON对象，按小时统计提交数）
    hourly_activity = Column(
        JSON,
        nullable=True,
        comment="按小时统计 {0: count, 1: count, ...}"
    )

    # 表级约束和索引
    __table_args__ = (
        UniqueConstraint("registration_id", "stat_date", name="uq_github_stats_reg_date"),
        Index("ix_github_stats_date", "stat_date"),
        Index("ix_github_stats_registration", "registration_id"),
    )

    # ORM 关系
    registration = relationship("Registration", backref="github_stats")

    def __repr__(self):
        return f"<GitHubStats(registration_id={self.registration_id}, date={self.stat_date}, commits={self.commits_count})>"


class GitHubSyncLog(BaseModel):
    """
    GitHub 同步日志表

    记录每次数据同步的状态，用于排查问题和避免重复同步。
    """
    __tablename__ = "github_sync_logs"

    # 关联字段
    registration_id = Column(
        Integer,
        ForeignKey("registrations.id", ondelete="CASCADE"),
        nullable=False,
        comment="关联报名ID"
    )

    # 同步信息
    sync_type = Column(String(20), nullable=False, comment="同步类型: hourly/daily/manual")
    status = Column(String(20), nullable=False, comment="状态: success/failed/skipped")
    error_message = Column(Text, nullable=True, comment="错误信息")

    # API 调用信息
    api_calls_used = Column(Integer, default=0, comment="消耗的API调用次数")
    rate_limit_remaining = Column(Integer, nullable=True, comment="剩余API限额")

    # 表级索引
    __table_args__ = (
        Index("ix_github_sync_log_registration", "registration_id"),
        Index("ix_github_sync_log_created", "created_at"),
    )

    # ORM 关系
    registration = relationship("Registration", backref="sync_logs")

    def __repr__(self):
        return f"<GitHubSyncLog(registration_id={self.registration_id}, status={self.status})>"
