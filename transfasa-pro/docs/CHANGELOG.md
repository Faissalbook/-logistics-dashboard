# Changelog

## Phase 1 — Operations parity (19/11/2026)

Delivered (PRD §11.1 P1):
- **Reference data** (§6.1, §6.3): regions (Conakry, Coyah, Dubréka), destinations per region with spelling-insensitive ids, cement types, rate cards (per trip or per tonne, optional cement/truck, validity dates; most specific card wins).
- **Fleet** (FLT-05, §7.3): vehicles (tractors and trailers, unique plate/VIN, status), drivers (optionally linked to a DRIVER login), driver/trailer assignments with history.
- **Trips** (OPS-01..04, OPS-06): single scrollable form; truck → driver/trailer auto-fill; rate-card pre-fill with "modifié / edited" badges; live profit on every keystroke (same domain function as the server); inline bilingual validation; duplicate trip; statuses PLANNED → DELIVERED → VALIDATED (locked) with cancel and unlock (reason required, audit-logged); list with period/truck/region/cement/status filters and totals; drivers see and deliver only their own trips.
- **Expenses** (§6.5): per truck or general, six types, validation by accountant, delete with reason; drivers record their own.
- **Dashboard** (§6.6): server-computed summary with the same figures as the current app (trips, tonnage, revenue, direct costs, operating profit, expenses, net profit, margin) plus averages and revenue per tonne; by month, truck, region, cement, driver; period and truck filters; drivers see only their own trips.
- **Migration** (§12): `scripts/migrate-legacy.ts` — normalise, import as validated history, reconcile. **Acceptance met on the live export of 19/11/2026: 369 trips, 81 expenses; all 100 reconciliation figures match (net profit 728,136,000 GNF); re-run is a no-op.**
- Security rules extended to every new collection (drivers: own trips, own expenses, own truck).

Tests: 68 unit · 382 integration (350 rules cases = 35 paths × 10 principals; functions for every role) · 27 E2E (mobile + desktop, incl. a phone-width overflow check on 8 screens).

Open (owner input needed — PRD §14):
- Driver names/phones for BK2195, BN0836, AL8734 → enter in *Flotte / Fleet* and assign. Imported trips have no driver (the old app did not record one).
- Rate cards are empty: enter per destination in *Référentiel* (per trip or per tonne — both supported).
- Driver incentive is a separate field from now on; imported trips keep it inside "autres frais" (0 incentive).
- 26 imported expenses name a truck only in their description and stay "general"; one names the retired plate AL7834. Listed in the migration report for review.
- 4 destination spelling groups were merged (e.g. Kipe ×14 / Kipé ×9 → Kipé) and "." became "Non précisé"; rename in *Référentiel* if needed.


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
