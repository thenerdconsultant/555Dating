import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import { io } from 'socket.io-client'

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
      const s = io('/', { path:'/socket.io', auth:{ token } })
      socketRef.current = s
      s.on('private_message', (msg)=>{
        if ((msg.fromId===userId) || (msg.toId===userId)) setItems(prev=>[...prev,msg])
      })
      s.on('typing', ({ fromId, typing })=>{
        if (fromId===userId) setTyping(!!typing)
      })
      return ()=> s.close()
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
        {items.map(m=> (
          <div key={m.id} style={{textAlign: m.fromId===userId? 'left':'right'}}>
            <span className="pill">{m.text}</span>
            {m.readAt && m.fromId!==userId && <small className="pill" style={{marginLeft:6}}>{t('messages.read','Read')}</small>}
          </div>
        ))}
        {typing && <div style={{textAlign:'left'}}><small className="pill">{t('messages.typing','Typing...')}</small></div>}
      </div>
      <div className="row">
        <input style={{flex:1}} value={text} onChange={onInput} placeholder={t('messages.input.placeholder','Write a message...')} />
        <button className="btn" onClick={send}>{t('messages.send','Send')}</button>
      </div>
    </div>
  )
}
