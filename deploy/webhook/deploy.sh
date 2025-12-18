#!/bin/bash
#
# 自动部署脚本
# 由 GitHub Webhook 触发执行
#

set -e

PROJECT_DIR="/opt/chicken-king"
LOG_FILE="/opt/chicken-king/deploy/webhook/logs/deploy.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# 检测 docker compose 命令
if docker compose version > /dev/null 2>&1; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

log "========== 开始部署 =========="
log "使用命令: $DOCKER_COMPOSE"

cd "$PROJECT_DIR"

# 1. 拉取最新代码
log "拉取最新代码..."
git fetch origin main
git reset --hard origin/main

# 2. 重新构建并启动容器
log "重新构建 Docker 容器..."
$DOCKER_COMPOSE down
$DOCKER_COMPOSE build --no-cache
$DOCKER_COMPOSE up -d

# 3. 等待服务启动
log "等待服务启动..."
sleep 10

# 4. 健康检查
log "执行健康检查..."
if curl -s http://localhost:8000/api/v1/health > /dev/null 2>&1; then
    log "✅ 后端服务正常"
else
    log "⚠️ 后端服务可能还在启动中"
fi

# 5. 清理旧镜像
log "清理旧镜像..."
docker image prune -f

log "========== 部署完成 =========="
log ""
