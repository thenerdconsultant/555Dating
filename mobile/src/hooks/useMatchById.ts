import { useEffect, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { Match } from '@/types/user'

export const useMatchById = (matchId: string | null) => {
  const [match, setMatch] = useState<Match | null>(null)

  useEffect(() => {
    if (!matchId) {
      setMatch(null)
      return
    }
    const { firestore } = getFirebase()
    const ref = doc(firestore, 'matches', matchId)
    const unsubscribe = onSnapshot(ref, snapshot => {
      if (!snapshot.exists()) {
        setMatch(null)
        return
      }
      setMatch(snapshot.data() as Match)
    })
    return () => unsubscribe()
  }, [matchId])

  return match
}
