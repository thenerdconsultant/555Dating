import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { api, assetUrl } from '../api'
import { languageNameFor } from '../constants/languages'
import { useTranslation } from '../i18n/LanguageContext'

function primaryPhoto(member) {
  if (!member) return ''
  if (Array.isArray(member.photos) && member.photos.length) return member.photos[0]
  return member.selfiePath || ''
}

export default function MemberProfile({ viewer }) {
  const { userId } = useParams()
  const { t } = useTranslation()
  const [member, setMember] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setErr('')
    setMember(null)
    ;(async () => {
      try {
        const data = await api('/api/users/' + userId)
        if (!active) return
        setMember(data)
      } catch (e) {
        if (!active) return
        setErr(e.message)
      } finally {
        if (!active) return
        setLoading(false)
      }
    })()
    return () => { active = false }
  }, [userId])

  const avatar = primaryPhoto(member)
  const canMessage = viewer && viewer.id !== userId

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('memberProfile.title', 'Member Profile')}</h2>
      {loading && <div className="pill secondary">{t('common.loading', 'Loading...')}</div>}
      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
      {member && (
        <div className="card col" style={{ gap: 16 }}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div
              style={{
                width: '100%',
                maxHeight: 420,
                borderRadius: 12,
                overflow: 'hidden',
                background: '#2b2b2b',
                border: '2px solid rgba(255,255,255,0.1)'
              }}
            >
              {avatar ? (
                <img
                  src={assetUrl(avatar)}
                  alt={member.displayName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                <div style={{ padding: 40, textAlign: 'center', color: '#9aa0a6' }}>
                  {t('memberProfile.noPhoto', 'No photo uploaded yet')}
                </div>
              )}
            </div>
            {member.photos && member.photos.length > 1 && (
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                {member.photos.slice(1).map((photo) => (
                  <img
                    key={photo}
                    src={assetUrl(photo)}
                    alt={member.displayName}
                    style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)' }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="col" style={{ gap: 10 }}>
            <div style={{ fontSize: 22, fontWeight: 600 }}>{member.displayName}</div>
            <div style={{ color: '#9aa0a6' }}>
              {[
                member.gender === 'woman' ? t('common.gender.woman', 'Woman') :
                member.gender === 'man' ? t('common.gender.man', 'Man') :
                member.gender === 'ladyboy' ? t('common.gender.ladyboy', 'Ladyboy') : null,
                member.age ? t('messages.ageValue', 'Age {age}', { age: member.age }) : null,
                member.location || null
              ].filter(Boolean).join(' | ')}
            </div>
            {member.languages?.length ? (
              <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {member.languages.map(lang => (
                  <span key={lang} className="pill secondary">{languageNameFor(lang)}</span>
                ))}
              </div>
            ) : null}
            {member.bio && <p style={{ lineHeight: 1.5 }}>{member.bio}</p>}
          </div>

          <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
            <Link className="btn secondary" to="/messages">
              {t('memberProfile.backToMessages', 'Back to messages')}
            </Link>
            {canMessage && (
              <Link className="btn" to={`/messages/${member.id}`}>
                {t('memberProfile.message', 'Message')}
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
