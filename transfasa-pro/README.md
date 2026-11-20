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

## Migrating from the current app (PRD §12)

Export the three JSON files from the current TransFasa app (ask Claude: "export all voyages, dépenses and the résumé from TransFasa") and run:

```bash
npx tsx scripts/migrate-legacy.ts --trips voyages.json --expenses depenses.json --summary resume.json
```

Against the emulator this needs nothing else; against the real project see step 8 below. The script:
- normalises plates, `Dubréka` accents, dates and destination spellings (accented spelling wins; every merge is listed);
- refuses retired/off-fleet plates (AL7834, AL8735, …) and lists them instead of importing them;
- never guesses a truck from an expense description — those are listed for review;
- imports trips and expenses as **validated** history, audit-logged, with deterministic ids so re-running only adds new rows;
- compares 100 figures (total, every month, truck and region) with the old app and exits with an error on any difference.

The report (`migration-report/`, git-ignored — it contains business data) lists everything to review.

## Publier dans le projet existant `scratch3code` (à côté de ScratchCode)

TransFasa y est isolé : site séparé (`transfasa-pro-gn.web.app`), base Firestore séparée (`transfasa`), fonctions dans un groupe séparé (`transfasa`). Le site, les données, les règles et les fonctions de ScratchCode ne sont pas touchés. Les comptes de connexion sont partagés, mais un compte sans rôle TransFasa ne voit rien.

Prérequis : Node 20+, Git, projet `scratch3code` au forfait **Blaze**, et dans la console Firebase : *Authentication → Sign-in method → Email/Password* activé.

```bash
git clone -b claude/transfasa-pro-prd-idz1ge https://github.com/faissalbook/-logistics-dashboard.git
cd -logistics-dashboard/transfasa-pro
npm ci
npx firebase login
npx firebase functions:list --project scratch3code        # voir les fonctions ScratchCode existantes (rien n'est modifié)
npx firebase firestore:databases:create transfasa --location=europe-west1 --project scratch3code
npx firebase hosting:sites:create transfasa-pro-gn --project scratch3code
npm run setup:scratch3code -- votre@email.com              # l'e-mail du compte gérant
npm run deploy:scratch3code
```

### Ou : publier depuis GitHub, sans ordinateur

Le workflow `.github/workflows/transfasa-pro-deploy-scratch3code.yml` fait tout (tests, base `transfasa`, site, contrôle qu'aucune fonction ScratchCode ne serait remplacée, publication). Une seule fois, dans le navigateur :

1. Google Cloud → *IAM et administration → Comptes de service* du projet `scratch3code` → **Créer un compte de service** `transfasa-deploy`, rôles **Éditeur** et **Utilisateur du compte de service**.
2. Ce compte → onglet *Clés* → *Ajouter une clé → JSON* (un fichier se télécharge — ne le partagez avec personne).
3. GitHub → dépôt → *Settings → Secrets and variables → Actions → New repository secret* :
   - `FIREBASE_SA_SCRATCH3CODE` : tout le contenu du fichier JSON ;
   - `TRANSFASA_OWNER_EMAIL` : votre e-mail de gérant.

Ensuite, chaque modification de `transfasa-pro/deploy/scratch3code.trigger` sur la branche publie (Claude peut le faire pour vous). Le résultat et l'adresse du site s'affichent dans l'onglet *Actions*.

Si le nom `transfasa-pro-gn` est déjà pris, choisissez-en un autre et remplacez-le dans `firebase.scratch3code.json`.

Ensuite :
1. Console Firebase → *Authentication → Users → Add user* : créez votre compte avec **le même e-mail** (avant tout le monde).
2. Ouvrez `https://transfasa-pro-gn.web.app`, connectez-vous, cliquez **« Je suis le gérant »** (ne marche qu'une fois, pour cet e-mail).
3. Menu *Import ancienne app* : choisissez `voyages.json`, `depenses.json`, `resume.json` → *Importer*. Le contrôle doit afficher « Contrôle OK ».

## New Firebase project — one-time setup (owner)

1. **Create** the project at console.firebase.google.com → *Add project* (e.g. `transfasa-pro`). Note the project ID.
2. **Billing**: switch to the *Blaze* plan (Cloud Functions require it) and set a budget alert (e.g. 25 USD/month — expected cost at this size is a few dollars).
3. **Authentication** → *Sign-in method* → enable **Email/Password**.
4. **Firestore** → *Create database* → production mode, location **europe-west1** (same region as the functions).
5. **Project settings → General → Your apps → Web app**: register it, then copy `apiKey`, `authDomain`, `projectId`, `storageBucket`, `appId` into `apps/web/.env.production.local` (template: `apps/web/.env.example`).
6. **Service account**: *Project settings → Service accounts → Generate new private key*. Keep the JSON file private (never commit it).
7. **Deploy** (from `transfasa-pro/`):
   ```bash
   npx firebase login
   npx firebase use --add <project-id>     # alias it "prod"
   npm run build
   npx firebase deploy --project <project-id> --only firestore:rules,firestore:indexes,functions,hosting
   ```
8. **First owner + data**:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json GCLOUD_PROJECT=<project-id>
   npx tsx scripts/bootstrap-owner.ts <your-email> "<Your Name>"          # prints a temporary password
   npx tsx scripts/migrate-legacy.ts --trips voyages.json --expenses depenses.json --summary resume.json --project <project-id>
   ```
9. Sign in at `https://<project-id>.web.app`, create the other accounts in *Utilisateurs / Users*, add drivers and assign them to trucks in *Flotte / Fleet*, and enter rate cards in *Référentiel / Reference data*.
10. Run both apps in parallel for two weeks; re-run the migration at cut-over (it only adds the new rows), then freeze the old app.
