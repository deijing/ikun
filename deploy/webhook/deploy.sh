#!/bin/bash
#
# 自动部署脚本
# 由 GitHub Webhook 触发执行
#
# 工作流程：
# 1. 拉取最新代码
# 2. 自动生成生产环境配置（.env）
# 3. 重建 Docker 容器
# 4. 健康检查
# 5. 清理旧镜像
#

set -e

PROJECT_DIR="/opt/chicken-king"
LOG_FILE="/opt/chicken-king/deploy/webhook/logs/deploy.log"
ENV_FILE="/opt/chicken-king/.env"

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

# 2. 生成生产环境配置
log "生成生产环境配置..."
cat > "$ENV_FILE" << 'ENVEOF'
# ============================================================================
# 生产环境配置 - 由部署脚本自动生成
# ============================================================================

# MySQL 数据库（注意：修改密码需要删除 mysql 数据卷重建）
MYSQL_ROOT_PASSWORD=password
MYSQL_DATABASE=chicken_king
MYSQL_USER=chicken
MYSQL_PASSWORD=password

# 应用密钥（用于 JWT 签名）
SECRET_KEY=a3f8c9d2e5b7a1f4c8d0e3b6a9f2c5d8e1b4a7f0c3d6e9b2a5f8c1d4e7b0a3f6

# 前端 URL
FRONTEND_URL=https://pk.ikuncode.cc

# Linux.do OAuth
LINUX_DO_CLIENT_ID=ZFdemXAFDfy9mQfCI1tsOTyzBEKJYXT1
LINUX_DO_CLIENT_SECRET=xSAW4rhOyz6ejc9xrflf4XeRYY39Etex
LINUX_DO_REDIRECT_URI=https://pk.ikuncode.cc/api/v1/auth/linuxdo/callback

# GitHub OAuth
GITHUB_CLIENT_ID=Ov23liWnv2Zcv4FPoi3H
GITHUB_CLIENT_SECRET=205aa31cc830ea3ed5f9f5cc5edbe9b61c9c59ca
GITHUB_REDIRECT_URI=https://pk.ikuncode.cc/api/v1/auth/github/callback

# 前端 API URL（生产环境使用相对路径）
VITE_API_URL=/api/v1

# Umami 统计
UMAMI_APP_SECRET=chicken_king_umami_secret_2024
ENVEOF

log "✅ 生产环境配置已生成"

# 3. 重新构建并启动容器
log "重新构建 Docker 容器..."
$DOCKER_COMPOSE build --no-cache

log "启动容器..."
$DOCKER_COMPOSE up -d --force-recreate

# 4. 等待服务启动并健康检查
log "等待服务启动..."
sleep 10

log "执行健康检查..."
MAX_RETRIES=12
RETRY_COUNT=0
HEALTH_OK=false

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # 检查后端 API
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        log "✅ 后端服务正常"
        HEALTH_OK=true
        break
    fi
    RETRY_COUNT=$((RETRY_COUNT + 1))
    log "等待后端启动... ($RETRY_COUNT/$MAX_RETRIES)"
    sleep 5
done

if [ "$HEALTH_OK" = false ]; then
    log "⚠️ 后端服务可能还在启动中"
fi

# 检查前端
if curl -s http://localhost:5174/health > /dev/null 2>&1; then
    log "✅ 前端服务正常"
else
    log "⚠️ 前端健康检查未响应（可能正常，nginx 会代理）"
fi

# 5. 清理旧镜像
log "清理旧镜像..."
docker image prune -f

log "========== 部署完成 =========="
log ""
