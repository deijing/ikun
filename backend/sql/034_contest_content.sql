-- ============================================================================
-- 比赛内容配置
-- 数据库: MySQL 8.x
-- 描述: 为 contests 表增加内容配置字段
-- ============================================================================

USE `chicken_king`;

ALTER TABLE `contests`
  ADD COLUMN `banner_url` VARCHAR(500) NULL COMMENT '比赛 Banner 图片' AFTER `visibility`,
  ADD COLUMN `rules_md` LONGTEXT NULL COMMENT '比赛规则（Markdown）' AFTER `banner_url`,
  ADD COLUMN `prizes_md` LONGTEXT NULL COMMENT '奖项说明（Markdown）' AFTER `rules_md`,
  ADD COLUMN `review_rules_md` LONGTEXT NULL COMMENT '评审规则（Markdown）' AFTER `prizes_md`,
  ADD COLUMN `faq_md` LONGTEXT NULL COMMENT '常见问题（Markdown）' AFTER `review_rules_md`;

SELECT '034_contest_content.sql 迁移完成' AS message;
