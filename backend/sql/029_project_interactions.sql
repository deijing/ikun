-- ============================================================================
-- ikuncode - 作品互动（点赞/收藏）
-- 数据库: MySQL 8.x
-- 描述: 新增 project_likes / project_favorites 表
-- ============================================================================

USE `chicken_king`;

-- ============================================================================
-- 1. 作品点赞表（project_likes）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `project_likes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `user_id` INT NOT NULL COMMENT '点赞用户ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_like` (`project_id`, `user_id`),
  KEY `ix_project_likes_project` (`project_id`),
  KEY `ix_project_likes_user` (`user_id`),
  CONSTRAINT `fk_project_likes_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_project_likes_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品点赞表';

-- ============================================================================
-- 2. 作品收藏表（project_favorites）
-- ============================================================================

CREATE TABLE IF NOT EXISTS `project_favorites` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  `project_id` INT NOT NULL COMMENT '关联作品ID',
  `user_id` INT NOT NULL COMMENT '收藏用户ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_favorite` (`project_id`, `user_id`),
  KEY `ix_project_favorites_project` (`project_id`),
  KEY `ix_project_favorites_user` (`user_id`),
  CONSTRAINT `fk_project_favorites_project_id`
    FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_project_favorites_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品收藏表';

-- ============================================================================
-- 3. 验证迁移
-- ============================================================================

SELECT '029_project_interactions.sql 迁移完成' AS message;
