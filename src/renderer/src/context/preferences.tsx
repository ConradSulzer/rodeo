/* eslint-disable react-refresh/only-export-components */
import * as React from 'react'

type Theme = 'light' | 'dark'

type PreferencesState = {
  theme: Theme
  recents: string[]
}

type PreferencesContextValue = PreferencesState & {
  setTheme: (theme: Theme) => void
  addRecent: (path: string) => void
  clearRecents: () => void
}

const PREFERENCES_STORAGE_KEY = 'rodeo:preferences'
const MAX_RECENTS = 5

const PreferencesContext = React.createContext<PreferencesContextValue | null>(null)

const getDefaultPreferences = (): PreferencesState => ({
  theme: getSystemTheme(),
  recents: []
})
const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'light'
  const mediaQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  return mediaQuery?.matches ? 'dark' : 'light'
}
const resolveTheme = (value: unknown): Theme => {
  return value === 'light' || value === 'dark' ? value : getSystemTheme()
}

const readPreferences = (): PreferencesState => {
  try {
    const raw = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!raw) return getDefaultPreferences()
    const parsed = JSON.parse(raw) as Partial<PreferencesState>
    return {
      theme: resolveTheme(parsed.theme),
      recents: Array.isArray(parsed.recents)
        ? parsed.recents.filter((entry): entry is string => typeof entry === 'string')
        : []
    }
  } catch (error) {
    console.warn('Failed to read preferences from storage', error)
    return getDefaultPreferences()
  }
}

const persistPreferences = (prefs: PreferencesState) => {
  try {
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(prefs))
  } catch (error) {
    console.warn('Failed to persist preferences', error)
  }
}

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = React.useState<PreferencesState>(() => readPreferences())

  React.useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = state.theme
    }
  }, [state.theme])

  const setTheme = React.useCallback((theme: Theme) => {
    setState((prev) => {
      if (prev.theme === theme) return prev
      const next = { ...prev, theme }
      persistPreferences(next)
      return next
    })
  }, [])

  const addRecent = React.useCallback((path: string) => {
    setState((prev) => {
      if (!path) return prev
      const existing = prev.recents.filter((entry) => entry !== path)
      const nextRecents = [path, ...existing].slice(0, MAX_RECENTS)
      const next = { ...prev, recents: nextRecents }
      persistPreferences(next)
      return next
    })
  }, [])

  const clearRecents = React.useCallback(() => {
    setState((prev) => {
      if (!prev.recents.length) return prev
      const next = { ...prev, recents: [] }
      persistPreferences(next)
      return next
    })
  }, [])

  const value = React.useMemo<PreferencesContextValue>(
    () => ({
      ...state,
      setTheme,
      addRecent,
      clearRecents
    }),
    [state, setTheme, addRecent, clearRecents]
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

export const usePreferences = () => {
  const context = React.useContext(PreferencesContext)
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider')
  }
  return context
}
