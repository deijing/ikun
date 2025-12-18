-- GitHub 提交示例数据
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/seed_github_commits.sql

USE chicken_king;

-- 为已有的报名记录添加 GitHub 统计数据
-- 报名 ID 为 2, 3, 4 (api-key-tool, AI智能编程助手, 协作画板 CoBoard)

-- 报名2的提交记录 (今天) - api-key-tool
INSERT INTO github_stats (
    registration_id, stat_date, repo_url, repo_owner, repo_name,
    commits_count, additions, deletions, files_changed,
    total_commits, total_additions, total_deletions,
    commits_detail, created_at, updated_at
) VALUES (
    2, CURDATE(), 'https://github.com/zhangsan/api-key-tool', 'zhangsan', 'api-key-tool',
    3, 245, 32, 8,
    15, 1200, 180,
    JSON_ARRAY(
        JSON_OBJECT(
            'sha', 'a1b2c3d4e5f6g7h8i9j0',
            'message', 'feat: 添加智能对话功能，支持多轮会话',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 2 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 120,
            'deletions', 15
        ),
        JSON_OBJECT(
            'sha', 'b2c3d4e5f6g7h8i9j0k1',
            'message', 'fix: 修复消息历史记录丢失问题',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 4 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 45,
            'deletions', 12
        ),
        JSON_OBJECT(
            'sha', 'c3d4e5f6g7h8i9j0k1l2',
            'message', 'style: 优化界面布局和响应式设计',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 6 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 80,
            'deletions', 5
        )
    ),
    NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    commits_count = VALUES(commits_count),
    commits_detail = VALUES(commits_detail),
    updated_at = NOW();

-- 报名3的提交记录 (今天) - AI智能编程助手
INSERT INTO github_stats (
    registration_id, stat_date, repo_url, repo_owner, repo_name,
    commits_count, additions, deletions, files_changed,
    total_commits, total_additions, total_deletions,
    commits_detail, created_at, updated_at
) VALUES (
    3, CURDATE(), 'https://github.com/lisi/ai-code-helper', 'lisi', 'ai-code-helper',
    2, 180, 25, 5,
    12, 900, 120,
    JSON_ARRAY(
        JSON_OBJECT(
            'sha', 'd4e5f6g7h8i9j0k1l2m3',
            'message', 'feat: 实现商品溯源查询API',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 150,
            'deletions', 20
        ),
        JSON_OBJECT(
            'sha', 'e5f6g7h8i9j0k1l2m3n4',
            'message', 'test: 添加单元测试覆盖',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 3 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 30,
            'deletions', 5
        )
    ),
    NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    commits_count = VALUES(commits_count),
    commits_detail = VALUES(commits_detail),
    updated_at = NOW();

-- 报名4的提交记录 (今天) - 协作画板 CoBoard
INSERT INTO github_stats (
    registration_id, stat_date, repo_url, repo_owner, repo_name,
    commits_count, additions, deletions, files_changed,
    total_commits, total_additions, total_deletions,
    commits_detail, created_at, updated_at
) VALUES (
    4, CURDATE(), 'https://github.com/wangwu/coboard', 'wangwu', 'coboard',
    4, 320, 45, 12,
    20, 1500, 200,
    JSON_ARRAY(
        JSON_OBJECT(
            'sha', 'f6g7h8i9j0k1l2m3n4o5',
            'message', 'feat: 添加设备实时监控面板',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 30 MINUTE), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 200,
            'deletions', 30
        ),
        JSON_OBJECT(
            'sha', 'g7h8i9j0k1l2m3n4o5p6',
            'message', 'refactor: 重构数据采集模块架构',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 2 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 80,
            'deletions', 10
        ),
        JSON_OBJECT(
            'sha', 'h8i9j0k1l2m3n4o5p6q7',
            'message', 'docs: 更新 README 和 API 文档',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 5 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 25,
            'deletions', 3
        ),
        JSON_OBJECT(
            'sha', 'i9j0k1l2m3n4o5p6q7r8',
            'message', 'fix: 修复传感器数据解析异常',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 8 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 15,
            'deletions', 2
        )
    ),
    NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    commits_count = VALUES(commits_count),
    commits_detail = VALUES(commits_detail),
    updated_at = NOW();

-- 昨天的提交记录 (报名2 - api-key-tool)
INSERT INTO github_stats (
    registration_id, stat_date, repo_url, repo_owner, repo_name,
    commits_count, additions, deletions, files_changed,
    total_commits, total_additions, total_deletions,
    commits_detail, created_at, updated_at
) VALUES (
    2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), 'https://github.com/zhangsan/api-key-tool', 'zhangsan', 'api-key-tool',
    2, 150, 20, 6,
    12, 955, 148,
    JSON_ARRAY(
        JSON_OBJECT(
            'sha', 'j0k1l2m3n4o5p6q7r8s9',
            'message', 'feat: 集成 GPT-4 API 调用',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 26 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 100,
            'deletions', 15
        ),
        JSON_OBJECT(
            'sha', 'k1l2m3n4o5p6q7r8s9t0',
            'message', 'chore: 更新依赖版本',
            'timestamp', DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 28 HOUR), '%Y-%m-%dT%H:%i:%sZ'),
            'additions', 50,
            'deletions', 5
        )
    ),
    NOW(), NOW()
) ON DUPLICATE KEY UPDATE
    commits_count = VALUES(commits_count),
    commits_detail = VALUES(commits_detail),
    updated_at = NOW();

-- 显示创建结果
SELECT
    gs.id,
    r.title as project_title,
    gs.stat_date,
    gs.commits_count,
    gs.additions,
    gs.deletions,
    JSON_LENGTH(gs.commits_detail) as detail_count
FROM github_stats gs
JOIN registrations r ON gs.registration_id = r.id
ORDER BY gs.stat_date DESC, gs.id;
