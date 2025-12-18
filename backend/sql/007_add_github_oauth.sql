-- 007: 添加 GitHub OAuth 登录支持
-- 为 users 表添加 GitHub 相关字段

ALTER TABLE `users`
  ADD COLUMN `github_id` VARCHAR(50) NULL AFTER `linux_do_avatar_template`,
  ADD COLUMN `github_username` VARCHAR(100) NULL AFTER `github_id`,
  ADD COLUMN `github_avatar_url` VARCHAR(500) NULL AFTER `github_username`,
  ADD COLUMN `github_email` VARCHAR(255) NULL AFTER `github_avatar_url`;

-- 添加唯一索引
ALTER TABLE `users`
  ADD UNIQUE KEY `uq_users_github_id` (`github_id`);

-- 添加普通索引加速查询
ALTER TABLE `users`
  ADD INDEX `idx_users_github_username` (`github_username`);
