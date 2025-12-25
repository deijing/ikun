-- ============================================================================
-- ikuncode - 作品与部署提交流程（Project + Submission）
-- 数据库: MySQL 8.x
-- 描述: 新增 projects 与 project_submissions 表，支持镜像部署链路
-- ============================================================================

USE `chicken_king`;

-- ============================================================================
-- 1. 作品表（projects）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '创建者ID',

  `title` VARCHAR(200) NOT NULL COMMENT '作品名称',
  `summary` VARCHAR(500) NULL COMMENT '作品简介',
  `description` TEXT NULL COMMENT '作品详情',
  `repo_url` VARCHAR(500) NULL COMMENT '开源仓库地址',
  `cover_image_url` VARCHAR(500) NULL COMMENT '封面图',
  `screenshot_urls` JSON NULL COMMENT '截图列表',
  `readme_url` VARCHAR(500) NULL COMMENT 'README 链接',
  `demo_url` VARCHAR(500) NULL COMMENT '演示地址',

  `status` ENUM('draft', 'submitted', 'online', 'offline')
    NOT NULL DEFAULT 'draft' COMMENT '作品状态',
  `current_submission_id` INT NULL COMMENT '当前线上 submission_id',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_projects_contest_user` (`contest_id`, `user_id`),
  KEY `ix_projects_contest` (`contest_id`),
  KEY `ix_projects_user` (`user_id`),
  KEY `ix_projects_status` (`status`),
  CONSTRAINT `fk_projects_contest_id`
    FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_projects_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品表';

-- ============================================================================
-- 2. 作品部署提交表（project_submissions）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `project_submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '提交者ID',

  `image_ref` VARCHAR(500) NOT NULL COMMENT '镜像引用（含 digest）',
  `image_registry` VARCHAR(100) NULL COMMENT '镜像仓库域名',
  `image_repo` VARCHAR(300) NULL COMMENT '镜像仓库路径',
  `image_digest` VARCHAR(128) NULL COMMENT '镜像 digest',

  `status` ENUM('created', 'queued', 'pulling', 'deploying', 'healthchecking', 'online', 'failed', 'stopped')
    NOT NULL DEFAULT 'created' COMMENT '提交状态',
  `status_message` VARCHAR(500) NULL COMMENT '状态说明',
  `error_code` VARCHAR(100) NULL COMMENT '错误码',
  `log` LONGTEXT NULL COMMENT '部署日志',
  `domain` VARCHAR(255) NULL COMMENT '访问域名',
  `status_history` JSON NULL COMMENT '状态历史',

  `submitted_at` DATETIME(6) NULL COMMENT '提交时间',
  `online_at` DATETIME(6) NULL COMMENT '上线时间',
  `failed_at` DATETIME(6) NULL COMMENT '失败时间',

  PRIMARY KEY (`id`),
  KEY `ix_project_submissions_project` (`project_id`),
  KEY `ix_project_submissions_contest` (`contest_id`),
  KEY `ix_project_submissions_user` (`user_id`),
  KEY `ix_project_submissions_status` (`status`),
  KEY `ix_project_submissions_submitted` (`submitted_at`),
  CONSTRAINT `fk_project_submissions_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_project_submissions_contest_id`
    FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_project_submissions_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品部署提交表';

-- ============================================================================
-- 3. 验证迁移
-- ============================================================================

SELECT '026_project_deployments.sql 迁移完成' AS message;
