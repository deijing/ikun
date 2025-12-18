-- 抽奖中奖示例数据 (欧皇榜)
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/seed_lottery_winners.sql

USE chicken_king;

-- 添加更多稀有奖品到奖品池
INSERT INTO lottery_prizes (config_id, prize_type, prize_name, prize_value, weight, stock, is_rare, created_at, updated_at)
VALUES
    (1, 'API_KEY', 'API Key 10万额度', '100000', 5, 10, 1, NOW(), NOW()),
    (1, 'API_KEY', 'API Key 5万额度', '50000', 10, 20, 1, NOW(), NOW()),
    (1, 'API_KEY', 'API Key 1万额度', '10000', 20, 50, 1, NOW(), NOW())
ON DUPLICATE KEY UPDATE updated_at = NOW();

-- 获取新奖品ID并插入中奖记录
-- 用户ID 3-7 对应 zhangsan, lisi, wangwu, zhaoliu, sunqi

-- 中奖记录1: 用户3 中 API Key 10万额度 (30分钟前)
INSERT INTO lottery_draws (user_id, config_id, cost_points, prize_id, prize_type, prize_name, prize_value, is_rare, request_id, created_at)
SELECT
    3, 1, 20,
    (SELECT id FROM lottery_prizes WHERE prize_name = 'API Key 10万额度' LIMIT 1),
    'API_KEY', 'API Key 10万额度', '100000', 1,
    CONCAT('req_', UUID()),
    DATE_SUB(NOW(), INTERVAL 30 MINUTE)
WHERE EXISTS (SELECT 1 FROM lottery_prizes WHERE prize_name = 'API Key 10万额度');

-- 中奖记录2: 用户4 中 API Key 5万额度 (2小时前)
INSERT INTO lottery_draws (user_id, config_id, cost_points, prize_id, prize_type, prize_name, prize_value, is_rare, request_id, created_at)
SELECT
    4, 1, 20,
    (SELECT id FROM lottery_prizes WHERE prize_name = 'API Key 5万额度' LIMIT 1),
    'API_KEY', 'API Key 5万额度', '50000', 1,
    CONCAT('req_', UUID()),
    DATE_SUB(NOW(), INTERVAL 2 HOUR)
WHERE EXISTS (SELECT 1 FROM lottery_prizes WHERE prize_name = 'API Key 5万额度');

-- 中奖记录3: 用户5 中 API Key 1万额度 (5小时前)
INSERT INTO lottery_draws (user_id, config_id, cost_points, prize_id, prize_type, prize_name, prize_value, is_rare, request_id, created_at)
SELECT
    5, 1, 20,
    (SELECT id FROM lottery_prizes WHERE prize_name = 'API Key 1万额度' LIMIT 1),
    'API_KEY', 'API Key 1万额度', '10000', 1,
    CONCAT('req_', UUID()),
    DATE_SUB(NOW(), INTERVAL 5 HOUR)
WHERE EXISTS (SELECT 1 FROM lottery_prizes WHERE prize_name = 'API Key 1万额度');

-- 中奖记录4: 用户6 中 API Key 5万额度 (8小时前)
INSERT INTO lottery_draws (user_id, config_id, cost_points, prize_id, prize_type, prize_name, prize_value, is_rare, request_id, created_at)
SELECT
    6, 1, 20,
    (SELECT id FROM lottery_prizes WHERE prize_name = 'API Key 5万额度' LIMIT 1),
    'API_KEY', 'API Key 5万额度', '50000', 1,
    CONCAT('req_', UUID()),
    DATE_SUB(NOW(), INTERVAL 8 HOUR)
WHERE EXISTS (SELECT 1 FROM lottery_prizes WHERE prize_name = 'API Key 5万额度');

-- 中奖记录5: 用户7 中 API Key 1万额度 (1天前)
INSERT INTO lottery_draws (user_id, config_id, cost_points, prize_id, prize_type, prize_name, prize_value, is_rare, request_id, created_at)
SELECT
    7, 1, 20,
    (SELECT id FROM lottery_prizes WHERE prize_name = 'API Key 1万额度' LIMIT 1),
    'API_KEY', 'API Key 1万额度', '10000', 1,
    CONCAT('req_', UUID()),
    DATE_SUB(NOW(), INTERVAL 1 DAY)
WHERE EXISTS (SELECT 1 FROM lottery_prizes WHERE prize_name = 'API Key 1万额度');

-- 中奖记录6: 用户3 再次中 API Key 1万额度 (2天前，欧皇实锤)
INSERT INTO lottery_draws (user_id, config_id, cost_points, prize_id, prize_type, prize_name, prize_value, is_rare, request_id, created_at)
SELECT
    3, 1, 20,
    (SELECT id FROM lottery_prizes WHERE prize_name = 'API Key 1万额度' LIMIT 1),
    'API_KEY', 'API Key 1万额度', '10000', 1,
    CONCAT('req_', UUID()),
    DATE_SUB(NOW(), INTERVAL 2 DAY)
WHERE EXISTS (SELECT 1 FROM lottery_prizes WHERE prize_name = 'API Key 1万额度');

-- 显示欧皇榜结果
SELECT
    d.id,
    u.username,
    u.display_name,
    d.prize_name,
    d.prize_value,
    d.created_at
FROM lottery_draws d
JOIN users u ON d.user_id = u.id
WHERE d.is_rare = 1
ORDER BY d.created_at DESC
LIMIT 10;
