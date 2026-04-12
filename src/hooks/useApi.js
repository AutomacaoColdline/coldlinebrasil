import { useState, useCallback } from 'react'
import { apiClient } from '../services/api'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const call = useCallback(async (fn) => {
    setLoading(true)
    setError(null)
    try {
      const result = await fn()
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { call, loading, error }
}

export function useServices() {
  const [services, setServices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const getServices = useCallback(async () => {
    setLoading(true)
    try {
      const data = await apiClient.getServices()
      setServices(data || [])
      return data
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  return { services, loading, error, getServices }
}

export function useContacts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createContact = useCallback(async (name, email, phone, message) => {
    setLoading(true)
    setError(null)
    try {
      const result = await apiClient.createContact(name, email, phone, message)
      return result
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createContact, loading, error }
}
