# Solucar Architecture

## Overview

**Solucar → frontend**
**Alixar → backend and business authority**

Solucar is the Angular web frontend for the Alixar ERP. It owns presentation, navigation, and strictly frontend state. Alixar owns business rules, persistence, authentication, and the canonical API.

## Approved Decisions

| Decision | Status |
|----------|--------|
| Node.js 24 LTS | Approved |
| Angular 22 stable | Approved |
| TypeScript strict mode | Approved |
| Docker + Docker Compose as only supported environment | Approved |
| Standalone components | Approved |
| Vitest | Approved |
| SCSS | Approved |
| API-first | Approved |
| Domain isolated from infrastructure (Spring, HTTP, JSON, Dolibarr, llx_*) | Approved |
| Legacy boundary: no code copied from Dolibarr | Approved |
| Apache-2.0 license | Approved |

## Implemented

- Angular 22 bootstrap with standalone components
- Core API infrastructure in `core/api`
- Session authentication foundation in `core/auth` and `features/auth`
- Application bootstrap through `GET /api/auth/me`
- Effective authorization context (`roles` and `permissions`) kept in memory
- Permission lookup, `requirePermission` route guard factory, `/forbidden` view and permission-aware navigation metadata
- Login and logout against the Alixar canonical API
- Angular built-in CSRF handling for same-origin non-safe requests
- User administration (`features/admin-users`) protected by `users.manage`
- Role administration (`features/admin-roles`) protected by `roles.manage`
- Audit event viewer (`features/admin-audit`) protected by `audit.read`
- Contact feature (`features/contact`) — create and retrieve contacts via Alixar canonical API
- Accept-Language header derived from `LOCALE_ID`
- Development proxy for `/api/**` → `host.docker.internal:48081`
- Docker-only development environment
- Internationalization (i18n) with English (source) and Spanish

## Planned (Not Implemented)

- ERP feature modules (thirdparties, catalog, sales, billing, inventory, accounting)
- OpenAPI client generation (if adopted)
- Real Alixar integration (e2e)
- Full-stack demo (Solucar → Alixar)

## Not Implemented

Everything not listed as "Approved" or "Implemented" above.

## Canonical API Boundary

Solucar communicates **exclusively** through the **Alixar canonical API**.

```
Solucar (Angular)
      │
      ▼
Alixar Canonical API
      │
      ├── temporarily: Dolibarr adapters
      └── finally: new domain/backend
```

Rules:
1. No business rules in the frontend — Alixar is the authority.
2. No database schema knowledge — no `llx_*` names.
3. No Dolibarr vocabulary as internal model — no `fk_soc`, `socid`, `llx_*`.
4. HTTP details centralized in `core/api` and `core/auth`.
5. Features must not encode backend quirks.
6. Frontend types and UI models reflect Alixar concepts, not legacy field names.

## Angular Code Organization

```
src/app/
├── core/             # Frontend singleton infrastructure
│   ├── api/          # Canonical HTTP clients and shared ProblemDetail
│   ├── auth/         # Session state, permissions, guard, HTTP, errors, navigation
│   └── navigation/   # Permission-aware navigation metadata
├── shared/           # Genuinely reused components, utilities, elements
└── features/         # ERP functional modules
    ├── auth/         # Login and forbidden views
    ├── admin-users/  # User administration and User → Roles assignment
    ├── admin-roles/  # Role administration and Role → Permissions assignment
    ├── admin-audit/  # Read-only audit event viewer and integrity verification
    └── contact/      # Contact management (create, retrieve)
```

## Fundamental Rules

1. **No critical business rules** in frontend — belong to Alixar.
2. **No physical database knowledge** — no `llx_*` names.
3. **No Dolibarr legacy vocabulary** as internal model.
4. **Consume Alixar canonical API** — HTTP centralized in `core/api` and `core/auth`.
5. **Features must not encode backend quirks**.
6. **No speculative abstractions** — features emerge from real use cases.

## Architecture Goal

Progressively replace the backend (from Dolibarr adapters to new domain) **without modifying features** for legacy peculiarities.

## Internationalization (i18n) Architecture

### Mechanism

Angular native i18n (`@angular/localize`) is the chosen mechanism.

- English is the source/default locale.
- Spanish is initially supported.
- Production generates localized variants for each supported locale.
- Angular development server serves one locale at a time.
- Dynamic in-place language switching is not currently implemented.
- Future language selection may navigate/reload between localized variants.

### Feature ownership

