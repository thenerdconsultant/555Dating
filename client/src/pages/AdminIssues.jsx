import { useEffect, useState } from 'react'
import { api } from '../api'

export default function AdminIssues() {
  const [issues, setIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const data = await api('/api/admin/issues')
      setIssues(Array.isArray(data) ? data : [])
    } catch (e) {
      setError(e.message || 'Failed to load issues')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="col" style={{ gap: 12 }}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>Issue reports</h3>
        <button className="btn secondary" onClick={load} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>
      {error && <div className="pill" style={{ color: '#ff8b8b' }}>{error}</div>}
      {loading ? (
        <div className="pill secondary">Loading...</div>
      ) : issues.length === 0 ? (
        <div className="text-muted">No issues reported yet.</div>
      ) : (
        <div className="col" style={{ gap: 12 }}>
          {issues.map(issue => (
            <div key={issue.id} className="col" style={{ gap: 6, borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
              <div className="row" style={{ gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <strong>{issue.category || 'general'}</strong>
                <span className="pill secondary">{issue.status || 'open'}</span>
                {issue.userId && <span className="pill secondary">User: {issue.userId}</span>}
                {issue.email && <span className="pill secondary">{issue.email}</span>}
              </div>
              {issue.url && <small className="text-muted">{issue.url}</small>}
              <div style={{ whiteSpace: 'pre-wrap' }}>{issue.message}</div>
              <small className="text-muted">{issue.createdAt ? new Date(issue.createdAt).toLocaleString() : ''}</small>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
