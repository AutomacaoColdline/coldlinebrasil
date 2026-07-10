import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tvApi } from '../services/tvApi'
import { Snowflake, Loader2, Tv } from 'lucide-react'

export default function TVLoginPage() {
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('coldline_tv_token')
    if (token) {
      navigate('/industria/tv', { replace: true })
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const { data } = await tvApi.tvLogin('9999')
        if (cancelled) return
        localStorage.setItem('coldline_tv_token', data.token)
        navigate('/industria/tv', { replace: true })
      } catch {
        if (!cancelled) navigate('/login', { replace: true })
      }
    })()

    return () => { cancelled = true }
  }, [navigate])

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-10 gap-3">
          <div className="w-14 h-14 bg-brand-mid rounded-2xl flex items-center justify-center">
            <Snowflake size={26} className="text-white" />
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-xl">Coldline Brasil</p>
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <Tv size={13} className="text-white/40" />
              <p className="text-white/40 text-sm">Acesso Modo TV</p>
            </div>
          </div>
        </div>

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 flex flex-col items-center gap-4">
          <Loader2 size={24} className="animate-spin text-brand-mid" />
          <p className="text-white/40 text-sm">Conectando ao Modo TV...</p>
        </div>
      </div>
    </div>
  )
}
