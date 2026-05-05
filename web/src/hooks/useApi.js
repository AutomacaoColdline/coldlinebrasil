import { useState, useCallback } from 'react'
import { api } from '../services/api'

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

export function useContacts() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const createContact = useCallback(async (name, email, phone, message) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:4000'}/api/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message }),
      })
      return await res.json()
    } catch (err) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }, [])

  return { createContact, loading, error }
}
