"""
作品提交模型

定义作品提交表和附件表的数据模型。
支持5种材料：项目源码、演示视频（可选）、项目文档、API调用证明、参赛报名表。
"""
import enum
from typing import TYPE_CHECKING

from sqlalchemy import (
    BigInteger,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    Enum as SQLEnum,
)
from sqlalchemy.orm import relationship

from app.models.base import BaseModel

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.contest import Contest
    from app.models.registration import Registration


class SubmissionStatus(str, enum.Enum):
    """作品提交状态枚举"""
    DRAFT = "draft"            # 草稿（材料未齐全）
    VALIDATING = "validating"  # 校验中
    SUBMITTED = "submitted"    # 已提交（待审核）
    APPROVED = "approved"      # 已通过
    REJECTED = "rejected"      # 已拒绝


class AttachmentType(str, enum.Enum):
    """附件类型枚举"""
    DEMO_VIDEO = "demo_video"        # 演示视频（MP4/AVI，3-5分钟）
    API_SCREENSHOT = "api_screenshot"  # API调用证明截图
    API_LOG = "api_log"              # API调用证明日志
    DOC_FILE = "doc_file"            # 文档文件（备用）
    OTHER = "other"                  # 其他附件


class StorageProvider(str, enum.Enum):
    """存储提供方枚举"""
    LOCAL = "local"    # 本地存储
    MINIO = "minio"    # MinIO
    S3 = "s3"          # AWS S3
    OSS = "oss"        # 阿里云 OSS
    COS = "cos"        # 腾讯云 COS


