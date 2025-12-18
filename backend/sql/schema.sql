-- ============================================================================
-- 鸡王争霸赛 - 数据库初始化脚本
-- 数据库: MySQL 8.x
-- 字符集: utf8mb4
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS `chicken_king`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `chicken_king`;

-- ============================================================================
-- 删除旧表（按依赖顺序）
-- ============================================================================
DROP TABLE IF EXISTS `votes`;
DROP TABLE IF EXISTS `submissions`;
DROP TABLE IF EXISTS `registrations`;
DROP TABLE IF EXISTS `contests`;
DROP TABLE IF EXISTS `users`;

-- ============================================================================
-- 用户表
-- ============================================================================
CREATE TABLE `users` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 基础认证信息
  `email` VARCHAR(255) NULL COMMENT '邮箱地址',
  `username` VARCHAR(50) NOT NULL COMMENT '用户名',
  `hashed_password` VARCHAR(255) NULL COMMENT '密码哈希（OAuth用户为空）',
  `role` ENUM('admin', 'reviewer', 'contestant', 'spectator') NOT NULL DEFAULT 'spectator' COMMENT '用户角色: admin=管理员, reviewer=评审员, contestant=参赛者, spectator=吃瓜用户',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否激活',
  `avatar_url` VARCHAR(500) NULL COMMENT '头像URL',

  -- Linux.do OAuth 信息
  `linux_do_id` VARCHAR(50) NULL COMMENT 'Linux.do 用户ID',
  `linux_do_username` VARCHAR(50) NULL COMMENT 'Linux.do 用户名',
  `display_name` VARCHAR(100) NULL COMMENT '显示名称',
  `linux_do_avatar_template` VARCHAR(500) NULL COMMENT 'Linux.do 头像模板',
  `trust_level` INT NULL COMMENT 'Linux.do 信任等级',
  `is_silenced` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否被禁言',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_email` (`email`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_linux_do_id` (`linux_do_id`),
  KEY `ix_users_role` (`role`),
  KEY `ix_users_is_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户表';

-- ============================================================================
-- 比赛表
-- ============================================================================
CREATE TABLE `contests` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 比赛基本信息
  `title` VARCHAR(200) NOT NULL COMMENT '比赛标题',
  `description` TEXT NULL COMMENT '比赛描述',
  `phase` ENUM('upcoming', 'signup', 'submission', 'voting', 'ended') NOT NULL DEFAULT 'upcoming' COMMENT '比赛阶段',

  -- 各阶段时间配置
  `signup_start` DATETIME NULL COMMENT '报名开始时间',
  `signup_end` DATETIME NULL COMMENT '报名结束时间',
  `submit_start` DATETIME NULL COMMENT '提交开始时间',
  `submit_end` DATETIME NULL COMMENT '提交结束时间',
  `vote_start` DATETIME NULL COMMENT '投票开始时间',
  `vote_end` DATETIME NULL COMMENT '投票结束时间',

  PRIMARY KEY (`id`),
  KEY `ix_contests_phase` (`phase`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='比赛表';

-- ============================================================================
-- 报名表
-- ============================================================================
CREATE TABLE `registrations` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',
  `user_id` INT NOT NULL COMMENT '关联用户ID',

  -- 项目信息
  `title` VARCHAR(200) NOT NULL COMMENT '项目名称',
  `summary` VARCHAR(500) NOT NULL COMMENT '一句话简介',
  `description` TEXT NOT NULL COMMENT '项目详细介绍',
  `plan` TEXT NOT NULL COMMENT '实现计划/里程碑',
  `tech_stack` JSON NOT NULL COMMENT '技术栈（JSON格式）',

  -- 联系方式
  `contact_email` VARCHAR(255) NOT NULL COMMENT '联系邮箱',
  `contact_wechat` VARCHAR(100) NULL COMMENT '微信号（可选）',
  `contact_phone` VARCHAR(30) NULL COMMENT '手机号（可选）',

  -- 状态管理
  `status` ENUM('draft', 'submitted', 'approved', 'rejected', 'withdrawn') NOT NULL DEFAULT 'submitted' COMMENT '报名状态',
  `submitted_at` DATETIME NULL COMMENT '提交时间',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_registration_contest_user` (`contest_id`, `user_id`),
  KEY `ix_registration_contest_status` (`contest_id`, `status`),
  KEY `ix_registration_user` (`user_id`),
  CONSTRAINT `fk_registrations_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_registrations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='报名表';

-- ============================================================================
-- 作品提交表
-- ============================================================================
CREATE TABLE `submissions` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `user_id` INT NOT NULL COMMENT '提交者ID',
  `contest_id` INT NOT NULL COMMENT '关联比赛ID',

  -- 作品信息
  `title` VARCHAR(200) NOT NULL COMMENT '作品标题',
  `description` TEXT NULL COMMENT '作品描述',
  `repo_url` VARCHAR(500) NOT NULL COMMENT '代码仓库URL',
  `demo_url` VARCHAR(500) NULL COMMENT '演示地址',
  `video_url` VARCHAR(500) NULL COMMENT '演示视频URL',

  -- 状态与统计
  `status` ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending' COMMENT '审核状态',
  `vote_count` INT NOT NULL DEFAULT 0 COMMENT '票数',

  PRIMARY KEY (`id`),
  KEY `ix_submissions_user` (`user_id`),
  KEY `ix_submissions_contest` (`contest_id`),
  KEY `ix_submissions_status` (`status`),
  KEY `ix_submissions_vote_count` (`vote_count` DESC),
  CONSTRAINT `fk_submissions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_submissions_contest_id` FOREIGN KEY (`contest_id`) REFERENCES `contests` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='作品提交表';

-- ============================================================================
-- 投票表
-- ============================================================================
CREATE TABLE `votes` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `created_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  -- 关联字段
  `user_id` INT NOT NULL COMMENT '投票用户ID',
  `submission_id` INT NOT NULL COMMENT '被投作品ID',

  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_vote_user_submission` (`user_id`, `submission_id`),
  KEY `ix_votes_submission` (`submission_id`),
  CONSTRAINT `fk_votes_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_votes_submission_id` FOREIGN KEY (`submission_id`) REFERENCES `submissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='投票表';

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- 初始数据：创建第一届比赛
-- ============================================================================
INSERT INTO `contests` (`title`, `description`, `phase`, `signup_start`, `signup_end`)
VALUES (
  '第一届鸡王争霸赛',
  '# ikuncode 开发者实战大赏\n\n这是一场面向所有开发者的创意编程比赛，展示你的技术实力，赢取丰厚奖品！',
  'signup',
  NOW(),
  DATE_ADD(NOW(), INTERVAL 30 DAY)
);
