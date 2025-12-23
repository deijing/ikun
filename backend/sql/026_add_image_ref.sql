-- 添加 Docker 镜像引用字段
-- 用于存储作品的容器镜像地址，必须使用 @sha256 digest 格式

ALTER TABLE submissions
ADD COLUMN image_ref VARCHAR(500) NULL COMMENT 'Docker镜像引用（格式：registry/image@sha256:xxx，禁止使用tag）'
AFTER project_doc_md;
