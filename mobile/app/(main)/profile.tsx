import { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  ScrollView,
  Alert
} from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { pickImageFromLibrary, uploadUserImage } from '@/services/storage'
import { addGalleryPhoto, setSelfie } from '@/services/profile'
import { useRouter } from 'expo-router'

export default function ProfileScreen() {
  const router = useRouter()
  const { profile, signOut: signOutUser } = useAuth()
  const [uploading, setUploading] = useState(false)

  if (!profile) return null

  const handleAddPhoto = async () => {
    setUploading(true)
    try {
      const asset = await pickImageFromLibrary()
      if (!asset) return
      const url = await uploadUserImage(profile.id, asset, 'photo')
      await addGalleryPhoto(profile, url)
    } catch (error) {
      Alert.alert('Upload failed', (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleReplaceSelfie = async () => {
    if (profile.gender !== 'female') return
    setUploading(true)
    try {
      const asset = await pickImageFromLibrary()
      if (!asset) return
      const url = await uploadUserImage(profile.id, asset, 'selfie')
      await setSelfie(profile, url)
    } catch (error) {
      Alert.alert('Upload failed', (error as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const handleSignOut = async () => {
    await signOutUser()
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{profile.displayName}</Text>
        <Text style={styles.caption}>{profile.email}</Text>
        <Text style={styles.caption}>
          {profile.gender === 'male' ? 'Male - Messaging locked until subscription' : 'Female - Free messaging'}
        </Text>
        {profile.gender === 'female' ? (
          <View style={[styles.status, profile.moderation.verifiedSelfie ? styles.verified : styles.pending]}>
            <Text style={styles.statusText}>
              {profile.moderation.verifiedSelfie ? 'Verified selfie' : 'Awaiting selfie approval'}
            </Text>
          </View>
        ) : (
          <View
            style={[
              styles.status,
              profile.subscription.status === 'active' ? styles.verified : styles.pending
            ]}
          >
            <Text style={styles.statusText}>
              {profile.subscription.status === 'active' ? 'Subscription active' : 'Subscription required to reply'}
            </Text>
          </View>
        )}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gallery photos</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
          {profile.photos.map(uri => (
            <Image key={uri} source={{ uri }} style={styles.photo} />
          ))}
          <Pressable style={styles.addPhoto} onPress={handleAddPhoto} disabled={uploading}>
            <Text style={styles.addPhotoText}>{uploading ? 'Uploading...' : '+ Add'}</Text>
          </Pressable>
        </ScrollView>
        <Text style={styles.helper}>Add at least two photos to improve match quality.</Text>
      </View>
      {profile.gender === 'female' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Selfie moderation</Text>
          {profile.selfieUrl ? (
            <Image source={{ uri: profile.selfieUrl }} style={styles.selfie} />
          ) : (
            <View style={styles.selfiePlaceholder}>
              <Text style={styles.selfiePlaceholderText}>No selfie uploaded yet</Text>
            </View>
          )}
          <Pressable
            style={styles.secondaryButton}
            onPress={handleReplaceSelfie}
            disabled={uploading}
          >
            <Text style={styles.secondaryText}>
              {uploading ? 'Uploading...' : profile.selfieUrl ? 'Replace selfie' : 'Upload selfie'}
            </Text>
          </Pressable>
        </View>
      ) : null}
      {profile.gender === 'female' ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Boosts & Visibility</Text>
          <Text style={styles.caption}>
            Purchase a boost to rise to the top of Discover or add visibility packs for more daily
            impressions.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/boosts')}>
            <Text style={styles.primaryText}>Manage boosts</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Messaging access</Text>
          <Text style={styles.caption}>
            Men can browse freely but must subscribe to reply to matches and messages.
          </Text>
          <Pressable style={styles.primaryButton} onPress={() => router.push('/subscribe')}>
            <Text style={styles.primaryText}>View plans</Text>
          </Pressable>
        </View>
      )}
      <Pressable style={styles.signOut} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#111111',
    padding: 16,
    gap: 20
  },
  header: {
    gap: 6
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700'
  },
  caption: {
    color: '#b0b0b0'
  },
  status: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999
  },
  statusText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  verified: {
    backgroundColor: '#1c3d29'
  },
  pending: {
    backgroundColor: '#3d2b1c'
  },
  section: {
    backgroundColor: '#1f1f1f',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2f2f2f'
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700'
  },
  photoRow: {
    flexDirection: 'row'
  },
  photo: {
    width: 120,
    height: 160,
    borderRadius: 12,
    marginRight: 12
  },
  addPhoto: {
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#363636',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addPhotoText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  helper: {
    color: '#858585',
    fontSize: 12
  },
  selfie: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14
  },
  selfiePlaceholder: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#363636',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selfiePlaceholderText: {
    color: '#808080'
  },
  primaryButton: {
    backgroundColor: '#ff3366',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12
  },
  primaryText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#2f2f2f',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 12
  },
  secondaryText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  signOut: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f2f2f'
  },
  signOutText: {
    color: '#ff6b6b',
    fontWeight: '600'
  }
})
