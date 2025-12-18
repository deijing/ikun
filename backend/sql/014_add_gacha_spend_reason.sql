-- 014_add_gacha_spend_reason.sql
-- 为扭蛋机功能添加新的积分变动原因

-- 修改 points_ledger 表的 reason 枚举，添加 GACHA_SPEND
ALTER TABLE points_ledger
MODIFY COLUMN reason ENUM(
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
    'EASTER_EGG_REDEEM',
    'GACHA_SPEND'
) NOT NULL;
