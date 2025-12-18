-- 系统操作日志表
-- 用于记录用户操作日志，方便管理员查看异常情况

CREATE TABLE IF NOT EXISTS system_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(50) NOT NULL COMMENT '操作类型: LOGIN, LOGOUT, REGISTER, SIGNIN, LOTTERY, BET, SUBMIT, VOTE, ADMIN, CHEER',
    description TEXT NULL COMMENT '操作描述',
    ip_address VARCHAR(50) NULL COMMENT 'IP地址',
    user_agent VARCHAR(500) NULL COMMENT '用户代理',
    extra_data TEXT NULL COMMENT '额外数据(JSON)',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_action (action),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 添加一些示例日志（可选）
-- INSERT INTO system_logs (user_id, action, description, ip_address) VALUES
-- (1, 'LOGIN', '用户登录成功', '127.0.0.1'),
-- (1, 'SIGNIN', '每日签到成功，获得 100 积分', '127.0.0.1');
