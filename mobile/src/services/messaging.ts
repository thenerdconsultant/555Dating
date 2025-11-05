import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc
} from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { Match, Message, UserProfile } from '@/types/user'

export const canSendMessage = (sender: UserProfile, recipient: UserProfile): boolean => {
  if (sender.gender === recipient.gender) return false

  if (sender.gender === 'male' && sender.subscription.status !== 'active') {
    return false
  }

  if (!sender.isActive) return false
  if (!recipient.isActive) return false

  if (recipient.gender === 'female' && !recipient.moderation.verifiedSelfie) {
    return false
  }

  return true
}

export const sendMessage = async (
  match: Match,
  sender: UserProfile,
  recipient: UserProfile,
  body: string
): Promise<Message> => {
  if (!canSendMessage(sender, recipient)) {
    throw new Error('Sender is not permitted to message this recipient.')
  }

  const { firestore } = getFirebase()
  const messagesCollection = collection(firestore, 'matches', match.id, 'messages')
  const messageRef = doc(messagesCollection)
  const now = Timestamp.now()

  const message: Message = {
    id: messageRef.id,
    matchId: match.id,
    senderId: sender.id,
    recipientId: recipient.id,
    body,
    createdAt: now.toDate().toISOString()
  }

  await setDoc(messageRef, {
    ...message,
    createdAt: now
  })

  await updateDoc(doc(firestore, 'matches', match.id), {
    lastMessageAt: serverTimestamp()
  })

  return message
}
