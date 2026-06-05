export const fmtGNF = (n) => {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' GNF';
};

export const fmtNum = (n) => {
  if (n == null || isNaN(n)) return '—';
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n);
};

export const fmtPct = (x) => {
  if (x == null || isNaN(x)) return '—';
  return (x * 100).toFixed(1) + '%';
};

export const fmtDate = (iso) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
