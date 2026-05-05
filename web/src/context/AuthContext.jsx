import { createContext, useContext, useState, useCallback } from 'react'
import { api } from '../services/api'

const AuthContext = createContext(null)

export const MODULE_PATHS = {
  admin:      '/home',
  industria:  '/industria',
  assistencia: '/assistencia',
  automation: '/automation',
}

function resolveModule(user) {
  if (!user) return null

  const typeId   = user?.userType?.id   || ''
  const typeName = (user?.userType?.name || '').toLowerCase()
  const deptName = (user?.department?.name || '').toLowerCase()

  const adminIds = [
    import.meta.env.VITE_USER_TYPE_ADMIN,
    import.meta.env.VITE_USER_TYPE_SETUP,
  ].filter(Boolean)

  if (adminIds.includes(typeId) ||
      typeName === 'admin' || typeName === 'setup' || typeName === 'administrador')
    return 'admin'

  const industriaId = import.meta.env.VITE_USER_TYPE_INDUSTRIA
  if (typeId === industriaId ||
      typeName.includes('industria') || typeName.includes('indústria') ||
      typeName === 'operador' ||
      deptName.includes('industria') || deptName.includes('indústria') ||
      deptName === 'operação')
    return 'industria'

  if (typeName.includes('tecnico') || typeName.includes('técnico') ||
      deptName.includes('assistencia') || deptName.includes('assistência') ||
      deptName === 'manutenção')
    return 'assistencia'

  return 'automation'
}

function readStoredUser() {
  const stored = localStorage.getItem('coldline_user')
  const token  = localStorage.getItem('coldline_token')
  if (stored && token) {
    try { return JSON.parse(stored) } catch { /* invalid */ }
  }
  return null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading]       = useState(false)

  const loginByIdentification = useCallback(async (identificationNumber) => {
    const { data } = await api.loginByIdentification(identificationNumber)
    localStorage.setItem('coldline_token', data.token)
    localStorage.setItem('coldline_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.login(email, password)
    localStorage.setItem('coldline_token', data.token)
    localStorage.setItem('coldline_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('coldline_token')
    localStorage.removeItem('coldline_user')
    setUser(null)
  }, [])

  const userModule   = resolveModule(user)
  const isAdmin      = userModule === 'admin'
  const isIndustria  = userModule === 'industria'
  const isRestricted = !!user && !isAdmin
  const modulePath   = MODULE_PATHS[userModule] || '/login'

  return (
    <AuthContext.Provider value={{
      user, loading, loginByIdentification, login, logout,
      isAdmin, isIndustria, isRestricted,
      userModule, modulePath,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
