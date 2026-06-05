# Logistics Dashboard

Browser-only cement-haulage analytics dashboard. Upload your monthly Excel
workbook (Trips + General Expenses, two side-by-side sections) and the app
parses, normalizes, charts, filters, and re-exports it — all client-side.

## Features

- **Upload XLSX** — drag-drop or pick a file; parsing runs in the browser via
  SheetJS. No data ever leaves the device.
- **6 KPI cards** — trips, tonnage, revenue, trip costs, general expenses,
  net profit + margin (auto-recomputed when filters change).
- **4 interactive charts (ECharts)**:
  - Daily revenue / cost / profit (line)
  - Profit by truck (bar — click to filter)
  - Cost mix (donut)
  - Trips by region (bar — click to filter)
  - Top 10 destinations by profit (bar — click to drill down)
- **Filters** — date range, region, truck, cement type, destination, expense
  type. Reset in one click.
- **Drill-down drawer** — click a truck/region bar to filter; click a
  destination bar or a trip row to open a detail drawer with all matching
  trips.
- **Sortable & paginated tables** for trips and expenses (TanStack Table).
- **Excel export** — one click writes a 4-sheet workbook:
  - `Trips` — raw normalized trips with frozen header + autofilter + GNF
    number format
  - `Expenses` — raw normalized expenses
  - `KPIs` — aggregated metrics for the current filter
  - `PivotSource` — long-format (Date / Month / Truck / Region / Destination /
    Metric / Value) ready for Excel PivotTables
  - Data validation lists for Truck and Region columns
- **Print** — clean print stylesheet hides filters and pagination.
- **Responsive** — 6-col KPI grid → 3-col → 2-col on mobile; charts stack.

## Data model

### `trips`
| field | type | example |
|---|---|---|
| `date` | ISO date | `2026-06-04` |
| `truck` | string | `BK-2195` |
| `cement_type` | string | `CIM II/AP 42.5 N` |
| `region` | string | `Conakry` |
| `destination` | string | `Entag` |
| `tonnage_t` | number | `40` |
| `transport_revenue` | number GNF | `4 000 000` |
| `offload_cost` | number GNF | `600 000` |
| `fuel_cost` | number GNF | `540 000` |
| `other_cost` | number GNF | `270 000` |
| `total_cost` | number GNF | `1 410 000` |
| `profit` | number GNF | `2 590 000` |

### `expenses`
| field | type | example |
|---|---|---|
| `date` | ISO date | `2026-05-29` |
| `type` | enum | `Repair`, `Tires`, `Insurance`, `Taxes`, `Other` |
| `description` | string | `Air parts AL8734` |
| `truck` | string \| null | `AL-8734` (auto-detected from description) |
| `amount` | number GNF | `500 000` |

## ETL applied on import

1. Find header row(s) by column name — auto-detects the two side-by-side blocks.
2. Drop section banners, calendar headers (`📅 …`), and `Subtotal`/`Total` rows.
3. Parse dates `DD/MM/YYYY` → ISO.
4. **Normalize trucks** — `Bk2195`, `Bak2195`, `BK2195`, `BK-2195` → `BK-2195`;
   `AL 8734`, `AL8734` → `AL-8734`.
5. **Normalize cement codes** — `CIMII/AP42.5 N` → `CIM II/AP 42.5 N`.
6. Coerce numerics, recompute `total_cost` / `profit` if missing.
7. Extract truck from each expense `description` via regex.
8. Sort newest-first.

## Tech stack

- React 18 + Vite
- TailwindCSS
- ECharts (`echarts-for-react`)
- SheetJS (`xlsx`) for read **and** write
- zustand for state
- TanStack Table for tables
- No backend. Deploys as a static site.

## Run locally

```bash
npm run install:all
npm run dev          # http://localhost:5173
npm run build        # production bundle in client/dist
npm run preview      # serve the production bundle
```

## Deploy

Any static host works. Examples:

- **Vercel**: `vercel --prod` from `client/`
- **Netlify**: drag-drop `client/dist`
- **GitHub Pages**: `npm run build` → push `client/dist` to `gh-pages`

No server, no API keys, no environment variables required.

## Project structure

```
client/
├─ index.html
├─ src/
│  ├─ App.jsx                  # composition + memoized selectors
│  ├─ main.jsx
│  ├─ index.css                # tailwind + print styles
│  ├─ lib/
│  │  ├─ etl.js                # XLSX → {trips, expenses}
│  │  ├─ excel.js              # {trips, expenses, kpis} → 4-sheet XLSX
│  │  ├─ selectors.js          # filter / KPI / series helpers
│  │  └─ format.js             # GNF, date, % formatters
│  ├─ store/useStore.js        # zustand store (data + filters + drilldown)
│  └─ components/
│     ├─ Header.jsx            # upload / print / export
│     ├─ Filters.jsx           # date + category filters
│     ├─ KpiGrid.jsx
│     ├─ DataTable.jsx         # TanStack wrapper
│     ├─ TripsTable.jsx
│     ├─ ExpensesTable.jsx
│     ├─ DrillDownDrawer.jsx
│     ├─ EmptyState.jsx
│     └─ charts/
│        ├─ ChartCard.jsx
│        └─ Charts.jsx         # 5 ECharts options
```
