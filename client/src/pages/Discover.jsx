import { useEffect, useState } from 'react'
import { api } from '../api'
import { Link } from 'react-router-dom'
import { LANGUAGES, languageNameFor } from '../constants/languages'
import { useTranslation } from '../i18n/LanguageContext'

export default function Discover({ user }) {
  const [filters, setFilters] = useState({
    gender: '',
    minAge: '',
    maxAge: '',
    location: '',
    bodyType: '',
    education: '',
    language: '',
    radiusKm: '',
    lat: '',
    lng: ''
  })
  const [people, setPeople] = useState([])
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  function setF(key, value) {
    setPeople([])
    setPage(1)
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const allowedGenderOptions = (() => {
    const g = user?.gender
    if (g === 'man') return ['woman']
    if (g === 'woman') return ['man']
    if (g === 'ladyboy') return ['man']
    return ['woman']
  })()

  useEffect(() => {
    if (filters.gender && !allowedGenderOptions.includes(filters.gender)) {
      setFilters(prev => ({ ...prev, gender: '' }))
    }
  }, [user?.gender])

  async function load(nextPage = 1, append = false) {
    setErr('')
    setLoading(true)
    const qs = new URLSearchParams()
    const payload = { ...filters, page: String(nextPage), limit: '24' }
    Object.entries(payload).forEach(([k, v]) => {
      if (v !== '' && v != null) qs.set(k, String(v))
    })
    try {
      const res = await api('/api/users/discover?' + qs.toString())
      setTotal(res.total)
      setPeople(prev => (append ? [...prev, ...res.items] : res.items))
      setPage(res.page)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(1, false)
  }, [filters.gender, filters.minAge, filters.maxAge, filters.location, filters.bodyType, filters.education, filters.language, filters.radiusKm])

  function more() {
    if (people.length < total) load(page + 1, true)
  }

  function useMyLocation() {
    if (!('geolocation' in navigator)) return setErr('Geolocation not supported')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFilters(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }))
      },
      (e) => setErr(e.message),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('discover.title','Discover')}</h2>
      <div className="card row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <select value={filters.gender} onChange={e => setF('gender', e.target.value)}>
          <option value="">{t('discover.filters.gender', 'Any gender')}</option>
          {allowedGenderOptions.includes('man') && <option value="man">{t('common.gender.man', 'Men')}</option>}
          {allowedGenderOptions.includes('woman') && <option value="woman">{t('common.gender.woman', 'Women')}</option>}
          {allowedGenderOptions.includes('ladyboy') && <option value="ladyboy">{t('common.gender.ladyboy', 'Ladyboy')}</option>}
        </select>
        <input
          placeholder={t('discover.filters.minAge', 'Min age')}
          style={{ width: 90 }}
          value={filters.minAge}
          onChange={e => setF('minAge', e.target.value)}
        />
        <input
          placeholder={t('discover.filters.maxAge', 'Max age')}
          style={{ width: 90 }}
          value={filters.maxAge}
          onChange={e => setF('maxAge', e.target.value)}
        />
        <input
          placeholder={t('discover.filters.location', 'Location')}
          value={filters.location}
          onChange={e => setF('location', e.target.value)}
        />
        <select value={filters.bodyType} onChange={e => setF('bodyType', e.target.value)}>
          <option value="">{t('profile.bodyType', 'Body type')}</option>
          <option value="skinny">{t('profile.bodyType.skinny', 'Skinny')}</option>
          <option value="fit">{t('profile.bodyType.fit', 'Fit')}</option>
          <option value="medium">{t('profile.bodyType.medium', 'Medium')}</option>
          <option value="curvy">{t('profile.bodyType.curvy', 'Curvy')}</option>
          <option value="thicc">{t('profile.bodyType.thicc', 'Thicc')}</option>
        </select>
        <input
          placeholder={t('discover.filters.education', 'Education')}
          value={filters.education}
          onChange={e => setF('education', e.target.value)}
        />
        <select value={filters.language} onChange={e => setF('language', e.target.value)}>
          <option value="">{t('discover.filters.language', 'Language')}</option>
          {LANGUAGES.map(lang => (
            <option key={lang.code} value={lang.name}>{lang.name}</option>
          ))}
        </select>
        <input
          placeholder={t('discover.filters.radius', 'Radius (km)')}
          style={{ width: 110 }}
          value={filters.radiusKm}
          onChange={e => setF('radiusKm', e.target.value)}
        />
        <button className="btn secondary" onClick={useMyLocation}>{t('discover.useLocation', 'Use my location')}</button>
        <button className="btn secondary" onClick={() => load(1, false)}>{t('discover.apply', 'Apply')}</button>
      </div>

      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}

      <div className="grid">
        {people.map(person => (
          <div key={person.id} className="card col">
            <img src={(person.photos && person.photos[0]) || person.selfiePath || ''} className="thumb" />
            <div style={{ fontWeight: 600 }}>{person.displayName} - {person.age}</div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              <span className="pill">{t(`common.gender.${person.gender}`, person.gender)}</span>
              {person.bodyType && (
                <span className="pill">{t(`profile.bodyType.${person.bodyType}`, person.bodyType)}</span>
              )}
              {person.distanceKm != null && (
                <span className="pill secondary">
                  {t('common.distance', '{distance} km away', { distance: person.distanceKm })}
                </span>
              )}
              {person.isBoosted && (
                <span className="pill" style={{ background: '#ffe08a', color: '#5b4100' }}>
                  {t('common.boosted', 'Boosted')}
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
          {person.lastActive != null && <small className="pill">{formatLastActive(person.lastActive)}</small>}
            {person.bio && <small style={{ color: '#9aa0a6' }}>{person.bio}</small>}
            {person.location && <small style={{ color: '#9aa0a6' }}>{person.location}</small>}
            <div className="row">
              <Link className="btn secondary" to={`/messages/${person.id}`}>{t('actions.message', 'Message')}</Link>
              <LikeButton userId={person.id} />
              <BlockButtons userId={person.id} />
              <ReportButton userId={person.id} />
            </div>
          </div>
        ))}
      </div>
      <div className="col" style={{ alignItems: 'center', gap: 8 }}>
        {loading && <div className="pill">{t('common.loading', 'Loading...')}</div>}
        {!loading && people.length < total && (
          <button className="btn secondary" onClick={more}>{t('discover.loadMore', 'Load more')}</button>
        )}
      </div>
    </div>
  )
}

