# Echomere Backend

Echomere 的 Express API。后端仓库自带 Prisma schema 和 SQLite migrations，可以独立克隆、构建和运行。

## 环境要求

- Node.js 20.9 或更高版本（推荐 Node.js 22 LTS）
- npm 10 或更高版本

## 本地运行

```bash
npm install
cp .env.example .env
# 设置 JWT_SECRET 和按身份分配的 AUTH_LOGIN_CODES_JSON
npm run dev
```

首次启动会自动生成 Prisma Client 并初始化本地 SQLite 数据库。服务默认监听 `http://localhost:3001`，健康检查地址为 `http://localhost:3001/api/health`。

LLM 配置是可选的。只有同时配置服务端 `LLM_API_KEY` 和 `LLM_ENABLED=true` 才会调用外部服务；否则其余功能仍可运行，聊天接口会返回占位提示。

## 常用命令

```bash
npm run dev       # 初始化数据库并启动热更新开发服务
npm run build     # 生成 Prisma Client 并编译 TypeScript
npm start         # 应用 migrations 后启动已编译服务
npm run db:setup  # 手动生成客户端并初始化数据库
npm run check     # 完整构建检查
```

## Docker

```bash
docker build -t echomere-backend .
docker run --rm -p 3001:3001 --env-file .env -v echomere-data:/data echomere-backend
```

生产环境必须设置安全的 `JWT_SECRET` 和 `AUTH_LOGIN_CODES_JSON`，并通过 `CORS_ORIGINS` 配置允许访问的前端地址；多个地址使用逗号分隔。每个邮箱或手机号必须使用独立长访问码。面向不特定公众提供账号时，应把邀请访问码替换为真实身份验证服务。完整规则见根目录的 `docs/API_SECURITY.md`。
