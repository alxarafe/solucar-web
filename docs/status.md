# Current implementation status

## Overview

Solucar is the Angular web frontend of the Solucar / Alixar ERP and is under active development.

Solucar communicates **exclusively** with the **Alixar canonical API**. It does not know or depend on Dolibarr. Backend implementation and persistence details belong behind Alixar.

## Implemented capabilities

### Session authentication

- **Login route**: `/login`
- **Bootstrap**: an Angular app initializer starts `GET /api/auth/me`; a loading state hides login and routed content until the lookup resolves; stalled auth requests are cancelled after 10 seconds
- **Login**: `POST /api/auth/login` with `identifier` and `password`
- **Logout**: `POST /api/auth/logout` clears the authorization context on `204`, then `/api/auth/me` reconciles the server session and renews CSRF; a failed refresh is reported as unavailable without undoing logout
- **Session state**: `unknown`, `authenticated`, `anonymous`, `unavailable`
- **Current user**: `id`, `username`, `email`, `roles` and `permissions`; the complete context is held only in memory and is never persisted
- **CSRF**: Angular's built-in `HttpClient` support reads `XSRF-TOKEN` and sends `X-XSRF-TOKEN` on same-origin non-safe requests
- **Login retry**: a `403` login response triggers one CSRF renewal and one retry, never an unbounded retry loop
- **Return URL**: only internal root-relative destinations are accepted; external, protocol-relative and `/login` targets fall back to `/contacts`
- **Errors**: invalid credentials, validation, forbidden, unavailable, network, session expired and unexpected authentication errors have distinct localized messages
- **Cookies**: the browser owns `JSESSIONID` (HttpOnly) and `XSRF-TOKEN`; Solucar application code never reads or stores session credentials or tokens

### Authorization UI foundation

- **Model**: `USER → ROLES → PERMISSIONS`; Solucar checks effective permission codes and never grants access from role names
- **Permission lookup**: `AuthSessionService.hasPermission(permission)` over an in-memory `Set` derived from `/api/auth/me`
- **Route guard**: `requirePermission(permission)` waits for an unresolved bootstrap, redirects anonymous users to `/login` with a safe `returnUrl` and authenticated users without the permission to `/forbidden`; it never logs the user out
- **Forbidden view**: localized `/forbidden` route
- **Navigation metadata**: entries declare `label`, `route` and `requiredPermission`; only effective entries are visible
- **Backend authority**: frontend checks are UX only; Alixar must enforce authorization and return `403` for forbidden operations

