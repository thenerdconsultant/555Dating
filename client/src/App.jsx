import { useEffect, useRef, useState } from 'react'
import { Routes, Route, Link, useNavigate } from 'react-router-dom'
import { api, me as fetchMe } from './api'
import { useTranslation } from './i18n/LanguageContext'
import Discover from './pages/Discover'
import Swipe from './pages/Swipe'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import Matches from './pages/Matches'
import Messages from './pages/Messages'
import MessagesList from './pages/MessagesList'
import Rooms from './pages/Rooms'
import LikesQueue from './pages/LikesQueue'
import MemberProfile from './pages/MemberProfile'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import GoogleCallback from './pages/GoogleCallback'
import Admin from './pages/Admin'
import Billing from './pages/Billing'
import BillingStatus from './pages/BillingStatus'
import Tos from './pages/Tos'
import CommunityRules from './pages/CommunityRules'

export default function App(){
  const [user,setUser] = useState(null)
  const [loading,setLoading] = useState(true)
  const [resumeLoading,setResumeLoading] = useState(false)
  const [resumeError,setResumeError] = useState('')
  const nav = useNavigate()
  const { t, options, setLanguage, language: currentLanguage } = useTranslation()

  async function refreshUser(){
    const fresh = await fetchMe()
    setUser(fresh)
    return fresh
  }

  useEffect(()=>{(async()=>{
    try { await refreshUser() }
    catch {}
    finally { setLoading(false) }
  })()},[])
  useEffect(()=>{
    if (!user?.isSuspended) setResumeError('')
  },[user?.isSuspended])

  async function logout(){
    await api('/api/auth/logout', { method:'POST' })
    setUser(null)
    nav('/login')
  }

  async function resumeAccount(){
    setResumeError('')
    setResumeLoading(true)
    try {
      await api('/api/me/preferences', { method:'PATCH', body: { pauseAccount: false } })
      await refreshUser()
    } catch (e) {
      setResumeError(e.message)
    } finally {
      setResumeLoading(false)
    }
  }

  if (loading) return <div className="container">{t('common.loading','Loading...')}</div>

  return (
    <div className="container">
      <header className="toolbar">
        <Link to="/" style={{fontWeight:700, fontSize: '1.125rem', whiteSpace: 'nowrap'}}>{t('app.title','555Dating')}</Link>
        <div className="row" style={{alignItems:'center', gap:'var(--space-sm)', position:'relative', flex: 1, justifyContent: 'flex-end'}}>
          {user && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-xs)', flexWrap: 'wrap' }}>
              <span className="pill">{user.displayName}</span>
              {user.roles?.moderator && (
                <span className="pill" style={{
                  background: 'var(--accent-light)',
                  color: 'var(--accent)',
                  borderColor: 'var(--accent)',
                  fontWeight: 600,
                  fontSize: '0.75rem'
                }}>
                  🛡️ MOD
                </span>
              )}
            </div>
          )}
          <SettingsMenu
            t={t}
            hasUser={!!user}
            onLogout={logout}
            options={options}
            currentLanguage={currentLanguage}
            onLanguageChange={setLanguage}
          />
        </div>
      </header>

      {user?.isSuspended && (
        <SuspendedBanner
          t={t}
          loading={resumeLoading}
          error={resumeError}
          onResume={resumeAccount}
        />
      )}

      <Routes>
        <Route path="/tos" element={<Tos />} />
        <Route path="/community-rules" element={<CommunityRules />} />
        <Route path="/auth/google/callback" element={<GoogleCallback onAuthed={setUser} onRefreshUser={refreshUser} />} />
        {!user ? (
          <>
            <Route path="/login" element={<Login onAuthed={setUser} />} />
            <Route path="/register" element={<Register onAuthed={setUser} />} />
            <Route path="/forgot" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="*" element={<Login onAuthed={setUser} />} />
          </>
        ) : (
          <>
            <Route index element={<Swipe user={user} onUpdateUser={setUser} />} />
            <Route path="/swipe" element={<Swipe user={user} onUpdateUser={setUser} />} />
            <Route path="/discover" element={<Discover user={user} />} />
            <Route path="/profile" element={<Profile user={user} setUser={setUser} />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/likes" element={<LikesQueue user={user} />} />
            <Route path="/messages" element={<MessagesList user={user} />} />
            <Route path="/messages/:userId" element={<Messages user={user} />} />
            <Route path="/members/:userId" element={<MemberProfile viewer={user} />} />
            <Route path="/rooms" element={<Rooms user={user} />} />
            <Route path="/billing" element={<Billing user={user} />} />
            <Route path="/billing/success" element={<BillingStatus variant="success" onRefreshUser={refreshUser} />} />
            <Route path="/billing/cancel" element={<BillingStatus variant="cancel" onRefreshUser={refreshUser} />} />
            <Route path="/admin" element={<Admin user={user} onRefreshUser={refreshUser} />} />
            <Route path="*" element={<Discover user={user} />} />
          </>
        )}
      </Routes>

      {user && (
        <nav className="nav">
          <Link to="/swipe">{t('nav.swipe','Swipe')}</Link>
          <Link to="/discover">{t('nav.discover','Discover')}</Link>
          <Link to="/matches">{t('nav.matches','Matches')}</Link>
          {user.canSeeLikedMe && <Link to="/likes">{t('nav.likes','Liked Me')}</Link>}
          <Link to="/rooms">{t('nav.rooms','Rooms')}</Link>
          <Link to="/messages">{t('nav.messages','Messages')}</Link>
          {user.gender === 'man' && <Link to="/billing">{t('nav.subscription','Subscription')}</Link>}
          {user.roles?.moderator && <Link to="/admin">{t('nav.admin','Admin')}</Link>}
          <Link to="/profile">{t('nav.profile','Profile')}</Link>
        </nav>
      )}

      <FooterLinks t={t} />
    </div>
  )
}

