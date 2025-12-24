-- ============================================================================
-- ikuncode - 作品评审分配
-- 数据库: MySQL 8.x
-- 描述: 新增 project_review_assignments 表，支持管理员分配评审员
-- ============================================================================

USE `chicken_king`;

-- ============================================================================
-- 1. 作品评审分配表（project_review_assignments）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `project_review_assignments` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `reviewer_id` INT NOT NULL COMMENT '评审员用户ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_review_assignment` (`project_id`, `reviewer_id`),
  KEY `ix_project_review_assignments_project` (`project_id`),
  KEY `ix_project_review_assignments_reviewer` (`reviewer_id`),
  CONSTRAINT `fk_project_review_assignments_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_project_review_assignments_reviewer_id`
    FOREIGN KEY (`reviewer_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品评审分配表';

-- ============================================================================
-- 2. 验证迁移
-- ============================================================================

SELECT '027_project_review_assignments.sql 迁移完成' AS message;
