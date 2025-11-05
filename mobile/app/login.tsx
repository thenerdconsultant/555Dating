import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { Redirect } from 'expo-router'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth'
import { getFirebase } from '@/config/firebase'
import { useAuth } from '@/contexts/AuthContext'
import { Gender } from '@/types/user'
import { createUserProfile } from '@/repositories/userRepository'

type Mode = 'login' | 'signup'

export default function LoginScreen() {
  const { auth } = getFirebase()
  const { user, profile } = useAuth()
  const [mode, setMode] = useState<Mode>('login')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    password: '',
    displayName: '',
    gender: 'male' as Gender
  })

  if (user && profile) {
    return <Redirect href="/" />
  }

  const toggleMode = () => {
    setMode(prev => (prev === 'login' ? 'signup' : 'login'))
    setError(null)
  }

  const handleChange = (field: keyof typeof form) => (value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, form.email.trim(), form.password)
        return
      }

      const credential = await createUserWithEmailAndPassword(
        auth,
        form.email.trim(),
        form.password
      )

      await updateProfile(credential.user, { displayName: form.displayName.trim() })

      await createUserProfile(credential.user.uid, {
        email: form.email.trim(),
        displayName: form.displayName.trim(),
        gender: form.gender,
        isActive: form.gender === 'male',
        birthdate: new Date().toISOString(),
        photos: [],
        moderation: {
          verifiedSelfie: false,
          verificationRequestedAt: null,
          verifiedAt: null,
          reviewerId: null
        },
        subscription: {
          status: 'inactive'
        }
      })
    } catch (ex) {
      setError((ex as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{mode === 'login' ? 'Welcome back' : 'Create account'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          placeholder="Email"
          placeholderTextColor="#7f7f7f"
          keyboardType="email-address"
          autoCapitalize="none"
          style={styles.input}
          value={form.email}
          onChangeText={handleChange('email')}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#7f7f7f"
          secureTextEntry
          style={styles.input}
          value={form.password}
          onChangeText={handleChange('password')}
        />
        {mode === 'signup' ? (
          <>
            <TextInput
              placeholder="Display name"
              placeholderTextColor="#7f7f7f"
              style={styles.input}
              value={form.displayName}
              onChangeText={handleChange('displayName')}
            />
            <View style={styles.toggleRow}>
              <Pressable
                style={[
                  styles.toggle,
                  form.gender === 'male' ? styles.toggleActive : undefined
                ]}
                onPress={() => handleChange('gender')('male')}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    form.gender === 'male' ? styles.toggleLabelActive : null
                  ]}
                >
                  Male
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.toggle,
                  form.gender === 'female' ? styles.toggleActive : undefined
                ]}
                onPress={() => handleChange('gender')('female')}
              >
                <Text
                  style={[
                    styles.toggleLabel,
                    form.gender === 'female' ? styles.toggleLabelActive : null
                  ]}
                >
                  Female
                </Text>
              </Pressable>
            </View>
            <Text style={styles.notice}>
              Women must upload a selfie for admin review before appearing in Discover. Men need a
              subscription before they can message.
            </Text>
          </>
        ) : null}
        <Pressable
          onPress={handleSubmit}
          style={[styles.button, loading ? styles.buttonDisabled : null]}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{mode === 'login' ? 'Log in' : 'Sign up'}</Text>
        </Pressable>
        <Pressable onPress={toggleMode}>
          <Text style={styles.switchText}>
            {mode === 'login' ? "Need an account? Sign up" : 'Have an account? Log in'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#1b1b1b',
    padding: 24,
    borderRadius: 20,
    gap: 12
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700'
  },
  error: {
    color: '#ff6b6b'
  },
  input: {
    backgroundColor: '#222222',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#ffffff'
  },
  button: {
    backgroundColor: '#ff3366',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: {
    opacity: 0.6
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  },
  switchText: {
    textAlign: 'center',
    color: '#ff8cc6',
    marginTop: 8
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 8
  },
  toggle: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    paddingVertical: 12,
    alignItems: 'center'
  },
  toggleActive: {
    backgroundColor: '#ff3366',
    borderColor: '#ff3366'
  },
  toggleLabel: {
    color: '#b0b0b0',
    fontWeight: '600'
  },
  toggleLabelActive: {
    color: '#ffffff'
  },
  notice: {
    fontSize: 12,
    color: '#9d9d9d'
  }
})
