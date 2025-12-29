"""
作品域名规则
"""
from app.core.config import settings


def build_project_domain(submission_id: int) -> str:
    """生成作品访问域名"""
    suffix = settings.PROJECT_DOMAIN_SUFFIX.lstrip(".")
    template = settings.PROJECT_DOMAIN_TEMPLATE
    return template.format(submission_id=submission_id, suffix=suffix)
