import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, assetUrl } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import { io } from 'socket.io-client'
import ModBadge from '../components/ModBadge'
import ReportDialog from '../components/ReportDialog'

const SOCKET_BASE = (import.meta.env.VITE_SOCKET_BASE || import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const formatTime = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

const formatDate = (ts) => {
  if (!ts) return ''
  try {
    const date = new Date(ts)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) return 'Today'
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

const shouldShowDateSeparator = (currentMsg, prevMsg) => {
  if (!prevMsg) return true
  const currentDate = new Date(currentMsg.ts).toDateString()
  const prevDate = new Date(prevMsg.ts).toDateString()
  return currentDate !== prevDate
}

export default function Messages({ user }){
  const { t } = useTranslation()
  const { userId } = useParams()
  const [items,setItems] = useState([])
  const [partner,setPartner] = useState(null)
  const [text,setText] = useState('')
  const socketRef = useRef(null)
  const [typing,setTyping] = useState(false)
  const typingRef = useRef(null)
  const [err,setErr] = useState('')
  const listRef = useRef(null)
  const [showReport,setShowReport] = useState(false)

  useEffect(()=>{
    let cancelled = false
    setErr('')
    setPartner(null)
    setItems([])
    ;(async()=>{
      try {
        const data = await api('/api/messages/'+userId)
        if (cancelled) return
        setPartner(data.partner || null)
        setItems(Array.isArray(data.messages) ? data.messages : [])
      } catch(e) {
        if (cancelled) return
        setItems([])
        setPartner(null)
        setErr(e.message)
      }
      try {
        const { token } = await api('/api/auth/socket-token')
        if (cancelled) return
        const socket = io(SOCKET_BASE || undefined, { path:'/socket.io', auth:{ token }, withCredentials: true })
        socketRef.current = socket
        socket.on('private_message', (msg)=>{
          if ((msg.fromId===userId) || (msg.toId===userId)) setItems(prev=>[...prev,msg])
        })
        socket.on('typing', ({ fromId, typing })=>{
          if (fromId===userId) setTyping(!!typing)
        })
      } catch (err) {
        console.error('Failed to connect to socket:', err);
      }
    })()
    return ()=>{
      cancelled = true
      if (socketRef.current) {
        try { socketRef.current.close() } catch {}
        socketRef.current = null
      }
      clearTimeout(typingRef.current)
      setTyping(false)
    }
  },[userId])

  useEffect(()=>{
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  },[items])

  async function send(){
    if (!text.trim()) return
    try {
      const msg = await api('/api/messages/'+userId, { method:'POST', body:{ text } })
      setItems(prev=>[...prev, msg])
      setText('')
      setErr('') // Clear any previous errors on success
      if (socketRef.current) {
        socketRef.current.emit('typing', { toId: userId, typing: false })
      }
    } catch(e){
      // Show user-friendly error message
      setErr(e.message)
      // Auto-clear error after 8 seconds for throttle messages
      if (e.message.includes('messages until') || e.message.includes('different people')) {
        setTimeout(() => setErr(''), 8000)
      }
    }
  }

  function onInput(e){
    setText(e.target.value)
    if (!socketRef.current) return
    socketRef.current.emit('typing', { toId: userId, typing: true })
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(()=>{
      if (!socketRef.current) return
      socketRef.current.emit('typing', { toId: userId, typing: false })
    }, 800)
  }

  function onKeyPress(e){
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const partnerMeta = (()=>{
    if (!partner) return ''
    const bits = []
    if (partner.gender === 'woman') bits.push(t('common.gender.woman','Woman'))
    else if (partner.gender === 'man') bits.push(t('common.gender.man','Man'))
    else if (partner.gender === 'ladyboy') bits.push(t('common.gender.ladyboy','Ladyboy'))
    if (partner.age) bits.push(t('messages.ageValue','Age {age}', { age: partner.age }))
    if (partner.location) bits.push(partner.location)
    return bits.join(' | ')
  })()

  return (
    <div className="chat-container">
      {/* Chat Header */}
      {partner && (
        <Link
          to={`/members/${partner.id}`}
          className="chat-header"
        >
          <div className="chat-avatar">
            {partner.avatar ? (
              <img
                src={assetUrl(partner.avatar)}
                alt={partner.displayName}
              />
            ) : (
              <span className="avatar-placeholder">??</span>
            )}
          </div>
          <div className="chat-header-info">
            <div className="chat-header-name">
              {partner.displayName}
              <ModBadge isModerator={partner.isModerator} size="xs" />
            </div>
            {partnerMeta && <div className="chat-header-meta">{partnerMeta}</div>}
          </div>
          <div className="chat-header-action">
            {t('messages.viewProfile','View profile')} →
          </div>
        </Link>
      )}

      {partner && (
        <div className="row" style={{ justifyContent:'flex-end', margin:'var(--space-md) 0' }}>
          <button className="btn secondary" type="button" onClick={() => setShowReport(true)}>
            {t('actions.report','Report')}
          </button>
        </div>
      )}

      {showReport && partner && (
        <ReportDialog
          userId={partner.id}
          userName={partner.displayName}
          onClose={() => setShowReport(false)}
          onSuccess={() => setShowReport(false)}
        />
      )}

      {err && (
        <div className="pill" style={{
          background: 'var(--error-bg)',
          color: 'var(--error)',
          borderColor: 'var(--error)',
          margin: 'var(--space-md)',
          padding: 'var(--space-md)'
        }}>
          {err}
        </div>
      )}

      {/* Messages Area */}
      <div ref={listRef} className="chat-messages">
        {items.length === 0 && !typing && (
          <div className="chat-empty-state">
            <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>💬</div>
            <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
              {t('messages.empty.title', 'Start a conversation')}
            </div>
            <div className="text-muted">
              {t('messages.empty.subtitle', 'Say hi and introduce yourself!')}
            </div>
          </div>
        )}

        {items.map((m, idx)=> {
          const isPartner = m.fromId === userId
          const showDate = shouldShowDateSeparator(m, items[idx - 1])
          const prevSameSender = idx > 0 && items[idx - 1].fromId === m.fromId
          const nextSameSender = idx < items.length - 1 && items[idx + 1].fromId === m.fromId

          return (
            <div key={m.id}>
              {showDate && (
                <div className="chat-date-separator">
                  <span>{formatDate(m.ts)}</span>
                </div>
              )}
              <div className={`chat-message ${isPartner ? 'partner' : 'me'}`}>
                {isPartner && !prevSameSender && (
                  <div className="chat-message-avatar">
                    {partner?.avatar ? (
                      <img src={assetUrl(partner.avatar)} alt={partner.displayName} />
                    ) : (
                      <span>?</span>
                    )}
                  </div>
                )}
                {isPartner && prevSameSender && <div className="chat-message-avatar-spacer" />}

                <div className="chat-message-content">
                  {isPartner && !prevSameSender && (
                    <div className="chat-message-sender">{m.displayName}</div>
                  )}
                  <div className={`chat-bubble ${isPartner ? 'partner' : 'me'} ${user?.gender === 'man' ? 'man' : ''} ${!nextSameSender ? 'last' : ''}`}>
                    {m.text}
                  </div>
                  <div className="chat-message-time">
                    {formatTime(m.ts)}
                    {m.readAt && !isPartner && (
                      <span className="chat-read-receipt"> · {t('messages.read','Read')}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
        )})}

        {typing && (
          <div className="chat-message partner">
            <div className="chat-message-avatar">
              {partner?.avatar ? (
                <img src={assetUrl(partner.avatar)} alt={partner.displayName} />
              ) : (
                <span>?</span>
              )}
            </div>
            <div className="chat-typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="chat-input-container">
        <input
          className="chat-input"
          value={text}
          onChange={onInput}
          onKeyPress={onKeyPress}
          placeholder={t('messages.input.placeholder','Type a message...')}
        />
        <button
          className="btn chat-send-button"
          onClick={send}
          disabled={!text.trim()}
        >
          {t('messages.send','Send')} ▸
        </button>
      </div>
    </div>
  )
}
