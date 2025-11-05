import { useState } from 'react'
import { View, Text, StyleSheet, Alert } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useFeatureFlags } from '@/contexts/FeatureFlagContext'
import { usePendingSelfieProfiles } from '@/hooks/usePendingSelfieProfiles'
import { AdminReviewQueue } from '@/components/AdminReviewQueue'
import { approveSelfie, rejectSelfie, requestSelfieReupload } from '@/services/moderation'
import { evaluateFaceMatch } from '@/services/faceMatch'

export default function AdminScreen() {
  const { profile } = useAuth()
  const { flags } = useFeatureFlags()
  const [scores, setScores] = useState<Record<string, number>>({})
  const pending = usePendingSelfieProfiles(Boolean(profile?.roles?.moderator))

  if (!profile?.roles?.moderator) {
    return (
      <View style={styles.center}>
        <Text style={styles.caption}>Moderator permissions required.</Text>
      </View>
    )
  }

  const handleApprove = async (target: typeof pending[number]) => {
    await approveSelfie(target, profile.id)
  }

  const handleReject = async (target: typeof pending[number]) => {
    await rejectSelfie(target, profile.id)
  }

  const handleReupload = async (target: typeof pending[number]) => {
    await requestSelfieReupload(target, profile.id)
  }

  const handleAiCheck = async (target: typeof pending[number]) => {
    if (!flags.aiAssistEnabled) return
    if (!target.selfieUrl || !target.photos.length) {
      Alert.alert('Missing media', 'Need selfie and gallery photos to run AI check.')
      return
    }
    const result = await evaluateFaceMatch({
      selfieUrl: target.selfieUrl,
      galleryUrls: target.photos.slice(0, 3)
    })
    setScores(prev => ({ ...prev, [target.id]: result.confidence }))
  }

  return (
    <AdminReviewQueue
      profiles={pending}
      aiAssistEnabled={flags.aiAssistEnabled}
      onApprove={handleApprove}
      onReject={handleReject}
      onRequestReupload={handleReupload}
      onRunAiCheck={handleAiCheck}
      faceMatchScores={scores}
    />
  )
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111111'
  },
  caption: {
    color: '#b0b0b0'
  }
})
