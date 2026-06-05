import { useRef } from 'react';
import { useStore } from '../store/useStore.js';
import { parseWorkbook } from '../lib/etl.js';
import { downloadWorkbook } from '../lib/excel.js';
import { computeKpis } from '../lib/selectors.js';

export default function Header() {
  const inputRef = useRef(null);
  const { trips, expenses, sourceFileName, setData } = useStore();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { trips, expenses } = await parseWorkbook(file);
      setData({ trips, expenses, sourceFileName: file.name });
    } catch (err) {
      console.error(err);
      alert('Failed to parse workbook: ' + err.message);
    } finally {
      e.target.value = '';
    }
  };

  const handleExport = () => {
    const kpis = computeKpis(trips, expenses);
    downloadWorkbook({ trips, expenses, kpis });
  };

  return (
    <header className="no-print sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-slate-200">
      <div className="max-w-[1400px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-brand-600 text-white grid place-items-center font-bold">
            L
          </div>
          <div>
            <div className="text-base font-semibold leading-tight">Logistics Dashboard</div>
            <div className="text-xs text-slate-500 leading-tight">
              {sourceFileName ? `Source: ${sourceFileName}` : 'Cement haulage analytics'}
            </div>
          </div>
        </div>
        <div className="flex-1" />
        <button className="btn" onClick={() => inputRef.current?.click()}>
          <span>Upload XLSX</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={handleFile}
        />
        <button className="btn" onClick={() => window.print()} disabled={!trips.length}>
          Print
        </button>
        <button
          className="btn-primary"
          onClick={handleExport}
          disabled={!trips.length && !expenses.length}
        >
          Export Excel
        </button>
      </div>
    </header>
  );
}
