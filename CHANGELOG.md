# Changelog

[Unreleased]

### Changed (2026-06-18)
- Resolved multiple Critical and High severity vulnerabilities in frontend build dependencies.

## [3.3.1] - 2026-06-18

### Added (2026-06-18)

- **CGCOM tenant support** added to tenants constants. applied CGCOM own branding.

## [3.2.7] - 2026-06-17

- **SSE URL resolution** is resolved with the appropiate canonical or non-canonical URL.

## [3.2.6] - 2026-06-15

### Added (2026-06-15)

- **`TenantService` with three-step resolution.** New `TenantService` resolves the active tenant before bootstrap in three steps: (1) extract slug from the first hostname label, strip env suffix (`-stg`/`-dev`/`-pre`), validate against `^[a-z0-9-]+$` and `KNOWN_TENANTS`; (2) if unresolved, fetch `/assets/custom-domain.json` and look up `window.location.hostname` in the map, applying the same validation; (3) fall back to `FALLBACK_TENANT` (`eudistack`). Enables custom-domain deployments (e.g. `wallets.company.com`) to be mapped to a known tenant without relying on subdomain structure.
- **`APP_INITIALIZER` ordering guarantee.** The initialiser in `app.config.ts` now chains `tenantService.resolve()` → `themeService.load()` sequentially in a single factory, ensuring the tenant signal is settled before `ThemeService` reads it.

### Changed (2026-06-15)

- **`tenants.constants.ts` simplified to data-only.** All resolution logic (`resolveTenant`, `stripEnvSuffix`, `TENANT_SLUG_RE`, `ENV_SUFFIXES`) moved into `TenantService` as private members. The file now exports only `KNOWN_TENANTS` and `FALLBACK_TENANT`.
- **`ThemeService` decoupled from `window.location`.** `load()` reads `this.tenantService.tenant()` (signal) instead of calling `resolveTenant(window.location.hostname)` directly.

## [3.3.0] - 2026-06-16

### Added (EUDISTACK-606 — US-003: Footer embebido configurable por tenant)

- **Tenant embedded footer.** `LoginComponent` now renders an optional tenant-provided HTML block below the page content. The block is conditionally rendered with `*ngIf` — the DOM node is fully absent (no space reserved) when the tenant has no `footerEmbedCode` configured (FR-06 / FR-07 / AC-01 / AC-02).
- **Footer sanitization via shared pipeline.** `ThemeService.sanitizedFooter` getter delegates to the existing `sanitizeEmbedHtml()` method, applying DOMPurify with the canonical allow-list (`EMBED_ALLOWED_TAGS`, `EMBED_ALLOWED_ATTR`, `EMBED_ALLOWED_URI_REGEXP`) before `DomSanitizer.bypassSecurityTrustHtml()`. Prohibits `<script>`, `<style>`, `javascript:` hrefs, and `on*` event handlers (FR-08 / AC-03 / ES-01–ES-04 / ADR-arch-002 / ADR-arch-003 / AD-1).
- **Empty-after-sanitize guard.** If DOMPurify strips all footer content, `sanitizeEmbedHtml` returns `null` and the footer container is not rendered (EC-01).
- **DOME seed footerEmbedCode.** `tenants/dome/theme.json` in `eudistack-platform-assets` updated with registration CTAs (customer + provider) as `footerEmbedCode` (in `eudistack-platform-assets`).

### Removed (EUDISTACK-606 — US-003: Footer embebido configurable por tenant)

- **Deprecated `registration-card` block.** The `*ngIf="theme.content?.onboardingUrl"` registration card has been removed from `LoginComponent` template and SCSS — superseded by the configurable `footerEmbedCode` embed (ADR-arch-005).
- **Deprecated `onboardingUrl` field.** Removed from all seed `theme.json` files (`dome`, `altia`, `cgcom`, `eudistack`, `kpmg`) in `eudistack-platform-assets` (ADR-arch-005).

### Added (EUDISTACK-605 — US-002: Header embebido configurable por tenant)

