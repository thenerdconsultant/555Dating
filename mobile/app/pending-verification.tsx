import { View, Text, StyleSheet, Pressable } from 'react-native'
import { Redirect, useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { pickImageFromLibrary, uploadUserImage } from '@/services/storage'
import { setSelfie } from '@/services/profile'

export default function PendingVerificationScreen() {
  const router = useRouter()
  const { profile } = useAuth()

  if (!profile) {
    return <Redirect href="/login" />
  }

  if (profile.gender !== 'female' || profile.moderation.verifiedSelfie) {
    return <Redirect href="/" />
  }

  const handleUploadSelfie = async () => {
    if (!profile) return
    const asset = await pickImageFromLibrary()
    if (!asset) return
    const url = await uploadUserImage(profile.id, asset, 'selfie')
    await setSelfie(profile, url)
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Selfie verification pending</Text>
      <Text style={styles.caption}>
        Upload a clear selfie so a moderator can approve your profile. Your profile stays hidden
        until approval is granted.
      </Text>
      <Pressable style={styles.button} onPress={handleUploadSelfie}>
        <Text style={styles.buttonText}>Upload selfie</Text>
      </Pressable>
      <Pressable style={styles.secondary} onPress={() => router.push('/(main)/profile')}>
        <Text style={styles.secondaryText}>Go to profile</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    padding: 24,
    justifyContent: 'center',
    gap: 16
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700'
  },
  caption: {
    color: '#b0b0b0',
    fontSize: 15,
    lineHeight: 22
  },
  button: {
    backgroundColor: '#ff3366',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  },
  secondary: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2f2f2f'
  },
  secondaryText: {
    color: '#ffffff',
    fontWeight: '600'
  }
})
