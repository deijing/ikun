"""
GitHub 数据采集服务

通过 GitHub API 获取选手仓库的 commits、代码行数等统计数据。
支持公开仓库的免授权访问，以及通过 Token 提高 API 限额。
"""
import re
import httpx
from datetime import date, datetime, timedelta
from typing import Optional
from urllib.parse import urlparse

from app.core.config import settings


class GitHubService:
    """GitHub API 服务"""

    BASE_URL = "https://api.github.com"

    def __init__(self, token: Optional[str] = None):
        """
        初始化 GitHub 服务

        Args:
            token: GitHub Personal Access Token（可选，用于提高 API 限额）
        """
        self.token = token or getattr(settings, "GITHUB_TOKEN", None)
        self.headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "ChickenKing-Contest",
        }
        if self.token:
            self.headers["Authorization"] = f"token {self.token}"

    @staticmethod
    def parse_repo_url(repo_url: str) -> tuple[str, str] | None:
        """
        解析 GitHub 仓库 URL，提取 owner 和 repo 名称

        支持格式：
        - https://github.com/owner/repo
        - https://github.com/owner/repo.git
        - git@github.com:owner/repo.git

        Returns:
            (owner, repo) 或 None（如果解析失败）
        """
        if not repo_url:
            return None

        # HTTPS 格式
        https_pattern = r"github\.com[/:]([^/]+)/([^/.]+)"
        match = re.search(https_pattern, repo_url)
        if match:
            return match.group(1), match.group(2).replace(".git", "")

        return None

    async def get_repo_info(self, owner: str, repo: str) -> dict | None:
        """获取仓库基本信息"""
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/repos/{owner}/{repo}",
                    headers=self.headers,
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    return resp.json()
                return None
            except Exception:
                return None

    async def get_commits(
        self,
        owner: str,
        repo: str,
        since: Optional[datetime] = None,
        until: Optional[datetime] = None,
        per_page: int = 100,
    ) -> list[dict]:
        """
        获取仓库提交记录

        Args:
            owner: 仓库所有者
            repo: 仓库名称
            since: 开始时间
            until: 结束时间
            per_page: 每页数量

        Returns:
            提交记录列表
        """
        params = {"per_page": per_page}
        if since:
            params["since"] = since.isoformat()
        if until:
            params["until"] = until.isoformat()

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/repos/{owner}/{repo}/commits",
                    headers=self.headers,
                    params=params,
                    timeout=15.0,
                )
                if resp.status_code == 200:
                    return resp.json()
                return []
            except Exception:
                return []

    async def get_commit_detail(self, owner: str, repo: str, sha: str) -> dict | None:
        """获取单个提交的详细信息（包含代码行数统计）"""
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/repos/{owner}/{repo}/commits/{sha}",
                    headers=self.headers,
                    timeout=10.0,
                )
                if resp.status_code == 200:
                    return resp.json()
                return None
            except Exception:
                return None

    async def get_daily_stats(
        self,
        owner: str,
        repo: str,
        target_date: date,
    ) -> dict:
        """
        获取指定日期的统计数据

        Args:
            owner: 仓库所有者
            repo: 仓库名称
            target_date: 目标日期

        Returns:
            {
                "commits_count": int,
                "additions": int,
                "deletions": int,
                "files_changed": int,
                "commits_detail": [...],
                "hourly_activity": {...}
            }
        """
        # 构建时间范围（当天 00:00:00 到 23:59:59）
        since = datetime.combine(target_date, datetime.min.time())
        until = datetime.combine(target_date, datetime.max.time())

        # 获取当天提交
        commits = await self.get_commits(owner, repo, since=since, until=until)

        result = {
            "commits_count": len(commits),
            "additions": 0,
            "deletions": 0,
            "files_changed": 0,
            "commits_detail": [],
            "hourly_activity": {},
        }

        # 初始化小时统计
        hourly = {str(h): 0 for h in range(24)}

        for commit in commits:
            sha = commit.get("sha", "")
            commit_data = commit.get("commit", {})
            message = commit_data.get("message", "").split("\n")[0][:100]  # 只取第一行，限制长度

            # 解析提交时间
            author_info = commit_data.get("author", {})
            commit_time_str = author_info.get("date", "")
            commit_hour = 0
            if commit_time_str:
                try:
                    commit_time = datetime.fromisoformat(commit_time_str.replace("Z", "+00:00"))
                    commit_hour = commit_time.hour
                except Exception:
                    pass

            # 统计小时活动
            hourly[str(commit_hour)] = hourly.get(str(commit_hour), 0) + 1

            # 获取详细统计（代码行数）
            detail = await self.get_commit_detail(owner, repo, sha)
            additions = 0
            deletions = 0
            files_count = 0

            if detail:
                stats = detail.get("stats", {})
                additions = stats.get("additions", 0)
                deletions = stats.get("deletions", 0)
                files_count = len(detail.get("files", []))

            result["additions"] += additions
            result["deletions"] += deletions
            result["files_changed"] += files_count

            result["commits_detail"].append({
                "sha": sha[:7],
                "message": message,
                "timestamp": commit_time_str,
                "additions": additions,
                "deletions": deletions,
            })

        # 只保留有数据的小时
        result["hourly_activity"] = {k: v for k, v in hourly.items() if v > 0}

        return result

    async def get_total_stats(self, owner: str, repo: str) -> dict:
        """
        获取仓库累计统计数据

        Returns:
            {
                "total_commits": int,
                "total_additions": int,
                "total_deletions": int,
            }
        """
        # 获取所有提交（最多获取最近500个）
        all_commits = []
        page = 1
        while page <= 5:  # 最多5页，每页100个
            commits = await self.get_commits(owner, repo, per_page=100)
            if not commits:
                break
            all_commits.extend(commits)
            if len(commits) < 100:
                break
            page += 1

        total_additions = 0
        total_deletions = 0

        # 为了不消耗太多 API 限额，只统计最近50个提交的代码行数
        for commit in all_commits[:50]:
            sha = commit.get("sha", "")
            detail = await self.get_commit_detail(owner, repo, sha)
            if detail:
                stats = detail.get("stats", {})
                total_additions += stats.get("additions", 0)
                total_deletions += stats.get("deletions", 0)

        return {
            "total_commits": len(all_commits),
            "total_additions": total_additions,
            "total_deletions": total_deletions,
        }

    async def get_rate_limit(self) -> dict:
        """获取当前 API 限额状态"""
        async with httpx.AsyncClient() as client:
            try:
                resp = await client.get(
                    f"{self.BASE_URL}/rate_limit",
                    headers=self.headers,
                    timeout=5.0,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get("rate", {})
                return {}
            except Exception:
                return {}


# 全局服务实例
github_service = GitHubService()
