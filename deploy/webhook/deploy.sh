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

# 2. 重新构建并启动容器（滚动更新，减少停机时间）
log "重新构建 Docker 容器..."
$DOCKER_COMPOSE build --no-cache
$DOCKER_COMPOSE up -d --force-recreate

# 3. 等待服务启动并健康检查
log "等待服务启动..."
MAX_RETRIES=12
RETRY_COUNT=0
while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    sleep 5
    if curl -s http://localhost:8000/health | grep -q "ok"; then
        log "✅ 后端服务正常"
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "等待后端启动... ($RETRY_COUNT/$MAX_RETRIES)"
done

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
    log "⚠️ 后端服务启动超时，请手动检查"
fi

# 5. 清理旧镜像
log "清理旧镜像..."
docker image prune -f

log "========== 部署完成 =========="
log ""