- **Tenant embedded header.** `LoginComponent` now renders an optional tenant-provided HTML block above the branding header. The block is conditionally rendered with `*ngIf` — the DOM node is fully absent (no space reserved) when the tenant has no `headerEmbedCode` configured (FR-03 / FR-04 / AC-01 / AC-02).
- **DOMPurify sanitization.** `ThemeService.sanitizeEmbedHtml()` applies DOMPurify with a canonical allow-list (`EMBED_ALLOWED_TAGS`, `EMBED_ALLOWED_ATTR`, `EMBED_ALLOWED_URI_REGEXP: /^https:/i`) before passing content to Angular's `DomSanitizer.bypassSecurityTrustHtml()`. Prohibits `<script>`, `<style>`, `javascript:` hrefs, and `on*` event handlers (FR-05 / AC-03 / ES-01–ES-04 / ADR-arch-002 / ADR-arch-003).
- **Empty-after-sanitize guard.** If DOMPurify strips all content, `sanitizeEmbedHtml` returns `null` and the container is not rendered (EC-01).
- **Shared allow-list constants.** `embed-sanitizer.constants.ts` materialises the canonical allow-list from `architecture.md §6` as TypeScript constants, ready for reuse by US-003 (footer embed).

### Added (EUDISTACK-604 — US-001: Carga per-tenant del theme.json desde subdominio)

- **Per-tenant theme resolution.** The Login MFE now resolves the tenant from the request hostname (`resolveTenant(window.location.hostname)`) and loads its branding from `/assets/tenants/{tenant}/theme.json` via `APP_INITIALIZER`, before the first paint. Replaces the previous single hardcoded `assets/theme.json`.
- **Deterministic fallback.** Any failure during theme load (404, 5xx, timeout ≥800 ms, malformed response) silently falls back to the built-in EUDIStack default theme. The bootstrap always completes; no blank screen on theme errors.
- **Extended `Theme` contract.** `ThemeContent` now includes optional `headerEmbedCode: string | null` and `footerEmbedCode: string | null` fields for future US-002/003 embed slots. `onboardingUrl` is deprecated (kept for backward-compat).
- **Path-traversal guard.** Resolved tenant identifiers are validated against `^[a-z0-9-]+$` before composing the asset URL (ES-05).
- **Asset path rewriting.** `rewriteAssetPaths()` normalises `/assets/tenant/logo.png` → `/assets/tenants/{tenant}/logo.png` after loading the theme, matching the Wallet PWA pattern and fixing broken logos on non-sandbox tenants.

## [3.2.4] - 2026-05-19

### Fixed
- Redirect to /issuer/home when login times out.

## [3.2.3] - 2026-05-13

### Added
- **Knowledge Base link.** Added a link to the knowledge base in the footer of the login component.

## [3.2.2] - 2026-05-04

### Added
- **QR scanner appearance.** Changed the QR look and feel to improve scan reliability and keep the scanner path responsive.

## [3.2.1] - 2026-04-28

### Fixed (EUDI-094 multi-tenant rollout)

- **GitHub Actions env — `API_BASE_URL=/verifier`.** Post-cutover the
  Atlassian-style routing serves the verifier same-origin under
  `/verifier/*`, but the STG env variable still pointed to the legacy
  `https://verifier-stg.api.altia.eudistack.net` which no longer
  resolves (`ERR_NAME_NOT_RESOLVED` on SSE at
  `/api/login/events`). Variable updated in GitHub Actions `stg`
  environment; redeploy triggered to regenerate `assets/env.js`.

### Added
- Add visual focus indicators, keyboard support (spacebar), and ARIA labels (PRB-002)

## [3.2.0] - 2026-04-23

### Changed (EUDI-094 — auto-deploy to all tenants on release)

- **`.github/workflows/deploy.yml`** — eliminado el input `tenant`. El deploy publica un build único a `s3://.../verifier/` e invalida todas las CloudFront STG del entorno (en lugar de una sola por tenant).
- **`.github/workflows/release.yml`** — el release dispara `deploy.yml` automáticamente tras el tag (`--ref main`) sin parametrizar tenant.

