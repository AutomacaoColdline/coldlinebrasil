import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { workOrderApi, clientApi } from '../../services/assistenciaApi'
import {
  Plus, Search, ChevronLeft, ChevronRight, RefreshCw,
  ClipboardList, MapPin, User, Calendar, X,
} from 'lucide-react'

const STATUS_LABELS = {
  ABERTA:       { label: 'Aberta',       color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  CONCLUIDA:    { label: 'Concluída',    color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  CANCELADA:    { label: 'Cancelada',    color: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-white/10 text-white/40' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

function NewOSModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({
    description: '', clientId: '', address: '', allowedRadius: 1000,
  })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    clientApi.getAll().then(r => setClients(r.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleClientChange = (id) => {
    set('clientId', id)
    if (id) {
      const c = clients.find(x => x.id === id)
      if (c?.address) set('address', c.address)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.description.trim()) return
    setSaving(true)
    try {
      const r = await workOrderApi.create({
        description:   form.description,
        clientId:      form.clientId || undefined,
        address:       form.address || undefined,
        allowedRadius: Number(form.allowedRadius) || 1000,
      })
      onCreated(r.data)
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao criar OS')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-lg border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold text-sm">Nova Ordem de Serviço</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Descrição *</label>
            <textarea
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50 resize-none"
              rows={3}
              placeholder="Descreva o problema ou serviço a ser realizado..."
              value={form.description}
              onChange={e => set('description', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Cliente</label>
            <select
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
              value={form.clientId}
              onChange={e => handleClientChange(e.target.value)}
            >
              <option value="">Sem cliente</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Endereço</label>
            <input
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50"
              placeholder="Rua, número, bairro, cidade"
              value={form.address}
              onChange={e => set('address', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Raio permitido para check-in (metros)</label>
            <input
              type="number"
              min={50}
              max={50000}
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-orange-500/50"
              value={form.allowedRadius}
              onChange={e => set('allowedRadius', e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-all disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar OS'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AssistenciaOSPage() {
  const navigate = useNavigate()
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await workOrderApi.search({
        page, pageSize: 15,
        q: search || undefined,
        status: statusFilter || undefined,
      })
      setData({ ...r.data, items: r.data.items || [] })
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter])

  useEffect(() => { load() }, [load])

  const handleCreated = (os) => {
    setShowNew(false)
    navigate(`/assistencia/os/${os.id}`)
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR') : '—'

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-lg">Ordens de Serviço</h1>
          <p className="text-white/40 text-xs mt-0.5">{data.total} OS cadastradas</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
        >
          <Plus size={14} /> Nova OS
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none focus:border-orange-500/40"
            placeholder="Buscar por número, descrição, endereço ou cliente..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500/40"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
        >
          <option value="">Todos os status</option>
          <option value="ABERTA">Aberta</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="CONCLUIDA">Concluída</option>
          <option value="CANCELADA">Cancelada</option>
        </select>
        <button
          onClick={load}
          className="p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.05] rounded-lg transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={18} className="animate-spin text-white/20" />
        </div>
      ) : data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <ClipboardList size={32} className="mb-3" />
          <p className="text-sm">Nenhuma OS encontrada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map(os => (
            <button
              key={os.id}
              onClick={() => navigate(`/assistencia/os/${os.id}`)}
              className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl p-4 text-left transition-all group"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-orange-400 text-xs font-mono font-semibold">{os.osNumber}</span>
                    <StatusBadge status={os.status} />
                  </div>
                  <p className="text-white text-sm font-medium leading-snug mb-2 line-clamp-2">
                    {os.description}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/35">
                    {os.client && (
                      <span className="flex items-center gap-1">
                        <User size={10} /> {os.client.name}
                      </span>
                    )}
                    {os.address && (
                      <span className="flex items-center gap-1">
                        <MapPin size={10} /> {os.address}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar size={10} /> {fmtDate(os.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  {os.technicians?.length > 0 && (
                    <p className="text-[11px] text-white/30">
                      {os.technicians.length} técnico{os.technicians.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-white/40">{page} / {data.totalPages}</span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="p-1.5 rounded-lg text-white/30 hover:text-white hover:bg-white/[0.05] disabled:opacity-30 transition-all"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showNew && <NewOSModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
    </div>
  )
}
