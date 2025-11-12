import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

export default function Login({ onAuthed }){
  const [email,setEmail] = useState('')
  const [password,setPassword] = useState('')
  const [err,setErr] = useState('')
  const [loading,setLoading] = useState(false)
  const nav = useNavigate()
  const { t } = useTranslation()

  async function submit(e){
    e.preventDefault(); setErr('')
    setLoading(true)
    try {
      const user = await api('/api/auth/login', { method:'POST', body:{ email, password } })
      onAuthed(user); nav('/discover')
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="col" style={{gap:16}}>
      <h2>{t('login.title','Welcome back')}</h2>
      <form className="col" onSubmit={submit}>
        <div className="field">
          <label>{t('login.email','Email')}</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        </div>
        <div className="field">
          <label>{t('login.password','Password')}</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        </div>
        <div style={{textAlign:'right', fontSize:13}}>
          <Link to="/forgot">{t('login.forgot','Forgot password?')}</Link>
        </div>
        {err && <div className="pill" style={{color:'#ff8b8b'}}>{err}</div>}
        <button className="btn" disabled={loading}>
          {loading ? t('login.submitting','Logging in...') : t('login.submit','Login')}
        </button>
      </form>
      <div>{t('login.registerPrompt','New here?')} <Link to="/register">{t('login.registerLink','Create an account')}</Link></div>
    </div>
  )
}
