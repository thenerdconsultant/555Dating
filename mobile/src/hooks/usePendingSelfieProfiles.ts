import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { UserProfile } from '@/types/user'

export const usePendingSelfieProfiles = (enabled: boolean) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([])

  useEffect(() => {
    if (!enabled) {
      setProfiles([])
      return
    }
    const { firestore } = getFirebase()
    const q = query(
      collection(firestore, 'users'),
      where('gender', '==', 'female'),
      where('moderation.verifiedSelfie', '==', false),
      orderBy('moderation.verificationRequestedAt', 'asc')
    )

    const unsubscribe = onSnapshot(q, snapshot => {
      setProfiles(snapshot.docs.map(doc => doc.data() as UserProfile))
    })

    return () => unsubscribe()
  }, [enabled])

  return useMemo(() => profiles, [profiles])
}
