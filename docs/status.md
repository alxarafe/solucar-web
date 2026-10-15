# Current implementation status

## Overview

Solucar is the Angular web frontend of the Solucar / Alixar ERP and is under active development.

Solucar communicates **exclusively** with the **Alixar canonical API**. It does not know or depend on Dolibarr. Backend implementation and persistence details belong behind Alixar.

## Implemented capabilities

### Contact

- **Route**: `/contacts` as the main application route
- **Canonical read**: `GET /api/contacts/{id}` via `ContactApi.getContact(id)`
- **Canonical creation**: `POST /api/contacts` via `ContactApi.createContact(request)`
- **Frontend API types**: `Contact`, `CreateContactRequest`, `CreateContactResponse`, `ProblemDetail` — mirror the Alixar canonical API exactly
- **Error handling**: RFC 9457 `ProblemDetail` responses handled; Alixar-localized `detail` displayed directly; frontend-owned fallback for network/unexpected errors

## Backend boundary

- All HTTP communication centralized in `core/api` (`ContactApi`, `acceptLanguageInterceptor`)
- No business rules in frontend — Alixar is the authority
- No database schema knowledge — no `llx_*` names in frontend
- No Dolibarr vocabulary as internal model — no `fk_soc`, `socid`, `llx_*`
- Frontend types reflect Alixar canonical concepts, not legacy field names
- `Accept-Language` header derived from Angular `LOCALE_ID` propagated to backend

## Internationalization

- **Mechanism**: Angular native i18n (`@angular/localize`)
- **Source locale**: English (`en`)
- **Supported locale**: Spanish (`es`, including `es-ES`)
- **Translation files**: `src/locale/messages.xlf` (English), `src/locale/messages.es.xlf` (Spanish)
- **Custom message IDs**: Namespaced by feature (e.g., `@@contact.title`, `@@contact.form.lastName`)
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

- Authentication/authorization UI
- Broad ERP UI beyond the current Contact slice
- Automated end-to-end validation against a running Alixar instance
- Dynamic in-place language switching

