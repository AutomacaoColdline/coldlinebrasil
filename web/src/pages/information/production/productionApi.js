import axios from 'axios'
import { clearStoredAuth, getStoredToken, redirectToLogin } from '../../../utils/authStorage'

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

const base = '/api/departamento-informacao/producao'

export const productionApi = {
  getModels: () => http.get(`${base}/models`),
  getModelById: (modelId) => http.get(`${base}/models/${modelId}`),
  getModelBom: (modelId) => http.get(`${base}/models/${modelId}/bom`),
  createModelBomItem: (modelId, data) => http.post(`${base}/models/${modelId}/bom`, data),
  exportModelBom: (modelId) => http.get(`${base}/models/${modelId}/bom/export`, { responseType: 'blob' }),
  importModelBom: (modelId, file) => {
    const form = new FormData()
    form.append('file', file)
    return http.post(`${base}/models/${modelId}/bom/import`, form)
  },

  getBuilds: (modelId) => http.get(`${base}/models/${modelId}/builds`),
  createBuild: (modelId, data) => http.post(`${base}/models/${modelId}/builds`, data),
  getBuildById: (buildId) => http.get(`${base}/builds/${buildId}`),
  updateBuild: (buildId, data) => http.put(`${base}/builds/${buildId}`, data),
  deleteBuild: (buildId) => http.delete(`${base}/builds/${buildId}`),
  getBuildBom: (buildId) => http.get(`${base}/builds/${buildId}/bom`),
  createBuildBomItem: (buildId, data) => http.post(`${base}/builds/${buildId}/bom`, data),
  exportBuildBom: (buildId) => http.get(`${base}/builds/${buildId}/bom/export`, { responseType: 'blob' }),
  importBuildBom: (buildId, file) => {
    const form = new FormData()
    form.append('file', file)
    return http.post(`${base}/builds/${buildId}/bom/import`, form)
  },

  updateBomItem: (id, data) => http.put(`${base}/bom/${id}`, data),
  deleteBomItem: (id) => http.delete(`${base}/bom/${id}`),

  getDashboard: () => http.get(`${base}/dashboard`),

  searchParts: (q) => http.get(`${base}/parts/search`, { params: { q } }),
  createPart: (data) => http.post(`${base}/parts`, data),
  updatePart: (id, data) => http.put(`${base}/parts/${id}`, data),
}

export default productionApi
