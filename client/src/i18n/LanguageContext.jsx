import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import translations, { LANGUAGE_OPTIONS } from './translations'

const LanguageContext = createContext({
  language: 'en',
  setLanguage: () => {},
  t: (key, fallback) => fallback ?? key,
  options: LANGUAGE_OPTIONS
})

const STORAGE_KEY = 'app.language'

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    if (typeof window === 'undefined') return 'en'
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored || 'en'
  })

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, language)
    }
  }, [language])

  const value = useMemo(() => ({
    language,
    setLanguage,
    options: LANGUAGE_OPTIONS,
    t: (key, fallback, vars) => {
      const raw = translations[language]?.[key] ?? fallback ?? key
      if (!vars) return raw
      return Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), raw)
    }
  }), [language])

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  return useContext(LanguageContext)
}
