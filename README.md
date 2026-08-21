<div align="center">

# EUDIStack MFE Login

**Authentication microfrontend for verifiable credential-based login via QR code.**

Part of [EUDIStack](https://github.com/in2workspace) — European Digital Identity Infrastructure for Organizations.

</div>

---

## Overview

The Login MFE is the user-facing authentication interface for the EUDIStack platform. It presents a QR code that wallet holders scan to initiate an OID4VP presentation flow through the Verifier. It supports cross-device login (QR scan from mobile wallet) with real-time SSE notifications for seamless UX.

It is designed to be deployed as a standalone SPA served by any static file server (Nginx, Amplify, CDN).

### Key Features

- **QR-based login** — Cross-device authentication via wallet QR scan
- **Real-time updates** — SSE connection for instant login confirmation
- **Runtime theming** — Tenant-specific branding loaded from `theme.json` at runtime
- **i18n** — Multi-language support (EN, ES, CA) via `@ngx-translate`
- **Environment injection** — Runtime configuration via `env.js` (no rebuild per environment)

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript 5.8 |
| Framework | Angular 19 |
| Tests | Jest 29 |
| i18n | @ngx-translate |
| QR | angularx-qrcode |
| Build | Angular CLI + npm |

## Getting Started

### Prerequisites

- Node.js 22

### Install

```bash
npm ci
```

### Build

```bash
npm run build
```

Build output is placed in `dist/` and can be served by any static file server.

### Run Tests

```bash
npm test
```

Coverage reports are generated in `coverage/app/`.

### Development Server

```bash
npm start
```

Navigate to `http://localhost:4200/`.

## Configuration

Runtime configuration is injected via `assets/env.js`, generated from `assets/env.template.js` at deploy time.

| Variable | Description | Default |
|----------|-------------|---------|
| `API_BASE_URL` | Verifier backend URL | `http://localhost:8082` |

Theming is loaded at runtime from `assets/theme.json` (colors, logos, favicon, tenant domain).

## CI/CD

| Workflow | Trigger | Description |
|----------|---------|-------------|
| `build.yml` | Push / PR to `main` | Build, test, Jest coverage summary |
| `deploy-aws.yml` | Manual | Build and deploy to AWS Amplify |
| `release.yml` | Manual | Validate and create GitHub Release tag |

## Project Structure

```
src/
├── app/
│   ├── core/
│   │   ├── models/         # Theme model, environment types
│   │   └── services/       # ThemeService, SseService
│   └── features/
│       └── login/          # Login component (QR, countdown, animations)
├── assets/
│   ├── env.template.js     # Environment template (envsubst at deploy)
│   ├── i18n/               # Translation files (en.json, es.json, ca.json)
│   └── theme.json          # Runtime theming (colors, logos, tenant)
└── environments/           # Angular environment files
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

Licensed under the [Apache License 2.0](LICENSE).

## Contact

- **Organization:** [IN2, Ingeniería de la Información](https://in2.es)
- **Email:** [dome@in2.es](mailto:dome@in2.es)
</div>

<!-- ci gate verification, will be reverted -->
