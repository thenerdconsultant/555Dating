import { useEffect, useMemo, useState } from 'react'
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { Match, UserProfile } from '@/types/user'

export const useMatches = (profile: UserProfile | null) => {
  const [matches, setMatches] = useState<Match[]>([])

  useEffect(() => {
    if (!profile) {
      setMatches([])
      return
    }

    const { firestore } = getFirebase()
    const q = query(
      collection(firestore, 'matches'),
      where('userIds', 'array-contains', profile.id),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, snapshot => {
      const next = snapshot.docs
        .map(doc => doc.data() as Match)
        .filter(match => {
          const partnerId = match.userIds.find(id => id !== profile.id)
          return Boolean(partnerId)
        })
      setMatches(next)
    })

    return () => unsubscribe()
  }, [profile])

  return useMemo(() => matches, [matches])
}
