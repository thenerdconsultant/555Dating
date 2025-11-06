import { useEffect, useRef, useState } from 'react'
import { api, me as fetchMe, assetUrl } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import { LANGUAGES, languageNameFor } from '../constants/languages'

export default function Profile({ user, setUser }){
  const [form,setForm] = useState({ ...user })
  const { t } = useTranslation()
  const [err,setErr] = useState('')
  const [saving,setSaving] = useState(false)
  const [pushSupported,setPushSupported] = useState(false)
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const [boostErr,setBoostErr] = useState('')
  const [boostLoading,setBoostLoading] = useState(false)
  const [pushState,setPushState] = useState({ enabled:false, loading:false, error:'' })
  const [tick,setTick] = useState(Date.now())
  const fileRef = useRef()
  const videoRef = useRef()
  const canvasRef = useRef()

  useEffect(()=>{
    if (user) setForm({ ...user, bio: user.bio || '' })
  },[user])
  useEffect(()=>{
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return
    let cancelled = false
    let supported = false
    try {
      supported = !!window.isSecureContext &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window
    } catch {
      supported = false
    }
    setPushSupported(supported)
    if (!supported || !navigator.serviceWorker) return
    ;(async()=>{
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (!registration) return
        const subscription = await registration.pushManager.getSubscription()
        if (!cancelled) setPushState(prev => ({ ...prev, enabled: !!subscription }))
      } catch (e) {
        if (!cancelled) setPushState(prev => ({ ...prev, error: e?.message || 'Push setup failed' }))
      }
    })()
    return ()=>{ cancelled = true }
  },[])
  useEffect(()=>{
    const id = setInterval(()=>setTick(Date.now()), 60_000)
    return ()=>clearInterval(id)
  },[])
  useEffect(()=>{
    const id = setInterval(()=>setTick(Date.now()), 60_000)
    return ()=>clearInterval(id)
  },[])

  function update(k,v){ setForm(p=>({ ...p, [k]:v })) }

  async function save(){
    setErr(''); setSaving(true)
    try {
      const payload = {
        displayName: form.displayName,
        gender: form.gender || 'man',
        location: form.location || '',
        education: form.education || '',
        languages: Array.isArray(form.languages)? form.languages.filter(Boolean) : [],
        datingStatus: form.datingStatus || '',
        heightCm: form.heightCm? Number(form.heightCm): null,
        weightKg: form.weightKg? Number(form.weightKg): null,
        bodyType: form.bodyType || '',
        bio: form.bio ? form.bio.trim() : '',
        interestedIn: Array.isArray(form.interestedIn)? form.interestedIn.filter(k=> form.gender==='man' ? k!=='man' : true) : []
      }
      await api('/api/me', { method:'PUT', body: payload })
      const fresh = await fetchMe(); setUser(fresh)
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function uploadPhoto(file){
    const fd = new FormData(); fd.append('photo', file)
    await api('/api/me/photo', { method:'POST', formData: fd })
    const fresh = await fetchMe(); setUser(fresh)
  }

  async function startBoost(){
    setBoostErr('')
    setBoostLoading(true)
    try {
      const res = await api('/api/me/boost', { method:'POST' })
      setUser(prev => prev ? ({ ...prev, boostUntil: res.boostUntil }) : prev)
    } catch(e){
      setBoostErr(e.message)
    } finally {
      setBoostLoading(false)
    }
  }

  async function ensureServiceWorker(){
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
      throw new Error('Service workers not supported')
    }
    let registration = await navigator.serviceWorker.getRegistration()
    if (!registration) registration = await navigator.serviceWorker.register('/sw.js')
    return registration
  }

  async function enablePush(){
    if (!pushSupported) return
    setPushState(prev => ({ ...prev, loading:true, error:'' }))
    try {
      if (!('Notification' in window)) throw new Error('Notifications not available')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') throw new Error('Permission denied')
      if (!vapidKey) throw new Error('Missing VAPID public key')
      const registration = await ensureServiceWorker()
      const existing = await registration.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })
      await api('/api/push/subscribe', { method:'POST', body: subscription })
      setPushState({ enabled:true, loading:false, error:'' })
    } catch(e){
      setPushState({ enabled:false, loading:false, error:e.message })
    }
  }

  async function disablePush(){
    if (!pushSupported) return
    if (typeof navigator === 'undefined' || !navigator.serviceWorker) {
      setPushState(prev => ({ ...prev, error: 'Service workers not supported' }))
      return
    }
    setPushState(prev => ({ ...prev, loading:true, error:'' }))
    try {
      const registration = await navigator.serviceWorker.getRegistration()
      if (registration) {
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await api('/api/push/unsubscribe', { method:'POST', body:{ endpoint: subscription.endpoint } })
          await subscription.unsubscribe()
        }
      }
      setPushState({ enabled:false, loading:false, error:'' })
    } catch(e){
      setPushState(prev => ({ ...prev, loading:false, error:e.message }))
    }
  }

  async function startCamera(){
    const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode: 'user' } })
    videoRef.current.srcObject = stream
    videoRef.current.play()
  }
  async function takeSelfie(){
    const video = videoRef.current; const canvas = canvasRef.current
    const w = 480; const h = Math.round((video.videoHeight/video.videoWidth)*w)
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d'); ctx.drawImage(video,0,0,w,h)
    canvas.toBlob(async (blob)=>{
      const fd = new FormData(); fd.append('photo', blob, 'selfie.jpg')
      await api('/api/me/selfie', { method:'POST', formData: fd })
      const fresh = await fetchMe(); setUser(fresh)
    }, 'image/jpeg', 0.9)
  }

  async function useMyLocation(){
    if (!('geolocation' in navigator)) return setErr(t('profile.location.unsupported','Geolocation not supported'))
    navigator.geolocation.getCurrentPosition(async (pos)=>{
      try {
        await api('/api/me/location', { method:'POST', body:{ lat: pos.coords.latitude, lng: pos.coords.longitude } })
        const fresh = await fetchMe(); setUser(fresh)
      } catch(e){ setErr(e.message) }
    }, (e)=> setErr(e.message), { enableHighAccuracy: true, timeout: 10000 })
  }

  const boostUntil = Number(user?.boostUntil || 0)
  const boostActive = boostUntil > tick
  const boostRemainingMs = boostActive ? boostUntil - tick : 0

  const cities = ['Bangkok','Chiang Mai','Pattaya','Phuket','Udon Thani','Khon Kaen','Nakhon Ratchasima','Hua Hin','Rayong','Samut Prakan','Nonthaburi','Pathum Thani']
  const educationOptions = [
    { value: 'High school', key: 'profile.education.highSchool' },
    { value: 'Trade/Technical', key: 'profile.education.trade' },
    { value: 'Associate', key: 'profile.education.associate' },
    { value: 'Bachelor', key: 'profile.education.bachelor' },
    { value: 'Master', key: 'profile.education.master' },
    { value: 'Doctorate', key: 'profile.education.doctorate' },
    { value: 'Other', key: 'profile.education.other' }
  ]
  const statusOptions = [
    { value: 'Single', key: 'profile.status.single' },
    { value: 'Divorced', key: 'profile.status.divorced' },
    { value: 'Separated', key: 'profile.status.separated' },
    { value: 'Widowed', key: 'profile.status.widowed' },
    { value: 'In a relationship', key: 'profile.status.relationship' },
    { value: 'Open relationship', key: 'profile.status.open' },
    { value: "It's complicated", key: 'profile.status.complicated' }
  ]
  const languages = LANGUAGES.map(l => l.name)
  const genderOptions = [
    { key: 'woman', labelKey: 'common.gender.woman', fallback: 'Women' },
    { key: 'man', labelKey: 'common.gender.man', fallback: 'Men' },
    { key: 'ladyboy', labelKey: 'common.gender.ladyboy', fallback: 'Ladyboys' }
  ]

  return (
    <div className="col" style={{gap:16}}>
      <h2>{t('profile.title','Your profile')}</h2>

      <div className="card col">
        <strong>{t('profile.boost.title', 'Profile boost')}</strong>
        <span style={{color:'#9aa0a6'}}>{t('profile.boost.description', 'Promote your profile to the top of discovery for 15 minutes.')}</span>
        {boostActive && <small className="pill">{t('profile.boost.active', 'Active for {time} more', { time: formatDurationShort(boostRemainingMs) })}</small>}
        {boostErr && <div className="pill" style={{color:'#ff8b8b'}}>{boostErr}</div>}
        <button className="btn" onClick={startBoost} disabled={boostLoading || boostActive}>
          {boostActive ? t('profile.boost.running', 'Boost running') : t('profile.boost.start', 'Start 15 min boost')}
        </button>
      </div>

      <div className="card col">
        <strong>{t('profile.push.title', 'Push notifications')}</strong>
        <span style={{color:'#9aa0a6'}}>{t('profile.push.description', 'Get alerts for new matches and messages.')}</span>
        {pushState.error && <div className="pill" style={{color:'#ff8b8b'}}>{pushState.error}</div>}
        {pushSupported ? (
          <div className="row" style={{gap:10, alignItems:'center'}}>
            {pushState.enabled && <span className="pill">{t('common.enabled', 'Enabled')}</span>}
            <button className="btn secondary" onClick={pushState.enabled ? disablePush : enablePush} disabled={pushState.loading}>
              {pushState.loading ? t('profile.saving', 'Saving...') : pushState.enabled ? t('profile.push.disable', 'Disable notifications') : t('profile.push.enable', 'Enable notifications')}
            </button>
          </div>
        ) : (
          <small style={{color:'#9aa0a6'}}>{t('profile.push.unsupported', 'Push notifications are not supported in this browser.')}</small>
        )}
      </div>

      <div className="card col">
        <div className="grid">
          {(user.photos||[]).map((p,i)=>(<img key={i} src={assetUrl(p)} className="thumb"/>))}
          <div className="col">
            <input ref={fileRef} type="file" accept="image/*" onChange={e=>e.target.files[0]&&uploadPhoto(e.target.files[0])} />
            <small>{t('profile.photos.max', 'Max 2 photos.')}</small>
          </div>
        </div>
      </div>

      <div className="card col">
        <div className="row" style={{alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <strong>{t('profile.selfie.required', 'Required selfie')}</strong>
            <div style={{color:'#9aa0a6'}}>{user.selfiePath? t('profile.selfie.status.submitted','Submitted') : t('profile.selfie.status.missing','Not submitted')}</div>
          </div>
          {user.selfiePath && <img src={assetUrl(user.selfiePath)} className="thumb" style={{width:80,height:80}}/>}
        </div>
        <video ref={videoRef} style={{width:'100%',borderRadius:8}} muted playsInline></video>
        <canvas ref={canvasRef} style={{display:'none'}}></canvas>
        <div className="row">
          <button className="btn secondary" onClick={startCamera}>{t('profile.selfie.openCamera','Open Camera')}</button>
          <button className="btn" onClick={takeSelfie}>{t('profile.selfie.capture','Take Selfie')}</button>
        </div>
      </div>

      <div className="card col">
        <div className="field"><label>{t('profile.displayName','Display name')}</label><input value={form.displayName||''} onChange={e=>update('displayName',e.target.value)} /></div>

        <div className="row">
          <div className="field" style={{flex:1}}>
            <label>{t('profile.gender','Gender')}</label>
            <select value={form.gender||''} onChange={e=>update('gender',e.target.value)}>
              <option value="man">{t('common.gender.man','Man')}</option>
              <option value="woman">{t('common.gender.woman','Woman')}</option>
              <option value="ladyboy">{t('common.gender.ladyboy','Ladyboy')}</option>
            </select>
          </div>
          <div className="field" style={{flex:1}}>
            <label>{t('profile.location.quick','Quick location')}</label>
            <select onChange={e=>e.target.value && update('location', e.target.value)}>
              <option value="">{t('common.choose','Choose...')}</option>
              {cities.map(c=>(
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="field"><label>{t('profile.location','Location')}</label><input value={form.location||''} onChange={e=>update('location',e.target.value)} /></div>

        <div className="row">
          <div className="field" style={{flex:1}}>
            <label>{t('profile.education','Education')}</label>
            <select value={form.education||''} onChange={e=>update('education',e.target.value)}>
              <option value="">{t('common.choose','Choose...')}</option>
              {educationOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{t(opt.key, opt.value)}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{flex:1}}>
            <label>{t('profile.datingStatus','Dating status')}</label>
            <select value={form.datingStatus||''} onChange={e=>update('datingStatus',e.target.value)}>
              <option value="">{t('common.choose','Choose...')}</option>
              {statusOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{t(opt.key, opt.value)}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="row">
          <div className="field" style={{flex:1}}>
            <label>{t('profile.languages','Languages you speak')}</label>
            <select multiple value={Array.isArray(form.languages)?form.languages: []} onChange={e=>update('languages', Array.from(e.target.selectedOptions).map(o=>o.value))}>
              {languages.map(l=> <option key={l} value={l}>{languageNameFor(l)}</option>)}
            </select>
            <small style={{color:'#9aa0a6'}}>{t('profile.languages.hint','Tip: Use Ctrl/Command to multi-select')}</small>
          </div>
          <div className="field" style={{flex:1}}>
            <label>{t('profile.bodyType','Body type')}</label>
            <select value={form.bodyType||''} onChange={e=>update('bodyType',e.target.value)}>
              <option value="">{t('common.choose','Choose...')}</option>
              <option value="skinny">{t('profile.bodyType.skinny','Skinny')}</option>
              <option value="fit">{t('profile.bodyType.fit','Fit')}</option>
              <option value="medium">{t('profile.bodyType.medium','Medium')}</option>
              <option value="curvy">{t('profile.bodyType.curvy','Curvy')}</option>
              <option value="thicc">{t('profile.bodyType.thicc','Thicc')}</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>{t('profile.interestedIn','Show me')}</label>
          <div className="row" style={{gap:12, flexWrap:'wrap'}}>
            {(form.gender==='man' ? genderOptions.filter(g=>g.key!=='man') : genderOptions).map(g => (
              <label key={g.key} className="pill" style={{cursor:'pointer'}}>
                <input
                  type="checkbox"
                  checked={Array.isArray(form.interestedIn) ? form.interestedIn.includes(g.key) : false}
                  onChange={e=>{
                    const curr = Array.isArray(form.interestedIn) ? [...form.interestedIn] : []
                    if (e.target.checked) { if (!curr.includes(g.key)) curr.push(g.key) }
                    else { const idx = curr.indexOf(g.key); if (idx>-1) curr.splice(idx,1) }
                    update('interestedIn', curr)
                  }}
                  style={{marginRight:8}}
                />
                {t(g.labelKey, g.fallback)}
              </label>
            ))}
        </div>
        <small style={{color:'#9aa0a6'}}>{t('profile.interestedIn.hint','Controls who you see in Discover')}</small>
      </div>

      <div className="field">
        <label>{t('profile.bio','Bio')}</label>
        <textarea
          value={form.bio || ''}
          onChange={e=>update('bio', e.target.value)}
          rows={4}
          placeholder={t('profile.bio.placeholder','Share a short introduction')}
          style={{resize:'vertical'}}
        />
        <small style={{color:'#9aa0a6'}}>{t('profile.bio.hint','Let others know a bit about you')}</small>
      </div>

      <div className="row">
        <div className="field" style={{flex:1}}>
            <label>{t('profile.height','Height (cm)')}</label>
            <select value={form.heightCm||''} onChange={e=>update('heightCm', e.target.value)}>
              <option value="">{t('common.choose','Choose...')}</option>
              {Array.from({length: (210-140)+1}, (_,i)=>140+i).map(h=> <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
          <div className="field" style={{flex:1}}>
            <label>{t('profile.weight','Weight (kg)')}</label>
            <select value={form.weightKg||''} onChange={e=>update('weightKg', e.target.value)}>
              <option value="">{t('common.choose','Choose...')}</option>
              {Array.from({length: (140-40)+1}, (_,i)=>40+i).map(w=> <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
        </div>

        <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
          <button className="btn secondary" onClick={useMyLocation}>{t('profile.useLocation','Use my location')}</button>
          {err && <div className="pill" style={{color:'#ff8b8b'}}>{err}</div>}
          <button className="btn" disabled={saving} onClick={save}>{saving ? t('profile.saving','Saving...') : t('profile.save','Save profile')}</button>
        </div>
      </div>
    </div>
  )
}

function formatDurationShort(ms){
  if (ms <= 0) return '0m'
  const mins = Math.ceil(ms / 60000)
  if (mins < 60) return `${mins}m`
  const hours = Math.ceil(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.ceil(hours / 24)
  return `${days}d`
}

function urlBase64ToUint8Array(base64String){
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}







