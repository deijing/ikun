-- 015_add_easter_egg_badge_definitions.sql
-- 为彩蛋系统添加徽章定义，使彩蛋奖励的徽章能够在成就页面显示

-- 添加彩蛋专属徽章类别的成就定义
INSERT INTO achievement_definitions (
    achievement_key, name, description, category, badge_icon, badge_tier, points, target_value, is_active, sort_order
) VALUES
    -- 彩蛋猎人 - 首次发现彩蛋
    ('easter_hunter', '彩蛋猎人', '成功发现并兑换了隐藏彩蛋', 'easter_egg', 'egg', 'bronze', 500, 1, 1, 100),

    -- 秘密发现者 - 发现秘密彩蛋
    ('secret_finder', '秘密发现者', '发现了网站中隐藏的秘密', 'easter_egg', 'search', 'silver', 500, 1, 1, 101),

    -- 寻宝达人 - 寻宝专家
    ('treasure_hunter', '寻宝达人', '在寻宝活动中展现了非凡的能力', 'easter_egg', 'gem', 'gold', 500, 1, 1, 102),

    -- 幸运之星 - 幸运加持
    ('lucky_star', '幸运之星', '被幸运女神眷顾的玩家', 'easter_egg', 'star', 'gold', 500, 1, 1, 103),

    -- iKun先锋 - 社区先锋
    ('ikun_pioneer', 'iKun先锋', '鸡王争霸赛的先锋参与者', 'easter_egg', 'crown', 'diamond', 500, 1, 1, 104)

ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    category = VALUES(category),
    badge_icon = VALUES(badge_icon),
    badge_tier = VALUES(badge_tier);
