import { useEffect, useRef, useState } from 'react'
import { api, me as fetchMe, assetUrl } from '../api'
import { useTranslation } from '../i18n/LanguageContext'
import { LANGUAGES, languageNameFor } from '../constants/languages'

export default function Profile({ user, setUser }){
  const hydrateProfile = (source = {}) => ({
    displayName: source.displayName || '',
    gender: source.gender || 'man',
    location: source.location || '',
    education: source.education || '',
    languages: Array.isArray(source.languages) ? source.languages : [],
    datingStatus: source.datingStatus || '',
    heightCm: source.heightCm || '',
    weightKg: source.weightKg || '',
    bodyType: source.bodyType || '',
    bio: source.bio || '',
    interestedIn: Array.isArray(source.interestedIn) ? source.interestedIn : [],
    photos: Array.isArray(source.photos) ? source.photos : []
  })
  const [form,setForm] = useState(hydrateProfile(user))
  const { t } = useTranslation()
  const [err,setErr] = useState('')
  const [saving,setSaving] = useState(false)
  const [saveNotice,setSaveNotice] = useState('')
  const [privacy,setPrivacy] = useState({ isHidden: !!user?.isHidden, pauseAccount: !!user?.isSuspended })
  const [privacySaving,setPrivacySaving] = useState(false)
  const [privacyErr,setPrivacyErr] = useState('')
  const [pushSupported,setPushSupported] = useState(false)
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY
  const [boostErr,setBoostErr] = useState('')
  const [boostLoading,setBoostLoading] = useState(false)
  const [pushState,setPushState] = useState({ enabled:false, loading:false, error:'' })
  const [tick,setTick] = useState(Date.now())
  const [photoErr,setPhotoErr] = useState('')
  const [lastSavedAt,setLastSavedAt] = useState(null)
  const noticeTimer = useRef(null)
  const [blockedUsers,setBlockedUsers] = useState([])
  const [blockedLoading,setBlockedLoading] = useState(false)
  const [blockedError,setBlockedError] = useState('')
  const [reportsHistory,setReportsHistory] = useState([])
  const [reportsLoading,setReportsLoading] = useState(false)
  const [reportsError,setReportsError] = useState('')
  const fileRef = useRef()
  const videoRef = useRef()
  const canvasRef = useRef()
  const streamRef = useRef(null)

useEffect(()=>{
    if (user) setForm(hydrateProfile(user))
  },[user])
useEffect(()=>{
    setPrivacy({ isHidden: !!user?.isHidden, pauseAccount: !!user?.isSuspended })
  },[user?.isHidden, user?.isSuspended])
  useEffect(()=>{
    if (!user?.id) return
    loadBlockedUsers()
    loadReportHistory()
  },[user?.id])
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
    return ()=>{ if (noticeTimer.current) clearTimeout(noticeTimer.current) }
  },[])
  function update(k,v){ setForm(p=>({ ...p, [k]:v })) }

  function showNotice(message) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current)
    setSaveNotice(message)
    setLastSavedAt(new Date())
    noticeTimer.current = setTimeout(()=>setSaveNotice(''), 5000)
  }

  async function loadBlockedUsers() {
    setBlockedLoading(true)
    setBlockedError('')
    try {
      const data = await api('/api/blocks')
      const sanitized = Array.isArray(data) ? data.map(item => ({
        ...item,
        photos: Array.isArray(item.photos) ? item.photos : []
      })) : []
      setBlockedUsers(sanitized)
    } catch (error) {
      setBlockedError(error.message)
    } finally {
      setBlockedLoading(false)
    }
  }

  async function loadReportHistory() {
    setReportsLoading(true)
    setReportsError('')
    try {
      const data = await api('/api/my-reports')
      setReportsHistory(Array.isArray(data) ? data : [])
    } catch (error) {
      setReportsError(error.message)
    } finally {
      setReportsLoading(false)
    }
  }

  async function unblockUser(targetId) {
    try {
      await api(`/api/block/${targetId}`, { method: 'DELETE' })
      showNotice(t('profile.blocked.unblocked', 'User unblocked'))
      loadBlockedUsers()
    } catch (error) {
      setBlockedError(error.message)
    }
  }

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
      showNotice(t('profile.saved','Profile updated'))
    } catch(e) { setErr(e.message) } finally { setSaving(false) }
  }

  async function updatePreferences(changes){
    setPrivacyErr('')
    setPrivacy(prev => ({ ...prev, ...changes }))
    setPrivacySaving(true)
    try {
      await api('/api/me/preferences', { method:'PATCH', body: changes })
      const fresh = await fetchMe()
      setUser(fresh)
      setPrivacy({ isHidden: !!fresh?.isHidden, pauseAccount: !!fresh?.isSuspended })
    } catch (e) {
      setPrivacyErr(e.message)
      setPrivacy({ isHidden: !!user?.isHidden, pauseAccount: !!user?.isSuspended })
    } finally {
      setPrivacySaving(false)
    }
  }

  async function uploadPhoto(file){
    setPhotoErr('')
    try {
      const fd = new FormData(); fd.append('photo', file)
      await api('/api/me/photo', { method:'POST', formData: fd })
      const fresh = await fetchMe(); setUser(fresh)
      showNotice(t('profile.photos.updated','Photos updated'))
    } catch (e) {
      setPhotoErr(e.message)
    }
  }

  async function removePhoto(path){
    setPhotoErr('')
    try {
      await api('/api/me/photo', { method:'DELETE', body:{ path } })
      const fresh = await fetchMe(); setUser(fresh)
      showNotice(t('profile.photos.removed','Photo removed'))
    } catch (e) {
      setPhotoErr(e.message)
    }
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
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera not supported')
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode: 'user' } })
      streamRef.current = stream
      const video = videoRef.current
      video.srcObject = stream
      const playPromise = video.play()
      if (playPromise instanceof Promise) await playPromise
    } catch (error) {
      setErr(error?.message || 'Unable to access camera')
    }
  }
  async function takeSelfie(){
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video?.videoWidth) {
      setErr('Camera not ready yet')
      return
    }
    const w = 480
    const h = Math.round((video.videoHeight/video.videoWidth)*w)
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d'); ctx.drawImage(video,0,0,w,h)
    canvas.toBlob(async (blob)=>{
      if (!blob) {
        setErr('Unable to capture image')
        return
      }
      try {
        const fd = new FormData(); fd.append('photo', blob, 'selfie.jpg')
        await api('/api/me/selfie', { method:'POST', formData: fd })
        const fresh = await fetchMe(); setUser(fresh)
      } catch (error) {
        setErr(error?.message || 'Upload failed')
      } finally {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop())
          streamRef.current = null
        }
        if (videoRef.current) videoRef.current.srcObject = null
      }
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
  const selfieStatus = user?.selfieStatus || 'none'
  const selfieMeta = getSelfieStatusMeta(selfieStatus, t)
  const safetyTips = [
    t('profile.safety.tip1','Meet in public places for your first few dates.'),
    t('profile.safety.tip2','Tell a friend where you\'re going and share your live location.'),
    t('profile.safety.tip3','Keep personal details private until you trust the person.'),
    t('profile.safety.tip4','Report and block anyone who makes you feel unsafe.')
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
        <strong>{t('profile.photos.title','Photos')}</strong>
        <div className="row" style={{gap:12, flexWrap:'wrap'}}>
          {(user.photos||[]).map((p,i)=>(
            <div key={p || i} style={{ position:'relative', width:200, maxWidth:'100%' }}>
              <img src={assetUrl(p)} className="thumb" style={{width:200, height:200, maxWidth:'100%'}} />
              <button
                type="button"
                className="btn secondary"
                style={{ position:'absolute', top:8, right:8, padding:'4px 10px', fontSize:12 }}
                onClick={()=>removePhoto(p)}
              >
                {t('profile.photos.remove','Remove')}
              </button>
            </div>
          ))}
        </div>
        <div className="col" style={{gap:6, marginTop:12}}>
          <input ref={fileRef} type="file" accept="image/*" onChange={e=>e.target.files[0]&&uploadPhoto(e.target.files[0])} />
          <small>{t('profile.photos.max', 'Max 2 photos.')}</small>
          <small style={{color:'#9aa0a6'}}>{t('profile.photos.addInfo','Square or portrait photos look best.')}</small>
        </div>
        {photoErr && <div className="pill" style={{color:'#ff8b8b'}}>{photoErr}</div>}
      </div>

      <div className="card col">
        <div className="row" style={{alignItems:'center',justifyContent:'space-between', gap:12, flexWrap:'wrap'}}>
          <div className="col" style={{ gap: 6, flex:1, minWidth:200 }}>
            <strong>{t('profile.selfie.required', 'Required selfie')}</strong>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span className={`pill ${selfieMeta.variant}`}>{selfieMeta.label}</span>
              {selfieStatus === 'rejected' && user.selfieRejectionReason && (
                <small className="text-muted">
                  {t('profile.selfie.rejectionReason','Reason: {text}', { text: user.selfieRejectionReason })}
                </small>
              )}
            </div>
            <div style={{color:'#9aa0a6', wordWrap:'break-word'}}>
              {user.selfiePath
                ? t('profile.selfie.status.submitted','Selfie on file. Re-upload to update your verification.')
                : t('profile.selfie.status.missing','Upload a clear selfie to unlock more features.')}
            </div>
          </div>
          {user.selfiePath && <img src={assetUrl(user.selfiePath)} className="thumb" style={{width:80,height:80,flexShrink:0}} alt={t('admin.selfieAlt','Member selfie')} />}
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

        <div className="card col">
          <strong>{t('profile.visibility.title','Visibility & safety')}</strong>
          <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={privacy.isHidden}
              onChange={() => updatePreferences({ isHidden: !privacy.isHidden })}
              disabled={privacySaving}
              style={{ marginTop: 4 }}
            />
            <div className="col" style={{ gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{t('profile.visibility.hide','Hide my profile')}</span>
              <span style={{ fontSize: 12, color: '#9aa0a6' }}>
                {t('profile.visibility.hideHelp','You will be hidden from discovery and matches unless a moderator reviews your account.')}
              </span>
            </div>
          </label>
          <label className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
            <input
              type="checkbox"
              checked={privacy.pauseAccount}
              onChange={() => updatePreferences({ pauseAccount: !privacy.pauseAccount })}
              disabled={privacySaving}
              style={{ marginTop: 4 }}
            />
            <div className="col" style={{ gap: 4 }}>
              <span style={{ fontWeight: 600 }}>{t('profile.visibility.pause','Pause account')}</span>
              <span style={{ fontSize: 12, color: '#9aa0a6' }}>
                {t('profile.visibility.pauseHelp','Pausing stops new matches and hides you from discovery until you resume.')}
              </span>
            </div>
          </label>
          {privacyErr && <span className="pill" style={{ color: '#ff8b8b' }}>{privacyErr}</span>}
          {privacySaving && !privacyErr && <span style={{ fontSize: 12, color: '#9aa0a6' }}>{t('profile.visibility.saving','Saving visibility preferences...')}</span>}
        </div>

        <div className="row" style={{justifyContent:'space-between',alignItems:'flex-start', flexWrap:'wrap', gap:12}}>
          <div className="col" style={{gap:6}}>
            <button className="btn secondary" onClick={useMyLocation}>{t('profile.useLocation','Use my location')}</button>
            {saveNotice && <span className="pill">{saveNotice}</span>}
            {lastSavedAt && (
              <small style={{color:'#9aa0a6'}}>
                {t('profile.lastSaved','Last saved {time}', { time: lastSavedAt.toLocaleTimeString() })}
              </small>
            )}
          </div>
          <div className="col" style={{gap:6, alignItems:'flex-end'}}>
            {err && <div className="pill" style={{color:'#ff8b8b'}}>{err}</div>}
            <button className="btn" disabled={saving} onClick={save}>
              {saving ? t('profile.saving','Saving...') : t('profile.save','Save profile')}
            </button>
          </div>
        </div>
      </div>

      <div className="card col">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center', flexWrap:'wrap'}}>
          <strong>{t('profile.blocked.title','Blocked users')}</strong>
          <button className="btn secondary" onClick={loadBlockedUsers} disabled={blockedLoading}>
            {blockedLoading ? t('common.loading','Loading...') : t('profile.blocked.refresh','Refresh')}
          </button>
        </div>
        {blockedError && <div className="pill" style={{color:'#ff8b8b'}}>{blockedError}</div>}
        {blockedLoading ? (
          <div className="pill secondary">{t('profile.blocked.loading','Fetching blocked profiles...')}</div>
        ) : blockedUsers.length ? (
          <div className="col" style={{ gap: 12 }}>
            {blockedUsers.map(block => (
              <div key={block.id || block.toId} className="row" style={{ justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
                <div className="row" style={{ gap:12, alignItems:'center', flex:1 }}>
                  <img
                    src={assetUrl((block.photos && block.photos[0]) || block.selfiePath || '')}
                    alt={block.displayName || t('profile.blocked.unknown','Deleted user')}
                    style={{ width:56, height:56, borderRadius:'50%', objectFit:'cover', border:'1px solid var(--border)' }}
                  />
                  <div className="col" style={{ gap:4 }}>
                    <div style={{ fontWeight:600 }}>{block.displayName || t('profile.blocked.unknown','Deleted user')}</div>
                    {block.createdAt && (
                      <small className="text-muted">
                        {t('profile.blocked.since','Blocked {time}', { time: formatDateTime(block.createdAt) })}
                      </small>
                    )}
                  </div>
                </div>
                <button className="btn secondary" onClick={() => unblockUser(block.toId)}>
                  {t('profile.blocked.unblock','Unblock')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted">{t('profile.blocked.empty','You have not blocked anyone yet.')}</div>
        )}
      </div>

      <div className="card col">
        <div className="row" style={{justifyContent:'space-between', alignItems:'center', flexWrap:'wrap'}}>
          <strong>{t('profile.reports.title','Your reports')}</strong>
          <button className="btn secondary" onClick={loadReportHistory} disabled={reportsLoading}>
            {reportsLoading ? t('common.loading','Loading...') : t('profile.reports.refresh','Refresh')}
          </button>
        </div>
        {reportsError && <div className="pill" style={{color:'#ff8b8b'}}>{reportsError}</div>}
        {reportsLoading ? (
          <div className="pill secondary">{t('profile.reports.loading','Loading report history...')}</div>
        ) : reportsHistory.length ? (
          <div className="col" style={{ gap:12 }}>
            {reportsHistory.map((report) => {
              const statusKey = report.status || 'pending'
              const statusVariant = statusKey === 'reviewed' ? 'success' : 'warning'
              return (
                <div key={report.id} className="col" style={{ gap:8, borderBottom:'1px solid var(--border)', paddingBottom:12 }}>
                  <div className="row" style={{ gap:8, flexWrap:'wrap', alignItems:'center' }}>
                    <div style={{ fontWeight:600 }}>
                      {report.reportedName || t('profile.reports.unknown','Deleted user')}
                    </div>
                    <span className={`pill ${statusVariant}`}>
                      {t(`profile.reports.status.${statusKey}`, statusKey)}
                    </span>
                    <span className="pill secondary">
                      {t(`report.category.${report.category}`, report.category)}
                    </span>
                    {report.action && (
                      <span className="pill secondary">
                        {t(`profile.reports.action.${report.action}`, report.action)}
                      </span>
                    )}
                  </div>
                  {report.reason && <small className="text-muted">{report.reason}</small>}
                  {report.createdAt && (
                    <small className="text-muted">
                      {t('profile.reports.submitted','Submitted {time}', { time: formatDateTime(report.createdAt) })}
                    </small>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-muted">{t('profile.reports.empty','You have not submitted any reports yet.')}</div>
        )}
      </div>

      <div className="card col">
        <strong>{t('profile.safety.title','Safety tips')}</strong>
        <ul style={{ margin:0, paddingLeft:'1.2rem', color:'#9aa0a6', lineHeight:1.5 }}>
          {safetyTips.map((tip, idx) => (
            <li key={idx}>{tip}</li>
          ))}
        </ul>
        <small className="text-muted">{t('profile.safety.learnMore','Need more advice? Visit the Community Rules for detailed guidance.')}</small>
      </div>
    </div>
  )
}

function formatDateTime(value) {
  if (!value) return ''
  try {
    return new Date(value).toLocaleString()
  } catch {
    return ''
  }
}

function getSelfieStatusMeta(status, t) {
  switch (status) {
    case 'approved':
      return { label: t('profile.selfie.status.approved', 'Verified selfie'), variant: 'success' }
    case 'pending':
      return { label: t('profile.selfie.status.pending', 'Pending review'), variant: 'warning' }
    case 'rejected':
      return { label: t('profile.selfie.status.rejected', 'Needs attention'), variant: 'error' }
    default:
      return { label: t('profile.selfie.status.none', 'No selfie on file'), variant: 'secondary' }
  }
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