## [3.1.1] - 2026-04-23

### Changed (EUDI-094 — drop tenant asset injection from deploy)

- **`.github/workflows/deploy.yml`** — eliminado el step "Inject tenant assets" que clonaba `eudistack-platform-assets` y sobreescribía `assets/theme.json` y `assets/tenant/*` en cada deploy. Login es un SPA con branding de producto único (baked en `src/assets/`, ya así desde 3.1.0), por lo que la inyección per-tenant era dead work.

## [3.1.0] - 2026-04-20

### Added (EUDI-064: SaaS multi-tenant)

- Product branding baked at build time (no runtime branding config).
- Atlassian-style base-href for same-origin MFE serving.
- Relative API URLs for same-origin routing.

## [3.0.0] - 2026-03-24

### Fixed

- Changed layout for login page button.
- Minor spelling fixes in `es.json`.
- **ThemeService error handling** — `load()` now catches fetch failures, logs the error, and propagates it instead of leaving the app in an infinite loading state.
- **SCSS budget** — Extracted shared animations (`fadeSlideIn`, `shimmer`) and `prefers-reduced-motion` rules to global `styles.scss`, compacted component styles, and adjusted `anyComponentStyle` budget to 7kB/10kB.
- **Toggle semantics** — Replaced click-only `<a>` elements in the QR/same-device toggle with `<button>` elements for correct HTML semantics.

### Added
- **ErrorComponent tests** — 20 unit tests covering initialization, `copyDetails()`, and template rendering.
- **ThemeService tests** — 12 unit tests covering `load()`, error handling, i18n config, CSS custom properties, favicon, and `computeActionPrimary`.
- **SseService tests** — 7 unit tests covering EventSource creation, redirect events, error handling, and cleanup on unsubscribe.
- **ARIA accessibility** — Added `role="alert"` to timeout/error messages, `role="status"` + `aria-live="polite"` to success overlay, `role="timer"` to countdown, `aria-hidden="true"` to decorative icons/SVGs, and `aria-label` to action buttons.

### Security
- **Angular XSS fix** — Updated `@angular/core`, `@angular/compiler` and all Angular packages from 19.2.19 to 19.2.20 (GHSA-g93w-mfhg-p222: XSS in i18n attribute bindings).
- **flatted Prototype Pollution** — Updated via `npm audit fix` (GHSA-rf6f-7fwh-wjgh).
- **immutable Prototype Pollution** — Updated via `npm audit fix` (GHSA-wf6x-7x77-mvgw).
- **tar path traversal** (6 CVEs) — Overridden to `^7.5.11` via npm overrides (GHSA-34x7-hfp2-rc4v, GHSA-8qq5-rm4j-mr97, GHSA-83g3-92jg-28cx, GHSA-qffp-2rhf-9h96, GHSA-9ppj-qmqm-q256, GHSA-r6q2-hw4h-h46w).
- **serialize-javascript RCE** — Overridden to `^7.0.3` via npm overrides (GHSA-5c6j-r48x-rmvq).
- **@tootallnate/once control flow** — Overridden to `^3.0.1` via npm overrides (GHSA-vpq2-c234-7xj6).
- **Dependabot** — Added `.github/dependabot.yml` for automated weekly security scanning of npm and GitHub Actions dependencies.

- **PR template** — Added `.github/pull_request_template.md` with checklist for CHANGELOG, tests, and EUDI closing tasks.

