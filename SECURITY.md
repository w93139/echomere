# Security Policy

## Supported version

Security fixes are applied to the latest commit on `main`.

## Report a vulnerability

Please do not disclose vulnerabilities in a public Issue. Use GitHub's **Security → Advisories → Report a vulnerability** flow so the maintainers can investigate privately. Include affected paths, reproduction steps, impact, and any suggested mitigation. Avoid accessing data that does not belong to you.

## Secrets and user data

- Never commit `.env` files, API keys, passwords, tokens, databases, SSH keys, or production user data.
- Configure secrets in the deployment platform's secret manager or a mounted `*_FILE`. Rotate a credential immediately if it reaches source control, chat, logs, screenshots, or build artifacts.
- Browser-exposed variable names such as `NEXT_PUBLIC_*`, `VITE_*`, and `PUBLIC_*` must never contain secrets.
- Production deployments must use HTTPS, a unique `JWT_SECRET` of at least 32 random characters, and a separate login code for every allowed identity.
- External APIs remain off until `LLM_ENABLED=true` is set on the server. Configure host allowlists, request/output limits, daily quotas, and concurrency limits before enabling them.

See [docs/API_SECURITY.md](docs/API_SECURITY.md) for the integration checklist.
