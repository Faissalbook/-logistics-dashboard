export default function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
      <span className="inline-block w-8 h-8 rounded-full border-2 border-[var(--border)] border-t-primary-500 animate-spin" />
      <p className="mt-3 text-xs font-medium">{label}</p>
    </div>
  );
}
