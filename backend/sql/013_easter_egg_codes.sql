-- =====================================================
-- 013_easter_egg_codes.sql
-- 彩蛋兑换码系统
-- 用于隐藏彩蛋奖励，先到先得
-- =====================================================

-- 0. 更新 points_ledger 表的 reason 枚举，添加 EASTER_EGG_REDEEM
ALTER TABLE points_ledger MODIFY COLUMN reason ENUM(
    'SIGNIN_DAILY',
    'SIGNIN_STREAK_BONUS',
    'CHEER_GIVE',
    'CHEER_RECEIVE',
    'LOTTERY_SPEND',
    'LOTTERY_WIN',
    'BET_STAKE',
    'BET_PAYOUT',
    'BET_REFUND',
    'ADMIN_GRANT',
    'ADMIN_DEDUCT',
    'ACHIEVEMENT_CLAIM',
    'EASTER_EGG_REDEEM'
) NOT NULL;

-- 1. 彩蛋兑换码表
CREATE TABLE IF NOT EXISTS easter_egg_codes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(64) NOT NULL COMMENT '兑换码（唯一）',
    reward_type ENUM('points', 'item', 'badge', 'api_key') NOT NULL COMMENT '奖励类型',
    reward_value JSON NOT NULL COMMENT '奖励值（JSON格式）',
    status ENUM('active', 'claimed', 'disabled', 'expired') NOT NULL DEFAULT 'active' COMMENT '状态',
    description VARCHAR(255) DEFAULT NULL COMMENT '兑换码描述（仅管理员可见）',
    hint VARCHAR(255) DEFAULT NULL COMMENT '提示语（兑换成功后显示）',
    claimed_by INT DEFAULT NULL COMMENT '领取用户ID',
    claimed_at TIMESTAMP NULL DEFAULT NULL COMMENT '领取时间',
    expires_at TIMESTAMP NULL DEFAULT NULL COMMENT '过期时间（可选）',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_code (code),
    INDEX idx_status (status),
    INDEX idx_claimed_by (claimed_by),
    INDEX idx_claimed_at (claimed_at DESC),
    FOREIGN KEY (claimed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='彩蛋兑换码表';

-- 2. 兑换记录流水表（审计用）
CREATE TABLE IF NOT EXISTS easter_egg_redemptions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code_id INT NOT NULL COMMENT '兑换码ID',
    user_id INT NOT NULL COMMENT '用户ID',
    reward_type VARCHAR(32) NOT NULL COMMENT '奖励类型',
    reward_value JSON NOT NULL COMMENT '奖励值',
    ip_address VARCHAR(45) DEFAULT NULL COMMENT '兑换时IP',
    user_agent VARCHAR(500) DEFAULT NULL COMMENT 'User Agent',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_user_id (user_id),
    INDEX idx_code_id (code_id),
    INDEX idx_created_at (created_at DESC),
    FOREIGN KEY (code_id) REFERENCES easter_egg_codes(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='彩蛋兑换记录表';

-- 3. 预置30个彩蛋兑换码（先到先得）
-- 奖励类型混搭：积分、道具、徽章
INSERT INTO easter_egg_codes (code, reward_type, reward_value, description, hint) VALUES
-- 积分奖励（15个）
('IKUN-EGG-2025-A1B2', 'points', '{"amount": 500}', '彩蛋码#1 - 500积分', '恭喜你发现了隐藏彩蛋！获得500积分~'),
('IKUN-EGG-2025-C3D4', 'points', '{"amount": 300}', '彩蛋码#2 - 300积分', '你真是太厉害了！300积分到账~'),
('IKUN-EGG-2025-E5F6', 'points', '{"amount": 200}', '彩蛋码#3 - 200积分', '探索精神可嘉！200积分奖励~'),
('IKUN-EGG-2025-G7H8', 'points', '{"amount": 100}', '彩蛋码#4 - 100积分', '小惊喜！100积分~'),
('IKUN-EGG-2025-I9J0', 'points', '{"amount": 888}', '彩蛋码#5 - 888积分', '大吉大利！888积分发发发~'),
('IKUN-EGG-2025-K1L2', 'points', '{"amount": 666}', '彩蛋码#6 - 666积分', '666！顺顺顺~'),
('IKUN-EGG-2025-M3N4', 'points', '{"amount": 520}', '彩蛋码#7 - 520积分', '520积分，爱你哟~'),
('IKUN-EGG-2025-O5P6', 'points', '{"amount": 250}', '彩蛋码#8 - 250积分', '不错不错，250积分~'),
('IKUN-EGG-2025-Q7R8', 'points', '{"amount": 350}', '彩蛋码#9 - 350积分', '探险成功！350积分~'),
('IKUN-EGG-2025-S9T0', 'points', '{"amount": 450}', '彩蛋码#10 - 450积分', '厉害了！450积分~'),
('IKUN-EGG-2025-U1V2', 'points', '{"amount": 150}', '彩蛋码#11 - 150积分', '小奖励150积分~'),
('IKUN-EGG-2025-W3X4', 'points', '{"amount": 180}', '彩蛋码#12 - 180积分', '180积分收入囊中~'),
('IKUN-EGG-2025-Y5Z6', 'points', '{"amount": 220}', '彩蛋码#13 - 220积分', '220积分到手~'),
('IKUN-EGG-2025-A7B8', 'points', '{"amount": 280}', '彩蛋码#14 - 280积分', '280积分奖励~'),
('IKUN-EGG-2025-C9D0', 'points', '{"amount": 320}', '彩蛋码#15 - 320积分', '320积分送上~'),

-- 道具奖励（10个）
('IKUN-EGG-ITEM-E1F2', 'item', '{"item_type": "cheer", "amount": 10}', '彩蛋码#16 - 10个爱心打气', '获得10个爱心打气道具！快去给选手加油吧~'),
('IKUN-EGG-ITEM-G3H4', 'item', '{"item_type": "coffee", "amount": 5}', '彩蛋码#17 - 5杯咖啡', '5杯咖啡给你续命~'),
('IKUN-EGG-ITEM-I5J6', 'item', '{"item_type": "energy", "amount": 3}', '彩蛋码#18 - 3瓶能量', '能量补给站到了！'),
('IKUN-EGG-ITEM-K7L8', 'item', '{"item_type": "pizza", "amount": 5}', '彩蛋码#19 - 5个披萨', '披萨派对开始！'),
('IKUN-EGG-ITEM-M9N0', 'item', '{"item_type": "star", "amount": 8}', '彩蛋码#20 - 8颗星星', '你就是最闪亮的星~'),
('IKUN-EGG-ITEM-O1P2', 'item', '{"item_type": "cheer", "amount": 20}', '彩蛋码#21 - 20个爱心打气', '超大礼包！20个爱心打气~'),
('IKUN-EGG-ITEM-Q3R4', 'item', '{"item_type": "coffee", "amount": 10}', '彩蛋码#22 - 10杯咖啡', '咖啡因狂欢！'),
('IKUN-EGG-ITEM-S5T6', 'item', '{"item_type": "energy", "amount": 6}', '彩蛋码#23 - 6瓶能量', '能量爆棚！'),
('IKUN-EGG-ITEM-U7V8', 'item', '{"item_type": "pizza", "amount": 8}', '彩蛋码#24 - 8个披萨', '披萨大餐！'),
('IKUN-EGG-ITEM-W9X0', 'item', '{"item_type": "star", "amount": 15}', '彩蛋码#25 - 15颗星星', '满天星光都是你的！'),

-- 徽章奖励（5个）
('IKUN-EGG-BADGE-Y1Z2', 'badge', '{"badge_key": "easter_hunter", "badge_name": "彩蛋猎人"}', '彩蛋码#26 - 彩蛋猎人徽章', '恭喜获得「彩蛋猎人」专属徽章！'),
('IKUN-EGG-BADGE-A3B4', 'badge', '{"badge_key": "secret_finder", "badge_name": "秘密发现者"}', '彩蛋码#27 - 秘密发现者徽章', '你发现了秘密！获得「秘密发现者」徽章~'),
('IKUN-EGG-BADGE-C5D6', 'badge', '{"badge_key": "treasure_hunter", "badge_name": "寻宝达人"}', '彩蛋码#28 - 寻宝达人徽章', '寻宝成功！「寻宝达人」徽章到手~'),
('IKUN-EGG-BADGE-E7F8', 'badge', '{"badge_key": "lucky_star", "badge_name": "幸运之星"}', '彩蛋码#29 - 幸运之星徽章', '幸运女神眷顾你！「幸运之星」徽章~'),
('IKUN-EGG-BADGE-G9H0', 'badge', '{"badge_key": "ikun_pioneer", "badge_name": "iKun先锋"}', '彩蛋码#30 - iKun先锋徽章', '你是真正的iKun！「iKun先锋」徽章~');
