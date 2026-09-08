# API and secret security

EchoMere treats every paid or privileged external API as a server-only capability. The browser calls EchoMere's own `/api` routes; only the backend may attach provider credentials.

## Rules for every current and future API

1. Store credentials in the deployment platform's secret manager, a mounted secret file (`NAME_FILE=/run/secrets/...`), or an ignored server `.env` file. Never add them to source, Docker images, example values, client JavaScript, URLs, logs, or screenshots.
2. Never use `NEXT_PUBLIC_*`, `VITE_*`, or `PUBLIC_*` for a secret. Those prefixes intentionally publish values to the browser bundle.
3. Add a backend adapter that reads the credential with `readServerSecret`. The adapter must use HTTPS and an explicit hostname allowlist so a key cannot be sent to an unexpected host.
4. Default the integration to off. Require an explicit server-side enable flag before the first paid request.
5. Set a timeout, response-size/token limit, per-user daily limit, global daily limit, and global concurrency limit. Cancel the provider request when the browser disconnects.
6. Return generic provider errors to users. Logs may include status codes and internal request IDs, but never authorization headers, request bodies containing personal data, or provider response bodies.
7. Give each provider key only the permissions it needs. Separate development and production keys, set provider-side spending caps and alerts, and rotate keys on a schedule.
8. Add tests for disabled-by-default behavior, host validation, timeouts, quota exhaustion, and redaction. Keep secret scanning and dependency review enabled in GitHub.

## Current LLM settings

The backend recognizes these server-only settings:

| Variable | Purpose |
| --- | --- |
| `LLM_ENABLED` | Explicit opt-in; must be `true` to call the provider |
| `LLM_API_KEY` | Provider credential |
| `LLM_BASE_URL` | HTTPS provider endpoint |
| `LLM_ALLOWED_HOSTS` | Comma-separated exact hostname allowlist |
| `LLM_TIMEOUT_MS` | Upstream request timeout |
| `LLM_MAX_TOKENS` | Provider output token cap |
| `LLM_MAX_OUTPUT_CHARS` | Local streamed-output cap |
| `LLM_DAILY_USER_LIMIT` | Requests per user per UTC day |
| `LLM_DAILY_GLOBAL_LIMIT` | Requests across the deployment per UTC day |
| `LLM_MAX_CONCURRENCY` | Simultaneous upstream calls in one backend process |

The built-in concurrency guard and HTTP rate limiter are process-local. A horizontally scaled deployment must replace them with a shared atomic limiter (for example Redis) and a provider-side budget cap. When the frontend `/api` proxy is used, enforce additional IP-based throttling at the trusted edge; the application intentionally refuses untrusted `X-Forwarded-For` values.
