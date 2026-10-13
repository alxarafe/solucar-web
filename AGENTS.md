# Solucar Agent Working Agreement

This document defines the project-specific working rules for AI agents and human collaborators working in this repository.

System, platform, security, and higher-priority instructions always take precedence over this document. User instructions for the current task take precedence over this document when they are more specific or more recent.

## Project scope

**Solucar is the Angular web frontend of the Alixar ERP.**

Alixar is the backend and business authority.

Solucar:
- presents data;
- collects interaction;
- manages navigation;
- manages strictly frontend state;
- consumes the Alixar canonical API.

Solucar must not:
- implement business rules as source of truth;
- know database tables;
- use `llx_*` names;
- depend conceptually on Dolibarr;
- reproduce historical API quirks in features;
- invent Alixar contracts.

## Mandatory task lifecycle

Work must be split into small, independently verifiable vertical tasks. Do not implement a large modification as one task.

For every task, follow this order:

1. Study the repository and the relevant official sources.
2. Define one small task with one verifiable outcome.
3. State acceptance criteria.
4. Identify risks and pending decisions.
5. Obtain explicit human approval.
6. Implement only the approved task.
7. Verify it with the applicable tests.
8. Run post-change checks when applicable.
9. Present evidence.
10. Review the diff to confirm it contains only the approved task's changes.
11. Review documentation impact and update relevant docs when needed.
12. Close the completed, validated task with a local atomic commit.
13. Obtain approval before starting another task.

Explicit task approval also authorizes staging and its final local commit once implementation, applicable validations and scope review are complete. No second authorization is required solely for that commit. Use one atomic commit, or the minimum number of atomic commits the task's structure requires, with clear messages consistent with repository conventions.

Do not commit incomplete tasks or tasks with failed validations. Correct and revalidate any defect found before closing a task. Never start the next task with uncommitted changes from the previous one; if a task exceptionally starts with another task's pending changes, separate their commits correctly before continuing. Preserve all other repository-specific rules.

Task approval does not authorize push, PR creation, merge, tag, release, publication or deployment; each requires separate express authorization.

If a request combines independent capabilities, stop and split it into ordered tasks. Request approval for the first task only. Do not silently expand the scope of an approved task.

## Decision status

Do not attribute undocumented decisions to the team. Clearly label decisions as one of:

- **Approved**: explicitly accepted by the human collaborator.
- **Proposed**: suggested but not yet accepted.
- **Pending**: requires information or a decision before implementation.
- **Discarded**: considered and rejected.
- **Antecedent**: historical context that must not be treated as a current decision.

A technology mentioned in a proposal, prototype, recommendation, or previous conversation is not a final decision unless explicitly approved.

## Technology and dependency policy

The current technical baseline is:

- Node.js 24 LTS
- Angular 22 stable
- TypeScript strict mode
- npm
- SCSS
- Angular standalone components
- Angular Router
- Vitest (Angular default)

Before introducing or changing a framework, library, or tool:

1. Consult current official documentation.
2. Check compatibility with the project baseline.
3. Check maintenance status.
4. Check licensing.
5. Record the exact version.
6. Explain why it is needed.
7. Request approval when it introduces a decision not already approved.

Do not use milestone, release-candidate, snapshot, preview, or `latest` versions.

Do not introduce:
- Angular Material, PrimeNG, Tailwind, Bootstrap
- NgRx, Akita, Redux, or other state libraries
- Table libraries, form libraries
- OpenAPI client generators
- Additional dependencies unless strictly required for the Angular project to function

Prefer standard Angular APIs over custom abstractions.

## Docker-only environment

Docker and Docker Compose are the only supported environment for developing, running, testing, and validating the project.

The host must provide only:
- Git
- Docker
- Docker Compose
- the programming agent

The host must **not** require:
- Node.js
- npm
- Angular CLI
- Vitest

installed locally.

All documented commands run through the versioned scripts in `bin/`:
- `./bin/up` — start development server
- `./bin/down` — stop development server
- `./bin/test` — run tests
- `./bin/check` — complete local validation (install, type-check, test, build)

Agents must use these scripts. Do not run global installations. Do not modify the host to satisfy project dependencies.

## Angular engineering rules

- Use Angular standalone components.
- Use TypeScript strict mode.
- Prefer standard Angular APIs.
- Do not install a library if Angular reasonably solves the problem.
- Do not introduce global state until a real use case exists.
- Do not create services, facades, stores, adapters, or interfaces for architectural symmetry.
- Do not create empty folders to represent a future architecture.
- Features must emerge from real use cases.
- `core` is reserved for frontend singleton infrastructure.
- `shared` contains only genuinely reused elements.
- `features` contains functional capabilities.
- A feature must not access internals of another feature.
- HTTP calls must go through the agreed API infrastructure in `core/api`.
- Do not manually edit generated clients if OpenAPI code generation is adopted in the future.

## Business rule boundary

**Alixar is the business authority.**

Solucar may reproduce purely UX validations:
- required
- maxlength
- format

But a rule such as:
- an invoice may be validated
- an order may be shipped
- a stock movement is allowed

must be decided by Alixar.

The frontend may use capabilities supplied by the API, for example:
```json
{
  "availableActions": ["EDIT", "VALIDATE"]
}
```
but must not become the authority that deduces them.

## Canonical API boundary

Solucar consumes the **Alixar canonical API**. It must not infer contracts from:

- Dolibarr
- dolibarr-reference
- Dolibarr Swagger
- legacy DTOs
- database schema

