/**
 * Date rules (PRD CNV-04): display DD/MM/YYYY, store ISO YYYY-MM-DD, timestamps UTC.
 * Guinea (Africa/Conakry) is UTC+0 with no DST, so UTC calendar fields are local fields.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DISPLAY_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function isValidYMD(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1) return false;
  const days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d <= days;
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Accepts an ISO date string, a Date, or epoch ms; returns `DD/MM/YYYY`. */
export function formatDate(value: string | Date | number): string {
  if (typeof value === 'string') {
    const m = ISO_DATE.exec(value);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  }
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) throw new RangeError(`Invalid date: ${String(value)}`);
  return `${pad(dt.getUTCDate())}/${pad(dt.getUTCMonth() + 1)}/${dt.getUTCFullYear()}`;
}

/** `DD/MM/YYYY HH:MM` in Africa/Conakry time. */
export function formatDateTime(value: string | Date | number): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) throw new RangeError(`Invalid date: ${String(value)}`);
  return `${formatDate(dt)} ${pad(dt.getUTCHours())}:${pad(dt.getUTCMinutes())}`;
}

/** Parse `DD/MM/YYYY` (or ISO) into ISO `YYYY-MM-DD`; null if invalid. Never accepts MM/DD. */
export function parseDisplayDate(input: string): string | null {
  const s = input.trim();
  const iso = ISO_DATE.exec(s);
  if (iso) {
    const [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
    return isValidYMD(y, m, d) ? s : null;
  }
  const dm = DISPLAY_DATE.exec(s);
  if (!dm) return null;
  const [d, m, y] = [Number(dm[1]), Number(dm[2]), Number(dm[3])];
  if (!isValidYMD(y, m, d)) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** ISO date `YYYY-MM-DD` for filenames, e.g. TransFasa_Trips_2026-04-30.xlsx */
export function fileDate(value: Date | number = Date.now()): string {
  const dt = new Date(value);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** Today's ISO date in Africa/Conakry. */
export function todayISO(now: Date | number = Date.now()): string {
  return fileDate(now);
}
