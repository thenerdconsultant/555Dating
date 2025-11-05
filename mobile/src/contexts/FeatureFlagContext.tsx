import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode
} from 'react'
import { FeatureFlags, defaultFeatureFlags } from '@/types/flags'
import { fetchFeatureFlags, subscribeToFeatureFlags } from '@/services/featureFlags'

interface FeatureFlagContextValue {
  flags: FeatureFlags
  loading: boolean
}

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(undefined)

export const useFeatureFlags = (): FeatureFlagContextValue => {
  const ctx = useContext(FeatureFlagContext)
  if (!ctx) throw new Error('useFeatureFlags must be used within FeatureFlagProvider')
  return ctx
}

export const FeatureFlagProvider = ({ children }: { children: ReactNode }) => {
  const [flags, setFlags] = useState<FeatureFlags>(defaultFeatureFlags)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubscribe: (() => void) | null = null

    fetchFeatureFlags()
      .then(initial => setFlags(initial))
      .finally(() => setLoading(false))

    unsubscribe = subscribeToFeatureFlags(nextFlags => setFlags(nextFlags))

    return () => {
      if (unsubscribe) unsubscribe()
    }
  }, [])

  const value = useMemo(() => ({ flags, loading }), [flags, loading])

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>
}
