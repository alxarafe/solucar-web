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
- `npm run build` for production builds

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