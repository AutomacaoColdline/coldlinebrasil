const TOKEN_KEY = 'coldline_token'
const USER_KEY = 'coldline_user'

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
  const decoded = atob(padded)

  try {
    return decodeURIComponent(
      Array.from(decoded)
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    )
  } catch {
    return decoded
  }
}

export function parseJwtPayload(token) {
  if (!token) return null

  const parts = token.split('.')
  if (parts.length < 2) return null

  try {
    return JSON.parse(decodeBase64Url(parts[1]))
  } catch {
    return null
  }
}

export function isTokenExpired(token, nowMs = Date.now()) {
  const payload = parseJwtPayload(token)
  if (!payload?.exp) return true
  return payload.exp * 1000 <= nowMs
}

export function clearStoredAuth() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function persistAuth(token, user) {
  if (!token || !user || isTokenExpired(token)) {
    clearStoredAuth()
    return false
  }

  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return true
}

export function readStoredAuth() {
  const token = localStorage.getItem(TOKEN_KEY)
  const rawUser = localStorage.getItem(USER_KEY)

  if (!token || !rawUser) {
    if (token || rawUser) clearStoredAuth()
    return null
  }

  if (isTokenExpired(token)) {
    clearStoredAuth()
    return null
  }

  try {
    return { token, user: JSON.parse(rawUser) }
  } catch {
    clearStoredAuth()
    return null
  }
}

export function getStoredToken() {
  return readStoredAuth()?.token || null
}

export function redirectToLogin() {
  if (window.location.pathname !== '/login') {
    window.location.href = '/login'
  }
}
