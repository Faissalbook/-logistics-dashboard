# TransFasa Pro — agent rules

Source of truth: `../docs/PRD-TransFasa-Pro.md`. Reference requirement IDs (IMP-xx, OPS-xx, SEC-xx, AUD-xx, CNV-xx) in commit messages.

## Phases
- Work one phase at a time (PRD §11.1). Stop at the end of each phase, summarise, and wait. Do not start the next phase unprompted.
- Phase log: `docs/CHANGELOG.md`. Phase 0 is done.

## Hard rules
- Money: integer GNF only, via `@transfasa/domain` (`roundGNF`, `applyRate`, `formatGNF`). Never JS float math on money. Display `1,234,567 GNF`.
- Dates: display `DD/MM/YYYY` (`formatDate`), store ISO. Filenames `YYYY-MM-DD`.
- Every user-facing string comes from `@transfasa/i18n` and is bilingual, French first. Keep `Dubréka` accented; files UTF-8.
- Never invent trucks, drivers, distances, tariffs or prices. Values marked [TBC] in the PRD stay flagged, editable settings.
- All business math lives in `packages/domain` with unit tests; UI and functions import it, never re-implement it.
- Every write that touches money, status, users or settings goes through a Cloud Function: `requirePermission(req, '<perm>')` + `auditedTransaction(...)`. Clients never write those collections directly.
- RBAC lives in `packages/domain/src/rbac.ts`. When you open a Firestore path, add rows to `tests/integration/rules.test.ts` (every path × every role). Default deny.
- No placeholder/fake business data anywhere except `scripts/seed-emulator.ts` (emulator-only logins).

## Ask before
Adding a dependency not in PRD §10.1 · changing the data model (PRD §8) · deleting data or migrations · deploying anywhere but the emulator · widening `firestore.rules` beyond the RBAC matrix.

## Commands (run from `transfasa-pro/`)
- `npm run check` — lint + typecheck + unit tests. Run before every commit.
- `npm run test:integration` — emulator tests (needs Java 11+).
- `npm run test:e2e` — Playwright against emulators + Vite.
- `npm run dev` — emulators + web app; then `npm run seed:emulator` in another terminal.
