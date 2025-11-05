import { arrayUnion, doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { UserProfile } from '@/types/user'

export const addGalleryPhoto = async (profile: UserProfile, url: string) => {
  const { firestore } = getFirebase()
  const ref = doc(firestore, 'users', profile.id)
  await updateDoc(ref, {
    photos: arrayUnion(url),
    updatedAt: serverTimestamp()
  })
}

export const setSelfie = async (profile: UserProfile, url: string) => {
  const { firestore } = getFirebase()
  const ref = doc(firestore, 'users', profile.id)
  await updateDoc(ref, {
    selfieUrl: url,
    'moderation.verifiedSelfie': false,
    'moderation.verificationRequestedAt': serverTimestamp(),
    isActive: false,
    updatedAt: serverTimestamp()
  })
}
