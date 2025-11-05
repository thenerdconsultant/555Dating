import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  serverTimestamp
} from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { FeatureFlags, defaultFeatureFlags } from '@/types/flags'

const SETTINGS_COLLECTION = 'settings'
const DOCUMENT_ID = 'featureFlags'

export const fetchFeatureFlags = async (): Promise<FeatureFlags> => {
  const { firestore } = getFirebase()
  const ref = doc(firestore, SETTINGS_COLLECTION, DOCUMENT_ID)
  const snap = await getDoc(ref)
  if (!snap.exists()) {
    await setDoc(ref, { ...defaultFeatureFlags, updatedAt: serverTimestamp() })
    return defaultFeatureFlags
  }
  return { ...defaultFeatureFlags, ...(snap.data() as Partial<FeatureFlags>) }
}

export const subscribeToFeatureFlags = (
  callback: (flags: FeatureFlags) => void
): (() => void) => {
  const { firestore } = getFirebase()
  const ref = doc(firestore, SETTINGS_COLLECTION, DOCUMENT_ID)
  return onSnapshot(ref, snap => {
    if (!snap.exists()) {
      callback(defaultFeatureFlags)
      return
    }
    callback({ ...defaultFeatureFlags, ...(snap.data() as Partial<FeatureFlags>) })
  })
}
