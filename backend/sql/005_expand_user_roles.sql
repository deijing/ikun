-- ============================================================================
-- 005 - 扩展用户角色：admin / contestant / spectator
-- 数据库: MySQL 8.x
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/005_expand_user_roles.sql
-- ============================================================================

USE `chicken_king`;
SET NAMES utf8mb4;

-- 1) 先扩展 ENUM，保留历史值 'user'，并把默认值切到 spectator
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('user', 'admin', 'contestant', 'spectator')
  NOT NULL DEFAULT 'spectator'
  COMMENT '用户角色: admin=管理员, contestant=参赛者, spectator=吃瓜用户';

-- 2) 迁移历史 user -> spectator
UPDATE `users`
SET `role` = 'spectator'
WHERE `role` = 'user';

-- 3) 将已有报名记录的用户升级为 contestant
UPDATE `users` u
JOIN `registrations` r ON r.user_id = u.id
SET u.`role` = 'contestant'
WHERE u.`role` = 'spectator';

-- 4) 收敛 ENUM：移除历史值 'user'
ALTER TABLE `users`
  MODIFY COLUMN `role` ENUM('admin', 'contestant', 'spectator')
  NOT NULL DEFAULT 'spectator'
  COMMENT '用户角色: admin=管理员, contestant=参赛者, spectator=吃瓜用户';

-- 5) 添加索引以优化按角色查询
-- (role 字段已有索引，无需重复添加)
