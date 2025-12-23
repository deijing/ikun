#!/bin/bash
#
# 手动重建镜像脚本
# 仅在以下情况使用：
# - 修改了 Dockerfile
# - 修改了 package.json / requirements.txt（依赖变化）
# - 需要更新基础镜像版本
#
# 使用方法：
#   ssh root@server "cd /opt/chicken-king && bash deploy/rebuild.sh"
#

set -e

cd /opt/chicken-king

echo "=== 重新构建 Docker 镜像 ==="
echo "⚠️  这将需要 5-10 分钟"
echo ""

docker compose build --no-cache

echo "=== 重启服务 ==="
docker compose up -d

echo "=== 完成 ==="
echo "访问 https://pk.ikuncode.cc 验证"
