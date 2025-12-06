import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'

export default function VerifyEmail({ setUser }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // 'verifying' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setStatus('error')
      setMessage('Invalid verification link. No token provided.')
      return
    }

    async function verify() {
      try {
        const result = await api('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token })
        })

        setStatus('success')
        setMessage(result.message || 'Email verified successfully!')

        // Refresh user data to update emailVerified status
        try {
          const updatedUser = await api('/api/me')
          setUser(updatedUser)
        } catch (err) {
          console.error('Failed to refresh user data:', err)
        }

        // Redirect to profile after 2 seconds
        setTimeout(() => navigate('/profile'), 2000)
      } catch (error) {
        setStatus('error')
        setMessage(error.message || 'Verification failed. The link may be invalid or expired.')
      }
    }

    verify()
  }, [searchParams, navigate, setUser])

  return (
    <div className="col" style={{ gap: 16, alignItems: 'center', padding: '40px 20px' }}>
      <div className="card col" style={{ maxWidth: 500, textAlign: 'center', gap: 16 }}>
        {status === 'verifying' && (
          <>
            <h2>Verifying Email</h2>
            <p>{message}</p>
            <div className="spinner"></div>
          </>
        )}

        {status === 'success' && (
          <>
            <h2 style={{ color: '#4caf50' }}>✓ Email Verified!</h2>
            <p>{message}</p>
            <p style={{ color: '#9aa0a6' }}>Redirecting to your profile...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <h2 style={{ color: '#ff8b8b' }}>Verification Failed</h2>
            <p>{message}</p>
            <button className="btn" onClick={() => navigate('/profile')}>
              Go to Profile
            </button>
          </>
        )}
      </div>
    </div>
  )
}