Each feature owns its translatable messages through namespaced custom IDs:

```text
contact.field.lastName
contact.action.create
auth.login.title
auth.error.invalidCredentials
```

Physical app-level XLF files are retained because they are the standard Angular mechanism. No custom per-module translation loader exists.

### Translation file format

Angular standard XLIFF (XLF) via `ng extract-i18n`.

```text
src/locale/messages.xlf       # English source (generated)
src/locale/messages.es.xlf    # Spanish translation
```

Custom message IDs are explicit and namespaced by feature:

```text
@@contact.field.lastName
@@auth.login.title
```

### Supported locales

- Default/fallback: English (`en`)
- Supported: `en`, `es` (including regional variants like `es-ES`)
- Resolution: Angular `LOCALE_ID` at build time; future runtime selection may navigate/reload between localized variants.

### Production

`ng build` with `localize: ["en", "es"]` produces separate localized application variants.

Development server serves one locale at a time (`ng serve --configuration development-es` for Spanish).

### Future Alixar integration

When Solucar calls Alixar, the current Solucar locale will be used to populate `Accept-Language`. Angular's existing locale information will be preferred over introducing a separate language source of truth.

```text
Solucar locale
      ↓
Accept-Language
      ↓
Alixar ProblemDetail title/detail
```

## Backend Boundary (`core/api` and `core/auth`)

All HTTP communication with the Alixar canonical API is centralized in `core/api` and `core/auth`:

- `ContactApi` — typed operations for Contact domain:
  - `getContact(id: number): Observable<Contact>`
  - `createContact(request: CreateContactRequest): Observable<CreateContactResponse>`
- `AdminUsersApi` — typed user list/detail/create, username/status changes, password reset and complete role assignment replacement; administrative state stays local to the feature
- `AdminRolesApi` — typed role list/detail/create, name changes, complete permission replacement, deletion and the backend permission catalogue; it owns the `AdminRole` contract shared with user administration
- `AdminAuditApi` — read-only audit event queries with keyset pagination and filters, plus explicit audit-chain integrity verification; it owns `AuditEvent`, `AuditEventQuery` and `AuditVerification`
- `AuthApi` — typed session operations:
  - `login(request: LoginRequest): Observable<AuthIdentity>`
  - `me(): Observable<CurrentUser>`
  - `logout(): Observable<void>`
- `acceptLanguageInterceptor` — functional HTTP interceptor that adds `Accept-Language` header derived from Angular's `LOCALE_ID` to all `/api/**` requests
- TypeScript contracts mirror the canonical API exactly (`Contact`, `CreateContactRequest`, `CreateContactResponse`, `AuthIdentity`, `CurrentUser`, `ProblemDetail`)

No generic repositories, facades, or adapter layers exist. The boundary is concrete and minimal.

## Authentication and Session

Solucar treats the Alixar session as the single source of truth.

- An Angular app initializer starts `AuthSessionService.bootstrap()`. The root renders a loading state while session status is `unknown`, hiding both login and routed content until the lookup completes.
- `bootstrap()` calls `GET /api/auth/me`; `200` becomes `authenticated`, `401` becomes `anonymous`, and other failures become `unavailable`.
- Login calls `POST /api/auth/login`, then refreshes the current user through `/api/auth/me` instead of trusting the login response as the complete session state.
- Logout calls `POST /api/auth/logout`; `204` immediately clears the frontend authorization context. A subsequent `/api/auth/me` renews CSRF: `401` confirms `anonymous`, an outage becomes `unavailable`, and `200` honors a concurrent server session. A failed refresh does not undo logout; navigation returns to `/login`.
- A `403` login response is treated as a possibly stale CSRF state: Solucar renews the token through `/api/auth/me` and retries login once.
- `/api/auth/me` returns `id`, `username`, `email`, `roles` and `permissions`. `CurrentUser` extends `AuthIdentity`; login remains an `AuthIdentity` because it is not the complete session state.

Authentication uses HTTP SESSION, deliberately without PAT or JWT. Every auth request has a 10-second RxJS deadline that cancels a stalled request; bootstrap also completes on HTTP failures, network errors and timeouts. The complete current-user context is kept only in memory. Passwords remain transient form/request values and the password field is cleared after each completed attempt. Credentials, roles, permissions and tokens are never persisted in localStorage or sessionStorage. `JSESSIONID` is HttpOnly; `XSRF-TOKEN` is intentionally non-HttpOnly and Angular's built-in CSRF support reads it. Solucar does not read or store the CSRF cookie itself. No custom CSRF interceptor, token storage, PAT or JWT is used.

