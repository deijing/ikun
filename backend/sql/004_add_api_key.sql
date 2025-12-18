-- ============================================================================
-- 鸡王争霸赛 - 添加 API Key 字段
-- 用于存储选手的 API Key，支持额度消耗排行榜查询
-- ============================================================================

USE `chicken_king`;

-- 添加 api_key 字段到 registrations 表
ALTER TABLE `registrations`
ADD COLUMN `api_key` VARCHAR(255) NULL COMMENT 'API Key（用于额度消耗排行榜）' AFTER `repo_url`;

-- 规范化空字符串，避免出现 "" 和 NULL 混用
UPDATE `registrations` SET `api_key` = NULL WHERE `api_key` = '';

-- 添加唯一索引（用于检查 key 是否已存在，并防止多人复用同一个 key）
ALTER TABLE `registrations`
ADD UNIQUE INDEX `uq_registration_api_key` (`api_key`);

SELECT '已添加 api_key 字段到 registrations 表' AS message;
