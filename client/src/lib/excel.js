import * as XLSX from 'xlsx';
import { todayISO } from './format.js';

const GNF_FMT = '#,##0 "GNF"';
const NUM_FMT = '#,##0';

function styleSheet(ws, headerCols, currencyCols = [], numericCols = []) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  // Column widths
  ws['!cols'] = headerCols.map((h) => ({ wch: Math.max(12, h.length + 4) }));
  // Freeze top row
  ws['!freeze'] = { xSplit: 0, ySplit: 1 };
  ws['!autofilter'] = { ref: ws['!ref'] };

  for (let R = range.s.r; R <= range.e.r; ++R) {
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (!cell) continue;
      if (R === 0) {
        cell.s = {
          font: { bold: true, color: { rgb: 'FFFFFFFF' } },
          fill: { fgColor: { rgb: 'FF0F172A' } },
          alignment: { horizontal: 'left', vertical: 'center' },
        };
      } else {
        if (currencyCols.includes(C)) cell.z = GNF_FMT;
        else if (numericCols.includes(C)) cell.z = NUM_FMT;
      }
    }
  }
}

export function buildWorkbook({ trips, expenses, kpis }) {
  const wb = XLSX.utils.book_new();

  // 1) Trips
  const tripHeaders = [
    'Date',
    'Truck',
    'Cement Type',
    'Region',
    'Destination',
    'Tonnage (t)',
    'Transport',
    'Offload',
    'Fuel',
    'Other',
    'Total Cost',
    'Profit',
  ];
  const tripData = [
    tripHeaders,
    ...trips.map((t) => [
      t.date,
      t.truck,
      t.cement_type,
      t.region,
      t.destination,
      t.tonnage_t,
      t.transport_revenue,
      t.offload_cost,
      t.fuel_cost,
      t.other_cost,
      t.total_cost,
      t.profit,
    ]),
  ];
  const wsTrips = XLSX.utils.aoa_to_sheet(tripData);
  styleSheet(wsTrips, tripHeaders, [6, 7, 8, 9, 10, 11], [5]);
  XLSX.utils.book_append_sheet(wb, wsTrips, 'Trips');

  // 2) Expenses
  const expHeaders = ['Date', 'Type', 'Description', 'Truck', 'Amount'];
  const expData = [
    expHeaders,
    ...expenses.map((e) => [e.date, e.type, e.description, e.truck || '', e.amount]),
  ];
  const wsExp = XLSX.utils.aoa_to_sheet(expData);
  styleSheet(wsExp, expHeaders, [4]);
  XLSX.utils.book_append_sheet(wb, wsExp, 'Expenses');

  // 3) KPIs
  const kpiRows = [
    ['Metric', 'Value'],
    ['Trips', kpis.trips],
    ['Tonnage (t)', kpis.tons],
    ['Revenue (GNF)', kpis.rev],
    ['Trip Costs (GNF)', kpis.tripCost],
    ['General Expenses (GNF)', kpis.genExp],
    ['Total Costs (GNF)', kpis.cost],
    ['Net Profit (GNF)', kpis.profit],
    ['Margin', kpis.margin],
  ];
  const wsKpi = XLSX.utils.aoa_to_sheet(kpiRows);
  styleSheet(wsKpi, ['Metric', 'Value']);
  // Number formats
  wsKpi['B4'] && (wsKpi['B4'].z = GNF_FMT);
  wsKpi['B5'] && (wsKpi['B5'].z = GNF_FMT);
  wsKpi['B6'] && (wsKpi['B6'].z = GNF_FMT);
  wsKpi['B7'] && (wsKpi['B7'].z = GNF_FMT);
  wsKpi['B8'] && (wsKpi['B8'].z = GNF_FMT);
  wsKpi['B9'] && (wsKpi['B9'].z = '0.0%');
  XLSX.utils.book_append_sheet(wb, wsKpi, 'KPIs');

  // 4) Pivot-ready long-format source
  const pivotHeaders = ['Date', 'Month', 'Truck', 'Region', 'Destination', 'Metric', 'Value'];
  const pivotRows = [pivotHeaders];
  const metrics = [
    ['Tonnage', 'tonnage_t'],
    ['Revenue', 'transport_revenue'],
    ['Fuel', 'fuel_cost'],
    ['Offload', 'offload_cost'],
    ['Other', 'other_cost'],
    ['Total Cost', 'total_cost'],
    ['Profit', 'profit'],
  ];
  for (const t of trips) {
    const month = t.date.slice(0, 7);
    for (const [label, key] of metrics) {
      pivotRows.push([t.date, month, t.truck, t.region, t.destination, label, t[key]]);
    }
  }
  for (const e of expenses) {
    const month = e.date.slice(0, 7);
    pivotRows.push([e.date, month, e.truck || '', '', '', `Expense:${e.type}`, e.amount]);
  }
  const wsPivot = XLSX.utils.aoa_to_sheet(pivotRows);
  styleSheet(wsPivot, pivotHeaders, [6]);

  // Data validation lists (Trucks, Regions) on Trips sheet — best-effort (SheetJS CE)
  const trucks = Array.from(new Set(trips.map((t) => t.truck).filter(Boolean)));
  const regions = Array.from(new Set(trips.map((t) => t.region).filter(Boolean)));
  if (trucks.length) {
    wsTrips['!dataValidation'] = wsTrips['!dataValidation'] || [];
    wsTrips['!dataValidation'].push({
      sqref: `B2:B${trips.length + 1}`,
      type: 'list',
      formula1: '"' + trucks.join(',') + '"',
    });
  }
  if (regions.length) {
    wsTrips['!dataValidation'].push({
      sqref: `D2:D${trips.length + 1}`,
      type: 'list',
      formula1: '"' + regions.join(',') + '"',
    });
  }

  XLSX.utils.book_append_sheet(wb, wsPivot, 'PivotSource');

  return wb;
}

export function downloadWorkbook(payload) {
  const wb = buildWorkbook(payload);
  XLSX.writeFile(wb, `logistics_${todayISO()}.xlsx`, { compression: true });
}
