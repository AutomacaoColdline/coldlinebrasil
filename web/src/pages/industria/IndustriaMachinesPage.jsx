import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import {
  Cog, Loader2, RefreshCw, Plus, Search,
  Pencil, Trash2, Eye, ChevronLeft, ChevronRight, X,
} from 'lucide-react'

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS = {
  1: { label: 'Aguardando',   color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'  },
  2: { label: 'Em Processo',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'   },
  3: { label: 'Ocorrência',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  4: { label: 'Retrabalho',   color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  5: { label: 'Finalizada',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  6: { label: 'Parada',       color: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
}

const EMPTY_FORM = {
  identificationNumber: '',
  customerName:         '',
  phase:                '',
  voltage:              '',
  machineType:          null,
  status:               1,
}

// ── Machine Form Modal ────────────────────────────────────────────────────────

function MachineModal({ machine, onClose, onSaved }) {
  const editing = !!machine
  const [form, setForm] = useState(editing ? {
    identificationNumber: machine.identificationNumber || '',
    customerName:         machine.customerName         || '',
    phase:                machine.phase                || '',
    voltage:              machine.voltage              || '',
    machineType:          machine.machineType          || null,
    status:               machine.status               || 1,
  } : { ...EMPTY_FORM })
  const [types, setTypes]   = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    api.getMachineTypes()
      .then(r => setTypes(r.data || []))
      .catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const setType = (id) => {
    const t = types.find(t => t.id === id || t._id === id)
    set('machineType', t ? { id: t.id || t._id, name: t.name } : null)
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.identificationNumber.trim()) {
      setError('Código / identificação é obrigatório')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        status: Number(form.status),
      }
      if (editing) {
        await api.updateMachine(machine.id, payload)
      } else {
        await api.createMachine(payload)
      }
      onSaved()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const machineTypeId = form.machineType?.id || form.machineType?._id || ''

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold">
            {editing ? 'Editar máquina' : 'Nova máquina'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Código / Identificação *
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="Ex: MQ-001, CNC-02..."
                value={form.identificationNumber}
                onChange={e => set('identificationNumber', e.target.value)}
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Cliente / OS
              </label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                placeholder="Nome do cliente ou OS de referência"
                value={form.customerName}
                onChange={e => set('customerName', e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Fase</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.phase}
                onChange={e => set('phase', e.target.value)}
              >
                <option value="">—</option>
                <option value="Monofásico">Monofásico</option>
                <option value="Bifásico">Bifásico</option>
                <option value="Trifásico">Trifásico</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tensão</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.voltage}
                onChange={e => set('voltage', e.target.value)}
              >
                <option value="">—</option>
                <option value="110V">110V</option>
                <option value="220V">220V</option>
                <option value="380V">380V</option>
                <option value="440V">440V</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de máquina</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={machineTypeId}
                onChange={e => setType(e.target.value)}
              >
                <option value="">Sem tipo</option>
                {types.map(t => (
                  <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.status}
                onChange={e => set('status', Number(e.target.value))}
              >
                {Object.entries(STATUS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 hover:text-slate-800 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {saving ? 'Salvando…' : editing ? 'Atualizar' : 'Criar máquina'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function IndustriaMachinesPage() {
  const navigate = useNavigate()

  const [data, setData]       = useState({ items: [], total: 0, totalPages: 1 })
  const [page, setPage]       = useState(1)
  const [q, setQ]             = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'new' | machine object

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.searchMachines({
        page,
        pageSize: 12,
        q:        q.trim() || undefined,
        status:   statusFilter || undefined,
      })
      setData(r.data)
    } catch {
      setData({ items: [], total: 0, totalPages: 1 })
    } finally {
      setLoading(false)
    }
  }, [page, q, statusFilter])

  useEffect(() => { load() }, [load])

  // Auto-refresh every 30 s when no modal is open
  useEffect(() => {
    if (modal) return
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load, modal])

  const handleDelete = async (m) => {
    if (!confirm(`Excluir máquina "${m.identificationNumber || m.customerName}"?`)) return
    try {
      await api.deleteMachine(m.id)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao excluir')
    }
  }

  const handleSaved = () => {
    setModal(null)
    load()
  }

  // KPI chips
  const kpis = [
    { key: '',  label: 'Todas',       value: data.total },
    { key: '1', label: 'Aguardando',  value: (data.items || []).filter(m => m.status === 1).length },
    { key: '2', label: 'Em Processo', value: (data.items || []).filter(m => m.status === 2).length },
    { key: '3', label: 'Ocorrência',  value: (data.items || []).filter(m => m.status === 3).length },
    { key: '5', label: 'Finalizadas', value: (data.items || []).filter(m => m.status === 5).length },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Máquinas</h1>
          <p className="text-sm text-slate-400">{data.total} máquinas cadastradas</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
          >
            <Plus size={14} /> Nova máquina
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={e => { setQ(e.target.value); setPage(1) }}
          placeholder="Buscar por código ou cliente…"
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
        />
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {kpis.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setStatusFilter(key); setPage(1) }}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-all border ${
              statusFilter === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : (data.items || []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <Cog size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhuma máquina encontrada</p>
          <button
            onClick={() => setModal('new')}
            className="mt-4 text-sm text-blue-600 hover:underline"
          >
            Criar primeira máquina
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(data.items || []).map(m => {
            const s = STATUS[m.status] || STATUS[1]
            return (
              <div
                key={m.id}
                className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${
                  m.status === 3 ? 'border-orange-200' :
                  m.status === 2 ? 'border-blue-100'   : 'border-slate-100'
                }`}
              >
                {/* Top row: code + status */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 truncate">
                      {m.identificationNumber || m.customerName || m.id?.slice(-6) || '—'}
                    </p>
                    {m.machineType?.name && (
                      <p className="text-xs text-slate-400 mt-0.5">{m.machineType.name}</p>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0 ml-2 ${s.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                    {s.label}
                  </span>
                </div>

                {/* Secondary info */}
                {m.customerName && (
                  <p className="text-xs text-slate-500 mb-2 truncate">{m.customerName}</p>
                )}

                <div className="flex gap-3 text-xs text-slate-400 mb-4">
                  {m.phase   && <span>Fase: <span className="text-slate-600 font-medium">{m.phase}</span></span>}
                  {m.voltage && <span>Tensão: <span className="text-slate-600 font-medium">{m.voltage}</span></span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 border-t border-slate-50 pt-3">
                  <button
                    onClick={() => navigate(`/industria/machines/${m.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-500 bg-slate-50 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <Eye size={12} /> Detalhes
                  </button>
                  <button
                    onClick={() => setModal(m)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    <Pencil size={12} /> Editar
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 bg-slate-50 hover:bg-red-50 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{page} / {data.totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Modals */}
      {modal === 'new' && (
        <MachineModal onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal && modal !== 'new' && (
        <MachineModal machine={modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
