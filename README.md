# EchoMere 洄映

开源 Web 项目：`frontend/` 使用 React、Vinext 和 Next.js 兼容 API，`backend/` 使用 Express、Prisma 和 SQLite。

## 本地开发

需要 Node.js 22.13+、npm 10+。在项目根目录打开两个终端。

终端一，启动后端：

```bash
cd backend
npm ci
cp .env.example .env
# 编辑 .env，设置 JWT_SECRET 和按身份分配的 AUTH_LOGIN_CODES_JSON
npm run dev
```

终端二，启动前端：

```bash
cd frontend
npm ci
cp .env.example .env.local
npm run dev
```

访问 `http://localhost:3000`；`/api` 默认代理到 `http://127.0.0.1:3001`，健康检查为 `/api/health`。后端首次启动会生成 Prisma Client 并应用 SQLite migrations。

后端目录内可用 `npm run db:setup` 初始化数据库、`npm run build` 编译、`npm start` 应用迁移并启动已编译服务。外部 LLM 默认关闭，启用方式与限制见 [API 安全说明](docs/API_SECURITY.md)。

## 质量检查

```bash
(cd backend && npm run check && npm audit)
(cd frontend && npm test && npm run lint && npm run build && npm audit)
```

## 文档与许可

- [部署](deploy/README.md)：Docker Compose、独立后端及 SSH 同步。
- [安全政策](SECURITY.md) · [API 安全](docs/API_SECURITY.md) · [参与开发](CONTRIBUTING.md)。不要提交凭据、数据库或用户数据。
- [glob 适配器维护](frontend/vendor/fast-glob-compat/README.md)：保留源码与本地依赖包，升级调用方时重新验证。
- [Apache-2.0](LICENSE) · [版权声明](NOTICE) · [第三方许可](backend/THIRD_PARTY_NOTICES.md)。
