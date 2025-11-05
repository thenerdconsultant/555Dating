import { useCallback, useMemo, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { useMatchById } from '@/hooks/useMatchById'
import { useMessages } from '@/hooks/useMessages'
import { useProfilesByIds } from '@/hooks/useProfilesByIds'
import { canSendMessage, sendMessage } from '@/services/messaging'
import { SubscribeToReply } from '@/components/SubscribeToReply'
import { requiresSubscriptionCta } from '@/utils/subscription'

export default function MessagesScreen() {
  const router = useRouter()
  const { profile } = useAuth()
  const { matchId } = useLocalSearchParams<{ matchId?: string }>()
  const match = useMatchById(matchId ?? null)
  const messages = useMessages(match?.id ?? null)
  const partnerId = useMemo(
    () => match?.userIds.find(id => id !== profile?.id) ?? null,
    [match, profile?.id]
  )
  const partnerMap = useProfilesByIds(partnerId ? [partnerId] : [], profile ?? null)
  const partner = partnerId ? partnerMap[partnerId] ?? null : null
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)

  const canReply = useMemo(() => {
    if (!profile || !partner) return false
    return canSendMessage(profile, partner)
  }, [profile, partner])

  const showSubscribe = useMemo(
    () => requiresSubscriptionCta(profile ?? null, partner ?? null),
    [profile, partner]
  )

  const handleSend = useCallback(async () => {
    if (!match || !profile || !partner) return
    if (!body.trim()) return
    setSending(true)
    try {
      await sendMessage(match, profile, partner, body.trim())
      setBody('')
    } catch (error) {
      console.error(error)
    } finally {
      setSending(false)
    }
  }, [match, profile, partner, body])

  if (!match || !partner) {
    return (
      <View style={styles.center}>
        <Text style={styles.caption}>Conversation unavailable.</Text>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>Go back</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={80}
    >
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.partnerName}>{partner.displayName}</Text>
      </View>
      <FlatList
        data={messages}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messages}
        renderItem={({ item }) => {
          const isMine = item.senderId === profile?.id
          return (
            <View
              style={[
                styles.messageBubble,
                isMine ? styles.mine : styles.theirs,
                isMine ? styles.mineAlign : styles.theirsAlign
              ]}
            >
              <Text style={styles.messageText}>{item.body}</Text>
            </View>
          )
        }}
      />
      {showSubscribe ? (
        <SubscribeToReply onPress={() => router.push('/subscribe')} />
      ) : (
        <View style={styles.composer}>
          <TextInput
            style={styles.input}
            placeholder="Send a message"
            placeholderTextColor="#7f7f7f"
            value={body}
            onChangeText={setBody}
            editable={canReply && !sending}
          />
          <Pressable
            onPress={handleSend}
            disabled={!canReply || sending || !body.trim()}
            style={[
              styles.sendButton,
              !canReply || sending || !body.trim() ? styles.sendDisabled : null
            ]}
          >
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
    padding: 16,
    gap: 12
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backText: {
    color: '#ff3366',
    fontWeight: '600'
  },
  partnerName: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 18
  },
  messages: {
    gap: 10,
    flexGrow: 1
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '80%'
  },
  mine: {
    backgroundColor: '#ff3366'
  },
  theirs: {
    backgroundColor: '#222222'
  },
  mineAlign: {
    alignSelf: 'flex-end'
  },
  theirsAlign: {
    alignSelf: 'flex-start'
  },
  messageText: {
    color: '#ffffff'
  },
  composer: {
    flexDirection: 'row',
    backgroundColor: '#1c1c1c',
    borderRadius: 16,
    padding: 8,
    alignItems: 'center',
    gap: 8
  },
  input: {
    flex: 1,
    color: '#ffffff',
    paddingHorizontal: 12
  },
  sendButton: {
    backgroundColor: '#ff3366',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12
  },
  sendDisabled: {
    opacity: 0.4
  },
  sendText: {
    color: '#ffffff',
    fontWeight: '600'
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#111111'
  },
  caption: {
    color: '#b0b0b0'
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#1f1f1f'
  }
})
