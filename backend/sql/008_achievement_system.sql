-- 008: 成就系统
-- 为吃瓜群众提供成就徽章系统

-- 成就定义表
CREATE TABLE IF NOT EXISTS `achievement_definitions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `achievement_key` VARCHAR(64) NOT NULL COMMENT '成就唯一标识',
  `name` VARCHAR(64) NOT NULL COMMENT '成就名称',
  `description` VARCHAR(255) NOT NULL COMMENT '成就描述',
  `category` VARCHAR(32) NOT NULL COMMENT '分类: cheers/retention/social/explorer',
  `badge_icon` VARCHAR(64) NOT NULL COMMENT '徽章图标标识',
  `badge_tier` VARCHAR(16) NOT NULL DEFAULT 'bronze' COMMENT '稀有度: bronze/silver/gold/platinum',
  `points` INT NOT NULL DEFAULT 0 COMMENT '成就积分',
  `target_value` INT NOT NULL DEFAULT 1 COMMENT '目标值(如打气次数)',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序权重',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_achievement_key` (`achievement_key`),
  KEY `idx_category_active` (`category`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户成就状态表
CREATE TABLE IF NOT EXISTS `user_achievements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT NOT NULL,
  `achievement_key` VARCHAR(64) NOT NULL,
  `status` VARCHAR(16) NOT NULL DEFAULT 'locked' COMMENT 'locked/unlocked/claimed',
  `progress_value` INT NOT NULL DEFAULT 0 COMMENT '当前进度值',
  `progress_data` JSON DEFAULT NULL COMMENT '额外进度数据(如连续天数记录)',
  `unlocked_at` TIMESTAMP NULL DEFAULT NULL,
  `claimed_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_achievement` (`user_id`, `achievement_key`),
  KEY `idx_user_status` (`user_id`, `status`),
  KEY `idx_achievement_status` (`achievement_key`, `status`),
  CONSTRAINT `fk_ua_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户徽章展示槽位
CREATE TABLE IF NOT EXISTS `user_badge_showcase` (
  `user_id` INT NOT NULL,
  `slot` TINYINT UNSIGNED NOT NULL COMMENT '槽位1-3',
  `achievement_key` VARCHAR(64) NOT NULL,
  `pinned_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`, `slot`),
  KEY `idx_achievement` (`achievement_key`),
  CONSTRAINT `fk_ubs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户统计数据表(用于快速查询,定时更新)
CREATE TABLE IF NOT EXISTS `user_stats` (
  `user_id` INT NOT NULL,
  `total_cheers_given` INT NOT NULL DEFAULT 0 COMMENT '总打气次数',
  `total_cheers_with_message` INT NOT NULL DEFAULT 0 COMMENT '带留言打气次数',
  `cheer_types_used` JSON DEFAULT NULL COMMENT '使用过的打气类型',
  `consecutive_days` INT NOT NULL DEFAULT 0 COMMENT '当前连续打气天数',
  `max_consecutive_days` INT NOT NULL DEFAULT 0 COMMENT '最大连续打气天数',
  `last_cheer_date` DATE DEFAULT NULL COMMENT '上次打气日期',
  `total_points` INT NOT NULL DEFAULT 0 COMMENT '累计成就积分',
  `achievements_unlocked` INT NOT NULL DEFAULT 0 COMMENT '已解锁成就数',
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_us_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 初始化成就定义数据
INSERT INTO `achievement_definitions` (`achievement_key`, `name`, `description`, `category`, `badge_icon`, `badge_tier`, `points`, `target_value`, `sort_order`) VALUES
-- 打气类成就
('cheer_first', '初次打气', '送出你的第一份应援', 'cheers', 'heart', 'bronze', 5, 1, 100),
('cheer_10', '小小应援', '累计打气 10 次', 'cheers', 'heart', 'bronze', 10, 10, 101),
('cheer_50', '应援达人', '累计打气 50 次', 'cheers', 'heart', 'silver', 25, 50, 102),
('cheer_100', '超级粉丝', '累计打气 100 次', 'cheers', 'heart', 'gold', 50, 100, 103),
('cheer_all_types', '全套礼物', '使用过所有5种打气类型', 'cheers', 'gift', 'silver', 30, 5, 110),

-- 留言类成就
('message_first', '有话要说', '第一次带留言打气', 'social', 'message', 'bronze', 5, 1, 200),
('message_10', '话痨出道', '带留言打气 10 次', 'social', 'message', 'silver', 20, 10, 201),
('message_50', '金牌嘴替', '带留言打气 50 次', 'social', 'message', 'gold', 40, 50, 202),

-- 连续打气成就
('streak_3', '三天不断', '连续 3 天打气', 'retention', 'fire', 'bronze', 15, 3, 300),
('streak_7', '一周坚守', '连续 7 天打气', 'retention', 'fire', 'silver', 35, 7, 301),
('streak_14', '两周狂热', '连续 14 天打气', 'retention', 'fire', 'gold', 70, 14, 302),

-- 探索类成就
('explore_all_projects', '全场巡视', '给至少 5 个不同项目打过气', 'explorer', 'compass', 'silver', 25, 5, 400),
('early_supporter', '先锋观众', '在比赛开始 3 天内打气', 'explorer', 'rocket', 'bronze', 20, 1, 401);
