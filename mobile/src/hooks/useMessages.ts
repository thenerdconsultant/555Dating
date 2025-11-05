import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  limit
} from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { Message } from '@/types/user'

export const useMessages = (matchId: string | null) => {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!matchId) {
      setMessages([])
      return
    }
    const { firestore } = getFirebase()
    const ref = collection(firestore, 'matches', matchId, 'messages')
    const q = query(ref, where('matchId', '==', matchId), orderBy('createdAt', 'desc'), limit(100))
    const unsubscribe = onSnapshot(q, snapshot => {
      setMessages(snapshot.docs.map(doc => doc.data() as Message).reverse())
    })
    return () => unsubscribe()
  }, [matchId])

  return messages
}