#### Premium UX/UI Improvements
- **QR Pulse Animation:** Subtle glowing border pulse on the QR code frame while waiting for wallet scan, using `box-shadow` with `--action-primary-rgb` token.
- **Visual Countdown Timer:** Circular SVG countdown indicator (48px) below the QR code showing remaining seconds before session timeout. Replaces text-only feedback with a `stroke-dashoffset`-based progress ring.
- **Same-Device / QR Toggle Animation:** Smooth `fadeSlideIn` crossfade transition (opacity + translateY) when toggling between QR code and same-device login modes.
- **Success Animation:** Animated SVG checkmark with circle draw-in effect and "Verified!" text displayed for 800ms before redirect on successful VP verification.
- **Copy Button Enhancement:** Scale bounce animation (`copyBounce`) and temporary green background (`--status-success`) on the copy button when content is copied.
- **Skeleton Loader:** CSS-only shimmer skeleton (card, title, lines, QR placeholder) shown while the theme is loading, using `linear-gradient` animation on `--surface-muted`/`--surface-card` tokens.
- **Error Component Enhancement:** Entrance `fadeSlideIn` animation on the error card, shake animation on the warning icon, and left border accent with `--status-error` color.
- **Accessibility:** All animations respect `prefers-reduced-motion: reduce` media query across both login and error components.
- Translation key `login.verified` added in EN/ES/CA.
- 7 new unit tests covering countdown, success state, skeleton loader, and interval cleanup.

#### Copy QR Content
- Added a "Copy" button below the QR code hint text that copies the authorization request URL to the clipboard.
- Visual feedback: icon switches from `fa-copy` to `fa-check` and text shows "Copied!" for 2 seconds.
- Translation keys: `login.qr.copy`, `login.qr.copied` (EN/ES/CA).

#### Same-Device Login Flow
- Added toggle link below the QR card: "Can't scan the QR? Login from the same device".
- When activated, the QR code is hidden and replaced with a "Digital Wallet" button.
- The wallet button opens the tenant's wallet webapp in a **new tab** (`window.open`), preserving the SSE connection in the original tab so the verifier can detect when the VP is submitted and redirect automatically.
- If the browser blocks the popup, it falls back to `window.location.href` redirect.
- The wallet redirect URL is built by concatenating the theme's `walletUrl` base with the `authRequest` path and query string (e.g., `https://wallet.dome-marketplace.org/oid4vp/auth?nonce=abc`).
- Toggle link switches to "Switch to QR code login" in same-device mode.
- The toggle is only visible when `walletUrl` is configured in the theme.
- Translation keys: `login.sameDevice.switch`, `login.qr.switch` (EN/ES/CA).

#### Theme Configuration
- Added `walletUrl`, `onboardingUrl`, and `supportUrl` fields to theme JSON files (`dome.json`, `altia.json`, `theme.json`) to align with the `Theme` TypeScript model.
- DOME theme configured with `walletUrl: "https://wallet.dome-marketplace.org"`.

#### Jest Testing Setup
- Configured Jest as the test runner (replacing Karma).
- Installed `jest@^29.7.0`, `@types/jest`, `jest-preset-angular@^14.6.2`, `ts-jest`.
- Created `jest.config.js` and `setup-jest.ts`.
- Updated `tsconfig.spec.json` to use `jest` types instead of `jasmine`.
- Updated `package.json` test script to run `jest`.
- Added 29 unit tests for `LoginComponent` covering:
  - Initialization and query parameter reading
  - `walletRedirectUrl` URL construction (5 cases including edge cases)
  - `copyAuthRequest` clipboard interaction
  - `toggleSameDevice` state management
  - `openWallet` with new-tab and popup-blocked fallback
  - Template rendering (QR vs same-device, conditional elements)
  - Navigation methods
  - Component cleanup

### Changed
- `openWallet()` now uses `window.open()` (new tab) with fallback to `window.location.href`, instead of direct redirect, to preserve the SSE subscription.
- Replaced `deeplinkUrl` getter (which used `openid4vp://` scheme) with `walletRedirectUrl` getter (which uses the tenant's `walletUrl` from theme config).

### Files Modified
- `src/app/features/login/login.component.ts`
- `src/app/features/login/login.component.html`
- `src/app/features/login/login.component.scss`
- `src/assets/i18n/en.json`
- `src/assets/i18n/es.json`
- `src/assets/i18n/ca.json`
- `src/assets/theme.json`
- `themes/dome.json`
- `themes/altia.json`

### Files Created
- `src/app/features/login/login.component.spec.ts`
- `jest.config.js`
- `setup-jest.ts`
