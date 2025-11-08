import { useState } from 'react'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

const PRICING = {
  monthly: { id: 'monthly', price: 10, labelKey: 'billing.monthlyLabel' },
  yearly: { id: 'yearly', price: 100, labelKey: 'billing.yearlyLabel' }
}

export default function Billing({ user }) {
  const { t } = useTranslation()
  const [plan, setPlan] = useState('monthly')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  if (!user?.gender || user.gender !== 'man') {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('billing.title','Premium features')}</h2>
        <div>{t('billing.notRequired','Subscriptions are only required for male accounts. Enjoy the app!')}</div>
      </div>
    )
  }

  async function startCheckout() {
    setErr('')
    setLoading(true)
    try {
      const res = await api('/api/billing/checkout', { method: 'POST', body: { plan } })
      if (res?.url) {
        window.location.href = res.url
      } else {
        throw new Error('Missing checkout URL')
      }
    } catch (e) {
      setErr(e.message)
      setLoading(false)
    }
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('billing.title','Premium features')}</h2>
      <div className="pill" style={{ lineHeight: 1.5 }}>
        {user.canSeeLikedMe
          ? t('billing.active','Your subscription is active. You can see who liked you and access premium chat features.')
          : t('billing.inactive','Unlock likes and premium chat by subscribing. Cancel anytime.')}
      </div>
      <div className="col" style={{ gap: 12 }}>
        {Object.values(PRICING).map((option) => (
          <label
            key={option.id}
            className="row"
            style={{
              gap: 12,
              alignItems: 'center',
              padding: 12,
              border: plan === option.id ? '1px solid #ff7a7a' : '1px solid #2f2f2f',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            <input
              type="radio"
              name="plan"
              value={option.id}
              checked={plan === option.id}
              onChange={() => setPlan(option.id)}
            />
            <div className="col" style={{ gap: 4 }}>
              <div style={{ fontWeight: 600 }}>
                {option.id === 'monthly'
                  ? t('billing.monthlyLabel','$10 per month')
                  : t('billing.yearlyLabel','$100 per year (save 2 months)')}
              </div>
              <div style={{ fontSize: 13, color: '#9aa0a6' }}>
                {option.id === 'monthly'
                  ? t('billing.monthlyDesc','Billed every month. Cancel anytime.')
                  : t('billing.yearlyDesc','Billed once yearly. Best value.')}
              </div>
            </div>
          </label>
        ))}
      </div>
      {err && <div className="pill" style={{ color: '#ff8b8b' }}>{err}</div>}
      <button className="btn" onClick={startCheckout} disabled={loading}>
        {loading ? t('common.loading','Loading...') : t('billing.checkout','Continue to secure checkout')}
      </button>
    </div>
  )
}
