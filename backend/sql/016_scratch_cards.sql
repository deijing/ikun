-- 016_scratch_cards.sql
-- 刮刮乐系统表

-- 刮刮乐卡片表
CREATE TABLE IF NOT EXISTS scratch_cards (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    config_id INT NOT NULL,
    cost_points INT NOT NULL COMMENT '购买花费积分',
    prize_id INT NOT NULL COMMENT '预定奖品ID',
    prize_type VARCHAR(20) NOT NULL,
    prize_name VARCHAR(100) NOT NULL,
    prize_value VARCHAR(255) DEFAULT NULL,
    is_rare BOOLEAN NOT NULL DEFAULT FALSE,
    status ENUM('PURCHASED', 'REVEALED') NOT NULL DEFAULT 'PURCHASED',
    revealed_at DATETIME DEFAULT NULL COMMENT '刮开时间',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (config_id) REFERENCES lottery_configs(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='刮刮乐卡片';

-- 插入刮刮乐配置（复用抽奖配置表）
INSERT INTO lottery_configs (name, cost_points, is_active, daily_limit, created_at, updated_at)
VALUES ('神秘刮刮乐', 30, TRUE, 5, NOW(), NOW())
ON DUPLICATE KEY UPDATE name = name;

-- 获取刚插入的config_id并插入奖品
SET @scratch_config_id = (SELECT id FROM lottery_configs WHERE name = '神秘刮刮乐' LIMIT 1);

-- 刮刮乐奖池（包含神秘兑换码）
INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, stock, is_rare, created_at, updated_at)
SELECT @scratch_config_id, 'API_KEY', '神秘兑换码', NULL, 5, NULL, TRUE, NOW(), NOW()
WHERE @scratch_config_id IS NOT NULL
ON DUPLICATE KEY UPDATE weight = weight;

INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, stock, is_rare, created_at, updated_at)
SELECT @scratch_config_id, 'POINTS', '幸运积分 +50', '50', 20, NULL, FALSE, NOW(), NOW()
WHERE @scratch_config_id IS NOT NULL
ON DUPLICATE KEY UPDATE weight = weight;

INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, stock, is_rare, created_at, updated_at)
SELECT @scratch_config_id, 'POINTS', '小额积分 +20', '20', 30, NULL, FALSE, NOW(), NOW()
WHERE @scratch_config_id IS NOT NULL
ON DUPLICATE KEY UPDATE weight = weight;

INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, stock, is_rare, created_at, updated_at)
SELECT @scratch_config_id, 'POINTS', '微量积分 +10', '10', 35, NULL, FALSE, NOW(), NOW()
WHERE @scratch_config_id IS NOT NULL
ON DUPLICATE KEY UPDATE weight = weight;

INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, stock, is_rare, created_at, updated_at)
SELECT @scratch_config_id, 'EMPTY', '谢谢参与', NULL, 10, NULL, FALSE, NOW(), NOW()
WHERE @scratch_config_id IS NOT NULL
ON DUPLICATE KEY UPDATE weight = weight;
