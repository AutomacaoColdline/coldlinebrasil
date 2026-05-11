import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const http = axios.create({ baseURL: BASE_URL })

// Usa o mesmo token principal — sem segundo login
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
  },
)

export const automationApi = {
  // Notes
  getNotes:    (params) => http.get('/api/Note/search', { params }),
  createNote:  (data)   => http.post('/api/Note', data),
  updateNote:  (id, d)  => http.put(`/api/Note/${id}`, d),
  deleteNote:  (id)     => http.delete(`/api/Note/${id}`),

  // Coldvisio Guide
  getColdvisioGuide:  ()      => http.get('/api/ColdvisioGuide'),
  saveColdvisioGuide: (steps) => http.put('/api/ColdvisioGuide', steps),

  // Users
  getUsers:     (params) => http.get('/api/User/search', { params }),
  getAllUsers:   ()       => http.get('/api/User'),
  createUser:   (data)   => http.post('/api/User', data),
  updateUser:   (id, d)  => http.put(`/api/User/${id}`, d),
  deleteUser:   (id)     => http.delete(`/api/User/${id}`),
  getUserTypes: ()       => http.get('/api/UserType'),
  getDepartments: ()     => http.get('/api/Department'),
  uploadUserImage: (oldName, newName, formData) =>
    http.post(`/api/User/upload-image?oldFileName=${encodeURIComponent(oldName)}&newFileName=${encodeURIComponent(newName)}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  // Monitoring
  getMonitorings:    (params) => http.get('/api/Monitoring/search', { params }),
  createMonitoring:  (data)   => http.post('/api/Monitoring', data),
  updateMonitoring:  (id, d)  => http.put(`/api/Monitoring/${id}`, d),
  deleteMonitoring:  (id)     => http.delete(`/api/Monitoring/${id}`),
  getMonitoringTypes: ()      => http.get('/api/Monitoring/types'),

  // Processes
  getProcesses:     (params) => http.get('/api/Process/search', { params }),
  createProcess:    (data)   => http.post('/api/Process', data),
  updateProcess:    (id, d)  => http.put(`/api/Process/${id}`, d),
  deleteProcess:    (id)     => http.delete(`/api/Process/${id}`),
  getProcessTypes:  ()       => http.get('/api/ProcessType'),
  getMonthlySummary: (userId, year, month) =>
    http.get(`/api/Process/monthly-summary/${userId}/${year}/${month}`),

  // Occurrences
  getOccurrences:     (params) => http.get('/api/Occurrence/search', { params }),
  createOccurrence:   (data)   => http.post('/api/Occurrence', data),
  updateOccurrence:   (id, d)  => http.put(`/api/Occurrence/${id}`, d),
  deleteOccurrence:   (id)     => http.delete(`/api/Occurrence/${id}`),
  getOccurrenceTypes: ()       => http.get('/api/OccurrenceType'),
}

export default automationApi
