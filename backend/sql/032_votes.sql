-- ============================================================================
-- 投票功能落地
-- 数据库: MySQL 8.x
-- 描述: 新增 votes 表并补充 submissions.vote_count 字段
-- ============================================================================

USE `chicken_king`;

-- 1. submissions 表补充 vote_count（如已存在则跳过）
ALTER TABLE `submissions`
  ADD COLUMN `vote_count` INT NOT NULL DEFAULT 0 COMMENT '票数' AFTER `status`;

-- 2. votes 表（投票记录）
CREATE TABLE IF NOT EXISTS `votes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `user_id` INT NOT NULL COMMENT '投票用户ID',
  `submission_id` INT NOT NULL COMMENT '作品ID',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vote_user_submission` (`user_id`, `submission_id`),
  KEY `ix_votes_submission` (`submission_id`),
  CONSTRAINT `fk_votes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_votes_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票记录表';

-- 3. 回填票数
UPDATE `submissions` s
SET s.`vote_count` = (
  SELECT COUNT(*) FROM `votes` v WHERE v.`submission_id` = s.`id`
);

SELECT '032_votes.sql 迁移完成' AS message;
