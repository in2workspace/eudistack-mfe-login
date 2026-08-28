# MFE Login (Access Portal) — Repo Guide for Claude

> **Per-repo CLAUDE.md.** Loaded only when working inside this repo. The
> SDD Constitution lives in `../eudistack-platform-dev/CLAUDE.md`.

## Identity

Angular 19 micro-frontend that serves as the **Access Portal** for
tenant users. Handles OIDC login, role resolution (LEAR, TENANT_ADMIN,
SYSADMIN) and redirects to the appropriate workspace.

## Tech stack

- **Angular 19** standalone components
- **Module Federation** (consumed by portal-console shell)
- **angular-auth-oidc-client** for OIDC
- **Angular Material**
- **TypeScript** strict mode
- **Jest** + Testing Library
- **ESLint** + Angular ESLint

## Architecture

Standalone components. Strict conventions:
`../eudistack-platform-dev/.claude/rules/frontend-conventions.md`.

## Multi-tenancy

- Tenant resolved from URL pattern (`<tenant>-stg.eudistack.net`).
- After login, role resolved via JWT claims: `power` + `admin_organization_id` + `schema` → SYSADMIN / TENANT_ADMIN / LEAR.
- **No `tenant_organization_id` field exists.** Never propose one. The triplet above is the only source of truth for role resolution.

## Common commands

> **Do NOT `ng serve`** — use `make up` from `eudistack-platform-dev`.

| Task | Command |
|------|---------|
| Install | `npm ci` |
| Production build | `npm run build` |
| Tests | `npm test` |
| Lint | `npx eslint .` |

## Where to find specs

`../eudistack-platform-dev/docs/EUDISTACK-NNN-*/EUDISTACK-MMM/`. Figma
page **08 Verifier**.

## Git workflow

- **Squash merge to `main`.** Conventional Commits + Story footer.

## References

- Constitution: [`../eudistack-platform-dev/CLAUDE.md`](../eudistack-platform-dev/CLAUDE.md)
- Skills: `angular-conventions`, `figma-ux-review`, `commit-conventions`
- Rules: `frontend-conventions`
