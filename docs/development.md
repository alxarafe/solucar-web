# Development

## Requirements

- Docker
- Docker Compose

The host does **not** need Node.js, npm, Angular CLI, or Vitest installed.

## Commands

```bash
# Start development server (http://127.0.0.1:44200)
./bin/up

# Stop development server
./bin/down

# Run tests
./bin/test

# Full validation (install, type-check, test, build)
./bin/check
```

## Authentication in development

Solucar uses same-origin session authentication through the development proxy:

- Browser origin: `http://127.0.0.1:44200`
- API requests: `/api/auth/**` proxied to Alixar on host port `48081`
- Application bootstrap: `GET /api/auth/me`
- Login page: `http://127.0.0.1:44200/login`

A provisioned Alixar user is required to sign in. Credentials are sent only to
Alixar; Solucar does not persist credentials or tokens. The password field is
cleared after each completed login attempt. SESSION cookies remain browser-managed;
PAT and JWT are deliberately absent from the SPA.

Angular `HttpClient` handles the `XSRF-TOKEN` cookie and `X-XSRF-TOKEN` header
automatically for same-origin non-safe requests. Do not add a custom CSRF
interceptor or copy the cookie manually.

`/contacts` remains public. `GET /api/auth/me` now includes effective `roles`
and `permissions`; Solucar keeps them in memory and exposes `hasPermission()`.
The `requirePermission()` guard, `/forbidden` view and permission-aware
navigation metadata are available, but no real ERP route is protected yet.
Frontend permission checks are UX only; Alixar must still enforce `403`.

### Manual session smoke test

1. Start Alixar locally on host port `48081`.
2. Start Solucar with `./bin/up`.
3. Open `http://127.0.0.1:44200/login`.
4. In browser network tools, verify bootstrap `/api/auth/me` returns `401` without a session and issues `XSRF-TOKEN`. No login form should flash before bootstrap completes.
5. Verify an invalid login shows the localized invalid-credentials message.
6. Sign in with a provisioned user. Verify POST login carries Angular's `X-XSRF-TOKEN`, the browser receives `JSESSIONID`, the subsequent `/me` refreshes the current user, roles and permissions plus CSRF, and the header shows the username.
7. Verify the `/me` response contains `roles` and `permissions`, and that Solucar does not write them to browser storage.
8. Reload the page and verify the session and authorization context are restored through `/api/auth/me`.
9. Open `/forbidden` directly and verify the localized access-denied message.
10. Log out; verify POST logout returns `204`, subsequent `/me` returns `401` and renews `XSRF-TOKEN`, and the app returns to `/login`.
11. Sign in again to verify CSRF remains usable after logout.
12. With the backend unreachable or a stalled `/me`, verify loading ends within the 10-second request deadline and manual Retry is available at `/login`.

This manual flow is required when browser cookie and CSRF behavior must be
proven; unit tests alone do not prove real browser/session integration.

## Configuration

The host port is configurable via `SOLUCAR_WEB_PORT` (default: 44200):

```bash
SOLUCAR_WEB_PORT=45000 ./bin/up
```

The service runs on loopback (127.0.0.1) only.

## Internal implementation

The Docker container uses Node.js 24.19.0 and runs:

- `npm ci` for reproducible installs
- `npm start -- --host 0.0.0.0 --port 4200` for development
- `npm test -- --watch=false` for tests
- `npx tsc --noEmit` for type checking
- `npm run build` for production builds (English and Spanish variants)
- `npx ng extract-i18n` to regenerate `src/locale/messages.xlf`

A named volume (`solucar_node_modules`) persists `node_modules` between container runs.

## Troubleshooting

View logs:

```bash
docker compose logs -f
```

Recreate from scratch:

```bash
./bin/down
docker compose down -v
./bin/up
```