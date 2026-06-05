import * as XLSX from 'xlsx';

const TRUCK_MAP = {
  BK2195: 'BK-2195',
  'BK-2195': 'BK-2195',
  Bk2195: 'BK-2195',
  Bak2195: 'BK-2195',
  AL8734: 'AL-8734',
  'AL 8734': 'AL-8734',
  'AL-8734': 'AL-8734',
};

const CEMENT_MAP = {
  'CIMII/AP42.5 N': 'CIM II/AP 42.5 N',
  'CIMI/42.5 R CPA': 'CIM I/42.5 R CPA',
};

const normTruck = (v) => {
  if (!v) return null;
  const key = String(v).trim();
  return TRUCK_MAP[key] || key.replace(/\s+/g, '').replace(/^([A-Z]+)(\d+)$/, '$1-$2');
};

const normCement = (v) => {
  if (!v) return null;
  const key = String(v).trim();
  return CEMENT_MAP[key] || key;
};

const num = (v) => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  // Strip everything except digits, minus, and decimal point.
  // Handles formatted cells like "4,000,000 GNF", "40 t", "1 410 000".
  const cleaned = String(v).replace(/[^0-9.\-]/g, '');
  if (!cleaned || cleaned === '-' || cleaned === '.') return 0;
  const n = Number(cleaned);
  return isNaN(n) ? 0 : n;
};

const parseDate = (v) => {
  if (!v) return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const s = String(v).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  const iso = s.match(/^\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

const extractTruck = (text) => {
  if (!text) return null;
  const m = String(text).match(/\b(BK[- ]?2195|Bak2195|Bk2195|AL[- ]?8734)\b/i);
  return m ? normTruck(m[1]) : null;
};

const isSubtotal = (v) => v && /^(subtotal|total)/i.test(String(v).trim());
const isCalendarHeader = (v) => v && /^[📅]/.test(String(v));
const isSectionTitle = (v) =>
  v && /^(LOGISTICS|GENERAL\s+EXPENSES|TRIP)/i.test(String(v).trim());

/**
 * Parse an XLSX File/Blob and return {trips, expenses}.
 * Auto-detects the two side-by-side blocks based on the header row.
 */
export async function parseWorkbook(file) {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const trips = [];
  const expenses = [];

  for (const sheetName of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], {
      header: 1,
      defval: null,
      raw: false,
    });

    let tripHdr = null;
    let expHdr = null;
    for (const row of rows) {
      if (!row) continue;
      // Detect header row by presence of known column names
      const lower = row.map((c) => (c ? String(c).trim().toLowerCase() : ''));
      const dateIdxs = lower.map((c, i) => (c === 'date' ? i : -1)).filter((i) => i >= 0);
      if (lower.includes('truck') && lower.includes('tonnage (t)')) {
        tripHdr = {
          date: lower.indexOf('date'),
          truck: lower.indexOf('truck'),
          cement: lower.indexOf('cement type'),
          region: lower.indexOf('region'),
          destination: lower.indexOf('destination'),
          tonnage: lower.indexOf('tonnage (t)'),
          transport: lower.indexOf('transport'),
          offload: lower.indexOf('offload'),
          fuel: lower.indexOf('fuel cost'),
          other: lower.indexOf('other'),
          total: lower.indexOf('total cost'),
          profit: lower.indexOf('profit'),
        };
      }
      if (lower.includes('type') && lower.includes('description') && lower.includes('amount')) {
        expHdr = {
          date: dateIdxs.length > 1 ? dateIdxs[dateIdxs.length - 1] : lower.lastIndexOf('date'),
          type: lower.indexOf('type'),
          description: lower.indexOf('description'),
          amount: lower.indexOf('amount'),
        };
      }

      if (tripHdr) {
        const dateCell = row[tripHdr.date];
        const truckCell = row[tripHdr.truck];
        if (
          dateCell &&
          !isSubtotal(dateCell) &&
          !isCalendarHeader(dateCell) &&
          !isSectionTitle(dateCell) &&
          truckCell &&
          String(truckCell).trim().toLowerCase() !== 'truck'
        ) {
          const date = parseDate(dateCell);
          if (date) {
            const transport = num(row[tripHdr.transport]);
            const offload = num(row[tripHdr.offload]);
            const fuel = num(row[tripHdr.fuel]);
            const other = num(row[tripHdr.other]);
            const total = num(row[tripHdr.total]) || offload + fuel + other;
            const profit = num(row[tripHdr.profit]) || transport - total;
            trips.push({
              trip_id: `${date}-${trips.length}`,
              date,
              truck: normTruck(truckCell),
              cement_type: normCement(row[tripHdr.cement]),
              region: row[tripHdr.region] ? String(row[tripHdr.region]).trim() : null,
              destination: row[tripHdr.destination]
                ? String(row[tripHdr.destination]).trim()
                : null,
              tonnage_t: num(row[tripHdr.tonnage]),
              transport_revenue: transport,
              offload_cost: offload,
              fuel_cost: fuel,
              other_cost: other,
              total_cost: total,
              profit,
            });
          }
        }
      }

      if (expHdr) {
        const dateCell = row[expHdr.date];
        const typeCell = row[expHdr.type];
        if (
          dateCell &&
          !isSubtotal(dateCell) &&
          !isCalendarHeader(dateCell) &&
          !isSectionTitle(dateCell) &&
          typeCell &&
          String(typeCell).trim().toLowerCase() !== 'type'
        ) {
          const date = parseDate(dateCell);
          if (date) {
            const description = row[expHdr.description]
              ? String(row[expHdr.description]).trim()
              : '';
            expenses.push({
              expense_id: `${date}-${expenses.length}`,
              date,
              type: String(typeCell).trim(),
              description,
              truck: extractTruck(description),
              amount: num(row[expHdr.amount]),
            });
          }
        }
      }
    }
  }

  // Sort newest-first
  trips.sort((a, b) => b.date.localeCompare(a.date));
  expenses.sort((a, b) => b.date.localeCompare(a.date));
  return { trips, expenses };
}
