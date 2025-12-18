-- ============================================================================
-- 鸡王争霸赛 - GitHub 统计与互动功能表
-- ============================================================================

USE `chicken_king`;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
-- GitHub 每日统计表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `github_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `registration_id` INT NOT NULL COMMENT '关联报名ID',

  -- 统计日期
  `stat_date` DATE NOT NULL COMMENT '统计日期',

  -- GitHub 仓库信息
  `repo_url` VARCHAR(500) NOT NULL COMMENT '仓库地址',
  `repo_owner` VARCHAR(100) NOT NULL COMMENT '仓库所有者',
  `repo_name` VARCHAR(100) NOT NULL COMMENT '仓库名称',

  -- 当日统计数据
  `commits_count` INT NOT NULL DEFAULT 0 COMMENT '当日提交次数',
  `additions` INT NOT NULL DEFAULT 0 COMMENT '当日新增行数',
  `deletions` INT NOT NULL DEFAULT 0 COMMENT '当日删除行数',
  `files_changed` INT NOT NULL DEFAULT 0 COMMENT '当日修改文件数',

  -- 累计统计数据
  `total_commits` INT NOT NULL DEFAULT 0 COMMENT '累计提交次数',
  `total_additions` INT NOT NULL DEFAULT 0 COMMENT '累计新增行数',
  `total_deletions` INT NOT NULL DEFAULT 0 COMMENT '累计删除行数',

  -- 提交详情
  `commits_detail` JSON NULL COMMENT '当日提交详情',
  `hourly_activity` JSON NULL COMMENT '按小时统计',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_github_stats_reg_date` (`registration_id`, `stat_date`),
  KEY `ix_github_stats_date` (`stat_date`),
  KEY `ix_github_stats_registration` (`registration_id`),
  CONSTRAINT `fk_github_stats_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GitHub每日统计表';

-- ============================================================================
-- GitHub 同步日志表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `github_sync_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `registration_id` INT NOT NULL COMMENT '关联报名ID',

  -- 同步信息
  `sync_type` VARCHAR(20) NOT NULL COMMENT '同步类型: hourly/daily/manual',
  `status` VARCHAR(20) NOT NULL COMMENT '状态: success/failed/skipped',
  `error_message` TEXT NULL COMMENT '错误信息',

  -- API 调用信息
  `api_calls_used` INT NOT NULL DEFAULT 0 COMMENT '消耗的API调用次数',
  `rate_limit_remaining` INT NULL COMMENT '剩余API限额',

  PRIMARY KEY (`id`),
  KEY `ix_github_sync_log_registration` (`registration_id`),
  KEY `ix_github_sync_log_created` (`created_at`),
  CONSTRAINT `fk_github_sync_logs_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='GitHub同步日志表';

-- ============================================================================
-- 打气记录表
-- ============================================================================
CREATE TABLE IF NOT EXISTS `cheers` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `user_id` INT NOT NULL COMMENT '打气用户ID',
  `registration_id` INT NOT NULL COMMENT '被打气的报名ID',

  -- 打气类型
  `cheer_type` ENUM('cheer', 'coffee', 'energy', 'pizza', 'star') NOT NULL DEFAULT 'cheer' COMMENT '打气类型',

  -- 留言
  `message` VARCHAR(200) NULL COMMENT '打气留言',

  PRIMARY KEY (`id`),
  KEY `ix_cheers_user` (`user_id`),
  KEY `ix_cheers_registration` (`registration_id`),
  KEY `ix_cheers_created` (`created_at`),
  CONSTRAINT `fk_cheers_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_cheers_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打气记录表';

-- ============================================================================
-- 打气统计表（聚合表）
-- ============================================================================
CREATE TABLE IF NOT EXISTS `cheer_stats` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `registration_id` INT NOT NULL COMMENT '关联报名ID',

  -- 各类型统计
  `cheer_count` INT NOT NULL DEFAULT 0 COMMENT '普通打气数',
  `coffee_count` INT NOT NULL DEFAULT 0 COMMENT '咖啡数',
  `energy_count` INT NOT NULL DEFAULT 0 COMMENT '能量饮料数',
  `pizza_count` INT NOT NULL DEFAULT 0 COMMENT '披萨数',
  `star_count` INT NOT NULL DEFAULT 0 COMMENT '星星数',
  `total_count` INT NOT NULL DEFAULT 0 COMMENT '总打气数',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cheer_stats_registration` (`registration_id`),
  CONSTRAINT `fk_cheer_stats_registration` FOREIGN KEY (`registration_id`) REFERENCES `registrations` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='打气统计表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 为现有报名记录初始化打气统计
-- ============================================================================
INSERT INTO `cheer_stats` (`registration_id`)
SELECT `id` FROM `registrations`
WHERE `id` NOT IN (SELECT `registration_id` FROM `cheer_stats`);

SELECT '新表创建完成！' AS message;
