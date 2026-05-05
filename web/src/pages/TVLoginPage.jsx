import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { tvApi } from '../services/tvApi'
import { Snowflake, Hash, AlertCircle, Loader2, Tv } from 'lucide-react'

export default function TVLoginPage() {
  const navigate = useNavigate()
  const [identification, setIdentification] = useState('')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('coldline_tv_token')
    if (token) navigate('/industria/tv', { replace: true })
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identification.trim()) return
    setError('')
    setLoading(true)
    try {
      const { data } = await tvApi.tvLogin(identification.trim())
      localStorage.setItem('coldline_tv_token', data.token)
      navigate('/industria/tv', { replace: true })
    } catch {
      setError('Identificação não encontrada')
    } finally {
      setLoading(false)
    }
  }

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

        <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
              <AlertCircle size={14} className="text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5">
                Número de Identificação
              </label>
              <div className="relative">
                <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  value={identification}
                  onChange={e => setIdentification(e.target.value)}
                  placeholder="Ex: 0001"
                  autoFocus
                  className="w-full pl-9 pr-4 py-2.5 bg-white/[0.06] border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-brand-mid/40 focus:border-brand-mid/50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !identification.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-mid hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all"
            >
              {loading
                ? <><Loader2 size={15} className="animate-spin" /> Verificando...</>
                : <><Tv size={15} /> Entrar no Modo TV</>
              }
            </button>
          </form>

          <p className="text-center text-xs text-white/20 pt-1">
            Token válido por 30 dias
          </p>
        </div>
      </div>
    </div>
  )
}
