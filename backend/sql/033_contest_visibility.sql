-- ============================================================================
-- 比赛可见性配置
-- 数据库: MySQL 8.x
-- 描述: 为 contests 表增加 visibility 字段
-- ============================================================================

USE `chicken_king`;

ALTER TABLE `contests`
  ADD COLUMN `visibility` ENUM('draft', 'published', 'hidden')
  NOT NULL DEFAULT 'published'
  COMMENT '赛事可见性' AFTER `description`;

SELECT '033_contest_visibility.sql 迁移完成' AS message;
