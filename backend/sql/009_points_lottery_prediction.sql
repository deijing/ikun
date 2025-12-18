-- =====================================================
-- 009_points_lottery_prediction.sql
-- 积分系统、每日签到、抽奖、竞猜系统
-- =====================================================

-- 1. 积分账本（核心表，所有积分变动可追溯）
CREATE TABLE IF NOT EXISTS points_ledger (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    amount INT NOT NULL COMMENT '变动金额，正数为收入，负数为支出',
    balance_after INT NOT NULL COMMENT '变动后余额',
    reason ENUM(
        'SIGNIN_DAILY',           -- 每日签到
        'SIGNIN_STREAK_BONUS',    -- 连续签到奖励
        'CHEER_GIVE',             -- 给别人打气获得
        'CHEER_RECEIVE',          -- 被打气获得
        'LOTTERY_SPEND',          -- 抽奖消费
        'LOTTERY_WIN',            -- 抽奖获得（安慰奖积分）
        'BET_STAKE',              -- 竞猜下注
        'BET_PAYOUT',             -- 竞猜赢得
        'BET_REFUND',             -- 竞猜退款
        'ADMIN_GRANT',            -- 管理员发放
        'ADMIN_DEDUCT',           -- 管理员扣除
        'ACHIEVEMENT_CLAIM'       -- 成就领取
    ) NOT NULL,
    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联类型',
    ref_id INT DEFAULT NULL COMMENT '关联ID',
    description VARCHAR(255) DEFAULT NULL COMMENT '描述',
    request_id VARCHAR(64) DEFAULT NULL COMMENT '幂等请求ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_ref (ref_type, ref_id),
    UNIQUE INDEX idx_request_id (request_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 用户积分余额缓存（提高查询性能）
CREATE TABLE IF NOT EXISTS user_points (
    user_id INT PRIMARY KEY,
    balance INT NOT NULL DEFAULT 0 COMMENT '当前积分余额',
    total_earned INT NOT NULL DEFAULT 0 COMMENT '累计获得积分',
    total_spent INT NOT NULL DEFAULT 0 COMMENT '累计消费积分',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 每日签到记录
CREATE TABLE IF NOT EXISTS daily_signins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    signin_date DATE NOT NULL COMMENT '签到日期',
    points_earned INT NOT NULL DEFAULT 100 COMMENT '获得积分',
    streak_day INT NOT NULL DEFAULT 1 COMMENT '连续签到天数',
    bonus_points INT NOT NULL DEFAULT 0 COMMENT '连续签到奖励积分',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_user_date (user_id, signin_date),
    INDEX idx_signin_date (signin_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 连续签到里程碑配置
CREATE TABLE IF NOT EXISTS signin_milestones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day INT NOT NULL UNIQUE COMMENT '连续天数',
    bonus_points INT NOT NULL COMMENT '奖励积分',
    description VARCHAR(100) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入连续签到奖励配置
INSERT INTO signin_milestones (day, bonus_points, description) VALUES
(3, 50, '连续签到3天奖励'),
(7, 150, '连续签到7天奖励'),
(14, 300, '连续签到14天奖励'),
(30, 500, '连续签到30天奖励');

-- 5. 抽奖配置
CREATE TABLE IF NOT EXISTS lottery_configs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL COMMENT '抽奖活动名称',
    cost_points INT NOT NULL DEFAULT 20 COMMENT '每次抽奖消耗积分',
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    daily_limit INT DEFAULT NULL COMMENT '每日抽奖次数限制',
    starts_at TIMESTAMP NULL DEFAULT NULL,
    ends_at TIMESTAMP NULL DEFAULT NULL,
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. 抽奖奖池
CREATE TABLE IF NOT EXISTS lottery_prizes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_id INT NOT NULL,
    prize_type ENUM('ITEM', 'API_KEY', 'POINTS', 'EMPTY') NOT NULL COMMENT '奖品类型',
    prize_name VARCHAR(100) NOT NULL COMMENT '奖品名称',
    prize_value VARCHAR(255) DEFAULT NULL COMMENT '奖品值（道具类型/积分数量等）',
    weight INT NOT NULL DEFAULT 100 COMMENT '权重',
    stock INT DEFAULT NULL COMMENT '库存数量，NULL为无限',
    is_rare TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否稀有奖品',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_config_id (config_id),
    FOREIGN KEY (config_id) REFERENCES lottery_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. API Key 兑换码库存
CREATE TABLE IF NOT EXISTS api_key_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) NOT NULL UNIQUE COMMENT '兑换码',
    status ENUM('AVAILABLE', 'ASSIGNED', 'REDEEMED', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
    assigned_user_id INT DEFAULT NULL,
    assigned_at TIMESTAMP NULL DEFAULT NULL,
    redeemed_at TIMESTAMP NULL DEFAULT NULL,
    expires_at TIMESTAMP NULL DEFAULT NULL,
    description VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_assigned_user (assigned_user_id),
    FOREIGN KEY (assigned_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. 抽奖记录
CREATE TABLE IF NOT EXISTS lottery_draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    config_id INT NOT NULL,
    cost_points INT NOT NULL COMMENT '消耗积分',
    prize_id INT NOT NULL COMMENT '中奖奖品ID',
    prize_type VARCHAR(20) NOT NULL COMMENT '奖品类型',
    prize_name VARCHAR(100) NOT NULL COMMENT '奖品名称',
    prize_value VARCHAR(255) DEFAULT NULL COMMENT '奖品值',
    is_rare TINYINT(1) NOT NULL DEFAULT 0,
    request_id VARCHAR(64) DEFAULT NULL COMMENT '幂等请求ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_config_id (config_id),
    INDEX idx_created_at (created_at),
    UNIQUE INDEX idx_request_id (request_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES lottery_configs(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. 竞猜市场（盘口）
CREATE TABLE IF NOT EXISTS prediction_markets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL COMMENT '竞猜标题',
    description TEXT DEFAULT NULL COMMENT '详细说明',
    status ENUM('DRAFT', 'OPEN', 'CLOSED', 'SETTLED', 'CANCELED') NOT NULL DEFAULT 'DRAFT',
    opens_at TIMESTAMP NULL DEFAULT NULL COMMENT '开始下注时间',
    closes_at TIMESTAMP NULL DEFAULT NULL COMMENT '截止下注时间',
    settled_at TIMESTAMP NULL DEFAULT NULL COMMENT '结算时间',
    fee_rate DECIMAL(5,4) NOT NULL DEFAULT 0.05 COMMENT '平台抽成比例（5%）',
    min_bet INT NOT NULL DEFAULT 10 COMMENT '最小下注积分',
    max_bet INT DEFAULT NULL COMMENT '最大下注积分',
    total_pool INT NOT NULL DEFAULT 0 COMMENT '总奖池',
    created_by INT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_status (status),
    INDEX idx_closes_at (closes_at),
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. 竞猜选项
CREATE TABLE IF NOT EXISTS prediction_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market_id INT NOT NULL,
    label VARCHAR(200) NOT NULL COMMENT '选项名称',
    description VARCHAR(500) DEFAULT NULL,
    ref_type VARCHAR(50) DEFAULT NULL COMMENT '关联类型（如 registration）',
    ref_id INT DEFAULT NULL COMMENT '关联ID',
    total_stake INT NOT NULL DEFAULT 0 COMMENT '该选项总下注积分',
    is_winner TINYINT(1) DEFAULT NULL COMMENT '是否为赢家，NULL=未结算',
    odds DECIMAL(10,2) DEFAULT NULL COMMENT '当前赔率（动态计算）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_market_id (market_id),
    FOREIGN KEY (market_id) REFERENCES prediction_markets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. 用户下注记录
CREATE TABLE IF NOT EXISTS prediction_bets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    market_id INT NOT NULL,
    option_id INT NOT NULL,
    user_id INT NOT NULL,
    stake_points INT NOT NULL COMMENT '下注积分',
    status ENUM('PLACED', 'WON', 'LOST', 'REFUNDED') NOT NULL DEFAULT 'PLACED',
    payout_points INT DEFAULT NULL COMMENT '获得积分（中奖后填入）',
    request_id VARCHAR(64) DEFAULT NULL COMMENT '幂等请求ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_market_id (market_id),
    INDEX idx_user_id (user_id),
    INDEX idx_option_id (option_id),
    UNIQUE INDEX idx_request_id (request_id),
    FOREIGN KEY (market_id) REFERENCES prediction_markets(id) ON DELETE CASCADE,
    FOREIGN KEY (option_id) REFERENCES prediction_options(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认抽奖配置
INSERT INTO lottery_configs (name, cost_points, is_active, daily_limit) VALUES
('鸡王幸运转盘', 20, 1, 50);

-- 获取刚插入的配置ID并插入奖池
SET @lottery_config_id = LAST_INSERT_ID();

-- 插入抽奖奖池（总权重1000）
INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, is_rare) VALUES
(@lottery_config_id, 'ITEM', '爱心打气', 'cheer', 200, 0),
(@lottery_config_id, 'ITEM', '咖啡打气', 'coffee', 180, 0),
(@lottery_config_id, 'ITEM', '能量打气', 'energy', 150, 0),
(@lottery_config_id, 'ITEM', '披萨打气', 'pizza', 120, 0),
(@lottery_config_id, 'ITEM', '星星打气', 'star', 100, 0),
(@lottery_config_id, 'POINTS', '安慰奖 5积分', '5', 100, 0),
(@lottery_config_id, 'POINTS', '幸运奖 20积分', '20', 30, 0),
(@lottery_config_id, 'POINTS', '大奖 50积分', '50', 10, 0),
(@lottery_config_id, 'API_KEY', 'API Key兑换码', NULL, 100, 1),
(@lottery_config_id, 'EMPTY', '谢谢参与', NULL, 10, 0);

-- 12. 用户道具库存
CREATE TABLE IF NOT EXISTS user_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    item_type VARCHAR(50) NOT NULL COMMENT '道具类型',
    quantity INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_user_item (user_id, item_type),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
