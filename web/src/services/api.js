import axios from 'axios'
import { clearStoredAuth, getStoredToken, redirectToLogin } from '../utils/authStorage'

// Produção: URL relativa ('') → nginx proxia /api/ → api:4000
// Dev: VITE_API_URL=http://localhost:4000 no .env.local
const BASE_URL = import.meta.env.VITE_API_URL || ''

const http = axios.create({ baseURL: BASE_URL })

http.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      clearStoredAuth()
      redirectToLogin()
    }
    return Promise.reject(err)
  }
)

export const api = {
  // Auth
  loginByIdentification: (id) => http.get(`/api/User/identification/${id}`),
  login: (email, password) => http.post('/api/User/login', { email, password }),

  // Dashboard
  getDashboard: () => http.get('/api/dashboard'),

  // Users
  getUsers: () => http.get('/api/User'),
  getUserById: (id) => http.get(`/api/User/${id}`),
  searchUsers: (q) => http.get(`/api/User/search?q=${encodeURIComponent(q)}`),
  searchUsersPaginated: (params) => http.get('/api/User/search', { params }),
  createUser: (data) => http.post('/api/User', data),
  updateUser: (id, data) => http.put(`/api/User/${id}`, data),
  deleteUser: (id) => http.delete(`/api/User/${id}`),
  updateUserServices: (id, services) => http.put(`/api/User/${id}/services`, { services }),

  // Processes
  getProcesses: (params) => http.get('/api/Process', { params }),
  searchProcesses: (params) => http.get('/api/Process/search', { params }),
  getProcessById: (id) => http.get(`/api/Process/${id}`),
  getProcessStats: () => http.get('/api/Process/stats'),
  getProcessTypeStats: (processTypeId) => http.get(`/api/Process/type-stats/${processTypeId}`),
  getProcessUserStats: (userId) => http.get(`/api/Process/user-stats/${userId}`),
  createProcess: (data) => http.post('/api/Process', data),
  updateProcess: (id, data) => http.put(`/api/Process/${id}`, data),
  deleteProcess: (id) => http.delete(`/api/Process/${id}`),
  startProcess: (data) => http.post('/api/Process/start', data),
  endProcess: (id) => http.post(`/api/Process/end/${id}`),
  updateProcessHistoryTime: (id, data) => http.patch(`/api/Process/${id}/history-time`, data),
  pauseProcess: (id, data) => http.post(`/api/Process/${id}/pause`, data),
  resumeProcess: (id) => http.post(`/api/Process/${id}/resume`),

  // Machines
  getMachines: (params) => http.get('/api/Machine', { params }),
  getMachineStats: () => http.get('/api/Machine/stats'),
  getMachineDashboard: () => http.get('/api/Machine/dashboard'),
  getMachineById: (id) => http.get(`/api/Machine/${id}`),
  getMachineDetail: (id) => http.get(`/api/Machine/${id}/detail`),
  searchMachines: (params) => http.get('/api/Machine/search', { params }),
  createMachine: (data) => http.post('/api/Machine', data),
  updateMachine: (id, data) => http.put(`/api/Machine/${id}`, data),
  deleteMachine: (id) => http.delete(`/api/Machine/${id}`),

  // Occurrences
  getOccurrences: (params) => http.get('/api/Occurrence', { params }),
  searchOccurrences: (params) => http.get('/api/Occurrence/search', { params }),
  getOccurrenceStats: () => http.get('/api/Occurrence/stats'),
  createOccurrence: (data) => http.post('/api/Occurrence', data),
  updateOccurrence: (id, data) => http.put(`/api/Occurrence/${id}`, data),
  deleteOccurrence: (id) => http.delete(`/api/Occurrence/${id}`),
  finalizeOccurrence: (id) => http.post(`/api/Occurrence/finalize/${id}`),

  // Config
  getUserTypes: () => http.get('/api/UserType'),
  createUserType: (data) => http.post('/api/UserType', data),
  updateUserType: (id, data) => http.put(`/api/UserType/${id}`, data),
  deleteUserType: (id) => http.delete(`/api/UserType/${id}`),

  getDepartments: () => http.get('/api/Department'),
  createDepartment: (data) => http.post('/api/Department', data),
  updateDepartment: (id, data) => http.put(`/api/Department/${id}`, data),
  deleteDepartment: (id) => http.delete(`/api/Department/${id}`),

  getProcessTypes: () => http.get('/api/ProcessType'),
  createProcessType: (data) => http.post('/api/ProcessType', data),
  updateProcessType: (id, data) => http.put(`/api/ProcessType/${id}`, data),
  deleteProcessType: (id) => http.delete(`/api/ProcessType/${id}`),

  getOccurrenceTypes: () => http.get('/api/OccurrenceType'),
  createOccurrenceType: (data) => http.post('/api/OccurrenceType', data),
  updateOccurrenceType: (id, data) => http.put(`/api/OccurrenceType/${id}`, data),
  deleteOccurrenceType: (id) => http.delete(`/api/OccurrenceType/${id}`),

  getMachineTypes: () => http.get('/api/MachineType'),
  createMachineType: (data) => http.post('/api/MachineType', data),
  updateMachineType: (id, data) => http.put(`/api/MachineType/${id}`, data),
  deleteMachineType: (id) => http.delete(`/api/MachineType/${id}`),
}

export default api
