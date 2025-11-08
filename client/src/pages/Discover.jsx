import { useEffect, useState } from 'react'
import { api, assetUrl } from '../api'
import { Link } from 'react-router-dom'
import { LANGUAGES, languageNameFor } from '../constants/languages'
import { useTranslation } from '../i18n/LanguageContext'
import ModBadge from '../components/ModBadge'
import VerifiedBadge from '../components/VerifiedBadge'
import PhotoLightbox from '../components/PhotoLightbox'
import ReportDialog from '../components/ReportDialog'

const STORAGE_KEY = 'discoverFilters.v1'
const defaultFilters = {
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
}

export default function Discover({ user }) {
  const [filters, setFilters] = useState(() => ({ ...defaultFilters }))
  const [people, setPeople] = useState([])
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [hydrated, setHydrated] = useState(false)
  const [lastApplied, setLastApplied] = useState(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxPhotos, setLightboxPhotos] = useState([])
  const [lightboxIndex, setLightboxIndex] = useState(0)

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

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      if (saved && typeof saved === 'object') {
        setFilters(prev => ({ ...prev, ...saved }))
      }
    } catch {
      // ignore
    } finally {
      setHydrated(true)
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters, hydrated])

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
      if (!append) setLastApplied(new Date())
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hydrated) return
    load(1, false)
  }, [filters.gender, filters.minAge, filters.maxAge, filters.location, filters.bodyType, filters.education, filters.language, filters.radiusKm, hydrated])

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

  const activeFilterSummaries = (() => {
    const badges = []
    if (filters.gender) {
      badges.push(t('discover.filters.summary.gender','Looking for {value}', {
        value: t(`common.gender.${filters.gender}`, filters.gender)
      }))
    }
    if (filters.location) badges.push(t('discover.filters.summary.location','Near {value}', { value: filters.location }))
    if (filters.bodyType) badges.push(t('discover.filters.summary.bodyType','Body: {value}', { value: t(`profile.bodyType.${filters.bodyType}`, filters.bodyType) }))
    if (filters.education) badges.push(t('discover.filters.summary.education','Education: {value}', { value: filters.education }))
    if (filters.language) badges.push(t('discover.filters.summary.language','Language: {value}', { value: filters.language }))
    if (filters.radiusKm) badges.push(t('discover.filters.summary.radius','Radius ≤ {value} km', { value: filters.radiusKm }))
    return badges
  })()

  function resetFilters() {
    setFilters({ ...defaultFilters })
    setPeople([])
    setPage(1)
    localStorage.removeItem(STORAGE_KEY)
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
        <button className="btn secondary" onClick={resetFilters}>{t('discover.clear', 'Clear filters')}</button>
      </div>

      {(activeFilterSummaries.length > 0 || lastApplied) && (
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          {activeFilterSummaries.map(text => (
            <span key={text} className="pill secondary">{text}</span>
          ))}
          {lastApplied && (
            <small className="pill">
              {t('discover.filters.applied','Filters updated at {time}', { time: lastApplied.toLocaleTimeString() })}
            </small>
          )}
        </div>
      )}

      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}

      <div className="grid">
        {people.map(person => (
          <div key={person.id} className="card col">
            <img
              src={assetUrl((person.photos && person.photos[0]) || person.selfiePath || '')}
              className="thumb photo-clickable"
              onClick={() => {
                const photos = person.photos || []
                if (photos.length > 0) {
                  setLightboxPhotos(photos)
                  setLightboxIndex(0)
                  setLightboxOpen(true)
                }
              }}
            />
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span>{person.displayName} - {person.age}</span>
              <VerifiedBadge isVerified={!!person.selfiePath} size="xs" />
              <ModBadge isModerator={person.isModerator} size="xs" />
            </div>
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
              <ReportButton userId={person.id} userName={person.displayName} />
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

      {lightboxOpen && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}
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

function ReportButton({ userId, userName }) {
  const [showDialog, setShowDialog] = useState(false)
  const [done, setDone] = useState(false)
  const { t } = useTranslation()

  if (done) {
    return <button className="btn secondary" disabled>{t('actions.reported', 'Reported')}</button>
  }

  return (
    <>
      <button className="btn secondary" onClick={() => setShowDialog(true)}>
        {t('actions.report', 'Report')}
      </button>
      {showDialog && (
        <ReportDialog
          userId={userId}
          userName={userName}
          onClose={() => setShowDialog(false)}
          onSuccess={() => setDone(true)}
        />
      )}
    </>
  )
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

