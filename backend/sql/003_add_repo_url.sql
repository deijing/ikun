-- ============================================================================
-- 鸡王争霸赛 - 添加 GitHub 仓库地址字段
-- ============================================================================

USE `chicken_king`;

-- 添加 repo_url 字段到 registrations 表
ALTER TABLE `registrations`
ADD COLUMN `repo_url` VARCHAR(500) NULL COMMENT 'GitHub 仓库地址' AFTER `tech_stack`;

-- 为现有模拟数据添加仓库地址
UPDATE `registrations` SET `repo_url` = 'https://github.com/langgenius/dify' WHERE `id` = 3;
UPDATE `registrations` SET `repo_url` = 'https://github.com/excalidraw/excalidraw' WHERE `id` = 4;
UPDATE `registrations` SET `repo_url` = 'https://github.com/portainer/portainer' WHERE `id` = 5;
UPDATE `registrations` SET `repo_url` = 'https://github.com/toeverything/AFFiNE' WHERE `id` = 6;
UPDATE `registrations` SET `repo_url` = 'https://github.com/AykutSarac/jsoncrack.com' WHERE `id` = 7;
UPDATE `registrations` SET `repo_url` = 'https://github.com/appsmithorg/appsmith' WHERE `id` = 8;
UPDATE `registrations` SET `repo_url` = 'https://github.com/apache/apisix' WHERE `id` = 9;
UPDATE `registrations` SET `repo_url` = 'https://github.com/AmruthPillworx/Starter-Resume' WHERE `id` = 10;
UPDATE `registrations` SET `repo_url` = 'https://github.com/louislam/uptime-kuma' WHERE `id` = 11;
UPDATE `registrations` SET `repo_url` = 'https://github.com/answerdev/answer' WHERE `id` = 12;

SELECT '字段添加完成！' AS message;
SELECT id, title, repo_url FROM registrations;
