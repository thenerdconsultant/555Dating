import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react'
import { onAuthStateChanged, signOut as firebaseSignOut, User } from 'firebase/auth'
import { doc, onSnapshot } from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { UserProfile } from '@/types/user'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { auth, firestore } = getFirebase()
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, nextUser => {
      setFirebaseUser(nextUser)
    })
    return unsubscribe
  }, [auth])

  useEffect(() => {
    if (!firebaseUser) {
      setProfile(null)
      setLoading(false)
      return
    }

    const ref = doc(firestore, 'users', firebaseUser.uid)
    const unsubscribe = onSnapshot(
      ref,
      snapshot => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile)
        } else {
          setProfile(null)
        }
        setLoading(false)
      },
      () => {
        setProfile(null)
        setLoading(false)
      }
    )
    return () => unsubscribe()
  }, [firebaseUser, firestore])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [auth])

  const value = useMemo<AuthContextValue>(
    () => ({
      user: firebaseUser,
      profile,
      loading,
      signOut
    }),
    [firebaseUser, profile, loading, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
