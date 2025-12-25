-- ============================================================================
-- 030_project_submission_stopped.sql
-- 描述: 提交状态增加 stopped
-- ============================================================================

ALTER TABLE `project_submissions`
  MODIFY COLUMN `status` ENUM(
    'created', 'queued', 'pulling', 'deploying', 'healthchecking', 'online', 'failed', 'stopped'
  ) NOT NULL DEFAULT 'created' COMMENT '提交状态';

SELECT '030_project_submission_stopped.sql 迁移完成' AS message;
