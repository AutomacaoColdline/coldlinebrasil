import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { flushSync } from 'react-dom'
import { api } from '../services/api'
import { clearStoredAuth, persistAuth, readStoredAuth } from '../utils/authStorage'

const AuthContext = createContext(null)

export const MODULE_PATHS = {
  admin:      '/home',
  industria:  '/industria',
  assistencia: '/assistencia',
  automation: '/automation',
  departamento: '/departamento-informacao',
}

// Serviços com controle granular de acesso, gerenciado pelo admin automação
// (usuário 0001) na tela /admin/acessos. "assistencia" fica de fora - segue
// o bucket único de sempre.
export const GRANULAR_SERVICES = ['industria', 'automation', 'departamento']

// Serviços que não fazem parte da navegação principal (não entram em
// resolveLandingPath), mas ainda assim são controlados por AllowedServices.
export const EXTRA_ACCESS_SERVICES = ['pesquisa']

export function resolveModule(user) {
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

// Espelha api/internal/authz.HasServiceAccess: admin sempre tem acesso;
// grants explícitos (user.allowedServices) mandam; sem grants, cai no
// módulo único de sempre (industria/automation) - "departamento" nunca é
// concedido por padrão, só quando o admin 0001 libera explicitamente.
export function hasServiceAccess(user, service) {
  if (!user) return false
  if (resolveModule(user) === 'admin') return true

  if (EXTRA_ACCESS_SERVICES.includes(service)) {
    const allowed = Array.isArray(user.allowedServices) ? user.allowedServices : null
    return allowed ? allowed.includes(service) : false
  }

  // Assistência não faz parte do controle granular (allowedServices cobre só
  // industria/automation/departamento) - continua no bucket único de sempre.
  if (!GRANULAR_SERVICES.includes(service)) return resolveModule(user) === service

  const allowed = Array.isArray(user.allowedServices) ? user.allowedServices : null
  if (allowed && allowed.length > 0) return allowed.includes(service)

  return resolveModule(user) === service
}

export function resolveLandingPath(user) {
  if (!user) return '/login'
  return '/home'
}

function readStoredUser() {
  return readStoredAuth()?.user || null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)
  const [loading]       = useState(false)

  useEffect(() => {
    const syncAuthState = () => setUser(readStoredUser())
    window.addEventListener('storage', syncAuthState)
    return () => window.removeEventListener('storage', syncAuthState)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.login(email, password)
    persistAuth(data.token, data.user)
    // flushSync: garante que o contexto reflita o usuário logado antes do
    // caller navegar - sem isso, os guards de rota (Auth/AdminOnly) podem
    // renderizar num tick anterior à atualização e mandar de volta pro login.
    flushSync(() => setUser(data.user))
    return data.user
  }, [])

  const logout = useCallback(() => {
    clearStoredAuth()
    setUser(null)
  }, [])

  const refreshUser = useCallback(() => {
    setUser(readStoredUser())
  }, [])

  const userModule   = resolveModule(user)
  const isAdmin      = userModule === 'admin'
  const isIndustria  = userModule === 'industria'
  const isRestricted = !!user && !isAdmin
  const isSuperAdmin = user?.identificationNumber === '7777'
  const modulePath   = resolveLandingPath(user)

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, refreshUser,
      isAdmin, isIndustria, isRestricted, isSuperAdmin,
      userModule, modulePath,
      hasServiceAccess: (service) => hasServiceAccess(user, service),
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
