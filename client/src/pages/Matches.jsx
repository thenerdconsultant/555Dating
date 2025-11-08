import { useEffect, useState } from 'react'
import { api, assetUrl } from '../api'
import { Link } from 'react-router-dom'
import { languageNameFor } from '../constants/languages'
import { useTranslation } from '../i18n/LanguageContext'
import ModBadge from '../components/ModBadge'
import VerifiedBadge from '../components/VerifiedBadge'

export default function Matches() {
  const [items, setItems] = useState([])
  const [err, setErr] = useState('')
  const { t } = useTranslation()

  useEffect(() => {
    (async () => {
      try {
        setItems(await api('/api/matches'))
      } catch (e) {
        setErr(e.message)
      }
    })()
  }, [])

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('matches.title', 'Matches')}</h2>
      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
      <div className="grid">
        {items.map(person => (
          <div key={person.id} className="card col">
            <img src={assetUrl((person.photos && person.photos[0]) || '')} className="thumb" />
            <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <span>{person.displayName} - {person.age}</span>
              <VerifiedBadge isVerified={!!person.selfiePath} size="xs" />
              <ModBadge isModerator={person.isModerator} size="xs" />
            </div>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {person.distanceKm != null && (
                <span className="pill secondary">
                  {t('common.distance', '{distance} km away', { distance: person.distanceKm })}
                </span>
              )}
              {person.isBoosted && (
                <span className="pill" style={{ background: '#ffe08a', color: '#5b4100' }}>
                  {t('common.boosting', 'Boosting')}
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
            <Link className="btn" to={`/messages/${person.id}`}>{t('matches.messageButton', 'Message')}</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