Authorization follows `USER → ROLES → PERMISSIONS`. Solucar never grants access from role names and does not model direct user permissions or per-user denies. `AuthSessionService.hasPermission()` checks only the effective permissions returned by Alixar. Permission checks are a presentation concern: Alixar remains the authority and must enforce authorization on every protected operation. A browser-side permission check is never treated as a security boundary.

`requirePermission(permission)` produces a functional route guard. It waits for an unresolved bootstrap before deciding. Anonymous or unauthenticated users are sent to `/login` with the requested internal URL as `returnUrl`; authenticated users without the required permission are sent to `/forbidden`. A missing permission never logs the user out. `/admin/users`, `/admin/users/new` and `/admin/users/:id` require `users.manage`; `/admin/roles`, `/admin/roles/new` and `/admin/roles/:code` require `roles.manage`; `/admin/audit` requires `audit.read`; `/contacts` remains public. Navigation entries can declare `label`, `route` and `requiredPermission`; only entries whose permission is effective are visible. Users, Roles and Audit navigation entries are independent, so a user may see any combination or none.

## CSRF and Same-Origin

Angular `HttpClient` reads the `XSRF-TOKEN` cookie and sends it as `X-XSRF-TOKEN` for same-origin requests whose method is not `GET` or `HEAD`. Solucar relies on this built-in behavior.

All API URLs are relative (`/api/...`). Development uses the proxy described below; production requires an equivalent same-origin reverse proxy. Alixar does not provide CORS for this frontend.

`GET /api/auth/me` is a safe request that also gives Alixar an opportunity to issue or renew the CSRF cookie. Solucar uses it before retrying a CSRF-rejected login and after logout.

The `/contacts` route remains public. User administration routes require `users.manage`, role administration routes require `roles.manage` and the audit viewer requires `audit.read`. Alixar still enforces authorization server-side.

## Development Proxy

During development, Solucar serves on `http://127.0.0.1:44200` and proxies `/api/**` to the Alixar development server at `http://host.docker.internal:48081`.

Configuration:
- `proxy.conf.json` — defines `/api/**` → `http://host.docker.internal:48081`
- `angular.json` — references proxy in `serve.options.proxyConfig`
- `docker-compose.yml` — `extra_hosts: ["host.docker.internal:host-gateway"]` enables container-to-host connectivity

This allows same-origin requests from the browser to `http://127.0.0.1:44200/api/contacts` without CORS configuration in Alixar.

Production builds use relative `/api/...` URLs directly; the proxy is development-only.

## ProblemDetail Error Handling

Alixar returns RFC 9457-compatible `ProblemDetail` responses. Contact displays Alixar's localized `detail` directly. Authentication maps HTTP status to frontend-owned localized messages and shows Alixar `detail` only as secondary information.

```typescript
interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  field?: string;
}
```

Frontend handling:
- Contact: if `error.detail` exists, display it directly (already localized by Alixar)
- Contact: on network failure or malformed/unexpected error, display frontend-owned localized fallback: `Unable to communicate with Alixar.`
- Authentication: HTTP status determines the error kind, then the `ProblemDetail.code` refines it; `detail` is secondary. `400` is validation, login `401` is rejected credentials, `/me` `401` means no valid session (normal during anonymous bootstrap), auth `403` indicates session/CSRF verification, `503` is temporary unavailability, and `503 AUDIT_UNAVAILABLE` specifically identifies the mandatory audit dependency. Network/status `0` and timeouts indicate an unreachable backend. There is no global 401 redirect interceptor.
- Canonical error codes (`VALIDATION_REQUIRED`, `CONTACT_NOT_FOUND`, `CONTACT_INVALID_THIRD_PARTY_REFERENCE`) are available internally for future structured behavior but not translated in the frontend

## User administration

`/admin/users` → requires `users.manage`; the creation and detail routes use the same guard.
Users navigation is filtered by that effective permission. Roles are assignments;
permissions are effective capabilities. Alixar is authoritative on every request.
User administration modifies User → Roles. It never grants permissions directly to users.
There is no individual permission editor or per-user deny.

The list submits `q` and optional `enabled` with backend page/size parameters.
Pages are zero-based (default size 20, backend maximum 100) and ordered by username
then id in Alixar. The frontend never loads all users for local pagination.