class Submission(BaseModel):
    """
    作品提交表

    每个用户在每个比赛只能提交一个作品。
    作品提交需要包含必填材料（finalize时强校验，演示视频可选）：
    1. 项目源码 - repo_url 字段
    2. 演示视频（可选） - 通过 attachments 关联
    3. 项目文档 - project_doc_md 字段
    4. API调用证明 - 通过 attachments 关联（截图+日志）
    5. 参赛报名表 - 通过 registration_id 关联
    """
    __tablename__ = "submissions"

    # 关联字段
    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
        comment="提交者ID"
    )
    contest_id = Column(
        Integer,
        ForeignKey("contests.id"),
        nullable=False,
        comment="关联比赛ID"
    )
    registration_id = Column(
        Integer,
        ForeignKey("registrations.id"),
        nullable=True,
        comment="关联报名ID（可选，便于追溯）"
    )

    # 作品基本信息
    title = Column(String(200), nullable=False, comment="作品标题")
    description = Column(Text, nullable=True, comment="作品描述")
    repo_url = Column(
        String(500),
        nullable=False,
        comment="项目源码仓库URL（GitHub/Gitee，必须Public）"
    )
    demo_url = Column(String(500), nullable=True, comment="在线演示地址")
    video_url = Column(String(500), nullable=True, comment="视频URL（兼容字段）")

    # 项目文档（Markdown格式）
    project_doc_md = Column(
        Text,
        nullable=True,
        comment="项目文档（Markdown格式，包含安装步骤、使用说明、技术架构）"
    )

    # 校验相关
    validation_summary = Column(
        JSON,
        nullable=True,
        comment="最近一次校验结果摘要（JSON格式）"
    )
    validated_at = Column(DateTime, nullable=True, comment="最近一次校验时间")
    submitted_at = Column(DateTime, nullable=True, comment="最终提交时间")

    # 状态
    status = Column(
        SQLEnum(
            'draft', 'validating', 'submitted', 'approved', 'rejected',
            name='submissionstatus'
        ),
        default='draft',
        nullable=False,
        comment="提交状态"
    )
    vote_count = Column(Integer, default=0, nullable=False, comment="投票数")

    # 审核相关（旧字段，保留兼容）
    reviewer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True,
        comment="审核人ID（旧字段）"
    )
    review_comment = Column(Text, nullable=True, comment="审核意见（旧字段）")
    reviewed_at = Column(DateTime, nullable=True, comment="审核时间（旧字段）")

    # 评分统计缓存字段（由评审系统异步更新）
    final_score = Column(
        Numeric(5, 2),
        nullable=True,
        comment="最终得分(去掉最高最低后平均)"
    )
    review_count = Column(
        Integer,
        default=0,
        nullable=False,
        comment="评分数量"
    )
    score_updated_at = Column(
        DateTime,
        nullable=True,
        comment="评分统计更新时间"
    )

    # 关系定义
    user = relationship(
        "User",
        foreign_keys=[user_id],
        backref="submissions"
    )
    contest = relationship("Contest", backref="submissions")
    registration = relationship("Registration", backref="submissions")
    reviewer = relationship(
        "User",
        foreign_keys=[reviewer_id],
        backref="reviewed_submissions"
    )
    attachments = relationship(
        "SubmissionAttachment",
        back_populates="submission",
        cascade="all, delete-orphan",
        lazy="selectin"
    )
    reviews = relationship(
        "SubmissionReview",
        back_populates="submission",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    @property
    def status_enum(self) -> SubmissionStatus:
        """获取状态枚举值"""
        return SubmissionStatus(self.status) if self.status else SubmissionStatus.DRAFT

    @property
    def is_editable(self) -> bool:
        """是否可编辑（仅草稿和被拒绝状态可编辑，校验中不可编辑）"""
        return self.status in {
            SubmissionStatus.DRAFT.value,
            SubmissionStatus.REJECTED.value,
        }

    @property
    def is_submitted(self) -> bool:
        """是否已提交"""
        return self.status in {
            SubmissionStatus.SUBMITTED.value,
            SubmissionStatus.APPROVED.value,
        }


class SubmissionAttachment(BaseModel):
    """
    作品提交附件表

    支持存储多种类型的附件：
    - demo_video: 演示视频（MP4/AVI，3-5分钟）
    - api_screenshot: API调用证明截图
    - api_log: API调用证明日志
    - doc_file: 文档文件（备用）
    - other: 其他附件
    """
    __tablename__ = "submission_attachments"

    # 关联字段
    submission_id = Column(
        Integer,
        ForeignKey("submissions.id"),
        nullable=False,
        comment="关联作品提交ID"
    )

    # 附件类型
    type = Column(
        SQLEnum(
            'demo_video', 'api_screenshot', 'api_log', 'doc_file', 'other',
            name='attachmenttype'
        ),
        nullable=False,
        comment="附件类型"
    )

    # 存储信息
    storage_provider = Column(
        SQLEnum(
            'local', 'minio', 's3', 'oss', 'cos',
            name='storageprovider'
        ),
        default='local',
        nullable=False,
        comment="存储提供方"
    )
    storage_key = Column(
        String(1000),
        nullable=False,
        comment="存储Key（本地相对路径或对象存储Key）"
    )

    # 文件元信息
    filename = Column(String(255), nullable=False, comment="原始文件名")
    content_type = Column(String(100), nullable=True, comment="MIME类型")
    size_bytes = Column(BigInteger, nullable=True, comment="文件大小（字节）")
    sha256 = Column(String(64), nullable=True, comment="SHA256校验和")

    # 媒体专用字段
    duration_seconds = Column(Integer, nullable=True, comment="视频/音频时长（秒）")
    width = Column(Integer, nullable=True, comment="图片/视频宽度（像素）")
    height = Column(Integer, nullable=True, comment="图片/视频高度（像素）")

    # 上传状态
    is_uploaded = Column(
        Boolean,
        default=False,
        nullable=False,
        comment="是否已完成上传"
    )
    uploaded_at = Column(DateTime, nullable=True, comment="上传完成时间")

    # 校验状态
    is_valid = Column(Boolean, nullable=True, comment="是否通过校验")
    validation_error = Column(String(500), nullable=True, comment="校验错误信息")

    # 关系定义
    submission = relationship("Submission", back_populates="attachments")

    @property
    def type_enum(self) -> AttachmentType:
        """获取类型枚举值"""
        return AttachmentType(self.type) if self.type else AttachmentType.OTHER

    @property
    def storage_provider_enum(self) -> StorageProvider:
        """获取存储提供方枚举值"""
        return StorageProvider(self.storage_provider) if self.storage_provider else StorageProvider.LOCAL
