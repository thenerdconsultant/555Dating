import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    setLoading(true)
    try {
      await api('/api/auth/forgot', { method: 'POST', body: { email } })
      setSent(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('forgot.title','Reset your password')}</h2>
        <div style={{ lineHeight: 1.5 }}>
          {t('forgot.sent','If an account matches that email address, a reset link is on the way.')}
        </div>
        <Link className="btn secondary" to="/login">
          {t('forgot.backToLogin','Return to login')}
        </Link>
      </div>
    )
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('forgot.title','Reset your password')}</h2>
      <form className="col" onSubmit={submit}>
        <div className="field">
          <label>{t('login.email','Email')}</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
        <button className="btn" disabled={loading}>
          {loading ? t('common.loading','Loading...') : t('forgot.submit','Send reset link')}
        </button>
      </form>
      <div style={{ fontSize: 13 }}>
        <Link to="/login">{t('forgot.back','Remembered your password? Log in')}</Link>
      </div>
    </div>
  )
}
