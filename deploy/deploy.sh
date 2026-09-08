#!/bin/bash
set -e

# 用法：DEPLOY_HOST=example.com DEPLOY_USER=deploy ./deploy/deploy.sh

: "${DEPLOY_HOST:?请设置 DEPLOY_HOST}"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
REMOTE_DIR="${REMOTE_DIR:-/opt/echomere}"
SSH_TARGET="${DEPLOY_USER}@${DEPLOY_HOST}"

# 脚本位于 deploy/，项目根目录是其上级目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> 同步代码到服务器..."
ssh -o StrictHostKeyChecking=accept-new "$SSH_TARGET" "mkdir -p '$REMOTE_DIR'"
rsync -avz \
  --exclude=.git \
  --exclude=node_modules \
  --exclude=dist \
  --exclude=.next \
  --exclude='.env*' \
  "$PROJECT_ROOT/backend" \
  "$PROJECT_ROOT/frontend" \
  "$PROJECT_ROOT/deploy" \
  "$SSH_TARGET:$REMOTE_DIR/"

REMOTE_COMPOSE_DIR="$REMOTE_DIR/deploy"

echo "==> 在服务器上构建并启动..."
ssh "$SSH_TARGET" "cd '$REMOTE_COMPOSE_DIR' && test -f .env && docker compose down && docker compose build --no-cache && docker compose up -d"

echo "==> 检查服务状态..."
ssh "$SSH_TARGET" "cd '$REMOTE_COMPOSE_DIR' && docker compose ps && docker compose logs --tail=30 backend frontend nginx"

echo "==> 部署完成"
