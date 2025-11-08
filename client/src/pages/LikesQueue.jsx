import { useEffect, useState } from 'react'
import { api, assetUrl } from '../api'
import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'
import { languageNameFor } from '../constants/languages'
import ModBadge from '../components/ModBadge'

function formatRelative(value) {
  if (!value) return ''
  const ts = typeof value === 'number' ? value : Date.parse(value)
  if (!ts || Number.isNaN(ts)) return ''
  const diff = Date.now() - ts
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function LikesQueue({ user }) {
  const { t } = useTranslation()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [locked, setLocked] = useState(!user?.canSeeLikedMe)

  useEffect(() => {
    let active = true
    async function load() {
      if (!user?.canSeeLikedMe) {
        if (active) {
          setLocked(true)
          setItems([])
          setLoading(false)
        }
        return
      }
      setLocked(false)
      setLoading(true)
      setErr('')
      try {
        const res = await api('/api/likes/incoming')
        if (active) setItems(res)
      } catch (e) {
        if (!active) return
        if (e.message === 'Feature locked') {
          setLocked(true)
          setItems([])
        } else {
          setErr(e.message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [user?.canSeeLikedMe])

  async function likeBack(id) {
    try {
      await api('/api/like/' + id, { method: 'POST' })
      setItems(prev => prev.filter(p => p.id !== id))
    } catch (e) {
      setErr(e.message)
    }
  }

  if (locked) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('likes.title', 'Who liked me')}</h2>
        <div className="card col" style={{ gap: 8 }}>
          <strong>{t('likes.locked.title', 'Locked feature')}</strong>
          <span style={{ color: '#9aa0a6' }}>{t('likes.locked.body', 'Upgrade your plan to unlock the queue.')}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('likes.title', 'Who liked me')}</h2>
      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
      {loading && <div className="pill">{t('common.loading', 'Loading...')}</div>}
      {!loading && items.length === 0 && <div className="pill">{t('likes.empty', 'No likes waiting right now. Check back soon.')}</div>}
      <div className="grid">
        {items.map(person => (
          <div key={person.id} className="card col" style={{ gap: 10 }}>
            <img src={assetUrl((person.photos && person.photos[0]) || person.selfiePath || '')} className="thumb" />
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span>{person.displayName} - {person.age}</span>
              <ModBadge isModerator={person.isModerator} size="xs" />
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="pill">{t(`common.gender.${person.gender}`, person.gender)}</span>
              {person.bodyType && <span className="pill">{t(`profile.bodyType.${person.bodyType}`, person.bodyType)}</span>}
              {person.isBoosted && (
                <span className="pill" style={{ background: '#ffe08a', color: '#5b4100' }}>
                  {t('common.boosting', 'Boosting')}
                </span>
              )}
              {person.distanceKm != null && (
                <span className="pill secondary">
                  {t('common.distance', '{distance} km away', { distance: person.distanceKm })}
                </span>
              )}
            </div>
            {person.languages?.length ? (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {person.languages.map(lang => (
                  <span key={lang} className="pill secondary">{languageNameFor(lang)}</span>
                ))}
              </div>
            ) : null}
            {person.bio && <small style={{ color: '#9aa0a6' }}>{person.bio}</small>}
            {person.likedAt && <small style={{ color: '#9aa0a6' }}>{t('likes.likedAt', 'Liked {time}', { time: formatRelative(person.likedAt) })}</small>}
            <div className="row" style={{ gap: 10 }}>
              <button className="btn" onClick={() => likeBack(person.id)}>{t('likes.likeBack', 'Like back')}</button>
              <Link className="btn secondary" to={`/messages/${person.id}`}>{t('actions.message', 'Message')}</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
