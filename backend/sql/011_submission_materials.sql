-- ============================================================================
-- 鸡王争霸赛 - 作品提交材料系统
-- 数据库: MySQL 8.x
-- 描述: 扩展 submissions 表并新增附件表，支持5种必填提交材料
-- ============================================================================

USE `chicken_king`;

-- ============================================================================
-- 1. 扩展 submissions 表状态枚举
--    新状态流: draft -> validating -> submitted -> approved/rejected
-- ============================================================================

-- 1.1 扩展 ENUM 类型（先添加新值，兼容旧数据）
ALTER TABLE `submissions`
  MODIFY COLUMN `status` ENUM('pending', 'draft', 'validating', 'submitted', 'approved', 'rejected')
  NOT NULL DEFAULT 'draft'
  COMMENT '提交状态: draft=草稿, validating=校验中, submitted=已提交待审, approved=已通过, rejected=已拒绝';

-- 1.2 将旧的 pending 状态映射到 submitted（待审核）
UPDATE `submissions` SET `status` = 'submitted' WHERE `status` = 'pending';

-- 1.3 移除旧的 pending 值，收敛为新枚举集合
ALTER TABLE `submissions`
  MODIFY COLUMN `status` ENUM('draft', 'validating', 'submitted', 'approved', 'rejected')
  NOT NULL DEFAULT 'draft'
  COMMENT '提交状态: draft=草稿, validating=校验中, submitted=已提交待审, approved=已通过, rejected=已拒绝';

-- ============================================================================
-- 2. 为 submissions 表添加新字段
-- ============================================================================

-- 2.1 关联报名记录（可选，便于追溯）
ALTER TABLE `submissions`
  ADD COLUMN `registration_id` INT NULL COMMENT '关联报名ID（可选）' AFTER `contest_id`;

-- 2.2 项目文档（Markdown 格式，必填）
ALTER TABLE `submissions`
  ADD COLUMN `project_doc_md` LONGTEXT NULL COMMENT '项目文档（Markdown格式，包含安装步骤、使用说明、技术架构）' AFTER `video_url`;

-- 2.3 校验相关字段
ALTER TABLE `submissions`
  ADD COLUMN `validation_summary` JSON NULL COMMENT '最近一次校验结果摘要（JSON）' AFTER `project_doc_md`,
  ADD COLUMN `validated_at` DATETIME NULL COMMENT '最近一次校验时间' AFTER `validation_summary`,
  ADD COLUMN `submitted_at` DATETIME NULL COMMENT '最终提交时间' AFTER `validated_at`;

-- 2.4 审核相关字段
ALTER TABLE `submissions`
  ADD COLUMN `reviewer_id` INT NULL COMMENT '审核人ID' AFTER `vote_count`,
  ADD COLUMN `review_comment` TEXT NULL COMMENT '审核意见' AFTER `reviewer_id`,
  ADD COLUMN `reviewed_at` DATETIME NULL COMMENT '审核时间' AFTER `review_comment`;

-- ============================================================================
-- 3. 回填 registration_id（若存在对应报名记录）
-- ============================================================================

UPDATE `submissions` s
INNER JOIN `registrations` r
  ON r.`contest_id` = s.`contest_id` AND r.`user_id` = s.`user_id`
SET s.`registration_id` = r.`id`
WHERE s.`registration_id` IS NULL;

-- ============================================================================
-- 4. 添加索引和约束
-- ============================================================================

-- 4.1 唯一约束：每个用户在每个比赛只能有一个作品提交
ALTER TABLE `submissions`
  ADD UNIQUE KEY `uq_submissions_contest_user` (`contest_id`, `user_id`);

-- 4.2 registration_id 索引和外键
ALTER TABLE `submissions`
  ADD KEY `ix_submissions_registration` (`registration_id`),
  ADD CONSTRAINT `fk_submissions_registration_id`
    FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`)
    ON DELETE SET NULL;

-- 4.3 审核人外键
ALTER TABLE `submissions`
  ADD KEY `ix_submissions_reviewer` (`reviewer_id`),
  ADD CONSTRAINT `fk_submissions_reviewer_id`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
    ON DELETE SET NULL;

-- ============================================================================
-- 5. 创建 submission_attachments 表（多附件：视频/截图/日志等）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `submission_attachments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `submission_id` INT NOT NULL COMMENT '关联作品提交ID',

  -- 附件类型
  `type` ENUM('demo_video', 'api_screenshot', 'api_log', 'doc_file', 'other')
    NOT NULL COMMENT '附件类型: demo_video=演示视频, api_screenshot=API调用截图, api_log=API调用日志, doc_file=文档文件, other=其他',

  -- 存储信息
  `storage_provider` ENUM('local', 'minio', 's3', 'oss', 'cos')
    NOT NULL DEFAULT 'local' COMMENT '存储提供方',
  `storage_key` VARCHAR(1000) NOT NULL COMMENT '存储Key（本地相对路径或对象存储Key）',

  -- 文件元信息
  `filename` VARCHAR(255) NOT NULL COMMENT '原始文件名',
  `content_type` VARCHAR(100) NULL COMMENT 'MIME类型',
  `size_bytes` BIGINT UNSIGNED NULL COMMENT '文件大小（字节）',
  `sha256` CHAR(64) NULL COMMENT 'SHA256校验和',

  -- 媒体专用字段
  `duration_seconds` INT UNSIGNED NULL COMMENT '视频/音频时长（秒）',
  `width` INT UNSIGNED NULL COMMENT '图片/视频宽度（像素）',
  `height` INT UNSIGNED NULL COMMENT '图片/视频高度（像素）',

  -- 上传状态
  `is_uploaded` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已完成上传',
  `uploaded_at` DATETIME NULL COMMENT '上传完成时间',

  -- 校验状态
  `is_valid` TINYINT(1) NULL COMMENT '是否通过校验（NULL=未校验）',
  `validation_error` VARCHAR(500) NULL COMMENT '校验错误信息',

  PRIMARY KEY (`id`),
  KEY `ix_submission_attachments_submission` (`submission_id`),
  KEY `ix_submission_attachments_type` (`submission_id`, `type`),
  KEY `ix_submission_attachments_uploaded` (`submission_id`, `is_uploaded`),
  CONSTRAINT `fk_submission_attachments_submission_id`
    FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品提交附件表';

-- ============================================================================
-- 6. 验证迁移
-- ============================================================================

SELECT '011_submission_materials.sql 迁移完成' AS message;
SELECT
  'submissions 表字段' AS info,
  COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'chicken_king' AND table_name = 'submissions';

SELECT
  'submission_attachments 表已创建' AS info,
  COUNT(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'chicken_king' AND table_name = 'submission_attachments';
