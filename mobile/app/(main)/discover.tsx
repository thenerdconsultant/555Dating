import { useMemo } from 'react'
import { View, FlatList, StyleSheet, Text } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'
import { useOppositeGenderProfiles } from '@/hooks/useOppositeGenderProfiles'
import { ProfileCard } from '@/components/ProfileCard'

export default function DiscoverScreen() {
  const { profile } = useAuth()
  const { profiles, loading } = useOppositeGenderProfiles(profile, 40)

  const emptyState = useMemo(() => {
    if (loading) {
      return <Text style={styles.caption}>Loading...</Text>
    }
    return <Text style={styles.caption}>No profiles available yet. Check back soon.</Text>
  }, [loading])

  return (
    <View style={styles.container}>
      {profile?.gender === 'female' && profile?.moderation.verifiedSelfie && (
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Boost visibility</Text>
          <Text style={styles.bannerCaption}>
            Activate a boost or visibility pack from your profile to reach more high-intent matches.
          </Text>
        </View>
      )}
      <FlatList
        data={profiles}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={emptyState}
        renderItem={({ item }) => (
          <ProfileCard
            profile={item}
            badgeText={item.boost?.active ? 'Boosting' : undefined}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111'
  },
  list: {
    padding: 16,
    gap: 16
  },
  caption: {
    color: '#b0b0b0',
    textAlign: 'center',
    marginTop: 48
  },
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1f1f1f',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#272727'
  },
  bannerTitle: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16
  },
  bannerCaption: {
    color: '#b0b0b0',
    marginTop: 4,
    fontSize: 13,
    lineHeight: 18
  }
})
