import Constants from 'expo-constants'
import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, initializeAuth, Auth, getReactNativePersistence } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'
import AsyncStorage from '@react-native-async-storage/async-storage'

type FirebaseInstances = {
  app: FirebaseApp
  auth: Auth
  firestore: Firestore
  storage: FirebaseStorage
}

let cached: FirebaseInstances | null = null

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.firebaseApiKey,
  authDomain: Constants.expoConfig?.extra?.firebaseAuthDomain,
  projectId: Constants.expoConfig?.extra?.firebaseProjectId,
  storageBucket: Constants.expoConfig?.extra?.firebaseStorageBucket,
  messagingSenderId: Constants.expoConfig?.extra?.firebaseMessagingSenderId,
  appId: Constants.expoConfig?.extra?.firebaseAppId
}

export const getFirebase = (): FirebaseInstances => {
  if (cached) return cached

  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error('Firebase configuration is missing. Add credentials to app config.')
  }

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)

  const auth =
    getApps().length > 0
      ? getAuth(app)
      : initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage)
        })

  const firestore = getFirestore(app)
  const storage = getStorage(app)

  cached = { app, auth, firestore, storage }
  return cached
}
