import { useState } from 'react'
import { api } from '../api'

export default function ReportIssue() {
  const [email, setEmail] = useState('')
  const [url, setUrl] = useState(typeof window !== 'undefined' ? window.location.href : '')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!message.trim()) {
      setError('Please describe the issue.')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/feedback', {
        method: 'POST',
        body: {
          email,
          url,
          category,
          message
        }
      })
      setSuccess('Thanks! Your report was submitted.')
      setMessage('')
    } catch (err) {
      setError(err.message || 'Failed to submit. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="col" style={{ gap: 12, maxWidth: 640 }}>
      <h2>Report a problem</h2>
      <p style={{ color: '#9aa0a6' }}>
        Tell us about bugs, billing issues, or anything that feels off. Include steps and the page you were on.
      </p>
      <form className="col" style={{ gap: 12 }} onSubmit={submit}>
        <div className="field">
          <label>Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="field">
          <label>Page URL</label>
          <input
            type="text"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div className="field">
          <label>Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="billing">Billing</option>
            <option value="safety">Safety/abuse</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="field">
          <label>What happened?</label>
          <textarea
            rows={5}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="Describe the issue and how to reproduce it..."
          />
        </div>
        {error && <div className="pill" style={{ color: '#ff8b8b' }}>{error}</div>}
        {success && <div className="pill" style={{ color: '#4caf50' }}>{success}</div>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
