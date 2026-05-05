import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { automationApi } from '../../services/automationApi'
import automationStore from '../../store/automationStore'
import { Snowflake, Hash, AlertCircle, Loader2 } from 'lucide-react'

export default function AutomationLogin() {
  const navigate = useNavigate()
  const [id, setId]       = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!id.trim()) return
    setError('')
    setLoading(true)
    try {
      const { data } = await automationApi.loginByIdentification(id.trim())
      automationStore.set({
        token: data.token,
        user:  data.user,
        identificationNumber: id.trim(),
      })
      navigate(`/automation?identificationNumber=${id.trim()}`, { replace: true })
    } catch {
      setError('Usuário não encontrado. Verifique o número de identificação.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-8">
      {/* Fundo decorativo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <Snowflake size={600} className="text-white/[0.03]" strokeWidth={0.5} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 justify-center">
          <div className="w-10 h-10 bg-cyan-500 rounded-xl flex items-center justify-center">
            <Snowflake size={20} className="text-white" />
          </div>
          <span className="font-bold text-xl text-white">Coldline Automation</span>
        </div>

        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8">
          <h2 className="text-lg font-bold text-white mb-1">Entrar</h2>
          <p className="text-sm text-white/40 mb-6">Digite seu número de identificação</p>

          {error && (
            <div className="flex items-start gap-2.5 p-3 bg-red-900/30 border border-red-500/30 rounded-xl mb-5">
              <AlertCircle size={15} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Hash size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                inputMode="numeric"
                pattern="\d*"
                value={id}
                onChange={e => setId(e.target.value)}
                placeholder="Número de identificação"
                className="w-full bg-white/10 border border-white/10 text-white placeholder-white/30 pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                autoFocus
              />
            </div>
            <button type="submit" disabled={loading || !id.trim()}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-semibold rounded-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2 text-sm">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Verificando...</> : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
