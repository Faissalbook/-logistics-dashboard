import { type LabelKey, pair } from '@transfasa/i18n';
import type { ReactNode } from 'react';

export interface Column<T> {
  k: LabelKey;
  cell: (row: T) => ReactNode;
  total?: ReactNode;
  align?: 'left' | 'right';
}

/** Bilingual stacked headers, totals row in bold (exports & reports convention). Scrolls inside its card on phones. */
export function Table<T>({ columns, rows, rowKey, testId }: { columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; testId?: string }) {
  const hasTotals = columns.some((c) => c.total !== undefined);
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm" data-testid={testId}>
        <thead className="border-b border-cement-200 bg-cement-50">
          <tr>
            {columns.map((c) => {
              const { fr, en } = pair(c.k);
              return (
                <th key={c.k} scope="col" className={`px-3 py-2 font-semibold ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {fr}
                  {fr !== en && <span className="block text-xs font-normal text-cement-500">{en}</span>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="divide-y divide-cement-100">
          {rows.map((r) => (
            <tr key={rowKey(r)}>
              {columns.map((c) => (
                <td key={c.k} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.cell(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {hasTotals && (
          <tfoot className="border-t-2 border-cement-200 bg-cement-50 font-bold">
            <tr>
              {columns.map((c) => (
                <td key={c.k} className={`px-3 py-2 ${c.align === 'right' ? 'text-right tabular-nums' : ''}`}>
                  {c.total ?? ''}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
