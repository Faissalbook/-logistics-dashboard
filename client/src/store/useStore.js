import { create } from 'zustand';

const initialFilters = {
  dateFrom: '',
  dateTo: '',
  region: '',
  truck: '',
  cementType: '',
  destination: '',
  expenseType: '',
};

export const useStore = create((set) => ({
  trips: [],
  expenses: [],
  sourceFileName: '',
  filters: { ...initialFilters },
  drilldown: { open: false, title: '', rows: [] },

  setData: ({ trips, expenses, sourceFileName }) =>
    set({ trips, expenses, sourceFileName }),

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),

  resetFilters: () => set({ filters: { ...initialFilters } }),

  openDrilldown: (title, rows) =>
    set({ drilldown: { open: true, title, rows } }),

  closeDrilldown: () => set({ drilldown: { open: false, title: '', rows: [] } }),
}));
