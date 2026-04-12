import { createContext, useState, useEffect, useCallback } from 'react'
import { apiClient } from '../services/api'

export const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      apiClient.setToken(token)
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const login = useCallback(async (email, password) => {
    try {
      const response = await apiClient.login(email, password)
      apiClient.setToken(response.token)
      setUser(response.user)
      setIsAuthenticated(true)
      return response
    } catch (error) {
      throw error
    }
  }, [])

  const signup = useCallback(async (name, email, password) => {
    try {
      const response = await apiClient.signup(name, email, password)
      return response
    } catch (error) {
      throw error
    }
  }, [])

  const logout = useCallback(() => {
    apiClient.clearToken()
    setUser(null)
    setIsAuthenticated(false)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        loading,
        login,
        signup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
