-- 作品提交示例数据 (热力榜)
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/seed_submissions.sql

USE chicken_king;

-- 插入示例作品数据
INSERT INTO submissions (
    user_id, contest_id, registration_id, title, description, repo_url,
    status, vote_count, submitted_at, created_at, updated_at
) VALUES
    (3, 1, 2, 'API Key Tool - 智能密钥管理工具',
     '一款专为开发者设计的 API Key 管理工具，支持多平台密钥管理、安全存储和快速调用。',
     'https://github.com/zhangsan/api-key-tool',
     'submitted', 156, NOW(), NOW(), NOW()),

    (4, 1, 3, 'AI智能编程助手',
     '基于大语言模型的智能编程助手，支持代码补全、代码审查和自动重构。',
     'https://github.com/lisi/ai-code-helper',
     'submitted', 128, DATE_SUB(NOW(), INTERVAL 1 HOUR), NOW(), NOW()),

    (5, 1, 4, '协作画板 CoBoard',
     '实时多人协作的在线画板工具，支持矢量绘图、白板协作和视频会议。',
     'https://github.com/wangwu/coboard',
     'submitted', 95, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(), NOW()),

    (6, 1, 5, '智能家居控制中心',
     '全屋智能家居的统一控制平台，支持主流品牌设备接入和场景自动化。',
     'https://github.com/zhaoliu/smart-home',
     'approved', 72, DATE_SUB(NOW(), INTERVAL 3 HOUR), NOW(), NOW()),

    (7, 1, 6, '区块链溯源系统',
     '基于区块链的商品溯源系统，确保产品信息真实可信、不可篡改。',
     'https://github.com/sunqi/blockchain-trace',
     'approved', 58, DATE_SUB(NOW(), INTERVAL 5 HOUR), NOW(), NOW()),

    (2, 1, 7, '知识图谱问答系统',
     '企业级知识图谱构建与智能问答系统，支持自然语言查询和推理。',
     'https://github.com/user841/kg-qa',
     'submitted', 45, DATE_SUB(NOW(), INTERVAL 8 HOUR), NOW(), NOW())
ON DUPLICATE KEY UPDATE vote_count = VALUES(vote_count), updated_at = NOW();

-- 显示结果
SELECT id, title, status, vote_count, submitted_at FROM submissions ORDER BY vote_count DESC;
