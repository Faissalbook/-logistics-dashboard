import { useMemo } from 'react';
import DataTable from './DataTable.jsx';
import { fmtGNF, fmtDate } from '../lib/format.js';

export default function ExpensesTable({ expenses }) {
  const columns = useMemo(
    () => [
      { accessorKey: 'date', header: 'Date', cell: (c) => fmtDate(c.getValue()) },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: (c) => <span className="chip">{c.getValue()}</span>,
      },
      { accessorKey: 'description', header: 'Description' },
      { accessorKey: 'truck', header: 'Truck', cell: (c) => c.getValue() || '—' },
      {
        accessorKey: 'amount',
        header: 'Amount',
        cell: (c) => fmtGNF(c.getValue()),
      },
    ],
    []
  );
  return <DataTable data={expenses} columns={columns} emptyMessage="No expenses for the current filters" />;
}
