import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [err, setErr] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const { t } = useTranslation()

  async function submit(e) {
    e.preventDefault()
    setErr('')
    if (!token) {
      setErr(t('reset.missingToken','Reset link is invalid or has expired.'))
      return
    }
    if (password.length < 8) {
      setErr(t('reset.short','Password must be at least 8 characters long.'))
      return
    }
    if (password !== confirm) {
      setErr(t('reset.mismatch','Passwords do not match.'))
      return
    }
    setLoading(true)
    try {
      await api('/api/auth/reset', { method: 'POST', body: { token, password } })
      setDone(true)
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (!token && !done) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('reset.title','Choose a new password')}</h2>
        <div>{t('reset.missingToken','Reset link is invalid or has expired.')}</div>
        <Link className="btn secondary" to="/forgot">
          {t('reset.requestAgain','Request a new link')}
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('reset.title','Choose a new password')}</h2>
        <div>{t('reset.success','Password updated! You can now log in with your new password.')}</div>
        <Link className="btn" to="/login">
          {t('reset.backToLogin','Back to login')}
        </Link>
      </div>
    )
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('reset.title','Choose a new password')}</h2>
      <form className="col" onSubmit={submit}>
        <div className="field">
          <label>{t('reset.newPassword','New password')}</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label>{t('reset.confirmPassword','Confirm password')}</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </div>
        {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
        <button className="btn" disabled={loading}>
          {loading ? t('common.loading','Loading...') : t('reset.submit','Update password')}
        </button>
      </form>
    </div>
  )
}
