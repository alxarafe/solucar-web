# Solucar

> The web frontend for the Alixar ERP.

[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue)](LICENSE)
[![Angular client CI](https://github.com/alxarafe/solucar-web/actions/workflows/ci.yml/badge.svg)](https://github.com/alxarafe/solucar-web/actions/workflows/ci.yml)
[![Node.js 24 LTS](https://img.shields.io/badge/Node.js-24%20LTS-green)](https://nodejs.org/)
[![Angular 22](https://img.shields.io/badge/Angular-22-red)](https://angular.io/)
[![Docker](https://img.shields.io/badge/Docker-%E2%9C%93-blue)](https://www.docker.com/)

Solucar is the Angular web client for the Alixar ERP.

It provides a modular, API-driven user interface designed to progressively
replace Dolibarr's legacy views while remaining independent from backend
implementation and persistence details.

**Solucar → frontend**  
**Alixar  → backend and business authority**

## Related repository

Solucar is the web frontend of the Solucar / Alixar ERP.

Backend and business authority:
- [Alixar](https://github.com/alxarafe/alixar)

## Project status

Solucar is under active development.

See [Current implementation status](docs/status.md) for implemented capabilities,
integration boundaries and known pending areas.

## Development

```bash
./bin/up        # Start development server (http://127.0.0.1:44200)
./bin/down      # Stop development server
./bin/test      # Run tests
./bin/check     # Full validation (install, type-check, test, build)
```

Requires Docker and Docker Compose. No host Node.js installation needed.

## Documentation

- [Current implementation status](docs/status.md)
- [Architecture](docs/architecture.md)
- [Development](docs/development.md)
- [Agent working agreement](AGENTS.md)

## License

Copyright (c) 2026 Alxarafe. Licensed under [Apache-2.0](LICENSE).