If observed legacy behavior influences the product, that decision must first be expressed by Alixar's canonical API.

Frontend types and UI models should reflect Alixar concepts, not legacy field names.

No `fk_soc`, `socid`, `llx_*`, or Dolibarr-specific response quirks in features.

## Verification layers

Solucar has two complementary validation levels that must not be treated as interchangeable:

- **`./bin/test`** — Deterministic unit/type/build tests. Runs in Docker. Proves internal logic correctness.

- **`./bin/check`** — Complete self-contained local validation. Runs install, type-check, tests, and production build. Does not depend on Alixar or Dolibarr.

A green `./bin/test` does not prove real Alixar integration.
A passing `./bin/check` does not prove Alixar compatibility.
Do not make `./bin/check` depend on Alixar or `dolibarr-reference`.

Future E2E/full-stack verification must not silently replace unit/type/build checks.

## Verification requirements

Before closing a task, execute as applicable:

```bash
./bin/check
```

or individually:

```bash
./bin/test
./bin/check
```

Do not claim a check was executed if it was not actually run.

If a task introduces e2e tests in the future, they must be part of its Definition of Done when applicable.

## Documentation language

Code and versioned public documentation: English.

Detailed Spanish working documentation may be kept locally under a directory excluded by `.gitignore` if decided. That directory is not a security boundary and must not store secrets.

## Public documentation policy

`README.md` is a **stable public landing page** for project purpose, high-level capabilities, architecture and ecosystem relationships, essential quick start, onboarding and configuration, principal limitations, verifiable badges, and links to detailed documentation.

README is **NOT**:
- a changelog
- a task history
- a screen inventory
- an endpoint catalogue
- a test report

Functional and technical detail belongs primarily under `docs/`.

**Every task must review documentation impact** after implementation, validation and scope review, before the final local commit. If the change makes public behavior, architecture, configuration, workflow, capability or limitations materially false or incomplete, update the relevant documentation **within the same task**. Do not modify docs merely to record that a review happened.

## Cross-repository documentation policy

Solucar participates in:
- `dolibarr-reference`
- `alxarafe/alixar`
- `alxarafe/solucar-web`

Cross-repository documentation synchronization is required only when a change affects:
- shared policy
- canonical API/contract expectations
- architecture/ecosystem relationship
- materially false information in another repository
- a significant milestone genuinely visible across repositories

Do not modify multiple repositories for every small feature.
Changes in each repository must remain separate commits/tasks.
Historical reports must remain historical and must not be rewritten to appear current.

## Badge policy

Badges may represent only **real and verifiable facts**.

Distinguish at least:
- Angular CI (GitHub Actions)
- local Solucar validation (`./bin/check`)
- future real integration with Alixar
- future full-stack demo

Never use a static green badge to imply a check that GitHub does not actually execute continuously.
Badge links and workflow names must remain current.

## No magic literals

Any literal with meaningful **domain, contract, protocol, configuration, or behavioral** semantics should have an explicit source of truth rather than being scattered. This includes, where applicable:

- API routes
- HTTP headers
- media types
- HTTP/error codes
- route names
- capability/action names
- configuration keys
- environment-variable names
- timeouts
- pagination limits
- state names
- validation regexes

Preference order:
1. Angular/platform APIs/constants
2. existing project types/constants
3. configuration
4. narrowly scoped named constants

Do not mechanically replace all literals. Explicitly allow incidental fixture values, array indexes, loop counters, and obvious local structural values to remain inline. Do not create pointless global constants.

Tests follow the same principle without coupling unnecessarily to implementation internals.

During final scope review, inspect newly introduced meaningful literals.

## Safe repository changes

Before editing, inspect **staged, unstaged, and untracked** changes.

Preserve unrelated user work.

Do not perform:
- hard reset
- stash
- checkout overwrite
- broad deletion
- unrelated formatting

without explicit authorization.

If the approved change cannot be isolated safely, report the conflict.

Never expose secrets/tokens/private data in:
- source
- logs
- docs
- commits
- delivery reports

## Deployment authorization

Task approval permits implementation, validation, and final local commit.

It does **NOT** authorize:
- push
- PR creation
- merge
- tag
- release
- publication
- deployment

Deployment requires separate express authorization.

## Engineering simplicity

Prefer simple, explicit, and maintainable solutions.

Apply these principles:

- **KISS** — keep solutions as simple as the requirements allow.
- **DRY** — avoid duplicated logic and duplicated sources of truth.
- **YAGNI** — do not build abstractions, extension points, or infrastructure without a concrete current need.
- **Occam's razor** — when several solutions satisfy the requirements equally well, prefer the one with fewer concepts, dependencies, and moving parts.
- **Reuse before invention** — prefer existing mechanisms, conventions, and components before introducing new ones.

Do not introduce layers, helpers, factories, interfaces, services, or abstractions merely for architectural symmetry or possible future use.

Simplicity must not compromise correctness, security, performance, clarity, testability, or contractual behavior.

**When duplication is small and removing it would require a more complex abstraction, prefer the clearer duplication.**

Do not introduce layers, helpers, factories, interfaces, services, or abstractions merely for architectural symmetry or possible future use.

## Business rule boundary

**Alixar is the business authority.**

Solucar may reproduce purely UX validations:
- required
- maxlength
- format

But a rule such as:
- an invoice may be validated
- an order may be shipped
- a stock movement is allowed

must be decided by Alixar.

The frontend may use capabilities supplied by the API, for example:
```json
{
  "availableActions": ["EDIT", "VALIDATE"]
}
```
but must not become the authority that deduces them.