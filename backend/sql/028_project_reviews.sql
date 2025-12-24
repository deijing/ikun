-- ============================================================================
-- ikuncode - 作品评审评分
-- 数据库: MySQL 8.x
-- 描述: 新增 project_reviews 表，记录评审员评分
-- ============================================================================

USE `chicken_king`;

-- ============================================================================
-- 1. 作品评审评分表（project_reviews）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `project_reviews` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `reviewer_id` INT NOT NULL COMMENT '评审员用户ID',
  `score` SMALLINT NOT NULL COMMENT '评分(1-100)',
  `comment` VARCHAR(2000) NULL COMMENT '评审意见(可选)',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_reviewer` (`project_id`, `reviewer_id`),
  KEY `ix_project_reviews_project` (`project_id`),
  KEY `ix_project_reviews_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_project_reviews_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_project_reviews_reviewer_id`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品评审评分表';

-- ============================================================================
-- 2. 验证迁移
-- ============================================================================

SELECT '028_project_reviews.sql 迁移完成' AS message;