`/contacts` remains public. User administration routes use the permission guard; see [Architecture](architecture.md#user-administration) for the contract and authorization boundaries.

### User administration

- `/admin/users`, `/admin/users/new`, `/admin/users/:id` require `users.manage`
- Server-side search, active/inactive filter and pagination; detail and creation
- Username changes, explicit account activation/deactivation, administrative password reset
- Read-only role catalogue and replacement of User → Roles assignments, including zero roles
- Email is entered on creation and read-only afterward; no direct user permissions
- Audit event consultation is owned by the audit event viewer

### Role administration

- `/admin/roles`, `/admin/roles/new`, `/admin/roles/:code` require `roles.manage`
- Role list without pagination, ordered by Alixar; creation, detail and name editing
- Role → Permissions editor driven by the real `GET /api/admin/permissions` catalogue
- Complete permission replacement in one `PUT`, including an empty collection
- Codes are normalized and validated by Alixar; role codes are immutable after creation
- `builtIn` roles are immutable: no rename, permission change or deletion controls
- Deletion requires explicit confirmation; a role in use returns `409 ADMIN_ROLE_IN_USE`
  and the role is preserved
- User → Roles assignment remains owned by user administration; roles never receive
  direct user permissions

### Audit event viewer

- `/admin/audit` requires `audit.read`; the Audit navigation entry uses the same permission
- Read-only event consultation with the real filters `action`, `resourceType`,
  `resourceId`, `actorUserId` and `result`; the cursor `afterSequence` and `limit`
  are managed internally
- Ascending keyset pagination by `sequence`; Load more appends batches and no total
  or page-number contract is invented
- Refresh reloads from the beginning with the applied filters; load-more failures
  preserve the already loaded events
- Inline expandable detail with the complete event contract, including full hashes
- Manual integrity verification via `GET /api/admin/audit-events/verification`;
  invalid results report the canonical failure without attributing a cause
- `audit.configure` does not grant access to events or verification; configuration has its own independent permission

### Audit configuration

- `/admin/audit/configuration` and its independent navigation entry require `audit.configure`
- Mode and read policy load and save independently, with separate feedback and retries
- OFF disables ordinary persistent audit; BASIC records the instrumented security/administration
  baseline; SELECTIVE adds the configured read policy to the BASIC baseline
- Fixed USER and ROLE selectors with NONE, QUERY_ONLY and QUERY_AND_OBJECT
- Missing persisted rules mean NONE; policy is stored in all modes and active only in SELECTIVE
- Backend responses are authoritative; mode changes preserve the policy

### Contact

- **Route**: `/contacts` as the main application route
- **Canonical read**: `GET /api/contacts/{id}` via `ContactApi.getContact(id)`
- **Canonical creation**: `POST /api/contacts` via `ContactApi.createContact(request)`
- **Frontend API types**: `Contact`, `CreateContactRequest`, `CreateContactResponse`, `ProblemDetail` — mirror the Alixar canonical API exactly
- **Error handling**: RFC 9457 `ProblemDetail` responses handled; Alixar-localized `detail` displayed directly; frontend-owned fallback for network/unexpected errors
- **Shared error type**: `ProblemDetail` is defined in `core/api` and reused by Contact and authentication

### Authentication errors

- HTTP status determines the authentication error kind before the response body is inspected
- `401` means invalid credentials during login and session expired during bootstrap or session refresh
- `403` means the session or CSRF state could not be verified
- `503` means authentication is temporarily unavailable; `503 AUDIT_UNAVAILABLE` specifically reports the mandatory audit dependency, never invalid credentials
- Alixar `detail` is shown as secondary information when it adds detail beyond the frontend-owned message

## Backend boundary

- All HTTP communication centralized in `core/api` and `core/auth` (`ContactApi`, `AdminUsersApi`, `AdminRolesApi`, `AdminAuditApi`, `AuthApi`, `acceptLanguageInterceptor`)
- No business rules in frontend — Alixar is the authority
- No database schema knowledge — no `llx_*` names in frontend
- No Dolibarr vocabulary as internal model — no `fk_soc`, `socid`, `llx_*`
- Frontend types reflect Alixar canonical concepts, not legacy field names
- `Accept-Language` header derived from Angular `LOCALE_ID` propagated to backend
- Session authentication uses the Alixar canonical `/api/auth/**` endpoints over same-origin HTTP

## Internationalization

- **Mechanism**: Angular native i18n (`@angular/localize`)
- **Source locale**: English (`en`)
- **Supported locale**: Spanish (`es`, including `es-ES`)
- **Translation files**: `src/locale/messages.xlf` (English), `src/locale/messages.es.xlf` (Spanish)
- **Custom message IDs**: Namespaced by feature (e.g., `@@contact.field.lastName`, `@@auth.login.title`)
- **Build output**: `ng build` with `localize: ["en", "es"]` produces separate localized variants
- **Development**: `ng serve --configuration development-es` serves Spanish variant
- **Runtime language switching**: Not implemented

## Validation

| Script | Purpose | Dependencies |
|--------|---------|--------------|
| `./bin/test` | Run unit/component tests in Docker | None (Docker only) |
| `./bin/check` | Full validation (install, type-check, test, build) | None (Docker only) |

See [Development](development.md) for full workflow details.

## Not yet implemented

- Self-service password recovery, account self-service and remember-me
- Broad ERP UI beyond the current Contact slice
- Automated end-to-end validation against a running Alixar instance
- Dynamic in-place language switching

