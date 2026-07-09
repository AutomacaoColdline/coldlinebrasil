import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import { useAuth, GRANULAR_SERVICES, resolveModule } from '../../context/AuthContext'
import { ShieldCheck, Search, Loader2, ArrowLeft, LogOut, Users } from 'lucide-react'

const SERVICE_LABELS = {
  industria: 'Indústria',
  automation: 'Automação',
  departamento: 'Departamento',
}

function defaultGrantedServices(user) {
  const module = resolveModule(user)
  return GRANULAR_SERVICES.filter((service) => service === module)
}

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-emerald-500' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

export default function AccessControlPage() {
  const { user: currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const [items, setItems]     = useState([])
  const [q, setQ]             = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.searchUsersPaginated({ q, page: 1, pageSize: 200 })
      setItems(data?.items || [])
    } catch {
      setError('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const servicesFor = (u) => {
    const explicit = Array.isArray(u.allowedServices) ? u.allowedServices : null
    if (explicit) return explicit
    return defaultGrantedServices(u)
  }

  const toggleService = async (u, service) => {
    if (u.identificationNumber === '0001') return
    const current = servicesFor(u)
    const next = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service]

    setSavingId(u.id)
    setError('')
    try {
      await api.updateUserServices(u.id, next)
      setItems((prev) => prev.map((it) => (it.id === u.id ? { ...it, allowedServices: next } : it)))
    } catch {
      setError('Erro ao atualizar acesso')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-[#0f172a] px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={() => navigate('/home')} className="text-white/50 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm truncate">Controle de Acessos</span>
        </div>
        <div className="flex items-center gap-3">
          {currentUser && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{currentUser.name}</p>
              <p className="text-[11px] text-white/40">Admin Automação · 0001</p>
            </div>
          )}
          <button onClick={handleLogout} className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all">
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div className="p-4 sm:p-8 max-w-5xl mx-auto">
        <p className="text-sm text-slate-500 mb-6">
          Libere ou revogue o acesso de cada usuário às abas Indústria, Automação e Departamento.
          Usuários sem nenhuma permissão marcada mantêm apenas o acesso padrão do próprio departamento.
        </p>

        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou identificação..."
            className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-3 px-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Usuário</th>
                    {GRANULAR_SERVICES.map((service) => (
                      <th key={service} className="py-3 px-5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        {SERVICE_LABELS[service]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {items.map((u) => {
                    const isSuper = u.identificationNumber === '0001'
                    const granted = servicesFor(u)
                    return (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-5">
                          <p className="text-sm font-medium text-slate-800">{u.name}</p>
                          <p className="text-xs text-slate-400">
                            {u.identificationNumber ? `#${u.identificationNumber} · ` : ''}
                            {u.department?.name || u.userType?.name || '—'}
                          </p>
                        </td>
                        {GRANULAR_SERVICES.map((service) => (
                          <td key={service} className="py-3 px-5 text-center">
                            {isSuper ? (
                              <span className="text-xs text-slate-300">Acesso total</span>
                            ) : (
                              <div className="flex justify-center">
                                <Toggle
                                  checked={granted.includes(service)}
                                  disabled={savingId === u.id}
                                  onChange={() => toggleService(u, service)}
                                />
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
