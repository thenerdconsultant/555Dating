import { useEffect, useState } from 'react'
import { UserProfile } from '@/types/user'
import { getFirebase } from '@/config/firebase'
import { doc, getDoc } from 'firebase/firestore'

export const useProfilesByIds = (
  ids: string[],
  currentProfile: UserProfile | null
): Record<string, UserProfile | null> => {
  const [map, setMap] = useState<Record<string, UserProfile | null>>({})

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      if (!currentProfile) {
        setMap({})
        return
      }
      const { firestore } = getFirebase()
      const promises = ids.map(async id => {
        const ref = doc(firestore, 'users', id)
        const snap = await getDoc(ref)
        if (!snap.exists()) return [id, null] as const
        const profile = snap.data() as UserProfile
        if (profile.gender === currentProfile.gender) {
          return [id, null] as const
        }
        if (!profile.isActive) {
          return [id, null] as const
        }
        if (profile.gender === 'female' && !profile.moderation.verifiedSelfie) {
          return [id, null] as const
        }
        return [id, profile] as const
      })
      const entries = await Promise.all(promises)
      if (!isMounted) return
      const next: Record<string, UserProfile | null> = {}
      entries.forEach(([id, profile]) => {
        next[id] = profile
      })
      setMap(next)
    }
    load()
    return () => {
      isMounted = false
    }
  }, [ids.join(','), currentProfile])

  return map
}
