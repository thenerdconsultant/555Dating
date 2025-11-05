import { memo } from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { UserProfile } from '@/types/user'

interface Props {
  profile: UserProfile
  badgeText?: string | null
}

const ProfileCardComponent = ({ profile, badgeText }: Props) => {
  const primaryPhoto = profile.photos[0]
  return (
    <View style={styles.card}>
      {primaryPhoto ? (
        <Image source={{ uri: primaryPhoto }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>{profile.displayName[0]?.toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{profile.displayName}</Text>
          {badgeText ? <Text style={styles.badge}>{badgeText}</Text> : null}
        </View>
        <Text style={styles.meta}>{profile.headline ?? profile.bio ?? ''}</Text>
      </View>
    </View>
  )
}

export const ProfileCard = memo(ProfileCardComponent)

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1b1b1b',
    borderWidth: 1,
    borderColor: '#2b2b2b'
  },
  image: {
    width: '100%',
    height: 280
  },
  placeholder: {
    width: '100%',
    height: 280,
    backgroundColor: '#282828',
    alignItems: 'center',
    justifyContent: 'center'
  },
  placeholderText: {
    fontSize: 56,
    color: '#3f3f3f',
    fontWeight: '700'
  },
  content: {
    padding: 16,
    gap: 8
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff'
  },
  badge: {
    backgroundColor: '#ff8cc6',
    color: '#23111d',
    fontWeight: '700',
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999
  },
  meta: {
    color: '#c0c0c0',
    fontSize: 14
  }
})
