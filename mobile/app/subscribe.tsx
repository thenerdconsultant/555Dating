import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native'
import { useRouter } from 'expo-router'

const PLANS = [
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$39.99',
    perks: ['Unlimited replies', 'Read receipts', 'Priority support']
  },
  {
    id: 'quarterly',
    name: 'Quarterly',
    price: '$99.99',
    perks: ['Unlimited replies', 'Read receipts', 'Priority support', 'Save 15%']
  }
]

export default function SubscribeScreen() {
  const router = useRouter()
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Unlock messaging</Text>
        <Text style={styles.caption}>
          Pick a plan to reply instantly, see read receipts, and keep momentum with your matches.
        </Text>
      </View>
      {PLANS.map(plan => (
        <View key={plan.id} style={styles.plan}>
          <Text style={styles.planName}>{plan.name}</Text>
          <Text style={styles.planPrice}>{plan.price}</Text>
          {plan.perks.map(perk => (
            <Text key={perk} style={styles.perk}>
              • {perk}
            </Text>
          ))}
          <Pressable style={styles.planButton}>
            <Text style={styles.planButtonText}>Continue</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#111111',
    gap: 16
  },
  header: {
    gap: 12
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
    color: '#b0b0b0',
    fontSize: 15,
    lineHeight: 22
  },
  plan: {
    backgroundColor: '#1f1f1f',
    borderRadius: 18,
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: '#2f2f2f'
  },
  planName: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700'
  },
  planPrice: {
    color: '#ff3366',
    fontSize: 24,
    fontWeight: '700'
  },
  perk: {
    color: '#b0b0b0'
  },
  planButton: {
    marginTop: 12,
    backgroundColor: '#ff3366',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center'
  },
  planButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  }
})
