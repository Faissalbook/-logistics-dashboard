// Refuse to publish if another app on the shared project (e.g. ScratchCode) already has a function
// with the same name and region as one of TransFasa's — deploying would otherwise replace it.
// Usage: npx firebase functions:list --project scratch3code --json | node scripts/check-function-conflicts.mjs europe-west1
import { readFileSync } from 'node:fs';

const region = process.argv[2] ?? 'europe-west1';
const src = readFileSync(new URL('../functions/src/index.ts', import.meta.url), 'utf8');
const ours = new Set([...src.matchAll(/^export const (\w+) = on(?:Call|Schedule)\(/gm)].map((m) => m[1]));
if (ours.size === 0) {
  console.error('::error::No TransFasa functions found in functions/src/index.ts');
  process.exit(1);
}

let deployed = [];
const raw = readFileSync(0, 'utf8').trim();
if (raw) {
  const parsed = JSON.parse(raw);
  deployed = Array.isArray(parsed) ? parsed : Array.isArray(parsed.result) ? parsed.result : [];
}

const conflicts = deployed.filter((f) => ours.has(f.id) && f.region === region && (f.codebase ?? 'default') !== 'transfasa');
console.log(`TransFasa functions: ${[...ours].join(', ')}`);
console.log(`Already deployed in project: ${deployed.length} (${deployed.map((f) => `${f.id}@${f.region}[${f.codebase ?? 'default'}]`).join(', ') || 'none'})`);
if (conflicts.length) {
  for (const f of conflicts)
    console.error(`::error::Conflit : la fonction ${f.id} (${f.region}) existe déjà dans le groupe "${f.codebase ?? 'default'}" — publication annulée pour ne pas la remplacer.`);
  process.exit(1);
}
console.log('No conflict with other apps’ functions.');
