import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'
import { sync, type SyncOutcome } from './sync'

interface SyncContextValue {
  syncing: boolean
  // Result of the most recent attempt; null before the first one
  lastOutcome: SyncOutcome | null
  syncNow: () => Promise<SyncOutcome>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
  const [syncing, setSyncing] = useState(false)
  const [lastOutcome, setLastOutcome] = useState<SyncOutcome | null>(null)

  const syncNow = useCallback(async () => {
    setSyncing(true)
    const outcome = await sync()
    setLastOutcome(outcome)
    setSyncing(false)
    return outcome
  }, [])

  // Sync when the app opens and each time it returns to the foreground
  useEffect(() => {
    void syncNow()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncNow()
    })
    return () => subscription.remove()
  }, [syncNow])

  const value = useMemo(() => ({ syncing, lastOutcome, syncNow }), [syncing, lastOutcome, syncNow])
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSync(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) throw new Error('useSync must be used inside SyncProvider')
  return context
}
