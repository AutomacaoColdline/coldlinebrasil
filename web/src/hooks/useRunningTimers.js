import { useState, useEffect } from 'react'

export function useRunningTimers(processes) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [])

  const getElapsed = (userId) => {
    const proc = processes?.find(p => p.user?.id === userId && !p.finished)
    if (!proc || !proc.startDate) return null
    return Math.floor((Date.now() - new Date(proc.startDate)) / 1000)
  }

  return { getElapsed }
}

export function formatTimer(secs) {
  if (secs == null || secs < 0) return '—'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
