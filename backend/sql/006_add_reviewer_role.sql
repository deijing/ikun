-- ============================================================================
-- 006 - 添加评审员角色
-- 数据库: MySQL 8.x
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/006_add_reviewer_role.sql
-- ============================================================================

USE `chicken_king`;
SET NAMES utf8mb4;

-- 1) 扩展 ENUM，添加 'reviewer' 角色
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'contestant', 'spectator', 'reviewer')
  NOT NULL DEFAULT 'spectator'
  COMMENT '用户角色: admin=管理员, contestant=参赛者, spectator=吃瓜用户, reviewer=评审员';

-- 2) （可选）将部分用户角色设为评审员，用于测试或初始化
-- UPDATE `users`
-- SET `role` = 'reviewer'
-- WHERE `id` = [某些用户ID];

-- 3) 如果之前有临时的评审员角色，这里可以进行数据迁移，例如：
-- UPDATE `users`
-- SET `role` = 'reviewer'
-- WHERE `role` = 'some_temp_reviewer_role';