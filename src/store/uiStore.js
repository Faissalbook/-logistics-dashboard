import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { translations, LANGUAGES } from '../i18n/translations'

function applyDocumentAttrs(theme, language) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  const lang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]
  root.lang = lang.code
  root.dir = lang.dir
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = theme === 'dark' ? '#1a1a19' : '#fcfcfb'
}

export const useUIStore = create(
  persist(
    (set, get) => ({
      theme: window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      language: 'en',
      setTheme: (theme) => {
        set({ theme })
        applyDocumentAttrs(theme, get().language)
      },
      setLanguage: (language) => {
        set({ language })
        applyDocumentAttrs(get().theme, language)
      },
    }),
    {
      name: 'bf.ui',
      onRehydrateStorage: () => (state) => {
        if (state) applyDocumentAttrs(state.theme, state.language)
      },
    }
  )
)

// Apply on first load (before rehydrate resolves, and for first-time visitors).
applyDocumentAttrs(useUIStore.getState().theme, useUIStore.getState().language)

export function useI18n() {
  const language = useUIStore((s) => s.language)
  const dict = translations[language] || translations.en
  const lang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0]

  const t = (key, params) => {
    let str = dict[key] ?? translations.en[key] ?? key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replaceAll(`{${k}}`, String(v))
      }
    }
    return str
  }

  return { t, language, locale: lang.locale, dir: lang.dir, isRTL: lang.dir === 'rtl' }
}
