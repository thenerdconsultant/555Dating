import { useEffect, useState } from 'react'
import { api, assetUrl } from '../api'
import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'
import ModBadge from '../components/ModBadge'
import VerifiedBadge from '../components/VerifiedBadge'

const formatTimeAgo = (ts) => {
  if (!ts) return ''
  try {
    const diff = Date.now() - Number(ts)
    if (diff < 60_000) return 'Just now'
    const mins = Math.floor(diff / 60_000)
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(Number(ts)).toLocaleDateString()
  } catch {
    return ''
  }
}

export default function MessagesList({ user }){
  const { t } = useTranslation()
  const [items,setItems] = useState([])
  const [loading,setLoading] = useState(true)

  useEffect(()=>{
    (async()=>{
      try{
        const data = await api('/api/inbox')
        setItems(data)
      }catch{}
      finally {
        setLoading(false)
      }
    })()
  },[])

  return (
    <div className="col" style={{gap:'var(--space-lg)'}}>
      <h2>{t('messages.title','Messages')}</h2>

      {loading && (
        <div className="card loading" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          {t('common.loading','Loading...')}
        </div>
      )}

      {!loading && items.length === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-md)' }}>💬</div>
          <div style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: 'var(--space-sm)' }}>
            {t('messages.inbox.empty.title','No messages yet')}
          </div>
          <div className="text-muted">
            {t('messages.inbox.empty.subtitle','Start conversations with your matches')}
          </div>
          <Link className="btn" to="/matches" style={{ marginTop: 'var(--space-lg)', display: 'inline-block' }}>
            {t('messages.inbox.viewMatches','View Matches')}
          </Link>
        </div>
      )}

      <div className="col" style={{gap:'var(--space-sm)'}}>
        {items.map(m=>{
          const peerId = m.fromId===user.id? m.toId : m.fromId
          const isFromMe = m.fromId === user.id
          const isUnread = !m.readAt && !isFromMe

          return (
            <Link
              key={m.id}
              className="inbox-item"
              to={`/messages/${peerId}`}
            >
              <div className="inbox-avatar">
                {m.avatar ? (
                  <img src={assetUrl(m.avatar)} alt={m.displayName} />
                ) : (
                  <span>?</span>
                )}
                {isUnread && <div className="inbox-unread-badge"></div>}
              </div>

              <div className="inbox-content">
                <div className="inbox-header">
                  <div className="inbox-name">
                    {m.displayName}
                    <VerifiedBadge isVerified={!!m.selfiePath} size="xs" />
                    <ModBadge isModerator={m.isModerator} size="xs" />
                  </div>
                  <div className="inbox-time">{formatTimeAgo(m.ts)}</div>
                </div>
                <div className="inbox-preview">
                  {isFromMe && <span className="inbox-you">{t('messages.inbox.you','You')}: </span>}
                  {m.text}
                </div>
              </div>

              {isUnread && (
                <div className="inbox-unread-dot"></div>
              )}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

