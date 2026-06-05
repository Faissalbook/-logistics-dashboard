const sum = (arr, key) => arr.reduce((a, r) => a + (Number(r[key]) || 0), 0);

const inDateRange = (date, from, to) => {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
};

export function filterTrips(trips, f) {
  return trips.filter(
    (t) =>
      inDateRange(t.date, f.dateFrom, f.dateTo) &&
      (!f.region || t.region === f.region) &&
      (!f.truck || t.truck === f.truck) &&
      (!f.cementType || t.cement_type === f.cementType) &&
      (!f.destination || t.destination === f.destination)
  );
}

export function filterExpenses(expenses, f) {
  return expenses.filter(
    (e) =>
      inDateRange(e.date, f.dateFrom, f.dateTo) &&
      (!f.truck || e.truck === f.truck) &&
      (!f.expenseType || e.type === f.expenseType)
  );
}

export function computeKpis(trips, expenses) {
  const rev = sum(trips, 'transport_revenue');
  const tripCost = sum(trips, 'total_cost');
  const genExp = sum(expenses, 'amount');
  const cost = tripCost + genExp;
  return {
    trips: trips.length,
    tons: sum(trips, 'tonnage_t'),
    rev,
    tripCost,
    genExp,
    cost,
    profit: rev - cost,
    margin: rev ? (rev - cost) / rev : 0,
    avgRevPerTrip: trips.length ? rev / trips.length : 0,
    avgProfitPerTrip: trips.length ? (rev - cost) / trips.length : 0,
  };
}

export function dailySeries(trips, expenses) {
  const byDate = new Map();
  for (const t of trips) {
    const d = byDate.get(t.date) || { date: t.date, revenue: 0, cost: 0, profit: 0, tons: 0 };
    d.revenue += t.transport_revenue;
    d.cost += t.total_cost;
    d.profit += t.profit;
    d.tons += t.tonnage_t;
    byDate.set(t.date, d);
  }
  for (const e of expenses) {
    const d =
      byDate.get(e.date) || { date: e.date, revenue: 0, cost: 0, profit: 0, tons: 0 };
    d.cost += e.amount;
    d.profit -= e.amount;
    byDate.set(e.date, d);
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

export function groupBy(arr, key, valueKey) {
  const m = new Map();
  for (const r of arr) {
    const k = r[key] || '—';
    m.set(k, (m.get(k) || 0) + (Number(r[valueKey]) || 0));
  }
  return [...m.entries()].map(([name, value]) => ({ name, value }));
}

export function countBy(arr, key) {
  const m = new Map();
  for (const r of arr) {
    const k = r[key] || '—';
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].map(([name, value]) => ({ name, value }));
}

export function costMix(trips, expenses) {
  return [
    { name: 'Fuel', value: trips.reduce((a, t) => a + t.fuel_cost, 0) },
    { name: 'Offload', value: trips.reduce((a, t) => a + t.offload_cost, 0) },
    { name: 'Other (trip)', value: trips.reduce((a, t) => a + t.other_cost, 0) },
    { name: 'General expenses', value: expenses.reduce((a, e) => a + e.amount, 0) },
  ].filter((r) => r.value > 0);
}

export function uniqueSorted(arr, key) {
  return [...new Set(arr.map((r) => r[key]).filter(Boolean))].sort();
}
