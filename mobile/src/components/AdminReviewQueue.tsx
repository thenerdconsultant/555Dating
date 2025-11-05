import { memo } from 'react'
import { View, Text, Image, StyleSheet, ScrollView, Pressable } from 'react-native'
import { UserProfile } from '@/types/user'

interface Props {
  profiles: UserProfile[]
  aiAssistEnabled: boolean
  onApprove: (profile: UserProfile) => void
  onReject: (profile: UserProfile) => void
  onRequestReupload: (profile: UserProfile) => void
  onRunAiCheck: (profile: UserProfile) => Promise<void>
  faceMatchScores: Record<string, number | undefined>
}

const AdminReviewQueueComponent = ({
  profiles,
  aiAssistEnabled,
  onApprove,
  onReject,
  onRequestReupload,
  onRunAiCheck,
  faceMatchScores
}: Props) => {
  if (!profiles.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No pending selfies</Text>
        <Text style={styles.emptyCaption}>Great news. Everyone who applied is verified.</Text>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {profiles.map(profile => {
        const score = faceMatchScores[profile.id]
        return (
          <View key={profile.id} style={styles.card}>
            <View style={styles.mediaRow}>
              {profile.selfieUrl ? (
                <Image source={{ uri: profile.selfieUrl }} style={styles.selfie} />
              ) : (
                <View style={styles.selfiePlaceholder}>
                  <Text style={styles.selfiePlaceholderText}>No selfie</Text>
                </View>
              )}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gallery}>
                {profile.photos.map(uri => (
                  <Image key={uri} source={{ uri }} style={styles.galleryImage} />
                ))}
              </ScrollView>
            </View>
            <View style={styles.infoRow}>
              <View style={styles.meta}>
                <Text style={styles.name}>{profile.displayName}</Text>
                <Text style={styles.caption}>{profile.email}</Text>
                <Text style={styles.caption}>Gender: {profile.gender}</Text>
              </View>
              {aiAssistEnabled ? (
                <View style={styles.aiBlock}>
                  <Text style={styles.caption}>
                    AI match confidence:{' '}
                    {typeof score === 'number' ? `${Math.round(score * 100)}%` : 'Not run'}
                  </Text>
                  <Pressable style={styles.aiButton} onPress={() => onRunAiCheck(profile)}>
                    <Text style={styles.aiButtonText}>Run pre-check</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[styles.actionButton, styles.reject]}
                onPress={() => onReject(profile)}
              >
                <Text style={styles.actionText}>Reject</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.request]}
                onPress={() => onRequestReupload(profile)}
              >
                <Text style={styles.actionText}>Request re-upload</Text>
              </Pressable>
              <Pressable
                style={[styles.actionButton, styles.approve]}
                onPress={() => onApprove(profile)}
              >
                <Text style={styles.actionText}>Approve</Text>
              </Pressable>
            </View>
          </View>
        )
      })}
    </ScrollView>
  )
}

export const AdminReviewQueue = memo(AdminReviewQueueComponent)

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 20
  },
  card: {
    backgroundColor: '#1f1f1f',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2f2f2f',
    padding: 16,
    gap: 16
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 12
  },
  selfie: {
    width: 120,
    height: 160,
    borderRadius: 12
  },
  selfiePlaceholder: {
    width: 120,
    height: 160,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#363636',
    alignItems: 'center',
    justifyContent: 'center'
  },
  selfiePlaceholderText: {
    color: '#808080'
  },
  gallery: {
    flex: 1
  },
  galleryImage: {
    width: 120,
    height: 160,
    borderRadius: 12,
    marginRight: 12
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  meta: {
    gap: 8
  },
  name: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  caption: {
    color: '#aaaaaa'
  },
  aiBlock: {
    alignItems: 'flex-end',
    gap: 8
  },
  aiButton: {
    backgroundColor: '#252525',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999
  },
  aiButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center'
  },
  actionText: {
    fontWeight: '700',
    color: '#ffffff'
  },
  reject: {
    backgroundColor: '#3d1c1c'
  },
  request: {
    backgroundColor: '#2b2b2b'
  },
  approve: {
    backgroundColor: '#1c3d29'
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 32
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700'
  },
  emptyCaption: {
    color: '#b0b0b0',
    textAlign: 'center'
  }
})
