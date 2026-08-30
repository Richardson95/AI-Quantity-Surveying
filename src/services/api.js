// ---------------------------------------------------------------------------
// The BuildQ API client — the single seam between the app and the backend.
// ---------------------------------------------------------------------------
// VITE_API_URL must be set: the app has no offline mode. Every store reads and
// writes through here, and a request made without it configured fails loudly
// rather than silently falling back to invented data.
//
// The backend lives inside the BRG Prime service at /api/buildq. In dev, Vite
// proxies /api to it (see vite.config.js) so the app and the API share an
// origin — that is what lets the refresh token stay in an httpOnly cookie
// instead of localStorage, where any XSS could read it.
//
// Error shape from the server (spec §11):
//   { "error": { "code": "string", "message": "human readable", "fields": {} } }
// ---------------------------------------------------------------------------

export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

/** True once a real backend is configured. */
export function hasApi() {
  return Boolean(API_BASE)
}

const TOKEN_KEY = 'buildq.token'

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || ''
  } catch {
    return ''
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable — the token stays in memory for this page only */
  }
}

/** An error carrying the server's code and per-field messages. */
export class ApiError extends Error {
  constructor(status, { code, message, fields } = {}) {
    super(message || 'Something went wrong.')
    this.status = status
    this.code = code || 'error'
    this.fields = fields || {}
  }
}

let refreshing = null

async function refreshOnce() {
  // Collapse concurrent 401s into a single refresh.
  if (!refreshing) {
    refreshing = (async () => {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!res.ok) return null
      const data = await res.json()
      if (data.token) setToken(data.token)
      return data.token || null
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

async function parse(res) {
  const text = await res.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function send(method, path, { body, form, retry = true } = {}) {
  if (!hasApi()) throw new ApiError(0, { code: 'no_api', message: 'No backend is configured.' })

  const headers = {}
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`

  let payload
  if (form) {
    payload = form // FormData sets its own multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
    credentials: 'include',
  })

  // An expired access token is recoverable: refresh and replay once.
  if (res.status === 401 && retry && token) {
    const fresh = await refreshOnce()
    if (fresh) return send(method, path, { body, form, retry: false })
    setToken('')
  }

  const data = await parse(res)

  if (!res.ok) {
    throw new ApiError(res.status, data?.error || { message: `Request failed (${res.status}).` })
  }
  return data
}

export const api = {
  get: (path) => send('GET', path),
  post: (path, body) => send('POST', path, { body }),
  patch: (path, body) => send('PATCH', path, { body }),
  del: (path) => send('DELETE', path),

  /** Multipart upload. `file` is a File; `fields` are extra form values. */
  upload: (path, file, fields = {}, fieldName = 'file') => {
    const form = new FormData()
    form.append(fieldName, file)
    for (const [k, v] of Object.entries(fields)) form.append(k, v)
    return send('POST', path, { form })
  },

  /**
   * Server-sent events, for the assistant. EventSource cannot POST or send an
   * Authorization header, so the stream is read off a normal fetch body.
   *
   * `onEvent` is called with each decoded `data:` payload. Resolves when the
   * stream ends. A 401 is retried once through the same refresh path as send().
   */
  sse: async (path, body, onEvent, { retry = true } = {}) => {
    if (!hasApi()) throw new ApiError(0, { code: 'no_api', message: 'No backend is configured.' })

    const headers = { 'Content-Type': 'application/json', Accept: 'text/event-stream' }
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'include',
    })

    if (res.status === 401 && retry && token) {
      const fresh = await refreshOnce()
      if (fresh) return api.sse(path, body, onEvent, { retry: false })
      setToken('')
    }

    // An error arrives as ordinary JSON, before the stream ever starts.
    if (!res.ok || !res.body) {
      const data = await parse(res)
      throw new ApiError(res.status, data?.error || { message: 'The assistant is unavailable.' })
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Frames are separated by a blank line; a partial frame stays buffered.
      let split
      while ((split = buffer.indexOf('\n\n')) !== -1) {
        const frame = buffer.slice(0, split)
        buffer = buffer.slice(split + 2)
        for (const line of frame.split('\n')) {
          if (!line.startsWith('data:')) continue
          const raw = line.slice(5).trim()
          if (!raw) continue
          try {
            onEvent(JSON.parse(raw))
          } catch {
            /* a frame we cannot read is skipped rather than killing the stream */
          }
        }
      }
    }
  },

  /** For endpoints that stream a file back rather than JSON (BOQ export). */
  download: async (path) => {
    const headers = {}
    const token = getToken()
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include' })
    if (!res.ok) {
      const data = await parse(res)
      throw new ApiError(res.status, data?.error || { message: 'Download failed.' })
    }
    return res.blob()
  },
}
