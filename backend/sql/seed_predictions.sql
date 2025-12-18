-- 竞猜示例数据
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/seed_predictions.sql

USE chicken_king;

-- 清理旧的测试数据（可选）
-- DELETE FROM prediction_bets WHERE market_id IN (SELECT id FROM prediction_markets WHERE title LIKE '%示例%');
-- DELETE FROM prediction_options WHERE market_id IN (SELECT id FROM prediction_markets WHERE title LIKE '%示例%');
-- DELETE FROM prediction_markets WHERE title LIKE '%示例%';

-- 竞猜1: 鸡王争霸赛冠军预测
INSERT INTO prediction_markets (title, description, status, closes_at, fee_rate, min_bet, max_bet, total_pool, created_at, updated_at)
VALUES (
    '鸡王争霸赛最终冠军预测',
    '预测本届鸡王争霸赛的最终冠军归属！根据当前人气榜和项目质量，谁将问鼎鸡王宝座？',
    'OPEN',
    DATE_ADD(NOW(), INTERVAL 7 DAY),
    0.05,
    10,
    1000,
    0,
    NOW(),
    NOW()
);

SET @market1_id = LAST_INSERT_ID();

INSERT INTO prediction_options (market_id, label, description, total_stake, odds, created_at, updated_at) VALUES
(@market1_id, '代码小王子', '目前人气榜第一，项目完成度高', 0, 2.50, NOW(), NOW()),
(@market1_id, '算法大神', 'AI 项目极具创新性，潜力巨大', 0, 3.00, NOW(), NOW()),
(@market1_id, '全栈小能手', '技术全面，前后端一把抓', 0, 4.00, NOW(), NOW()),
(@market1_id, '黑马选手', '低调实力派，可能爆冷', 0, 6.00, NOW(), NOW());

-- 竞猜2: 本周最佳项目
INSERT INTO prediction_markets (title, description, status, closes_at, fee_rate, min_bet, max_bet, total_pool, created_at, updated_at)
VALUES (
    '本周最佳项目花落谁家',
    '根据代码质量、创新性、实用性综合评判，本周哪个项目将获得最佳项目称号？',
    'OPEN',
    DATE_ADD(NOW(), INTERVAL 3 DAY),
    0.05,
    5,
    500,
    0,
    NOW(),
    NOW()
);

SET @market2_id = LAST_INSERT_ID();

INSERT INTO prediction_options (market_id, label, description, total_stake, odds, created_at, updated_at) VALUES
(@market2_id, 'AI 智能助手', '基于大模型的智能对话系统', 0, 2.00, NOW(), NOW()),
(@market2_id, '区块链溯源平台', '去中心化的供应链追踪方案', 0, 3.50, NOW(), NOW()),
(@market2_id, '物联网监控系统', '实时数据采集与可视化', 0, 4.00, NOW(), NOW());

-- 竞猜3: 总参赛人数预测
INSERT INTO prediction_markets (title, description, status, closes_at, fee_rate, min_bet, max_bet, total_pool, created_at, updated_at)
VALUES (
    '本届参赛人数最终预测',
    '截止报名结束，本届鸡王争霸赛将有多少人成功提交作品？',
    'OPEN',
    DATE_ADD(NOW(), INTERVAL 5 DAY),
    0.05,
    10,
    800,
    0,
    NOW(),
    NOW()
);

SET @market3_id = LAST_INSERT_ID();

INSERT INTO prediction_options (market_id, label, description, total_stake, odds, created_at, updated_at) VALUES
(@market3_id, '30人以下', '参与热情一般', 0, 5.00, NOW(), NOW()),
(@market3_id, '30-50人', '中等规模参与', 0, 2.50, NOW(), NOW()),
(@market3_id, '50-80人', '热情高涨', 0, 2.00, NOW(), NOW()),
(@market3_id, '80-100人', '火爆程度超预期', 0, 3.00, NOW(), NOW()),
(@market3_id, '100人以上', '盛况空前', 0, 4.50, NOW(), NOW());

-- 显示创建结果
SELECT
    m.id,
    m.title,
    m.status,
    m.closes_at,
    COUNT(o.id) as option_count
FROM prediction_markets m
LEFT JOIN prediction_options o ON o.market_id = m.id
WHERE m.id >= @market1_id
GROUP BY m.id
ORDER BY m.id;
