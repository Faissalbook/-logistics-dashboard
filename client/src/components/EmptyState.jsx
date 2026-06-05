export default function EmptyState({ onUpload }) {
  return (
    <div className="card p-10 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-50 grid place-items-center text-brand-600 text-2xl font-bold">
        ⬆
      </div>
      <h2 className="mt-4 text-lg font-semibold">Upload your logistics workbook</h2>
      <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
        Drop an Excel file with the same shape as <code>testapp.xlsx</code> — two side-by-side
        sections (<em>Trip Details</em> on the left, <em>General Expenses</em> on the right). The
        dashboard parses it entirely in your browser.
      </p>
      <button className="btn-primary mt-4" onClick={onUpload}>
        Choose XLSX file
      </button>
    </div>
  );
}
