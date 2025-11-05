export type Gender = 'male' | 'female'

export type SubscriptionStatus = 'active' | 'inactive'

export interface ModerationState {
  verifiedSelfie: boolean
  verificationRequestedAt: string | null
  verifiedAt: string | null
  reviewerId: string | null
  verificationNotes?: string
}

export interface BoostState {
  active: boolean
  expiresAt?: string
}

export interface VisibilityPackState {
  impressionsPerDay: number
  renewsAt?: string
}

export interface UserProfile {
  id: string
  email: string
  displayName: string
  gender: Gender
  isActive: boolean
  birthdate: string
  headline?: string
  bio?: string
  photos: string[]
  selfieUrl?: string
  moderation: ModerationState
  subscription: {
    status: SubscriptionStatus
    renewsAt?: string
  }
  boost?: BoostState
  visibility?: VisibilityPackState
  roles?: {
    moderator?: boolean
    admin?: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface Match {
  id: string
  userIds: [string, string]
  createdAt: string
  lastMessageAt?: string
}

export interface Message {
  id: string
  matchId: string
  senderId: string
  recipientId: string
  body: string
  createdAt: string
}
