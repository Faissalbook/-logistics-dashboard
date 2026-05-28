import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { translateText } from '../utils/api';

const MAX_HISTORY = 100;

export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── Theme ────────────────────────────────────────────────────
      isDark: false,
      toggleTheme: () => set((s) => ({ isDark: !s.isDark })),

      // ── Current Translation ──────────────────────────────────────
      inputText: '',
      currentTranslation: null,
      isLoading: false,
      error: null,

      setInputText: (text) => set({ inputText: text }),
      clearInput: () => set({ inputText: '', currentTranslation: null, error: null }),

      translate: async (text) => {
        if (!text?.trim()) return;
        set({ isLoading: true, error: null });
        try {
          const result = await translateText(text.trim());
          const entry = {
            ...result,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            inputText: text.trim(),
          };
          set((s) => ({
            currentTranslation: entry,
            isLoading: false,
            history: [entry, ...s.history.filter((h) => h.inputText !== text.trim())].slice(
              0,
              MAX_HISTORY
            ),
          }));
        } catch (err) {
          set({ error: err.message, isLoading: false });
        }
      },

      // ── History ──────────────────────────────────────────────────
      history: [],
      clearHistory: () => set({ history: [] }),
      deleteHistoryItem: (id) =>
        set((s) => ({ history: s.history.filter((h) => h.id !== id) })),
      replayFromHistory: (item) =>
        set({ currentTranslation: item, inputText: item.inputText }),

      // ── Favorites ────────────────────────────────────────────────
      favorites: [],
      addFavorite: (item) =>
        set((s) => ({
          favorites: s.favorites.some((f) => f.id === item.id)
            ? s.favorites
            : [item, ...s.favorites],
        })),
      removeFavorite: (id) =>
        set((s) => ({ favorites: s.favorites.filter((f) => f.id !== id) })),
      isFavorited: (id) => get().favorites.some((f) => f.id === id),
    }),
    {
      name: 'chinese-translator-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        isDark: s.isDark,
        history: s.history,
        favorites: s.favorites,
      }),
    }
  )
);
