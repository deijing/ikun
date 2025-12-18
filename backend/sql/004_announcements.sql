-- 公告功能数据表
-- 执行方式: mysql -u root -proot -P 3306 chicken_king < backend/sql/004_announcements.sql

USE chicken_king;

-- 公告表
CREATE TABLE IF NOT EXISTS announcements (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL COMMENT '公告标题',
    content TEXT NOT NULL COMMENT '公告内容',
    type ENUM('info', 'warning', 'success', 'error') NOT NULL DEFAULT 'info' COMMENT '公告类型',
    is_pinned TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否置顶',
    is_active TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用',
    author_id INT NOT NULL COMMENT '发布者ID',
    view_count INT NOT NULL DEFAULT 0 COMMENT '查看次数',
    published_at DATETIME COMMENT '发布时间',
    expires_at DATETIME COMMENT '过期时间（可选）',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_is_active (is_active),
    INDEX idx_is_pinned (is_pinned),
    INDEX idx_published_at (published_at),
    INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='系统公告表';

-- 显示结果
DESCRIBE announcements;
SELECT 'Announcements table created successfully!' AS status;