function SettingsMenu({ t, hasUser, onLogout, options, currentLanguage, onLanguageChange }) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(()=>{
    if (!open) return
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', handleClick)
    return () => window.removeEventListener('mousedown', handleClick)
  },[open])

  return (
    <div ref={menuRef} style={{ position:'relative' }}>
      <button
        className="btn secondary settings-btn"
        style={{display:'flex', alignItems:'center', gap:6, padding: 'var(--space-sm) var(--space-md)'}}
        onClick={()=>setOpen(o=>!o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('nav.settings','Settings')}
      >
        <span aria-hidden="true" style={{fontSize:16}}>⚙</span>
        <span className="settings-text">{t('nav.settings','Settings')}</span>
      </button>
      {open && (
        <div
          className="settings-menu"
          style={{
            position:'absolute',
            right:0,
            top:'110%',
            background:'#1f1f1f',
            border:'1px solid #333',
            borderRadius:8,
            padding:12,
            width:220,
            boxShadow:'0 8px 24px rgba(0,0,0,0.35)',
            zIndex:1001,
            display:'flex',
            flexDirection:'column',
            gap:10
          }}
        >
          <div style={{fontWeight:600}}>{t('settings.title','Settings')}</div>
          <label className="field" style={{gap:6}}>
            <span style={{fontSize:13,color:'#9aa0a6'}}>{t('settings.language','App language')}</span>
            <select
              value={currentLanguage}
              onChange={e=>onLanguageChange(e.target.value)}
            >
              {options.map(opt => (
                <option key={opt.code} value={opt.code}>{opt.label}</option>
              ))}
            </select>
          </label>
          <div className="col" style={{gap:4, fontSize:13}}>
            <Link to="/tos" onClick={()=>setOpen(false)} style={{color:'#9aa0a6'}}>
              {t('footer.tos','Terms of Service')}
            </Link>
            <Link to="/community-rules" onClick={()=>setOpen(false)} style={{color:'#9aa0a6'}}>
              {t('footer.community','Community Rules')}
            </Link>
          </div>
          {hasUser && (
            <button className="btn secondary" onClick={onLogout}>
              {t('nav.logout','Logout')}
            </button>
          )}
          <button className="btn secondary" onClick={()=>setOpen(false)}>
            {t('settings.close','Close')}
          </button>
        </div>
      )}
    </div>
  )
}

function SuspendedBanner({ t, loading, error, onResume }) {
  return (
    <div
      className="pill"
      style={{
        background:'#3b2020',
        color:'#ffd7d7',
        margin:'16px 0',
        padding:16,
        display:'flex',
        flexDirection:'column',
        gap:8
      }}
    >
      <div style={{fontWeight:600}}>{t('suspension.title','Account paused')}</div>
      <div style={{fontSize:14}}>
        {t('suspension.message','Your account is currently paused or suspended. You will not appear in discovery until you resume or contact support.')}
      </div>
      <div className="row" style={{gap:8, alignItems:'center'}}>
        <button className="btn secondary" onClick={onResume} disabled={loading}>
          {loading ? t('common.loading','Loading...') : t('suspension.resume','Resume account')}
        </button>
        {error && <span style={{color:'#ffb3b3', fontSize:13}}>{error}</span>}
      </div>
    </div>
  )
}

function FooterLinks({ t }) {
  return (
    <footer
      style={{
        marginTop:32,
        display:'flex',
        justifyContent:'center',
        gap:16,
        fontSize:13,
        color:'#9aa0a6'
      }}
    >
      <Link to="/tos" style={{color:'#9aa0a6'}}>{t('footer.tos','Terms of Service')}</Link>
      <span aria-hidden="true">•</span>
      <Link to="/community-rules" style={{color:'#9aa0a6'}}>{t('footer.community','Community Rules')}</Link>
    </footer>
  )
}

