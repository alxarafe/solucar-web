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
- API requests: `/api/**` proxied to Alixar on host port `48081`
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
navigation metadata protect `/admin/users`, `/admin/users/new` and
`/admin/users/:id` with `users.manage`, `/admin/roles`, `/admin/roles/new`
and `/admin/roles/:code` with `roles.manage`, and `/admin/audit` with
`audit.read`.
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

### Manual user administration smoke

Use a disposable Alixar database and a provisioned user with `users.manage`.
Sign in through Solucar, verify `/me` and Users navigation, create a user with
a catalogue role, then open detail, change username, disable/enable the account
and reset its password. New accounts start inactive. Check login with the new
password and verify mutating same-origin requests pass CSRF. Destroy only the
disposable containers and volumes afterward; Alixar has no administrative delete.

If the development proxy cannot reach a loopback-only Alixar via
`host.docker.internal`, use temporary smoke-only networking/proxy configuration.
Do not add a product dependency or change the permanent deployment architecture.

### Manual role administration smoke

Use a disposable Alixar database and a user whose effective permissions include
`roles.manage`, optionally without any role name. Sign in through Solucar and
verify `/me`, the Roles navigation entry, role listing and the backend permission
catalogue. Create a temporary role with zero permissions, verify the normalized
code returned by Alixar, open its detail, rename it and replace its permissions,
including an empty collection. Then delete it and confirm it disappears from the
list. If practical, verify that a built-in role exposes no mutation controls and
that deleting a role assigned to a user returns `409 ADMIN_ROLE_IN_USE` without
changing the view. A real browser is required to prove cookie and CSRF behavior;
an HTTP/proxy smoke alone is not browser E2E. Destroy only disposable containers
and volumes afterward.

### Manual audit smoke

Use a disposable Alixar database and a user whose effective permissions include
`audit.read`, optionally without `users.manage` or `roles.manage`. Sign in through
Solucar and verify `/me`, the Audit navigation entry and `/admin/audit`. Confirm
that events load in ascending `sequence` order, apply the real `action`,
`resourceType` and `result` filters, and verify keyset navigation: each load-more
request must use `afterSequence` equal to the last loaded sequence. Open an event
detail and inspect the full hashes. Run Verify integrity explicitly and confirm
that it is not triggered by loading, filtering or refreshing. Confirm that an
authenticated user without `audit.read` receives `403` and does not see the Audit
entry. A real browser is required to prove cookie and CSRF behavior; an
HTTP/proxy smoke alone is not browser E2E. Destroy only disposable containers
and volumes afterward.

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

### Temporary dependency override

`package.json` pins Vite `8.3.3` for `@angular/build` through a narrow npm
override. The current `@angular/build` version resolves Vite `8.3.0`, which is
affected by security advisories; Vite 8.3.x versions below `8.3.3` are affected.
Remove this override as soon as a supported `@angular/build` version resolves
Vite `>= 8.3.3` by itself.

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
