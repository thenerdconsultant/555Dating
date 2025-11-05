import { Redirect } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

export default function IndexScreen() {
  const { user, profile, loading } = useAuth()

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#ff3366" />
      </View>
    )
  }

  if (!user || !profile) {
    return <Redirect href="/login" />
  }

  if (profile.gender === 'female' && !profile.moderation.verifiedSelfie) {
    return <Redirect href="/pending-verification" />
  }

  return <Redirect href="/(main)/discover" />
}