Creation sends `roleCodes: []` when no roles are selected. Alixar creates inactive
accounts; enable them explicitly from detail. Role edits replace the complete
assignment list in one `PUT`. Email is set only during creation and read-only
afterward. Username/status/role updates use the returned user as current state.
Password resets are separate administrative operations, with no old-password
field; passwords require at least 12 characters and remain transient.

Administration distinguishes validation (400), expired session (401), forbidden
(403), missing user/role (404), conflict (409), unavailability (503, including
audit) and network failure. It displays useful localized ProblemDetail detail
as secondary information. An explicit sign-in action after 401 refreshes the
session and preserves the safe internal destination. A 403 never logs out.
The permission snapshot may become stale; backend denial wins, without polling.

## Role administration

`/admin/roles`, `/admin/roles/new` and `/admin/roles/:code` require `roles.manage`;
the Roles navigation entry is filtered by that same effective permission.
Role administration owns Role → Permissions. User administration owns
User → Roles. The two features are intentionally separate: no user receives a
direct permission and no role is authorized by its name.

The list reads `GET /api/admin/roles` without pagination; Alixar returns roles
ordered by code with sorted `permissionCodes`. Creation sends `code`, `name` and
the complete `permissionCodes` collection, including an empty one. Alixar
normalizes the code (`strip` + `lowercase`) and validates its syntax and maximum
length, so the frontend applies only matching UX validation and navigates to the
code returned by Alixar. Role codes are immutable after creation and are shown
read-only in detail.

The permission editor is driven by `GET /api/admin/permissions`; the catalogue is
never hardcoded, so permissions added by Alixar appear automatically. Saving uses
one `PUT /api/admin/roles/{code}/permissions` request that replaces the complete
collection. Rename uses `PATCH /api/admin/roles/{code}` with only `name`.
Both mutations adopt the response body as the new source of truth.

`builtIn` is authoritative domain state from Alixar, not a name convention.
Built-in roles are immutable: the UI shows their code, name and permissions but
does not render rename, permission-edit or delete controls. Custom roles can be
deleted after explicit in-page confirmation. When Alixar rejects deletion because
the role is assigned to users (`409`, code `ADMIN_ROLE_IN_USE`), Solucar keeps the
role and the current view and explains the conflict; it never changes user
assignments or infers role usage locally.

Role administration distinguishes validation (400), expired session (401),
forbidden (403), missing role or permission (404), conflict (409, including
role-already-exists, built-in immutable and role-in-use), unavailability (503,
including audit) and network failure. It displays useful localized ProblemDetail
detail as secondary information. A 403 never logs out. Removing `roles.manage`
from a role the administrator holds is allowed by Alixar; the next request may
therefore be denied by the backend and is handled as an ordinary 403.

## Audit event viewer

`/admin/audit` requires `audit.read`; the Audit navigation entry is filtered by
that same effective permission. `audit.configure` alone does not grant access to
events or verification. The viewer is read-only and owns no audit configuration.

The viewer reads `GET /api/admin/audit-events` with only the filters supported by
Alixar: `afterSequence`, `limit`, `action`, `resourceType`, `resourceId`,
`actorUserId` and `result`. There is no date, actor-username, page, size, sort or
total contract. Results are ascending by `sequence`. Keyset pagination starts at
`afterSequence=0` and advances with the last loaded sequence; the UI appends
batches, reports how many events are loaded and never displays page numbers or a
fabricated total. A batch shorter than the limit marks the current end. Refresh
discards the current list and reloads from the beginning with the applied
filters. Load-more failures keep the existing events visible.

The main list shows sequence, date, actor, action, resource type, resource ID and
result. Each event can be expanded inline to inspect the complete contract,
including `chainId`, `requestId`, `integrityFormatVersion` and the full
`previousHash` and `eventHash`. Nullable actor, authentication type, resource ID
and request ID values are supported. Action and resource-type selectors send the
canonical Alixar values; results are localized only for presentation.

Integrity verification is explicit and manual:
`GET /api/admin/audit-events/verification` runs only when the user requests it,
never on load, filter, refresh or load more. A valid result reports
`checkedEvents`; an invalid result reports the canonical failure code and
`failedSequence` without attributing tampering, manipulation or another cause.
Known failure codes are localized and unknown future codes are shown
canonically.

Audit queries distinguish invalid query parameters (400
`AUDIT_INVALID_QUERY`), expired session (401), forbidden (403), temporary
unavailability (503) and network failure. A 403 never logs out. Audit
configuration and read-policy UI remain out of scope and reserved for
`audit.configure`.
