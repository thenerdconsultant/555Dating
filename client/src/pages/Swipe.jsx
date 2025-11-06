import { useEffect, useState } from 'react'
import { api, assetUrl } from '../api'
import { Link } from 'react-router-dom'
import { languageNameFor } from '../constants/languages'
import { useTranslation } from '../i18n/LanguageContext'

const DAY_MS = 24 * 60 * 60 * 1000

function lastActiveLabel(ts) {
  if (!ts) return ''
  const diff = Date.now() - Number(ts)
  if (diff < 60_000) return 'Online'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `Active ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Active ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Active ${days}d ago`
}

function formatDuration(ms) {
  if (ms <= 0) return 'now'
  const mins = Math.ceil(ms / 60_000)
  if (mins < 60) return `${mins}m`
  const hours = Math.ceil(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.ceil(hours / 24)
  return `${days}d`
}

export default function Swipe({ user, onUpdateUser }) {
  const [candidate, setCandidate] = useState(null)
  const [err, setErr] = useState('')
  const [match, setMatch] = useState(null)
  const [quota, setQuota] = useState(0)
  const [tick, setTick] = useState(Date.now())
  const { t } = useTranslation()

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  async function load() {
    setErr('')
    try {
      const status = await api('/api/superlike/status')
      setQuota(status.remaining)
      const res = await api('/api/swipe/next')
      if (res.done) setCandidate(null)
      else setCandidate(res.user)
    } catch (e) {
      setErr(e.message)
    }
  }

  async function like() {
    if (!candidate) return
    const res = await api('/api/like/' + candidate.id, { method: 'POST' })
    if (res.match) setMatch(candidate)
    await load()
  }

  async function pass() {
    if (!candidate) return
    await api('/api/pass/' + candidate.id, { method: 'POST' })
    await load()
  }

  async function superLike() {
    if (!candidate) return
    try {
      const res = await api('/api/superlike/' + candidate.id, { method: 'POST' })
      setQuota(q => Math.max(0, q - 1))
      if (res.match) setMatch(candidate)
      await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  async function rewind() {
    setErr('')
    try {
      const res = await api('/api/swipe/rewind', { method: 'POST' })
      if (typeof onUpdateUser === 'function') {
        onUpdateUser(prev => (prev ? { ...prev, lastRewindAt: res.lastRewindAt } : prev))
      }
      if (res.restored) setCandidate(res.restored)
      else await load()
    } catch (e) {
      setErr(e.message)
    }
  }

  const nextRewindAt = user?.lastRewindAt ? user.lastRewindAt + DAY_MS : 0
  const cooldownMs = Math.max(0, nextRewindAt - tick)
  const canRewind = !user || cooldownMs <= 0

  return (
    <div className="col" style={{ gap: 16, alignItems: 'center' }}>
      <h2>{t('swipe.title', 'Swipe')}</h2>
      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
      {!candidate && <div className="pill">{t('swipe.noMore', 'No more profiles. Check back later.')}</div>}
      {candidate && (
        <div className="card col" style={{ maxWidth: 480, width: '100%', gap: 10 }}>
          <img src={assetUrl((candidate.photos && candidate.photos[0]) || candidate.selfiePath || '')} className="thumb" />
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 18 }}>{candidate.displayName} - {candidate.age}</div>
            <small className="pill">{lastActiveLabel(candidate.lastActive)}</small>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            <span className="pill">{candidate.gender}</span>
            {candidate.bodyType && <span className="pill">{candidate.bodyType}</span>}
            {candidate.location && <span className="pill">{candidate.location}</span>}
            {candidate.distanceKm != null && (
              <span className="pill secondary">
                {t('common.distance', '{distance} km away', { distance: candidate.distanceKm })}
              </span>
            )}
            {candidate.isBoosted && (
              <span className="pill" style={{ background: '#ffe08a', color: '#5b4100' }}>
                {t('common.boosted', 'Boosted')}
              </span>
            )}
          </div>
          {candidate.languages?.length ? (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
              {candidate.languages.map(lang => (
                <span key={lang} className="pill secondary">{languageNameFor(lang)}</span>
              ))}
            </div>
          ) : null}
          {candidate.bio && <p style={{ margin: 0, color: '#9aa0a6' }}>{candidate.bio}</p>}
          <div className="row" style={{ gap: 10, justifyContent: 'space-between' }}>
            <button className="btn secondary" onClick={pass} style={{ flex: 1 }}>{t('swipe.no', 'No')}</button>
            <button className="btn" onClick={like} style={{ flex: 1 }}>{t('swipe.yes', 'Yes')}</button>
          </div>
          <button className="btn secondary" onClick={rewind} disabled={!canRewind}>
            {canRewind
              ? t('swipe.rewind', 'Rewind (1/day)')
              : t('swipe.rewindWait', 'Rewind ({time} left)', { time: formatDuration(cooldownMs) })
            }
          </button>
          <button className="btn" onClick={superLike} disabled={!quota}>
            {t('swipe.superLike', 'Super Like')} {quota ? t('swipe.superLikeRemaining', '({count} left)', { count: quota }) : t('swipe.superLikeNone', '(none left)')}
          </button>
        </div>
      )}

      {match && (
        <div className="card col" style={{ maxWidth: 480, width: '100%', gap: 10, borderColor: '#3a3' }}>
          <div style={{ fontWeight: 700 }}>{t('swipe.matchTitle', "It's a match!")}</div>
          <div className="row" style={{ gap: 10, alignItems: 'center' }}>
            <img src={assetUrl((match.photos && match.photos[0]) || match.selfiePath || '')} className="thumb" style={{ width: 80, height: 80 }} />
            <div>{match.displayName}</div>
          </div>
          <Link className="btn" to={`/messages/${match.id}`}>{t('swipe.matchButton', 'Send a message')}</Link>
        </div>
      )}
    </div>
  )
}
