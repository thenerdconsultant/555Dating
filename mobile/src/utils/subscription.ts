import { UserProfile } from '@/types/user'

export const isSubscriber = (profile?: UserProfile | null): boolean => {
  if (!profile) return false
  return profile.subscription.status === 'active'
}

export const requiresSubscriptionCta = (
  sender: UserProfile | null,
  recipient: UserProfile | null
) => {
  if (!sender || !recipient) return false
  if (sender.gender !== 'male') return false
  if (sender.subscription.status === 'active') return false
  if (sender.gender === recipient.gender) return false
  return true
}
