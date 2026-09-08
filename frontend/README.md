# EchoMere Frontend

## 开发

```bash
npm ci
cp .env.example .env.local
npm run dev
```

默认访问 `http://localhost:3000`，并通过同源 `/api` 代理连接 `http://127.0.0.1:3001`。

## 检查

```bash
npm run lint
npm run build
npm audit
```
