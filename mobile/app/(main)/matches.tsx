import { useMemo } from 'react'
import { View, FlatList, StyleSheet, Text, Pressable } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useMatches } from '@/hooks/useMatches'
import { useProfilesByIds } from '@/hooks/useProfilesByIds'
import { ProfileCard } from '@/components/ProfileCard'
import { requiresSubscriptionCta } from '@/utils/subscription'

export default function MatchesScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const matches = useMatches(profile ?? null)
  const partnerIds = useMemo(
    () =>
      matches
        .map(match => match.userIds.find(id => id !== profile?.id))
        .filter((id): id is string => Boolean(id)),
    [matches, profile?.id]
  )
  const partners = useProfilesByIds(partnerIds, profile ?? null)

  const renderItem = ({ item }: { item: typeof matches[number] }) => {
    const partnerId = item.userIds.find(id => id !== profile?.id)
    if (!partnerId) return null
    const partner = partners[partnerId]
    if (!partner) return null

    const showSubscribe = requiresSubscriptionCta(profile ?? null, partner ?? null)

    return (
      <View style={styles.card}>
        <ProfileCard
          profile={partner}
          badgeText={partner.boost?.active ? 'Boosting' : null}
        />
        {showSubscribe ? (
          <Pressable style={styles.subscribeCard} onPress={() => router.push('/subscribe')}>
            <Text style={styles.subscribeTitle}>Subscribe to reply</Text>
            <Text style={styles.subscribeCaption}>
              Activate a plan to message {partner.displayName} and other matches.
            </Text>
            <Text style={styles.subscribeAction}>View plans →</Text>
          </Pressable>
        ) : (
          <Pressable
            style={styles.messageButton}
            onPress={() =>
              router.push({
                pathname: '/(main)/messages',
                params: { matchId: item.id }
              })
            }
          >
            <Text style={styles.messageText}>Open chat</Text>
          </Pressable>
        )}
      </View>
    )
  }

  const EmptyComponent = () => (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No matches yet</Text>
      <Text style={styles.emptyCaption}>
        Keep exploring profiles to start new conversations.
      </Text>
    </View>
  )

  return (
    <FlatList
      data={matches}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={renderItem}
      ListEmptyComponent={EmptyComponent}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    padding: 16,
    gap: 16
  },
  card: {
    gap: 12
  },
  subscribeCard: {
    backgroundColor: '#1f1f1f',
    padding: 16,
    borderRadius: 16,
    gap: 6
  },
  subscribeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff'
  },
  subscribeCaption: {
    color: '#b0b0b0'
  },
  subscribeAction: {
    fontWeight: '600',
    color: '#ff3366'
  },
  messageButton: {
    backgroundColor: '#ff3366',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 999
  },
  messageText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  },
  empty: {
    marginTop: 120,
    alignItems: 'center',
    gap: 8
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700'
  },
  emptyCaption: {
    color: '#9c9c9c'
  }
})
