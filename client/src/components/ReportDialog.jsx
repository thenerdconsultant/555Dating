import { useState } from 'react'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

const REPORT_CATEGORIES = [
  { value: 'harassment', labelKey: 'report.category.harassment', fallback: 'Harassment or bullying', icon: '!' },
  { value: 'fake_profile', labelKey: 'report.category.fake', fallback: 'Fake profile or impersonation', icon: 'ID' },
  { value: 'inappropriate_content', labelKey: 'report.category.inappropriate', fallback: 'Inappropriate content', icon: 'X' },
  { value: 'scam', labelKey: 'report.category.scam', fallback: 'Scam or fraud', icon: '$' },
  { value: 'underage', labelKey: 'report.category.underage', fallback: 'Underage user', icon: '<18' },
  { value: 'other', labelKey: 'report.category.other', fallback: 'Other', icon: '…' }
]

export default function ReportDialog({ userId, userName, onClose, onSuccess }) {
  const { t } = useTranslation()
  const [category, setCategory] = useState('')
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!category) {
      setError(t('report.error.category', 'Please select a category'))
      return
    }
    setSubmitting(true)
    setError('')
    try {
      await api(`/api/report/${userId}`, {
        method: 'POST',
        body: { category, reason: reason.trim() }
      })
      onSuccess?.()
      onClose?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="col" style={{ gap: 'var(--space-lg)' }}>
          <div className="col" style={{ gap: 'var(--space-sm)' }}>
            <h2 style={{ margin: 0 }}>{t('report.title', 'Report user')}</h2>
            <p className="text-muted" style={{ margin: 0 }}>
              {t('report.subtitle', 'Help us keep the community safe by reporting violations.')}
            </p>
            {userName && (
              <div className="pill secondary" aria-live="polite">
                {t('report.reporting', 'Reporting: {name}', { name: userName })}
              </div>
            )}
          </div>

          <form className="col" style={{ gap: 'var(--space-md)' }} onSubmit={handleSubmit}>
            <div className="field">
              <label>{t('report.category', 'Select a reason')}</label>
              <div className="col" style={{ gap: 'var(--space-sm)' }}>
                {REPORT_CATEGORIES.map((cat) => (
                  <label
                    key={cat.value}
                    className={`report-category ${category === cat.value ? 'selected' : ''}`}
                    onClick={() => setCategory(cat.value)}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={cat.value}
                      checked={category === cat.value}
                      onChange={(e) => setCategory(e.target.value)}
                    />
                    <span className="report-category-icon" aria-hidden="true">{cat.icon}</span>
                    <span className="report-category-label">
                      {t(cat.labelKey, cat.fallback)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div className="field">
              <label htmlFor="report-reason">{t('report.details', 'Additional details (optional)')}</label>
              <textarea
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={t('report.detailsPlaceholder', 'Provide any additional context...')}
                rows={4}
                maxLength={500}
              />
              <small className="text-muted">{reason.length}/500</small>
            </div>

            {error && (
              <div className="pill" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                {error}
              </div>
            )}

            <div className="row" style={{ gap: 'var(--space-md)' }}>
              <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button type="submit" className="btn" disabled={submitting || !category}>
                {submitting ? t('report.submitting', 'Submitting...') : t('report.submit', 'Submit report')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
