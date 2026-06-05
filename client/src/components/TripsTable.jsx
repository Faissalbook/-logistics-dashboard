import { useMemo } from 'react';
import DataTable from './DataTable.jsx';
import { fmtGNF, fmtNum, fmtDate } from '../lib/format.js';

export default function TripsTable({ trips, onRowClick }) {
  const columns = useMemo(
    () => [
      { accessorKey: 'date', header: 'Date', cell: (c) => fmtDate(c.getValue()) },
      { accessorKey: 'truck', header: 'Truck' },
      { accessorKey: 'cement_type', header: 'Cement' },
      { accessorKey: 'region', header: 'Region' },
      { accessorKey: 'destination', header: 'Destination' },
      {
        accessorKey: 'tonnage_t',
        header: 'Tons',
        cell: (c) => fmtNum(c.getValue()),
      },
      {
        accessorKey: 'transport_revenue',
        header: 'Revenue',
        cell: (c) => fmtGNF(c.getValue()),
      },
      { accessorKey: 'fuel_cost', header: 'Fuel', cell: (c) => fmtGNF(c.getValue()) },
      {
        accessorKey: 'total_cost',
        header: 'Total cost',
        cell: (c) => fmtGNF(c.getValue()),
      },
      {
        accessorKey: 'profit',
        header: 'Profit',
        cell: (c) => (
          <span className={c.getValue() >= 0 ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'}>
            {fmtGNF(c.getValue())}
          </span>
        ),
      },
    ],
    []
  );
  return <DataTable data={trips} columns={columns} onRowClick={onRowClick} emptyMessage="Upload an XLSX to see trips" />;
}
