/**
 * Migrate trips and expenses from the current TransFasa app (PRD §12).
 *
 *   npx tsx scripts/migrate-legacy.ts \
 *     --trips voyages.json --expenses depenses.json --summary resume.json \
 *     [--fleet BK2195,BN0836,AL8734] [--report ./migration-report] [--dry-run] [--project <id>]
 *
 * Inputs are the JSON returned by the TransFasa connector (lister_voyages limite=2000,
 * lister_depenses limite=2000, resume_transfassa). Against a real project, pass --project
 * with the exact project id as a confirmation (GOOGLE_APPLICATION_CREDENTIALS must be set).
 * Exit code 1 if the reconciliation does not match the old app to the franc.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { formatGNF, planLegacyImport, reconcile, type LegacySummary } from '../packages/domain/src/index';

const { values: args } = parseArgs({
  options: {
    trips: { type: 'string' },
    expenses: { type: 'string' },
    summary: { type: 'string' },
    fleet: { type: 'string', default: 'BK2195,BN0836,AL8734' },
    report: { type: 'string', default: './migration-report' },
    'dry-run': { type: 'boolean', default: false },
    project: { type: 'string' },
  },
});

if (!args.trips || !args.expenses) {
  console.error('Usage: --trips voyages.json --expenses depenses.json [--summary resume.json] [--dry-run]');
  process.exit(2);
}
const emulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const projectId = process.env.GCLOUD_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT;
if (!emulator && !args['dry-run'] && (!args.project || args.project !== projectId)) {
  console.error(`Refusing to write to a real project without --project ${projectId ?? '<GCLOUD_PROJECT>'} as confirmation.`);
  process.exit(2);
}
process.env.GCLOUD_PROJECT ??= 'demo-transfasa';

const read = (p: string) => readFileSync(resolve(p), 'utf8');
const tripsRaw = read(args.trips);
const expensesRaw = read(args.expenses);
const trips = JSON.parse(tripsRaw).voyages ?? JSON.parse(tripsRaw);
const expenses = JSON.parse(expensesRaw).depenses ?? JSON.parse(expensesRaw);
const source = createHash('sha256').update(tripsRaw).update(expensesRaw).digest('hex').slice(0, 12);

const plan = planLegacyImport({ trips, expenses }, args.fleet!.split(','));
const errors = plan.issues.filter((i) => i.level === 'error');
const warnings = plan.issues.filter((i) => i.level === 'warning');

console.log(`Source ${source}: ${trips.length} voyages, ${expenses.length} dépenses`);
console.log(`Plan: ${plan.trips.length} trips, ${plan.expenses.length} expenses, ${plan.plates.length} trucks (${plan.plates.join(', ')}),`);
console.log(`      ${plan.destinations.length} destinations, ${plan.cementTypes.length} cement types (${plan.cementTypes.map((c) => c.label).join(' · ')})`);
console.log(`Issues: ${errors.length} errors (rows excluded), ${warnings.length} warnings (rows imported)`);

mkdirSync(resolve(args.report!), { recursive: true });
const md: string[] = [
  `# Migration report — ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`,
  '',
  `Source ${source}. ${plan.trips.length}/${trips.length} trips and ${plan.expenses.length}/${expenses.length} expenses imported.`,
  '',
  '## Lignes exclues / Excluded rows',
  ...(errors.length ? errors.map((i) => `- ${i.source} ${i.legacyId} — ${i.code}: ${i.message}`) : ['Aucune / None']),
  '',
  '## À vérifier / To review',
  ...(warnings.length ? warnings.map((i) => `- ${i.source} ${i.legacyId} — ${i.code}: ${i.message}`) : ['Aucune / None']),
];

let exitCode = 0;
if (!args['dry-run']) {
  const { importLegacyPlan, storedSummary } = await import('../functions/src/ops/legacyImport');
  const result = await importLegacyPlan(plan, source);
  console.log('Imported:', JSON.stringify(result));
  md.push('', '## Résultat / Result', '```json', JSON.stringify(result, null, 2), '```');

  if (args.summary) {
    const legacy = JSON.parse(read(args.summary)) as LegacySummary;
    const recon = reconcile(legacy, await storedSummary());
    const bad = recon.lines.filter((l) => !l.ok);
    const fmt = (metric: string, n: number) => (/trips|tonnage/.test(metric) ? String(n) : formatGNF(n));
    console.log(
      recon.ok
        ? `RECONCILIATION OK — ${recon.lines.length} figures match (net profit ${formatGNF(legacy.total.profit_net)})`
        : `RECONCILIATION FAILED — ${bad.length} of ${recon.lines.length} figures differ`,
    );
    for (const l of bad) console.log(`  ${l.scope} ${l.metric}: legacy ${fmt(l.metric, l.legacy)} ≠ migrated ${fmt(l.metric, l.migrated)}`);
    md.push(
      '',
      `## Rapprochement / Reconciliation — ${recon.ok ? 'OK' : 'ÉCART / MISMATCH'}`,
      '',
      '| Périmètre / Scope | Indicateur / Metric | Ancienne app / Legacy | Migré / Migrated | |',
      '|---|---|---:|---:|---|',
      ...recon.lines.map(
        (l) => `| ${l.scope} | ${l.metric} | ${fmt(l.metric, l.legacy)} | ${fmt(l.metric, l.migrated)} | ${l.ok ? '✔' : '✘'} |`,
      ),
    );
    if (!recon.ok) exitCode = 1;
  }
}

const reportPath = resolve(args.report!, `migration-${new Date().toISOString().slice(0, 10)}.md`);
writeFileSync(reportPath, `${md.join('\n')}\n`, 'utf8');
writeFileSync(resolve(args.report!, 'plan-issues.json'), JSON.stringify(plan.issues, null, 2), 'utf8');
console.log(`Report: ${reportPath}`);
process.exit(exitCode);
