import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/AuthContext'

const TabIcon = ({
  name,
  focused
}: {
  name: keyof typeof Ionicons.glyphMap
  focused: boolean
}) => (
  <Ionicons name={name} size={20} color={focused ? '#ff3366' : '#888888'} />
)

export default function MainLayout() {
  const { user, profile, loading } = useAuth()

  if (loading) return null

  if (!user || !profile) {
    return <Redirect href="/login" />
  }

  if (profile.gender === 'female' && !profile.moderation.verifiedSelfie) {
    return <Redirect href="/pending-verification" />
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#111111' },
        headerTintColor: '#ffffff',
        tabBarStyle: {
          backgroundColor: '#111111',
          borderTopColor: '#1f1f1f'
        },
        tabBarActiveTintColor: '#ff3366'
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: 'Discover',
          tabBarIcon: ({ focused }) => <TabIcon name="flame" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: 'Matches',
          tabBarIcon: ({ focused }) => <TabIcon name="heart" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ focused }) => <TabIcon name="chatbubble-ellipses" focused={focused} />
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon name="person" focused={focused} />
        }}
      />
      {profile.roles?.moderator ? (
        <Tabs.Screen
          name="admin"
          options={{
            title: 'Admin',
            tabBarIcon: ({ focused }) => <TabIcon name="shield-checkmark" focused={focused} />
          }}
        />
      ) : null}
    </Tabs>
  )
}
