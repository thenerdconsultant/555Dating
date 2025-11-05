import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  limit,
  onSnapshot,
  query,
  where,
  orderBy
} from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { UserProfile } from '@/types/user'

const { firestore } = getFirebase()

export const useOppositeGenderProfiles = (
  currentProfile: UserProfile | null,
  size = 20
) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState<boolean>(Boolean(currentProfile))

  useEffect(() => {
    if (!currentProfile) {
      setProfiles([])
      setLoading(false)
      return
    }

    const targetGender = currentProfile.gender === 'male' ? 'female' : 'male'
    const filters = [
      where('gender', '==', targetGender),
      where('isActive', '==', true)
    ]

    if (targetGender === 'female') {
      filters.push(where('moderation.verifiedSelfie', '==', true))
    }

    const q = query(
      collection(firestore, 'users'),
      ...filters,
      orderBy('createdAt', 'desc'),
      limit(size)
    )

    const unsubscribe = onSnapshot(q, snapshot => {
      const next = snapshot.docs.map(doc => doc.data() as UserProfile)
      setProfiles(next)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [currentProfile, size])

  return useMemo(() => ({ profiles, loading }), [profiles, loading])
}