function LikeButton({ userId }) {
  const [liked, setLiked] = useState(false)
  const [match, setMatch] = useState(false)
  const { t } = useTranslation()
  async function like() {
    const res = await api('/api/like/' + userId, { method: 'POST' })
    setLiked(true)
    setMatch(res.match)
  }
  return (
    <button className="btn" onClick={like}>
      {match ? t('swipe.matchTitle', "It's a match!") : liked ? t('actions.liked', 'Liked') : t('actions.like', 'Like')}
    </button>
  )
}

function BlockButtons({ userId }) {
  const [blocked, setBlocked] = useState(false)
  const { t } = useTranslation()
  async function block() { await api('/api/block/' + userId, { method: 'POST' }); setBlocked(true) }
  async function unblock() { await api('/api/block/' + userId, { method: 'DELETE' }); setBlocked(false) }
  return blocked
    ? <button className="btn secondary" onClick={unblock}>{t('actions.unblock', 'Unblock')}</button>
    : <button className="btn secondary" onClick={block}>{t('actions.block', 'Block')}</button>
}

function ReportButton({ userId }) {
  const [done, setDone] = useState(false)
  const { t } = useTranslation()
  async function report() { await api('/api/report/' + userId, { method: 'POST' }); setDone(true) }
  return <button className="btn secondary" onClick={report} disabled={done}>{done ? t('actions.reported', 'Reported') : t('actions.report', 'Report')}</button>
}

function formatLastActive(ts) {
  const diff = Date.now() - Number(ts)
  if (diff < 60_000) return 'Online'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `Active ${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `Active ${hours}h ago`
  const days = Math.floor(hours / 24)
  return `Active ${days}d ago`
}

