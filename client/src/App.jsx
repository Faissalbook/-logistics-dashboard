import { useMemo, useRef } from 'react';
import { useStore } from './store/useStore.js';
import {
  computeKpis,
  costMix,
  countBy,
  dailySeries,
  filterExpenses,
  filterTrips,
  groupBy,
} from './lib/selectors.js';
import { parseWorkbook } from './lib/etl.js';
import Header from './components/Header.jsx';
import Filters from './components/Filters.jsx';
import KpiGrid from './components/KpiGrid.jsx';
import {
  CostMixPie,
  ProfitByTruckBar,
  RevenueProfitLine,
  TopDestinationsBar,
  TripsByRegionBar,
} from './components/charts/Charts.jsx';
import TripsTable from './components/TripsTable.jsx';
import ExpensesTable from './components/ExpensesTable.jsx';
import DrillDownDrawer from './components/DrillDownDrawer.jsx';
import EmptyState from './components/EmptyState.jsx';

export default function App() {
  const { trips, expenses, filters, setData, openDrilldown } = useStore();
  const fileInput = useRef(null);

  const filteredTrips = useMemo(() => filterTrips(trips, filters), [trips, filters]);
  const filteredExpenses = useMemo(
    () => filterExpenses(expenses, filters),
    [expenses, filters]
  );
  const kpis = useMemo(
    () => computeKpis(filteredTrips, filteredExpenses),
    [filteredTrips, filteredExpenses]
  );
  const series = useMemo(
    () => dailySeries(filteredTrips, filteredExpenses),
    [filteredTrips, filteredExpenses]
  );
  const profitByTruck = useMemo(
    () => groupBy(filteredTrips, 'truck', 'profit'),
    [filteredTrips]
  );
  const mix = useMemo(
    () => costMix(filteredTrips, filteredExpenses),
    [filteredTrips, filteredExpenses]
  );
  const tripsByRegion = useMemo(() => countBy(filteredTrips, 'region'), [filteredTrips]);
  const topDest = useMemo(
    () =>
      groupBy(filteredTrips, 'destination', 'profit')
        .sort((a, b) => b.value - a.value)
        .slice(0, 10)
        .reverse(),
    [filteredTrips]
  );

  const handleHiddenFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { trips, expenses } = await parseWorkbook(file);
    setData({ trips, expenses, sourceFileName: file.name });
    e.target.value = '';
  };

  const onDestinationDrill = (destination) => {
    const rows = filteredTrips.filter((t) => t.destination === destination);
    openDrilldown(`Destination · ${destination}`, rows);
  };

  const onTripRow = (trip) => {
    const rows = filteredTrips.filter(
      (t) => t.destination === trip.destination && t.truck === trip.truck
    );
    openDrilldown(`${trip.truck} → ${trip.destination}`, rows);
  };

  return (
    <div className="min-h-full flex flex-col">
      <Header />
      <main className="max-w-[1400px] w-full mx-auto px-4 py-4 flex-1 flex flex-col gap-4">
        {!trips.length && !expenses.length ? (
          <EmptyState onUpload={() => fileInput.current?.click()} />
        ) : (
          <>
            <Filters />
            <KpiGrid kpis={kpis} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RevenueProfitLine series={series} />
              <ProfitByTruckBar data={profitByTruck} />
              <CostMixPie data={mix} />
              <TripsByRegionBar data={tripsByRegion} />
            </div>
            <TopDestinationsBar data={topDest} onRowClick={onDestinationDrill} />
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-slate-700 px-1">
                Trips ({filteredTrips.length})
              </h2>
              <TripsTable trips={filteredTrips} onRowClick={onTripRow} />
            </section>
            <section className="flex flex-col gap-2">
              <h2 className="text-sm font-semibold text-slate-700 px-1">
                Expenses ({filteredExpenses.length})
              </h2>
              <ExpensesTable expenses={filteredExpenses} />
            </section>
          </>
        )}
      </main>
      <input
        ref={fileInput}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleHiddenFile}
      />
      <DrillDownDrawer />
      <footer className="no-print text-center text-xs text-slate-400 py-4">
        Built with React · ECharts · SheetJS · zustand
      </footer>
    </div>
  );
}
