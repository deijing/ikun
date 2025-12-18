-- 积分兑换系统
-- Migration: 017_exchange_system.sql

-- 积分兑换商品配置表
CREATE TABLE IF NOT EXISTS exchange_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '商品名称',
    description VARCHAR(500) DEFAULT NULL COMMENT '商品描述',
    item_type ENUM('LOTTERY_TICKET', 'SCRATCH_TICKET', 'GACHA_TICKET', 'API_KEY', 'ITEM') NOT NULL COMMENT '商品类型',
    item_value VARCHAR(100) DEFAULT NULL COMMENT '商品值（如道具类型）',
    cost_points INT NOT NULL COMMENT '所需积分',
    stock INT DEFAULT NULL COMMENT '库存（NULL为无限）',
    daily_limit INT DEFAULT NULL COMMENT '每人每日限购',
    total_limit INT DEFAULT NULL COMMENT '每人总限购',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否上架',
    sort_order INT NOT NULL DEFAULT 0 COMMENT '排序',
    icon VARCHAR(50) DEFAULT NULL COMMENT '图标名称',
    is_hot TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否热门',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active_sort (is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分兑换商品配置';

-- 积分兑换记录表
CREATE TABLE IF NOT EXISTS exchange_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL COMMENT '商品名称快照',
    item_type VARCHAR(50) NOT NULL COMMENT '商品类型快照',
    cost_points INT NOT NULL COMMENT '消费积分',
    quantity INT NOT NULL DEFAULT 1 COMMENT '兑换数量',
    reward_value VARCHAR(255) DEFAULT NULL COMMENT '发放的奖励值',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_user_item (user_id, item_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES exchange_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='积分兑换记录';

-- 用户兑换券额度表（免费使用次数）
CREATE TABLE IF NOT EXISTS user_exchange_quotas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    quota_type VARCHAR(50) NOT NULL COMMENT '额度类型',
    quantity INT NOT NULL DEFAULT 0 COMMENT '剩余数量',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY idx_user_quota_type (user_id, quota_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户兑换券额度';

-- 初始化兑换商品数据
INSERT INTO exchange_items (name, description, item_type, cost_points, daily_limit, total_limit, sort_order, icon, is_hot) VALUES
-- 抽奖券
('幸运抽奖券', '免费参与一次大转盘抽奖', 'LOTTERY_TICKET', 50, 5, NULL, 10, 'ticket', 1),
-- 刮刮乐券
('刮刮乐券', '免费获得一张刮刮乐卡', 'SCRATCH_TICKET', 80, 3, NULL, 20, 'card', 1),
-- 扭蛋券
('扭蛋机券', '免费扭一次扭蛋机', 'GACHA_TICKET', 100, 2, NULL, 30, 'gift', 1),
-- API Key 兑换码（高价值限量商品）
('API Key 兑换码', '价值 $5 的 API 额度兑换码，先到先得', 'API_KEY', 2000, 1, 1, 100, 'key', 0);

-- 添加 EXCHANGE_SPEND 到积分变动原因枚举（如果不存在）
-- 注意：这个已经在 Python 模型中定义，数据库的 ENUM 需要更新
ALTER TABLE points_ledger MODIFY COLUMN reason ENUM(
    'SIGNIN_DAILY', 'SIGNIN_STREAK_BONUS',
    'CHEER_GIVE', 'CHEER_RECEIVE',
    'LOTTERY_SPEND', 'LOTTERY_WIN',
    'BET_STAKE', 'BET_PAYOUT', 'BET_REFUND',
    'ADMIN_GRANT', 'ADMIN_DEDUCT',
    'ACHIEVEMENT_CLAIM', 'EASTER_EGG_REDEEM',
    'GACHA_SPEND', 'EXCHANGE_SPEND'
) NOT NULL;
