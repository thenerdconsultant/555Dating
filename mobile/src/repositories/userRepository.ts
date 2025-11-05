import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { UserProfile, Gender } from '@/types/user'

const USERS_COLLECTION = 'users'

export const userRef = (userId: string) => {
  const { firestore } = getFirebase()
  return doc(firestore, USERS_COLLECTION, userId)
}

export const fetchUserProfile = async (userId: string): Promise<UserProfile | null> => {
  const snap = await getDoc(userRef(userId))
  if (!snap.exists()) return null
  return snap.data() as UserProfile
}

export const ensureUserProfile = async (
  userId: string,
  seed: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<UserProfile> => {
  const ref = userRef(userId)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    return snap.data() as UserProfile
  }
  const now = new Date().toISOString()
  const profile: UserProfile = {
    id: userId,
    createdAt: now,
    updatedAt: now,
    ...seed
  }
  await setDoc(ref, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  })
  return profile
}

export const createUserProfile = async (
  userId: string,
  payload: Omit<UserProfile, 'id' | 'createdAt' | 'updatedAt'>
) => {
  const { firestore } = getFirebase()
  const ref = doc(firestore, USERS_COLLECTION, userId)
  const now = serverTimestamp()
  await setDoc(ref, {
    ...payload,
    id: userId,
    createdAt: now,
    updatedAt: now
  })
}

export const updateUserGender = async (userId: string, gender: Gender) => {
  await updateDoc(userRef(userId), {
    gender,
    updatedAt: serverTimestamp()
  })
}
