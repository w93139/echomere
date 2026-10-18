# 部署

需要 Docker Compose。在项目根目录执行：

```bash
cd deploy
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET、AUTH_LOGIN_CODES_JSON 和 CORS_ORIGINS
docker compose up -d --build
```

默认访问 `http://localhost:8080`。SQLite 数据保存在 `echomere-data` 卷中；不要删除该卷或提交数据库。

对外提供服务前配置 HTTPS/TLS、至少 32 个随机字符的 `JWT_SECRET` 和每个身份独立的长登录码；`CORS_ORIGINS` 支持逗号分隔多个前端地址。若开放公众注册，应使用真实身份验证服务替换邀请访问码。LLM 默认关闭，启用前按 [API 安全说明](../docs/API_SECURITY.md) 配置服务端密钥与限额。

## SSH 同步

先配置 SSH Key、服务器上的 Docker 和远端 `deploy/.env`，再从项目根目录执行：

```bash
DEPLOY_HOST=your-server.example DEPLOY_USER=deploy ./deploy/deploy.sh
```

脚本默认同步到 `/opt/echomere`（可用 `REMOTE_DIR` 修改），不会上传 `.env*`；重建时会短暂停止服务。

## 仅运行后端

在 `backend/` 目录配置 `.env` 后执行：

```bash
docker build -t echomere-backend .
docker run --rm -p 3001:3001 --env-file .env -e DATABASE_URL=file:/data/dev.db -v echomere-data:/data echomere-backend
```

更多安全要求见 [安全政策](../SECURITY.md)。
