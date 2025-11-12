import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import OnboardingWizard from '../components/OnboardingWizard'

export default function Register({ onAuthed }){
  const [form,setForm] = useState({ email:'', password:'', displayName:'', birthdate:'', gender:'man', termsAccepted:false })
  const [err,setErr] = useState('')
  const [loading,setLoading] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [registeredUser, setRegisteredUser] = useState(null)
  const nav = useNavigate()
  const { t } = useTranslation()
  function update(k,v){ setForm(p=>({ ...p, [k]:v })) }
  async function submit(e){
    e.preventDefault(); setErr('')
    if (!form.termsAccepted) {
      setErr(t('register.mustAccept','Please accept the terms to continue'))
      return
    }
    setLoading(true)
    try {
      const user = await api('/api/auth/register', { method:'POST', body: form })
      onAuthed(user)
      setRegisteredUser(user)
      setShowOnboarding(true)
    } catch (e) { setErr(e.message) }
    finally { setLoading(false) }
  }

  function handleOnboardingComplete() {
    setShowOnboarding(false)
    nav('/swipe')
  }

  function handleOnboardingSkip() {
    setShowOnboarding(false)
    nav('/profile')
  }

  if (showOnboarding && registeredUser) {
    return (
      <OnboardingWizard
        user={registeredUser}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />
    )
  }
  return (
    <div className="col" style={{gap:16}}>
      <h2>{t('register.title','Create your account')}</h2>
      <form className="col" onSubmit={submit}>
        <div className="field"><label>{t('profile.displayName','Display name')}</label>
          <input value={form.displayName} onChange={e=>update('displayName',e.target.value)} required /></div>
        <div className="field"><label>{t('login.email','Email')}</label>
          <input type="email" value={form.email} onChange={e=>update('email',e.target.value)} required /></div>
        <div className="field"><label>{t('login.password','Password')}</label>
          <input type="password" value={form.password} onChange={e=>update('password',e.target.value)} required /></div>
        <div className="row">
          <div className="field" style={{flex:1}}><label>{t('common.birthdate','Birthdate')}</label>
            <input type="date" value={form.birthdate} onChange={e=>update('birthdate',e.target.value)} required /></div>
          <div className="field" style={{flex:1}}><label>{t('profile.gender','Gender')}</label>
            <select value={form.gender} onChange={e=>update('gender',e.target.value)}>
              <option value="man">{t('common.gender.man','Man')}</option>
              <option value="woman">{t('common.gender.woman','Woman')}</option>
              <option value="ladyboy">{t('common.gender.ladyboy','Ladyboy')}</option>
            </select>
          </div>
        </div>
        <label className="row" style={{gap:8, alignItems:'flex-start'}}>
          <input
            type="checkbox"
            checked={form.termsAccepted}
            onChange={e=>update('termsAccepted', e.target.checked)}
            required
            style={{marginTop:4}}
          />
          <span style={{fontSize:13,lineHeight:1.4}}>
            {t('register.terms','I agree to the')}{' '}
            <Link to="/tos">{t('footer.tos','Terms of Service')}</Link>
            {' '}{t('register.and','and')}{' '}
            <Link to="/community-rules">{t('footer.community','Community Rules')}</Link>.
          </span>
        </label>
        {err && <div className="pill" style={{color:'#ff8b8b'}}>{err}</div>}
        <button className="btn" disabled={loading}>
          {loading ? t('register.submitting','Creating account...') : t('register.submit','Create account')}
        </button>
      </form>
      <div>{t('register.haveAccount','Already have an account?')} <Link to="/login">{t('register.loginLink','Log in')}</Link></div>
    </div>
  )
}
