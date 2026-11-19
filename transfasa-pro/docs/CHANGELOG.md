# Changelog

## Phase 0 — Foundation (19/11/2026)

Delivered (PRD §11.1 P0):
- Monorepo (npm workspaces): `apps/web`, `functions`, `packages/domain`, `packages/i18n`; strict TypeScript, ESLint, Vitest, Playwright, GitHub Actions CI.
- **Conventions** (CNV-01..05): `formatGNF`/`parseGNF`/`roundGNF` (integer GNF, half-up, decimal.js), `formatDate` DD/MM/YYYY, bilingual label dictionary.
- **RBAC** (§9.1, SEC-01, SEC-04): 8 roles × 37 permissions with own/assigned scopes in `packages/domain/src/rbac.ts`; roles stored as Firebase Auth custom claims; default-deny Firestore and Storage rules; callable guards.
- **User management**: OWNER creates users, assigns roles, disables accounts; cannot remove own OWNER role. First owner via `scripts/bootstrap-owner.ts`.
- **Audit log** (AUD-01, 02, 04): append-only, hash-chained (`sha256(prevHash ‖ canonical JSON)`), written in the same Firestore transaction as the change; sign-ins recorded; on-demand and nightly chain verification; viewer for OWNER/ACCOUNTANT.
- **App shell**: sign-in, role-aware navigation (sidebar on desktop, bottom bar + "Plus" sheet on mobile), dashboard, Users & roles, Audit log; later-phase screens show bilingual empty states.

Tests: 41 unit · 139 integration (120 rules cases = 12 paths × 10 principals) · 20 E2E (8 roles + 2 scenarios, mobile and desktop).

Deferred:
- Failed sign-in logging (AUD-04) needs Identity Platform blocking functions → P6.
- Phone OTP and 2FA for OWNER/ACCOUNTANT (SEC-03) need Identity Platform on the real project → P6.
- Audit chain break alert is a log error until notifications ship (P6).
- No real Firebase project yet: everything runs on the emulators.
