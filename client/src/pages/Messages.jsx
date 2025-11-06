import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import { io } from 'socket.io-client'

const SOCKET_BASE = (import.meta.env.VITE_SOCKET_BASE || import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

const formatTime = (ts) => {
  if (!ts) return ''
  try {
    return new Date(ts).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch {
    return ''
  }
}

export default function Messages(){
  const { t } = useTranslation()
  const { userId } = useParams()
  const [items,setItems] = useState([])
  const [text,setText] = useState('')
  const socketRef = useRef(null)
  const [typing,setTyping] = useState(false)
  const typingRef = useRef(null)
  const [err,setErr] = useState('')
  const listRef = useRef(null)

  useEffect(()=>{(async()=>{
    setErr('')
    try { setItems(await api('/api/messages/'+userId)) }
    catch(e){ setItems([]); setErr(e.message) }
    try {
      const { token } = await api('/api/auth/socket-token')
      const socket = io(SOCKET_BASE || undefined, { path:'/socket.io', auth:{ token }, withCredentials: true })
      socketRef.current = socket
      socket.on('private_message', (msg)=>{
        if ((msg.fromId===userId) || (msg.toId===userId)) setItems(prev=>[...prev,msg])
      })
      socket.on('typing', ({ fromId, typing })=>{
        if (fromId===userId) setTyping(!!typing)
      })
      return ()=> socket.close()
    } catch {}
  })()},[userId])

  useEffect(()=>{
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  },[items])

  async function send(){
    if (!text.trim()) return
    try {
      const msg = await api('/api/messages/'+userId, { method:'POST', body:{ text } })
      setItems(prev=>[...prev, msg]); setText('')
    } catch(e){ setErr(e.message) }
  }

  function onInput(e){
    setText(e.target.value)
    if (!socketRef.current) return
    socketRef.current.emit('typing', { toId: userId, typing: true })
    clearTimeout(typingRef.current)
    typingRef.current = setTimeout(()=>{
      socketRef.current.emit('typing', { toId: userId, typing: false })
    }, 800)
  }

  return (
    <div className="col" style={{gap:16}}>
      <h2>{t('messages.title','Messages')}</h2>
      {err && <div className="pill" style={{color:'#ff8b8b'}}>{err}</div>}
      <div ref={listRef} className="card col" style={{height:'60vh',overflowY:'auto',padding:8}}>
        {items.map(m=> {
          const isPartner = m.fromId === userId
          const bubbleColor = m.gender === 'woman' ? '#ff7ad9' : '#4da6ff'
          return (
            <div key={m.id} style={{textAlign: isPartner? 'left':'right', marginBottom: 10}}>
              <div style={{ fontSize: 12, color: '#9aa0a6', marginBottom: 4 }}>
                <strong>{m.displayName || t('rooms.member','Member')}</strong>&nbsp;•&nbsp;{formatTime(m.ts)}
              </div>
              <span
                className="pill"
                style={{
                  background: bubbleColor,
                  color:'#ffffff',
                  textShadow:'0 0 2px rgba(255,255,255,0.95)',
                  border:'1px solid rgba(255,255,255,0.25)'
                }}
              >
                {m.text}
              </span>
              {m.readAt && !isPartner && <small className="pill" style={{marginLeft:6}}>{t('messages.read','Read')}</small>}
            </div>
        )})}
        {typing && <div style={{textAlign:'left'}}><small className="pill">{t('messages.typing','Typing...')}</small></div>}
      </div>
      <div className="row">
        <input style={{flex:1}} value={text} onChange={onInput} placeholder={t('messages.input.placeholder','Write a message...')} />
        <button className="btn" onClick={send}>{t('messages.send','Send')}</button>
      </div>
    </div>
  )
}
