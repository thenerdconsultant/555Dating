import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

export default function GoogleCallback({ onAuthed, onRefreshUser }) {
  const [params] = useSearchParams()
  const status = params.get('status') || ''
  const reason = params.get('reason') || ''
  const created = params.get('created') === '1'
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [processing, setProcessing] = useState(true)
  const nav = useNavigate()
  const { t } = useTranslation()

  useEffect(() => {
    let timer
    async function hydrate() {
      try {
        const user = onRefreshUser ? await onRefreshUser() : null
        if (user && onAuthed) onAuthed(user)
        setMessage(created ? t('google.created','Welcome! Let’s finish your profile.') : t('google.success','Successfully signed in with Google.'))
        setProcessing(false)
        timer = setTimeout(() => {
          nav(created ? '/profile' : '/discover', { replace: true })
        }, 1500)
      } catch (err) {
        setError(t('google.fetchError','Signed in but we could not load your profile. Please refresh the page.'))
        setProcessing(false)
      }
    }

    if (status === 'success') {
      hydrate()
      return () => timer && clearTimeout(timer)
    }

    if (status === 'error') {
      let msg = t('google.error','We could not complete Google sign-in. Please try again.')
      if (reason === 'state') msg = t('google.stateMismatch','Google login could not be verified. Please try again.')
      if (reason === 'suspended') msg = t('google.suspended','This account is currently suspended. Contact support for help.')
      if (reason === 'disabled') msg = t('google.disabled','Google sign-in is not enabled for this app right now.')
      setError(msg)
      setProcessing(false)
    } else if (!status) {
      setMessage(t('google.waiting','Completing Google sign-in...'))
    }

    return () => timer && clearTimeout(timer)
  }, [status, reason, created, onAuthed, onRefreshUser, nav, t])

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('google.title','Google sign-in')}</h2>
      {processing && !error && (
        <div>{message || t('common.loading','Loading...')}</div>
      )}
      {!processing && message && !error && (
        <div>{message}</div>
      )}
      {error && (
        <div className="col" style={{ gap: 12 }}>
          <div className="pill" style={{ color: '#ff8b8b' }}>{error}</div>
          <Link className="btn secondary" to="/login">
            {t('google.backToLogin','Return to login')}
          </Link>
        </div>
      )}
    </div>
  )
}
