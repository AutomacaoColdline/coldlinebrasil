import axios from 'axios'
import { clearStoredAuth, getStoredToken, redirectToLogin } from '../utils/authStorage'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const http = axios.create({ baseURL: `${BASE_URL}/api` })

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

export const atendimentoApi = {
  // Listagem e busca
  search: (params) => http.get('/Atendimento/search', { params }),
  getAll: (params) => http.get('/Atendimento', { params }),
  getById: (id) => http.get(`/Atendimento/${id}`),
  create: (data) => http.post('/Atendimento', data),
  update: (id, data) => http.put(`/Atendimento/${id}`, data),
  delete: (id) => http.delete(`/Atendimento/${id}`),

  // Status e atribuição
  updateStatus: (id, status, notes) => http.patch(`/Atendimento/${id}/status`, { status, notes }),
  assignTechnician: (id, data) => http.post(`/Atendimento/${id}/assign`, data),

  // Diagnóstico
  updateDiagnosis: (id, data) => http.patch(`/Atendimento/${id}/diagnosis`, data),

  // Tags
  updateTags: (id, tags) => http.patch(`/Atendimento/${id}/tags`, { tags }),
  listAvailableTags: () => http.get('/Atendimento/tags'),

  // Anexos
  uploadFile: (id, file, kind = 'image', section = '') => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('kind', kind)
    if (section) fd.append('section', section)
    return http.post(`/Atendimento/${id}/files`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  deleteFile: (id, fileId, kind = 'image') =>
    http.delete(`/Atendimento/${id}/files/${fileId}`, { params: { kind } }),

  // Tempo
  startTimeLog: (id, data = {}) => http.post(`/Atendimento/${id}/time-logs/start`, data),
  stopTimeLog: (id) => http.post(`/Atendimento/${id}/time-logs/stop`),

  // Assinatura
  sign: (id, data) => http.post(`/Atendimento/${id}/sign`, data),

  // Observação
  addObservation: (id, text) => http.post(`/Atendimento/${id}/observation`, { text }),

  // Base de conhecimento
  listKnowledgeBase: () => http.get('/Atendimento/knowledge-base'),
  publishToKnowledgeBase: (id, data) => http.post(`/Atendimento/${id}/knowledge-base`, data),
  unpublishFromKnowledgeBase: (id) => http.delete(`/Atendimento/${id}/knowledge-base`),

  // Checklist
  listChecklistTemplates: () => http.get('/Atendimento/checklist-templates'),
  createChecklistTemplate: (data) => http.post('/Atendimento/checklist-templates', data),
  updateChecklistTemplate: (id, data) => http.put(`/Atendimento/checklist-templates/${id}`, data),
  deleteChecklistTemplate: (id) => http.delete(`/Atendimento/checklist-templates/${id}`),
  applyChecklistTemplate: (id, templateId) => http.post(`/Atendimento/${id}/checklist/apply`, { templateId }),
  updateChecklistItem: (id, itemId, checked) =>
    http.patch(`/Atendimento/${id}/checklist/items`, { itemId, checked }),

  // Histórico
  clientHistory: (clientId) => http.get(`/Atendimento/client/${clientId}`),
  equipmentHistory: (params) => http.get('/Atendimento/equipment-history', { params }),

  // Dashboard / Relatórios
  dashboard: () => http.get('/Atendimento/dashboard'),
  reportGeneral: (params) => http.get('/Atendimento/report/general', { params }),
  reportByClient: (clientId, params = {}) => http.get(`/Atendimento/report/client/${clientId}`, { params }),
}
