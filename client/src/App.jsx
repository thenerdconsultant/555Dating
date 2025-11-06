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

export default function App(){
  const [user,setUser] = useState(null)
  const [loading,setLoading] = useState(true)
  const nav = useNavigate()
  const { t, options, setLanguage, language: currentLanguage } = useTranslation()

  useEffect(()=>{(async()=>{
    try { setUser(await fetchMe()) }
    catch {}
    finally { setLoading(false) }
  })()},[])

  async function logout(){
    await api('/api/auth/logout', { method:'POST' })
    setUser(null)
    nav('/login')
  }

  if (loading) return <div className="container">{t('common.loading','Loading...')}</div>

  return (
    <div className="container">
      <header className="toolbar">
        <Link to="/" style={{fontWeight:700}}>{t('app.title','555Dating')}</Link>
        <div className="row" style={{alignItems:'center', gap:8, position:'relative'}}>
          {user && <span className="pill">{user.displayName}</span>}
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

      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<Login onAuthed={setUser}/>} />
            <Route path="/register" element={<Register onAuthed={setUser}/>} />
            <Route path="*" element={<Login onAuthed={setUser}/>} />
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
            <Route path="/messages/:userId" element={<Messages />} />
            <Route path="/members/:userId" element={<MemberProfile viewer={user} />} />
            <Route path="/rooms" element={<Rooms user={user} />} />
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
          <Link to="/profile">{t('nav.profile','Profile')}</Link>
        </nav>
      )}
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
        className="btn secondary"
        style={{display:'flex', alignItems:'center', gap:6}}
        onClick={()=>setOpen(o=>!o)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('nav.settings','Settings')}
      >
        <span aria-hidden="true" style={{fontSize:16}}>⚙</span>
        <span>{t('nav.settings','Settings')}</span>
      </button>
      {open && (
        <div
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
            zIndex:20,
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

