"""
用户模型
"""
from sqlalchemy import Column, String, Boolean, Enum as SQLEnum, Integer, DateTime
from sqlalchemy.orm import relationship
import enum

from app.models.base import BaseModel


class UserRole(str, enum.Enum):
    """用户角色枚举"""
    ADMIN = "admin"            # 管理员
    REVIEWER = "reviewer"      # 评审员
    CONTESTANT = "contestant"  # 参赛者
    SPECTATOR = "spectator"    # 吃瓜用户（观众）


class User(BaseModel):
    """用户表"""
    __tablename__ = "users"

    # 本地账号字段（OAuth 用户可能为空）
    email = Column(String(255), unique=True, index=True, nullable=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=True)
    role = Column(
        SQLEnum('admin', 'reviewer', 'contestant', 'spectator', name='userrole'),
        default='spectator'
    )
    # 原始角色（用于管理员角色切换功能，记录用户的原始身份）
    original_role = Column(
        SQLEnum('admin', 'reviewer', 'contestant', 'spectator', name='userrole'),
        nullable=True
    )
    is_active = Column(Boolean, default=True)
    avatar_url = Column(String(500), nullable=True)

    # Linux.do OAuth2
    linux_do_id = Column(String(50), unique=True, index=True, nullable=True)
    linux_do_username = Column(String(50), nullable=True)
    display_name = Column(String(100), nullable=True)
    linux_do_avatar_template = Column(String(500), nullable=True)
    trust_level = Column(Integer, nullable=True)
    is_silenced = Column(Boolean, default=False)

    # GitHub OAuth2
    github_id = Column(String(50), unique=True, index=True, nullable=True)
    github_username = Column(String(100), nullable=True)
    github_avatar_url = Column(String(500), nullable=True)
    github_email = Column(String(255), nullable=True)

    # 角色选择引导状态
    role_selected = Column(Boolean, default=False, nullable=False)
    role_selected_at = Column(DateTime, nullable=True)

    # Relationships
    achievements = relationship("UserAchievement", back_populates="user", lazy="dynamic")
    stats = relationship("UserStats", back_populates="user", uselist=False)

    @property
    def role_enum(self) -> UserRole:
        """获取 role 的枚举类型"""
        return UserRole(self.role) if self.role else UserRole.SPECTATOR

    @property
    def is_admin(self) -> bool:
        """是否为管理员"""
        return self.role == UserRole.ADMIN.value

    @property
    def is_reviewer(self) -> bool:
        """是否为评审员"""
        return self.role == UserRole.REVIEWER.value

    @property
    def is_contestant(self) -> bool:
        """是否为参赛者"""
        return self.role == UserRole.CONTESTANT.value

    @property
    def is_spectator(self) -> bool:
        """是否为吃瓜用户"""
        return self.role == UserRole.SPECTATOR.value

    @property
    def has_password(self) -> bool:
        """是否设置了本地密码"""
        return bool(self.hashed_password)
