-- 请求日志表
-- 用于记录所有 API 请求，支持管理员监控

CREATE TABLE IF NOT EXISTS request_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- 请求基本信息
    method VARCHAR(10) NOT NULL COMMENT 'HTTP 方法: GET, POST, PUT, DELETE 等',
    path VARCHAR(500) NOT NULL COMMENT '请求路径',
    query_params TEXT NULL COMMENT '查询参数 (JSON)',

    -- 用户信息
    user_id INT NULL COMMENT '用户ID (如果已认证)',
    username VARCHAR(50) NULL COMMENT '用户名 (冗余字段，方便查询)',

    -- 请求详情
    ip_address VARCHAR(50) NULL COMMENT '客户端IP',
    user_agent VARCHAR(500) NULL COMMENT '用户代理',

    -- 响应信息
    status_code INT NOT NULL COMMENT 'HTTP 响应状态码',
    response_time_ms INT NOT NULL COMMENT '响应时间(毫秒)',

    -- 错误信息 (如果有)
    error_message TEXT NULL COMMENT '错误信息',

    -- 时间戳
    created_at TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP(3) COMMENT '请求时间(毫秒精度)',

    -- 索引
    INDEX idx_method (method),
    INDEX idx_path (path(100)),
    INDEX idx_user_id (user_id),
    INDEX idx_status_code (status_code),
    INDEX idx_created_at (created_at),
    INDEX idx_ip_address (ip_address),

    -- 复合索引：按时间+状态查询
    INDEX idx_time_status (created_at, status_code),
    -- 复合索引：按用户+时间查询
    INDEX idx_user_time (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='API 请求日志表';

-- 创建定期清理旧日志的事件 (保留 30 天)
-- 需要先开启事件调度器: SET GLOBAL event_scheduler = ON;
DELIMITER //
CREATE EVENT IF NOT EXISTS cleanup_old_request_logs
ON SCHEDULE EVERY 1 DAY
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DELETE FROM request_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL 30 DAY);
END //
DELIMITER ;
