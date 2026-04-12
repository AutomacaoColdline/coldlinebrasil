const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

class APIClient {
  constructor() {
    this.token = localStorage.getItem('token') || null
  }

  setToken(token) {
    this.token = token
    localStorage.setItem('token', token)
  }

  clearToken() {
    this.token = null
    localStorage.removeItem('token')
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (response.status === 401) {
      this.clearToken()
      window.location.href = '/login'
      return
    }

    let data
    try {
      data = await response.json()
    } catch {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      return {}
    }

    if (!response.ok) {
      throw new Error(data.error || `HTTP ${response.status}`)
    }

    return data
  }

  // ============ AUTH ============
  login(email, password) {
    return this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  // ============ DASHBOARD ============
  getDashboard() {
    return this.request('/api/dashboard')
  }

  // ============ SERVICES ============
  getServices() {
    return this.request('/api/services')
  }

  getService(id) {
    return this.request(`/api/services/${id}`)
  }

  createService(name, description, icon) {
    return this.request('/api/services', {
      method: 'POST',
      body: JSON.stringify({ name, description, icon }),
    })
  }

  updateService(id, name, description, icon) {
    return this.request(`/api/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description, icon }),
    })
  }

  deleteService(id) {
    return this.request(`/api/services/${id}`, {
      method: 'DELETE',
    })
  }

  // ============ CONTACTS ============
  createContact(name, email, phone, message) {
    return this.request('/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ name, email, phone, message }),
    })
  }

  getContacts() {
    return this.request('/api/contacts')
  }

  // ============ HEALTH ============
  health() {
    return this.request('/api/health')
  }
}

export const apiClient = new APIClient()
