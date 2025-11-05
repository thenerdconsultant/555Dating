import { ScrollView, Text, StyleSheet, Pressable, View } from 'react-native'
import { useRouter, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'

const BOOST_PLANS = [
  { id: 'boost-1', label: 'Single boost', details: '15 minutes priority placement', price: '$6.99' },
  { id: 'boost-5', label: 'Boost pack', details: '5 boosts - save 10%', price: '$29.99' }
]

const VISIBILITY_PACKS = [
  { id: 'vis-1', label: 'Visibility+, 1 week', details: '+30% daily impressions', price: '$19.99' },
  { id: 'vis-4', label: 'Visibility+, 4 week', details: '+30% daily impressions - save 20%', price: '$59.99' }
]

export default function BoostsScreen() {
  const router = useRouter()
  const { profile } = useAuth()

  if (!profile) {
    return <Redirect href="/login" />
  }

  if (profile.gender !== 'female') {
    return <Redirect href="/(main)/profile" />
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </Pressable>
      <Text style={styles.title}>Boost visibility</Text>
      <Text style={styles.caption}>
        Boosts place you top of Discover. Visibility packs guarantee more daily impressions.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Boosts</Text>
        {BOOST_PLANS.map(plan => (
          <View key={plan.id} style={styles.plan}>
            <Text style={styles.planLabel}>{plan.label}</Text>
            <Text style={styles.planDetails}>{plan.details}</Text>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Pressable style={styles.planButton}>
              <Text style={styles.planButtonText}>Purchase</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Visibility packs</Text>
        {VISIBILITY_PACKS.map(plan => (
          <View key={plan.id} style={styles.plan}>
            <Text style={styles.planLabel}>{plan.label}</Text>
            <Text style={styles.planDetails}>{plan.details}</Text>
            <Text style={styles.planPrice}>{plan.price}</Text>
            <Pressable style={styles.planButton}>
              <Text style={styles.planButtonText}>Purchase</Text>
            </Pressable>
          </View>
        ))}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#111111',
    gap: 16
  },
  backText: {
    color: '#ff3366',
    fontWeight: '600'
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700'
  },
  caption: {
    color: '#b0b0b0'
  },
  section: {
    gap: 12
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700'
  },
  plan: {
    backgroundColor: '#1f1f1f',
    padding: 16,
    borderRadius: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#2f2f2f'
  },
  planLabel: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 16
  },
  planDetails: {
    color: '#b0b0b0'
  },
  planPrice: {
    color: '#ff3366',
    fontWeight: '700',
    fontSize: 18
  },
  planButton: {
    marginTop: 10,
    backgroundColor: '#ff3366',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 10
  },
  planButtonText: {
    color: '#ffffff',
    fontWeight: '600'
  }
})
