import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

export default function MessagesList({ user }){
  const { t } = useTranslation()
  const [items,setItems] = useState([])
  useEffect(()=>{(async()=>{ try{ setItems(await api('/api/inbox')) }catch{} })()},[])
  const peers = {}
  items.forEach(m=>{
    const peerId = m.fromId===m.toId? m.fromId : (m.fromId===m.me? m.toId : (m.toId))
  })
  return (
    <div className="col" style={{gap:16}}>
      <h2>{t('messages.title','Messages')}</h2>
      <div className="col" style={{gap:8}}>
        {items.map(m=>{
          const peerId = m.fromId===user.id? m.toId : m.fromId
          return (
            <Link key={m.id} className="card row" style={{justifyContent:'space-between',alignItems:'center'}} to={`/messages/${peerId}`}>
              <div style={{fontWeight:600}}>{m.text}</div>
              <small className="pill">{new Date(Number(m.ts)).toLocaleString()}</small>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

