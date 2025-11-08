import { useEffect, useMemo, useState } from 'react'
import { api, assetUrl } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

const TABS = ['members', 'verifications', 'reports']

export default function Admin({ user, onRefreshUser }) {
  const { t } = useTranslation()
  const isModerator = !!user?.roles?.moderator

  const [activeTab, setActiveTab] = useState('members')
  const [rows, setRows] = useState([])
  const [loadingMembers, setLoadingMembers] = useState(true)
  const [membersError, setMembersError] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const [verifications, setVerifications] = useState([])
  const [verificationsLoading, setVerificationsLoading] = useState(false)
  const [verificationsError, setVerificationsError] = useState('')

  const [reportsQueue, setReportsQueue] = useState([])
  const [reportsLoading, setReportsLoading] = useState(false)
  const [reportsError, setReportsError] = useState('')

  useEffect(() => {
    if (!isModerator) return
    loadMembers()
  }, [isModerator])

  useEffect(() => {
    if (!isModerator || !selectedId) return
    loadMemberDetail(selectedId)
  }, [isModerator, selectedId])

  useEffect(() => {
    if (!isModerator || activeTab !== 'verifications') return
    loadVerifications()
  }, [isModerator, activeTab])

  useEffect(() => {
    if (!isModerator || activeTab !== 'reports') return
    loadReports()
  }, [isModerator, activeTab])

  const selectedSummary = useMemo(
    () => rows.find((row) => row.id === selectedId),
    [rows, selectedId]
  )

  async function loadMembers() {
    setLoadingMembers(true)
    setMembersError('')
    try {
      const data = await api('/api/admin/users')
      setRows(data)
      setSelectedId((prev) => {
        if (prev && data.some((row) => row.id === prev)) return prev
        return data.length ? data[0].id : ''
      })
    } catch (error) {
      setMembersError(error.message)
    } finally {
      setLoadingMembers(false)
    }
  }

  async function loadMemberDetail(id) {
    setDetailLoading(true)
    try {
      const info = await api(`/api/users/${id}`)
      setDetail(info)
    } catch (error) {
      setDetail(null)
      setActionError(error.message)
    } finally {
      setDetailLoading(false)
    }
  }

  async function loadVerifications() {
    setVerificationsLoading(true)
    setVerificationsError('')
    try {
      const data = await api('/api/admin/verifications')
      setVerifications(data)
    } catch (error) {
      setVerificationsError(error.message)
    } finally {
      setVerificationsLoading(false)
    }
  }

  async function loadReports() {
    setReportsLoading(true)
    setReportsError('')
    try {
      const data = await api('/api/admin/reports')
      setReportsQueue(data)
    } catch (error) {
      setReportsError(error.message)
    } finally {
      setReportsLoading(false)
    }
  }

  async function handleAction(type) {
    if (!selectedSummary) return
    setActionError('')
    try {
      let updated
      if (type === 'approveSelfie') {
        updated = await api(`/api/admin/users/${selectedSummary.id}/approve-selfie`, { method: 'POST' })
      } else if (type === 'rejectSelfie') {
        const reason = window.prompt(t('admin.verifications.rejectPrompt', 'Share a short reason for rejecting this selfie'))
        if (!reason) return
        updated = await api(`/api/admin/users/${selectedSummary.id}/reject-selfie`, { method: 'POST', body: { reason } })
      } else if (type === 'toggleModerator') {
        if (selectedSummary.moderator) {
          updated = await api(`/api/admin/users/${selectedSummary.id}/moderator`, { method: 'DELETE' })
        } else {
          updated = await api(`/api/admin/users/${selectedSummary.id}/moderator`, { method: 'POST' })
        }
      } else if (type === 'toggleSubscription') {
        updated = await api(`/api/admin/users/${selectedSummary.id}/subscription`, {
          method: 'POST',
          body: { active: !selectedSummary.canSeeLikedMe }
        })
      } else if (type === 'toggleSuspend') {
        if (selectedSummary.isSuspended) {
          updated = await api(`/api/admin/users/${selectedSummary.id}/suspend`, { method: 'DELETE' })
        } else {
          updated = await api(`/api/admin/users/${selectedSummary.id}/suspend`, { method: 'POST' })
        }
      } else if (type === 'toggleHidden') {
        updated = await api(`/api/admin/users/${selectedSummary.id}/visibility`, {
          method: 'POST',
          body: { hidden: !selectedSummary.isHidden }
        })
      }

      if (updated) {
        setRows((prev) => prev.map((row) => (row.id === updated.id ? updated : row)))
        if (selectedSummary.id === user.id && typeof onRefreshUser === 'function') {
          await onRefreshUser()
        }
        loadMemberDetail(selectedSummary.id)
      }
    } catch (error) {
      setActionError(error.message)
    }
  }

  async function handleSelfieDecision(userId, decision) {
    try {
      if (decision === 'approve') {
        await api(`/api/admin/users/${userId}/approve-selfie`, { method: 'POST' })
      } else {
        const reason = window.prompt(t('admin.verifications.rejectPrompt', 'Share a short reason for rejecting this selfie'))
        if (!reason) return
        await api(`/api/admin/users/${userId}/reject-selfie`, { method: 'POST', body: { reason } })
      }
      loadVerifications()
      loadMembers()
    } catch (error) {
      setActionError(error.message)
    }
  }

  async function handleReportAction(reportId, action) {
    try {
      await api(`/api/admin/reports/${reportId}/review`, { method: 'POST', body: { action } })
      loadReports()
    } catch (error) {
      setActionError(error.message)
    }
  }

  if (!isModerator) {
    return (
      <div className="col" style={{ gap: 16 }}>
        <h2>{t('admin.title','Moderator tools')}</h2>
        <div>{t('admin.noAccess','Moderator access is required for this page.')}</div>
      </div>
    )
  }

  const selfieStatusBadge = (status) => {
    const meta = getSelfieStatusMeta(status, t)
    return <span className={`pill ${meta.variant}`}>{meta.label}</span>
  }

  return (
    <div className="col" style={{ gap: 16 }}>
      <h2>{t('admin.title','Moderator tools')}</h2>

      <div className="admin-tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            className={tab === activeTab ? 'active' : ''}
            onClick={() => setActiveTab(tab)}
          >
            {t(`admin.tab.${tab}`, tab)}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="pill" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
          {actionError}
        </div>
      )}

      {activeTab === 'members' && (
        <>
          {membersError && <div className="pill" style={{ color: '#ff8b8b' }}>{membersError}</div>}
          {loadingMembers ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
              {t('common.loading','Loading...')}
            </div>
          ) : (
            <div className="row" style={{ gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 320 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('admin.user','User')}</th>
                      <th>{t('admin.created','Created')}</th>
                      <th>{t('admin.status','Status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const isSelected = row.id === selectedId
                      return (
                        <tr
                          key={row.id}
                          className={isSelected ? 'selected' : ''}
                          onClick={() => setSelectedId(row.id)}
                        >
                          <td>
                            <div style={{ fontWeight: 600 }}>{row.displayName}</div>
                            <div className="text-muted" style={{ fontSize: 12 }}>{row.email}</div>
                          </td>
                          <td>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}</td>
                          <td style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <span className="pill secondary">
                              {row.subscription === 'active' ? t('admin.subActive','Active') : t('admin.subInactive','Inactive')}
                            </span>
                            {row.isSuspended && <span className="pill warning">{t('admin.suspended','Suspended')}</span>}
                            {row.isHidden && <span className="pill secondary">{t('admin.hidden','Hidden')}</span>}
                            {selfieStatusBadge(row.selfieStatus)}
                          </td>
                        </tr>
                      )
                    })}
                    {!rows.length && (
                      <tr>
                        <td colSpan={3} style={{ textAlign: 'center', padding: 'var(--space-lg)' }}>
                          {t('admin.empty','No members found.')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="admin-panel">
                <h3 style={{ marginTop: 0 }}>{t('admin.detailTitle','Member Details')}</h3>
                {detailLoading ? (
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    {t('common.loading','Loading...')}
                  </div>
                ) : detail && selectedSummary ? (
                  <div className="col" style={{ gap: 16 }}>
                    <div className="card">
                      <div style={{ fontSize: 20, fontWeight: 600 }}>{detail.displayName}</div>
                      <div className="text-muted">{detail.email}</div>
                      <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
                        {selfieStatusBadge(selectedSummary.selfieStatus)}
                        {selectedSummary.isModerator && <span className="pill secondary">{t('admin.moderator','Moderator')}</span>}
                        {selectedSummary.isSuspended && <span className="pill warning">{t('admin.suspended','Suspended')}</span>}
                      </div>
                      {detail.selfieRejectionReason && selectedSummary.selfieStatus === 'rejected' && (
                        <small className="text-muted">
                          {t('profile.selfie.rejectionReason','Reason: {text}', { text: detail.selfieRejectionReason })}
                        </small>
                      )}
                    </div>

                    <div className="admin-actions">
                      <AdminActionButton
                        onClick={() => handleAction('approveSelfie')}
                        label={t('admin.approveSelfie','Approve selfie')}
                        variant="success"
                      />
                      <AdminActionButton
                        onClick={() => handleAction('rejectSelfie')}
                        label={t('admin.verifications.reject','Reject selfie')}
                        variant="warning"
                      />
                      <AdminActionButton
                        onClick={() => handleAction('toggleModerator')}
                        label={selectedSummary.moderator ? t('admin.removeMod','Remove Moderator') : t('admin.makeMod','Make Moderator')}
                      />
                      <AdminActionButton
                        onClick={() => handleAction('toggleSubscription')}
                        label={selectedSummary.canSeeLikedMe ? t('admin.deactivate','Deactivate Premium') : t('admin.activate','Activate Premium')}
                      />
                      <AdminActionButton
                        onClick={() => handleAction('toggleSuspend')}
                        variant={selectedSummary.isSuspended ? 'success' : 'error'}
                        label={selectedSummary.isSuspended ? t('admin.unsuspend','Unsuspend') : t('admin.suspend','Suspend')}
                      />
                      <AdminActionButton
                        onClick={() => handleAction('toggleHidden')}
                        label={selectedSummary.isHidden ? t('admin.unhide','Unhide from Search') : t('admin.hide','Hide from Search')}
                      />
                    </div>

                    <div className="card">
                      <h4 style={{ marginTop: 0 }}>{t('admin.selfie','Verification Selfie')}</h4>
                      {detail.selfiePath ? (
                        <img src={assetUrl(detail.selfiePath)} alt={t('admin.selfieAlt','Member selfie')} className="thumb" style={{ maxWidth: 280 }} />
                      ) : (
                        <div className="text-muted">{t('admin.noSelfie','No selfie uploaded')}</div>
                      )}
                    </div>

                    <div className="card">
                      <h4 style={{ marginTop: 0 }}>{t('admin.photos','Profile Photos')}</h4>
                      {(detail.photos || []).length ? (
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                          {detail.photos.map((photo) => (
                            <img key={photo} src={assetUrl(photo)} alt={t('admin.photoAlt','Member photo')} style={{ width: 120, height: 160, objectFit: 'cover', borderRadius: 12 }} />
                          ))}
                        </div>
                      ) : (
                        <div className="text-muted">{t('admin.noPhotos','No gallery photos')}</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>
                    {t('admin.selectPrompt','Select a member to view details.')}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'verifications' && (
        <div className="col" style={{ gap: 16 }}>
          {verificationsError && <div className="pill" style={{ color: '#ff8b8b' }}>{verificationsError}</div>}
          {verificationsLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>{t('common.loading','Loading...')}</div>
          ) : verifications.length ? (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))' }}>
              {verifications.map((entry) => (
                <div key={entry.id} className="card col" style={{ gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>{entry.displayName}</div>
                  <div className="text-muted">{entry.email}</div>
                  {entry.selfiePath && (
                    <img src={assetUrl(entry.selfiePath)} alt={entry.displayName} className="thumb" style={{ maxWidth: '100%' }} />
                  )}
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn" onClick={() => handleSelfieDecision(entry.id, 'approve')}>
                      {t('admin.verifications.approve','Approve selfie')}
                    </button>
                    <button className="btn secondary" onClick={() => handleSelfieDecision(entry.id, 'reject')}>
                      {t('admin.verifications.reject','Reject selfie')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>{t('admin.verifications.empty','No pending verifications.')}</div>
          )}
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="col" style={{ gap: 16 }}>
          {reportsError && <div className="pill" style={{ color: '#ff8b8b' }}>{reportsError}</div>}
          {reportsLoading ? (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-2xl)' }}>{t('common.loading','Loading...')}</div>
          ) : reportsQueue.length ? (
            <div className="col" style={{ gap: 16 }}>
              {reportsQueue.map((report) => (
                <div key={report.id} className="card col" style={{ gap: 12 }}>
                  <div style={{ fontWeight: 600 }}>{report.reportedName || t('profile.reports.unknown','Deleted user')}</div>
                  <div className="text-muted">{t('admin.reports.reporter','Reporter')}: {report.reporterName || t('admin.reports.reporter','Reporter')}</div>
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <span className="pill secondary">{t(`report.category.${report.category}`, report.category)}</span>
                    <span className={`pill ${report.status === 'reviewed' ? 'success' : 'warning'}`}>
                      {t(`admin.reports.status.${report.status || 'pending'}`, report.status || 'pending')}
                    </span>
                    {report.action && (
                      <span className="pill secondary">
                        {t(`profile.reports.action.${report.action}`, report.action)}
                      </span>
                    )}
                  </div>
                  {report.reason && <small className="text-muted">{report.reason}</small>}
                  <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                    {['dismiss','warn','suspend','ban'].map((action) => (
                      <button
                        key={action}
                        className="btn secondary"
                        onClick={() => handleReportAction(report.id, action)}
                      >
                        {t(`admin.reports.actions.${action}`, action)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: 'var(--space-xl)' }}>{t('admin.reports.empty','No reports to review.')}</div>
          )}
        </div>
      )}
    </div>
  )
}

function AdminActionButton({ onClick, label, variant = 'secondary' }) {
  return (
    <button
      type="button"
      className={`btn ${variant === 'secondary' ? 'secondary' : ''}`}
      onClick={onClick}
      style={variant !== 'secondary' ? getVariantStyles(variant) : {}}
    >
      {label}
    </button>
  )
}

function getVariantStyles(variant) {
  const map = {
    success: { background: 'var(--success)', color: '#fff', border: 'none' },
    warning: { background: 'var(--warning)', color: '#fff', border: 'none' },
    error: { background: 'var(--error)', color: '#fff', border: 'none' }
  }
  return map[variant] || {}
}

function getSelfieStatusMeta(status, t) {
  switch (status) {
    case 'approved':
      return { label: t('profile.selfie.status.approved','Verified selfie'), variant: 'success' }
    case 'pending':
      return { label: t('profile.selfie.status.pending','Pending review'), variant: 'warning' }
    case 'rejected':
      return { label: t('profile.selfie.status.rejected','Needs attention'), variant: 'error' }
    default:
      return { label: t('profile.selfie.status.none','No selfie on file'), variant: 'secondary' }
  }
}
