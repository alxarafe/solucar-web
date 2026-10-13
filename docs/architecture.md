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
- Initial screen (`features/home`)
- Docker-only development environment

## Planned (Not Implemented)

- Authentication/authorization UI
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
4. HTTP details centralized in `core/api`.
4. Features must not encode backend quirks.
5. Frontend types and UI models reflect Alixar concepts, not legacy field names.

## Angular Code Organization

```
src/app/
├── core/         # Frontend singleton infrastructure
│   ├── auth/     # Authentication
│   ├── api/      # Centralized HTTP client
│   ├── config/   # Global configuration
│   ├── permissions/ # Permissions
│   └── modules/  # Core modules
├── shared/       # Genuinely reused components, utilities, elements
└── features/     # ERP functional modules
    └── home/     # Initial screen
```

## Fundamental Rules

1. **No critical business rules** in frontend — belong to Alixar.
2. **No physical database knowledge** — no `llx_*` names.
3. **No Dolibarr legacy vocabulary** as internal model.
4. **Consume Alixar canonical API** — HTTP centralized in `core/api`.
5. **Features must not encode backend quirks**.
6. **No speculative abstractions** — features emerge from real use cases.

## Architecture Goal

Progressively replace the backend (from Dolibarr adapters to new domain) **without modifying features** for legacy peculiarities.