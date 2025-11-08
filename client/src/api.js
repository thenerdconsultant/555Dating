const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

function buildUrl(path) {
  if (!path.startsWith('/')) path = `/${path}`
  if (!API_BASE) return path
  return `${API_BASE}${path}`
}

export function assetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  const normalized = path.startsWith('/') ? path : `/${path}`
  // In production with API_BASE set, return full backend URL
  // CORS is configured on backend to allow requests from Netlify domain
  if (!API_BASE) return normalized
  return `${API_BASE}${normalized}`
}

export async function api(path, { method='GET', body, formData }={}) {
  const opts = { method, credentials: 'include' }
  if (formData) {
    opts.body = formData
  } else if (body) {
    opts.headers = { 'Content-Type': 'application/json' }
    opts.body = JSON.stringify(body)
  }
  const res = await fetch(buildUrl(path), opts)
  if (!res.ok) {
    let msg = 'Request failed'
    try { const j = await res.json(); msg = j.error || msg } catch {}
    throw new Error(msg)
  }
  return res.json()
}

export async function me() { return api('/api/me') }
