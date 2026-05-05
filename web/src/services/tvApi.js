import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const tvHttp = axios.create({ baseURL: BASE_URL })

tvHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('coldline_tv_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

tvHttp.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('coldline_tv_token')
      window.location.href = '/industria/tv/login'
    }
    return Promise.reject(err)
  }
)

export const tvApi = {
  tvLogin: (identificationNumber) =>
    tvHttp.get(`/api/User/tv-identification/${identificationNumber}`),

  searchUsersPaginated: (params) =>
    tvHttp.get('/api/User/search', { params }),

  getMachines: () =>
    tvHttp.get('/api/Machine'),

  getDashboard: () =>
    tvHttp.get('/api/dashboard'),

  getProcessUserStats: (userId) =>
    tvHttp.get(`/api/Process/user-stats/${userId}`),
}
