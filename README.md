# EchoMere 洄映

EchoMere 是一个前后端同仓管理的开源 Web 项目。前端使用 React、Next.js 兼容 API 与 Vinext，后端使用 Express、Prisma 和 SQLite。

## 目录

- `frontend/`：Web 前端和同源 API 代理
- `backend/`：Express API、Prisma schema 与 migrations
- `deploy/`：Docker Compose、Nginx 和基于 SSH Key 的部署脚本

## 环境要求

- Node.js 22 或更高版本
- npm 10 或更高版本
- Docker Compose（仅部署需要）

## 本地开发

后端：

```bash
cd backend
npm ci
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 和按身份分配的 AUTH_LOGIN_CODES_JSON
npm run dev
```

前端：

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

浏览器访问 `http://localhost:3000`。前端默认把 `/api` 请求代理到 `http://127.0.0.1:3001`。

## 质量检查

```bash
cd backend && npm run check && npm audit
cd frontend && npm test && npm run lint && npm run build && npm audit
```

## Docker 部署

```bash
cd deploy
cp .env.example .env
# 设置随机 JWT_SECRET、按身份分配的登录码、正式域名与可选 LLM 配置
docker compose up -d --build
```

生产环境应在 Nginx 前配置 HTTPS/TLS。外部 LLM API 默认关闭；只有在服务端设置 `LLM_ENABLED=true` 后才会调用，并受域名白名单、超时、输出、每日额度和并发限制保护。不要提交任何 `.env`、数据库、API Key、密码或 SSH 私钥。

如需从本机同步到服务器，应先配置 SSH Key，然后运行：

```bash
DEPLOY_HOST=your-server.example DEPLOY_USER=deploy ./deploy/deploy.sh
```

详细安全要求见 [SECURITY.md](SECURITY.md) 和 [API 接入安全清单](docs/API_SECURITY.md)。参与开发前请阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 开源许可

本项目以 [Apache License 2.0](LICENSE) 开源。
