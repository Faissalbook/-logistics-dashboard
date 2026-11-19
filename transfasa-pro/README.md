# TransFasa Pro

Import & fleet operations platform for TransFasa Guinée — heavy-vehicle procurement from China and cement-haulage operations around Conakry, Coyah and Dubréka. All financial data in GNF.

- Product requirements: [`../docs/PRD-TransFasa-Pro.md`](../docs/PRD-TransFasa-Pro.md)
- Agent rules: [`CLAUDE.md`](CLAUDE.md) · Progress: [`docs/CHANGELOG.md`](docs/CHANGELOG.md)

## Stack

React 18 + TypeScript + Vite + Tailwind · Firebase (Auth with role claims, Firestore, Cloud Functions in `europe-west1`) · `decimal.js` money math · Vitest · Firebase Emulator Suite · Playwright.

```
apps/web/          React app
functions/         Cloud Functions (users & roles, audit chain)
packages/domain/   money, dates, RBAC matrix, audit hash chain — pure TS, unit-tested
packages/i18n/     FR / EN labels
tests/integration/ rules × roles matrix, functions, audit chain (emulators)
e2e/               Playwright (mobile + desktop)
scripts/           emulator seed, first-owner bootstrap
```

## Run locally

Requires Node 20+ and Java 11+ (for the emulators).

```bash
cd transfasa-pro
npm install
npm run dev              # emulators + http://127.0.0.1:5173
npm run seed:emulator    # in a second terminal: one login per role
```

Seeded logins: `owner@transfasa.test`, `procurement@`, `inspector@`, `customs@`, `fleet-manager@`, `driver@`, `accountant@`, `viewer@` (all `@transfasa.test`), password `Transfasa#2026`. Emulator only.

## Tests

```bash
npm run check             # lint, typecheck, unit
npm run test:integration  # security rules × every role, functions authz, audit chain
npm run test:e2e          # sign-in and navigation for every role, mobile + desktop
```

## Going to a real Firebase project

1. Create the project (Blaze plan, needed for Functions), enable Email/Password auth.
2. Add it to `.firebaserc`, copy `apps/web/.env.example` to `apps/web/.env.production.local` and fill it in.
3. Create the first owner: `GCLOUD_PROJECT=<id> GOOGLE_APPLICATION_CREDENTIALS=<sa.json> npx tsx scripts/bootstrap-owner.ts <email> "<Full Name>"`.
4. Deploy (human-approved): `firebase deploy --project <id>`.
