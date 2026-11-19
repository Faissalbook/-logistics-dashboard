// Writes functions/.env.scratch3code (git-ignored) with the owner's email.
// Usage: npm run setup:scratch3code -- you@example.com
import { writeFileSync } from 'node:fs';

const email = (process.argv[2] ?? '').trim();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run setup:scratch3code -- votre@email.com');
  process.exit(1);
}
writeFileSync(
  new URL('../functions/.env.scratch3code', import.meta.url),
  `FIRESTORE_DATABASE_ID=transfasa\nBOOTSTRAP_OWNER_EMAIL=${email}\n`,
  'utf8',
);
console.log(`OK — functions/.env.scratch3code écrit pour ${email}`);
