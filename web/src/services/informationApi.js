import axios from 'axios'
import { clearStoredAuth, getStoredToken, redirectToLogin } from '../utils/authStorage'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const http = axios.create({ baseURL: BASE_URL })

http.interceptors.request.use((config) => {
  const token = getStoredToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearStoredAuth()
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

const base = '/api/departamento-informacao'

export const informationApi = {
  getDashboard: (params) => http.get(`${base}/dashboard`, { params }),
  uploadAttachment: (file) => {
    const formData = new FormData()
    formData.append('file', file)
    return http.post(`${base}/attachments/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },

  getDemands: (params) => http.get(`${base}/demands`, { params }),
  getDemandById: (id) => http.get(`${base}/demands/${id}`),
  createDemand: (data) => http.post(`${base}/demands`, data),
  updateDemand: (id, data) => http.put(`${base}/demands/${id}`, data),
  deleteDemand: (id) => http.delete(`${base}/demands/${id}`),

  getApprovals: (params) => http.get(`${base}/approvals`, { params }),
  createApproval: (data) => http.post(`${base}/approvals`, data),
  updateApproval: (id, data) => http.put(`${base}/approvals/${id}`, data),
  deleteApproval: (id) => http.delete(`${base}/approvals/${id}`),

  getTrainings: (params) => http.get(`${base}/trainings`, { params }),
  createTraining: (data) => http.post(`${base}/trainings`, data),
  updateTraining: (id, data) => http.put(`${base}/trainings/${id}`, data),
  deleteTraining: (id) => http.delete(`${base}/trainings/${id}`),

  getProcesses: (params) => http.get(`${base}/processes`, { params }),
  createProcess: (data) => http.post(`${base}/processes`, data),
  updateProcess: (id, data) => http.put(`${base}/processes/${id}`, data),
  deleteProcess: (id) => http.delete(`${base}/processes/${id}`),

  getDailyRoutines: (params) => http.get(`${base}/daily-routines`, { params }),
  createDailyRoutine: (data) => http.post(`${base}/daily-routines`, data),
  updateDailyRoutine: (id, data) => http.put(`${base}/daily-routines/${id}`, data),
  deleteDailyRoutine: (id) => http.delete(`${base}/daily-routines/${id}`),

  getMeetings: (params) => http.get(`${base}/meetings`, { params }),
  createMeeting: (data) => http.post(`${base}/meetings`, data),
  updateMeeting: (id, data) => http.put(`${base}/meetings/${id}`, data),
  deleteMeeting: (id) => http.delete(`${base}/meetings/${id}`),

  getDepartmentSupport: (params) => http.get(`${base}/department-support`, { params }),
  createDepartmentSupport: (data) => http.post(`${base}/department-support`, data),
  updateDepartmentSupport: (id, data) => http.put(`${base}/department-support/${id}`, data),
  deleteDepartmentSupport: (id) => http.delete(`${base}/department-support/${id}`),

  getChecklist: (weekStart) => http.get(`${base}/checklist`, { params: { weekStart } }),
  createChecklistItem: (data) => http.post(`${base}/checklist/items`, data),
  updateChecklistItem: (id, data) => http.put(`${base}/checklist/items/${id}`, data),
  deleteChecklistItem: (id) => http.delete(`${base}/checklist/items/${id}`),
  updateChecklistEntry: (id, data) => http.put(`${base}/checklist/entries/${id}`, data),

  getPositions: (orgChartId) => http.get(`${base}/positions`, { params: { orgChartId } }),
  createPosition: (data) => http.post(`${base}/positions`, data),
  updatePosition: (id, data) => http.put(`${base}/positions/${id}`, data),
  deletePosition: (id) => http.delete(`${base}/positions/${id}`),

  getOrgDepartments: (orgChartId) => http.get(`${base}/org-departments`, { params: { orgChartId } }),
  createOrgDepartment: (data) => http.post(`${base}/org-departments`, data),
  updateOrgDepartment: (id, data) => http.put(`${base}/org-departments/${id}`, data),
  deleteOrgDepartment: (id) => http.delete(`${base}/org-departments/${id}`),
  reorderOrgDepartments: (order) => http.post(`${base}/org-departments/reorder`, { order }),

  getOrgCharts: () => http.get(`${base}/org-charts`),
  getOrgChartById: (id) => http.get(`${base}/org-charts/${id}`),
  createOrgChart: (data) => http.post(`${base}/org-charts`, data),
  updateOrgChart: (id, data) => http.put(`${base}/org-charts/${id}`, data),
  deleteOrgChart: (id) => http.delete(`${base}/org-charts/${id}`),
}

export default informationApi
