import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { getFirebase } from '@/config/firebase'
import { UserProfile } from '@/types/user'

const { firestore } = getFirebase()

const updateModeration = async (profile: UserProfile, changes: Record<string, unknown>) => {
  const ref = doc(firestore, 'users', profile.id)
  await updateDoc(ref, {
    ...changes,
    'moderation.verifiedAt': serverTimestamp(),
    updatedAt: serverTimestamp()
  })
}

export const approveSelfie = async (profile: UserProfile, reviewerId: string) => {
  await updateModeration(profile, {
    'moderation.verifiedSelfie': true,
    'moderation.reviewerId': reviewerId,
    isActive: true
  })
}

export const rejectSelfie = async (profile: UserProfile, reviewerId: string, reason?: string) => {
  await updateModeration(profile, {
    'moderation.verifiedSelfie': false,
    'moderation.reviewerId': reviewerId,
    'moderation.verificationNotes': reason ?? 'Rejected',
    isActive: false
  })
}

export const requestSelfieReupload = async (
  profile: UserProfile,
  reviewerId: string,
  instruction?: string
) => {
  await updateModeration(profile, {
    'moderation.verifiedSelfie': false,
    'moderation.reviewerId': reviewerId,
    'moderation.verificationNotes': instruction ?? 'Please upload a new selfie.',
    isActive: false
  })
}
