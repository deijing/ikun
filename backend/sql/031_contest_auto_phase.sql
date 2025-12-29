ALTER TABLE contests
  ADD COLUMN auto_phase_enabled TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否自动同步比赛阶段';
