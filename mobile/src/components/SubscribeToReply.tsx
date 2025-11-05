import { memo } from 'react'
import { StyleSheet, View, Text, Pressable } from 'react-native'

interface Props {
  onPress: () => void
}

const SubscribeToReplyComponent = ({ onPress }: Props) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Subscribe to reply</Text>
      <Text style={styles.caption}>
        Unlock messaging to respond, view receipts, and keep the conversation going.
      </Text>
      <Pressable style={styles.button} onPress={onPress}>
        <Text style={styles.buttonText}>View plans</Text>
      </Pressable>
    </View>
  )
}

export const SubscribeToReply = memo(SubscribeToReplyComponent)

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1f1f1f',
    borderRadius: 16,
    padding: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#2f2f2f'
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff'
  },
  caption: {
    fontSize: 14,
    color: '#b0b0b0',
    lineHeight: 20
  },
  button: {
    backgroundColor: '#ff3366',
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center'
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16
  }
})
