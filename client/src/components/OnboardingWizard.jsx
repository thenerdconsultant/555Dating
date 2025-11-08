import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useTranslation } from '../i18n/LanguageContext'

const STEPS = [
  { id: 'welcome', title: 'Welcome!', icon: '👋' },
  { id: 'photos', title: 'Add Photos', icon: '📸' },
  { id: 'bio', title: 'About You', icon: '✍️' },
  { id: 'verify', title: 'Verify', icon: '✓' },
  { id: 'complete', title: 'Ready!', icon: '🎉' }
]

export default function OnboardingWizard({ user: initialUser, onComplete, onSkip }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [user, setUser] = useState(initialUser)
  const [bio, setBio] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const { t } = useTranslation()
  const nav = useNavigate()

  const refreshUser = async () => {
    try {
      const updated = await api('/api/me')
      setUser(updated)
    } catch (err) {
      // Silently fail - user will see outdated data
    }
  }

  const step = STEPS[currentStep]
  const progress = ((currentStep + 1) / STEPS.length) * 100

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
      setError('')
    } else {
      onComplete?.()
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setError('')
    }
  }

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('photo', file)

    try {
      await api('/api/me/photo', {
        method: 'POST',
        body: formData,
        isFormData: true
      })
      await refreshUser()
      nextStep()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSelfieUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    const formData = new FormData()
    formData.append('photo', file)

    try {
      await api('/api/me/selfie', {
        method: 'POST',
        body: formData,
        isFormData: true
      })
      await refreshUser()
      nextStep()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleBioSave = async () => {
    if (!bio.trim()) {
      setError('Please write a short bio')
      return
    }

    setUploading(true)
    setError('')
    try {
      await api('/api/me', {
        method: 'PUT',
        body: { bio: bio.trim() }
      })
      await refreshUser()
      nextStep()
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-container">
        {/* Progress Bar */}
        <div className="onboarding-progress-bar">
          <div
            className="onboarding-progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Step Indicators */}
        <div className="onboarding-steps">
          {STEPS.map((s, idx) => (
            <div
              key={s.id}
              className={`onboarding-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'complete' : ''}`}
            >
              <div className="onboarding-step-icon">{s.icon}</div>
              <div className="onboarding-step-title">{s.title}</div>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="onboarding-content">
          {step.id === 'welcome' && (
            <div className="onboarding-step-content">
              <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>
                {t('onboarding.welcome.title', 'Welcome to 555Dating!')}
              </h1>
              <p className="text-muted" style={{ fontSize: '1.125rem', marginBottom: 'var(--space-xl)' }}>
                {t('onboarding.welcome.subtitle', 'Let\'s set up your profile in just a few steps')}
              </p>
              <div className="onboarding-features">
                <div className="onboarding-feature">
                  <div className="onboarding-feature-icon">📸</div>
                  <div className="onboarding-feature-text">
                    <strong>Add Photos</strong>
                    <span>Show your best self</span>
                  </div>
                </div>
                <div className="onboarding-feature">
                  <div className="onboarding-feature-icon">✓</div>
                  <div className="onboarding-feature-text">
                    <strong>Get Verified</strong>
                    <span>Build trust with others</span>
                  </div>
                </div>
                <div className="onboarding-feature">
                  <div className="onboarding-feature-icon">💬</div>
                  <div className="onboarding-feature-text">
                    <strong>Start Matching</strong>
                    <span>Find your perfect match</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step.id === 'photos' && (
            <div className="onboarding-step-content">
              <h2>{t('onboarding.photos.title', 'Add Your Photos')}</h2>
              <p className="text-muted">
                {t('onboarding.photos.subtitle', 'Upload at least one photo to get started. You can add up to 2 photos.')}
              </p>
              <div className="onboarding-upload-area">
                <label className="onboarding-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <div className="onboarding-upload-icon">📸</div>
                  <div className="onboarding-upload-text">
                    {uploading ? t('common.uploading', 'Uploading...') : t('onboarding.photos.upload', 'Click to upload photo')}
                  </div>
                </label>
              </div>
              {user?.photos?.length > 0 && (
                <div className="onboarding-photo-preview">
                  <img src={`/api${user.photos[0]}`} alt="Your photo" />
                </div>
              )}
            </div>
          )}

          {step.id === 'bio' && (
            <div className="onboarding-step-content">
              <h2>{t('onboarding.bio.title', 'Tell Us About Yourself')}</h2>
              <p className="text-muted">
                {t('onboarding.bio.subtitle', 'Write a short bio that describes who you are and what you\'re looking for')}
              </p>
              <textarea
                className="onboarding-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder={t('onboarding.bio.placeholder', 'I love traveling, good food, and meeting new people...')}
                maxLength={500}
                rows={6}
              />
              <div className="text-muted" style={{ fontSize: '0.875rem', textAlign: 'right' }}>
                {bio.length}/500
              </div>
            </div>
          )}

          {step.id === 'verify' && (
            <div className="onboarding-step-content">
              <h2>{t('onboarding.verify.title', 'Verify Your Profile')}</h2>
              <p className="text-muted">
                {t('onboarding.verify.subtitle', 'Take a selfie to verify your identity and get a verified badge')}
              </p>
              <div className="onboarding-upload-area">
                <label className="onboarding-upload-label">
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={handleSelfieUpload}
                    disabled={uploading}
                    style={{ display: 'none' }}
                  />
                  <div className="onboarding-upload-icon">✓</div>
                  <div className="onboarding-upload-text">
                    {uploading ? t('common.uploading', 'Uploading...') : t('onboarding.verify.upload', 'Take a selfie')}
                  </div>
                </label>
              </div>
              <div className="onboarding-tips">
                <div className="onboarding-tip">✓ Good lighting</div>
                <div className="onboarding-tip">✓ Face clearly visible</div>
                <div className="onboarding-tip">✓ No filters</div>
              </div>
            </div>
          )}

          {step.id === 'complete' && (
            <div className="onboarding-step-content">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '4rem', marginBottom: 'var(--space-lg)' }}>🎉</div>
                <h1 style={{ fontSize: '2rem', marginBottom: 'var(--space-md)' }}>
                  {t('onboarding.complete.title', 'You\'re All Set!')}
                </h1>
                <p className="text-muted" style={{ fontSize: '1.125rem', marginBottom: 'var(--space-xl)' }}>
                  {t('onboarding.complete.subtitle', 'Your profile is ready. Start swiping to find your match!')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="pill" style={{
              background: 'var(--error-bg)',
              color: 'var(--error)',
              borderColor: 'var(--error)',
              padding: 'var(--space-md)',
              marginTop: 'var(--space-md)'
            }}>
              {error}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="onboarding-nav">
          {currentStep > 0 && currentStep < STEPS.length - 1 && (
            <button
              className="btn secondary"
              onClick={prevStep}
              disabled={uploading}
            >
              {t('common.back', 'Back')}
            </button>
          )}

          {step.id === 'welcome' && (
            <>
              <button className="btn secondary" onClick={onSkip}>
                {t('onboarding.skip', 'Skip for now')}
              </button>
              <button className="btn" onClick={nextStep}>
                {t('onboarding.getStarted', 'Get Started')}
              </button>
            </>
          )}

          {step.id === 'photos' && (
            <button
              className="btn secondary"
              onClick={nextStep}
              disabled={uploading}
            >
              {t('onboarding.skipStep', 'Skip this step')}
            </button>
          )}

          {step.id === 'bio' && (
            <button
              className="btn"
              onClick={handleBioSave}
              disabled={uploading || !bio.trim()}
            >
              {uploading ? t('common.saving', 'Saving...') : t('common.continue', 'Continue')}
            </button>
          )}

          {step.id === 'verify' && (
            <button
              className="btn secondary"
              onClick={nextStep}
              disabled={uploading}
            >
              {t('onboarding.skipStep', 'Skip this step')}
            </button>
          )}

          {step.id === 'complete' && (
            <button
              className="btn"
              onClick={() => {
                onComplete?.()
                nav('/swipe')
              }}
              style={{ width: '100%' }}
            >
              {t('onboarding.startSwiping', 'Start Swiping!')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
