# Carms Web

A private, Codex-inspired coding workspace for Vercel. This is a standalone Next.js app; it does not include or modify the original Carms desktop application.

## Features
- Password-only login configured with environment variables.
- HMAC-SHA256 signed, HTTP-only, seven-day session cookie.
- Mistral chat completions only. The API key stays on the server.
- Responsive coding assistant workspace.
- Task history stored in this browser's localStorage (no database or cross-device sync).

This first version is an AI coding companion, not a remote code execution environment. It cannot clone repositories, read local files, run terminals, create branches, or open pull requests.

## Deploy to Vercel
1. Create a new Vercel project and import this separate project folder (or upload it to its own repository).
2. Set the project framework to Next.js.
3. Set the Root Directory to the folder containing this `package.json`.
4. Add the environment variables below, then deploy.

| Variable | Required | Description |
| --- | --- | --- |
| `APP_PASSWORD` | Yes | Long, unique password used to enter the workspace. |
| `AUTH_SECRET` | Yes | Random secret, at least 32 characters, used to sign sessions. |
| `MISTRAL_API_KEY` | Yes | Mistral Studio API key. Keep it server-side. |
| `MISTRAL_MODEL` | No | Model ID; defaults to `mistral-large-latest`. |

Generate a secret with `openssl rand -base64 48`. Never commit real secrets or use `NEXT_PUBLIC_` for them.

Create keys in [Mistral Studio API Keys](https://docs.mistral.ai/admin/identity-access/api-keys). Requests go to `https://api.mistral.ai/v1/chat/completions`. No other AI provider is used.

## Local development
```bash
cp .env.example .env.local
# Replace the placeholder values in .env.local
npm install
npm run dev
```
Open http://localhost:3000.

## Security notes
- Password, auth secret, and Mistral key are read only by server code.
- Session cookie is HTTP-only, SameSite=Strict, Secure in production.
- Chat requests require a valid session and are bounded to 24 messages, 12,000 characters per message, and 4,096 output tokens.
- Password-only access is for a small private workspace, not multi-user identity management. Add rate limiting / Vercel Firewall protection before broader exposure.
- Conversations are stored in localStorage. Clearing browser data removes them.
