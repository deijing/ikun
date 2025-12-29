"""
邮件发送服务
"""
import smtplib
from email.message import EmailMessage

from app.core.config import settings


class EmailServiceError(RuntimeError):
    """邮件发送异常"""


def _build_from_header() -> str:
    """构建发件人显示"""
    if settings.SMTP_FROM_NAME:
        return f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    return settings.SMTP_FROM_EMAIL or ""


def send_email(to_email: str, subject: str, content: str, html: bool = False) -> None:
    """发送邮件"""
    if not settings.SMTP_HOST or not settings.SMTP_FROM_EMAIL:
        raise EmailServiceError("SMTP 未配置，无法发送邮件")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = _build_from_header()
    msg["To"] = to_email
    if html:
        msg.add_alternative(content, subtype="html")
    else:
        msg.set_content(content)

    if settings.SMTP_USE_SSL:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
            server.send_message(msg)
        return

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
        server.ehlo()
        if settings.SMTP_USE_TLS:
            server.starttls()
            server.ehlo()
        if settings.SMTP_USERNAME:
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD or "")
        server.send_message(msg)
