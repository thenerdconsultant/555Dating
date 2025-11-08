import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from '../i18n/LanguageContext'

export default function BillingStatus({ variant, onRefreshUser }) {
  const { t } = useTranslation()
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function refresh() {
      if (typeof onRefreshUser === 'function') {
        try {
          await onRefreshUser()
        } catch (err) {
          // Silently fail - user can retry manually
        }
      }
      if (active) setLoading(false)
    }
    refresh()
    return () => { active = false }
  }, [onRefreshUser])

  useEffect(() => {
    if (variant === 'success') {
      setMessage(t('billing.success','Thanks! Your subscription is active.'))
    } else if (variant === 'cancel') {
      setMessage(t('billing.cancelled','Checkout was cancelled. You can try again anytime.'))
    } else {
      setMessage('')
    }
  }, [variant, t])

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('billing.statusTitle','Subscription')}</h2>
      <div className="pill" style={{ lineHeight: 1.5 }}>
        {loading ? t('common.loading','Loading...') : message}
      </div>
      <div className="row" style={{ gap: 12 }}>
        <Link className="btn" to="/billing">
          {t('billing.manage','Manage subscription')}
        </Link>
        <Link className="btn secondary" to="/discover">
          {t('billing.back','Back to discovery')}
        </Link>
      </div>
    </div>
  )
}
