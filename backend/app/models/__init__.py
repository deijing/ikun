"""
数据模型汇总
"""
from app.models.base import Base, BaseModel
from app.models.user import User, UserRole
from app.models.contest import Contest, ContestPhase
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_review import SubmissionReview
from app.models.registration import Registration, RegistrationStatus
from app.models.vote import Vote
from app.models.project import Project, ProjectStatus
from app.models.project_submission import ProjectSubmission, ProjectSubmissionStatus
from app.models.project_review_assignment import ProjectReviewAssignment
from app.models.project_review import ProjectReview
from app.models.project_like import ProjectLike
from app.models.project_favorite import ProjectFavorite
from app.models.github_stats import GitHubStats, GitHubSyncLog
from app.models.cheer import Cheer, CheerType, CheerStats
from app.models.achievement import (
    AchievementDefinition,
    UserAchievement,
    UserBadgeShowcase,
    UserStats,
    AchievementTier,
    AchievementStatus,
    AchievementCategory,
)
from app.models.system_log import SystemLog, LogAction
from app.models.request_log import RequestLog

__all__ = [
    "Base",
    "BaseModel",
    "User",
    "UserRole",
    "Contest",
    "ContestPhase",
    "Submission",
    "SubmissionStatus",
    "SubmissionReview",
    "Registration",
    "RegistrationStatus",
    "Vote",
    "Project",
    "ProjectStatus",
    "ProjectSubmission",
    "ProjectSubmissionStatus",
    "ProjectReviewAssignment",
    "ProjectReview",
    "ProjectLike",
    "ProjectFavorite",
    "GitHubStats",
    "GitHubSyncLog",
    "Cheer",
    "CheerType",
    "CheerStats",
    "AchievementDefinition",
    "UserAchievement",
    "UserBadgeShowcase",
    "UserStats",
    "AchievementTier",
    "AchievementStatus",
    "AchievementCategory",
    "SystemLog",
    "LogAction",
    "RequestLog",
]
