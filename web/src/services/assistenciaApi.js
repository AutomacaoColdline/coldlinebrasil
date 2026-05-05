import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const http = axios.create({ baseURL: `${BASE_URL}/api` })

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('coldline_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('coldline_token')
      localStorage.removeItem('coldline_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Work Orders ──────────────────────────────────────────────────────────────

export const workOrderApi = {
  search: (params) => http.get('/WorkOrder/search', { params }),
  getAll: (params) => http.get('/WorkOrder', { params }),
  getById: (id) => http.get(`/WorkOrder/${id}`),
  create: (data) => http.post('/WorkOrder', data),
  update: (id, data) => http.put(`/WorkOrder/${id}`, data),
  delete: (id) => http.delete(`/WorkOrder/${id}`),

  assignTechnician: (id, data) => http.post(`/WorkOrder/${id}/assign`, data),
  removeTechnician: (id, techId) => http.delete(`/WorkOrder/${id}/technician/${techId}`),
  updateStatus: (id, status) => http.patch(`/WorkOrder/${id}/status`, { status }),

  checkIn: (id, coords) => http.post(`/WorkOrder/${id}/checkin`, coords),
  checkOut: (id, coords) => http.post(`/WorkOrder/${id}/checkout`, coords),

  updateReport: (id, report) => http.patch(`/WorkOrder/${id}/report`, report),

  uploadImage: (id, file, annotation = '') => {
    const fd = new FormData()
    fd.append('file', file)
    if (annotation) fd.append('annotation', annotation)
    return http.post(`/WorkOrder/${id}/images`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteImage: (id, imageId) => http.delete(`/WorkOrder/${id}/images/${imageId}`),
  updateImageAnnotation: (id, imageId, annotation) =>
    http.patch(`/WorkOrder/${id}/images/${imageId}/annotation`, { annotation }),
}

// ── Clients ──────────────────────────────────────────────────────────────────

export const clientApi = {
  search: (params) => http.get('/Client/search', { params }),
  getAll: () => http.get('/Client'),
  getById: (id) => http.get(`/Client/${id}`),
  lookupCNPJ: (cnpjNumbers) => http.get(`/Client/cnpj/${cnpjNumbers}`),
  create: (data) => http.post('/Client', data),
  update: (id, data) => http.put(`/Client/${id}`, data),
  delete: (id) => http.delete(`/Client/${id}`),
}
