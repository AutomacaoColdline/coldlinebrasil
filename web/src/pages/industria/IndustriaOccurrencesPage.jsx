import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../../services/api'
import {
  Loader2, RefreshCw, Plus, ChevronLeft, ChevronRight,
  Pencil, Trash2, CheckCircle2, X, AlertTriangle,
} from 'lucide-react'
import { formatDateTimePtBrSP } from '../../utils/industriaWorkTime'
import { isSystemOutOfShiftOccurrence } from '../../utils/industriaOccurrences'
import { isIndustriaOperatorUser } from '../../utils/industriaUsers'

const EMPTY_FORM = {
  machine:        null,
  user:           null,
  occurrenceType: null,
  description:    '',
}

// ── Modal create / edit ───────────────────────────────────────────────────────

function OccurrenceModal({ occurrence, onClose, onSaved }) {
  const editing = !!occurrence

  const [form, setForm] = useState(editing ? {
    machine:        occurrence.machine        || null,
    user:           occurrence.user           || null,
    occurrenceType: occurrence.occurrenceType || null,
    description:    occurrence.description    || '',
  } : { ...EMPTY_FORM })

  const [machines, setMachines] = useState([])
  const [users,    setUsers]    = useState([])
  const [occTypes, setOccTypes] = useState([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const selectedTypeName = String(form.occurrenceType?.name || '').trim().toLowerCase()
  const isOutroType = selectedTypeName === 'outro'

  useEffect(() => {
    Promise.all([
      api.searchMachines({ pageSize: 200 }),
      api.searchUsersPaginated({ pageSize: 200 }),
      api.getOccurrenceTypes(),
    ]).then(([mRes, uRes, otRes]) => {
      setMachines(mRes.data?.items || [])
      const allUsers = uRes.data?.items || uRes.data || []
      setUsers(allUsers.filter(isIndustriaOperatorUser))
      setOccTypes(otRes.data || [])
    }).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const selectMachine = (id) => {
    if (!id) { set('machine', null); return }
    const m = machines.find(m => (m.id || m._id) === id)
    if (!m) return
    set('machine', { id: m.id || m._id, name: m.identificationNumber || m.customerName || m.id })
  }

  const selectUser = (id) => {
    if (!id) { set('user', null); return }
    const u = users.find(u => (u.id || u._id) === id)
    if (!u) return
    set('user', { id: u.id || u._id, name: u.name })
  }

  const selectOccType = (id) => {
    if (!id) { set('occurrenceType', null); return }
    const t = occTypes.find(t => (t.id || t._id) === id)
    if (!t) return
    set('occurrenceType', { id: t.id || t._id, name: t.name })
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.machine) { setError('Máquina é obrigatória'); return }
    if (!form.occurrenceType?.id) { setError('Tipo de ocorrência é obrigatório'); return }
    if (isOutroType && !String(form.description || '').trim()) {
      setError('Informe o motivo quando o tipo for "Outro"')
      return
    }
    setSaving(true)
    try {
      if (editing) {
        await api.updateOccurrence(occurrence.id, {
          machine:        form.machine,
          user:           form.user,
          occurrenceType: form.occurrenceType,
          description:    form.description,
        })
      } else {
        await api.createOccurrence(form)
      }
      onSaved()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-none md:rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-orange-500" />
            <h2 className="text-slate-800 font-semibold">
              {editing ? 'Editar ocorrência' : 'Nova ocorrência'}
            </h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Máquina *</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              value={form.machine?.id || ''}
              onChange={e => selectMachine(e.target.value)}
              required
            >
              <option value="">Selecione a máquina...</option>
              {machines.map(m => {
                const label = m.identificationNumber || m.customerName || m.id?.slice(-6)
                const sub   = m.identificationNumber && m.customerName ? ` — ${m.customerName}` : ''
                return (
                  <option key={m.id || m._id} value={m.id || m._id}>{label}{sub}</option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Operador</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              value={form.user?.id || ''}
              onChange={e => selectUser(e.target.value)}
            >
              <option value="">Sem operador</option>
              {users.map(u => (
                <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de ocorrência *</label>
            <select
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              value={form.occurrenceType?.id || ''}
              onChange={e => selectOccType(e.target.value)}
              required
            >
              <option value="">Selecione o tipo...</option>
              {occTypes.map(t => (
                <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {isOutroType ? 'Motivo *' : 'Descrição'}
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
              rows={3}
              placeholder={isOutroType ? 'Descreva o motivo para cadastrar esse novo tipo...' : 'Descreva a ocorrência...'}
              value={form.description}
              onChange={e => set('description', e.target.value)}
              required={isOutroType}
            />
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
              className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
            >
              {saving ? 'Salvando…' : editing ? 'Atualizar' : 'Registrar ocorrência'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function IndustriaOccurrencesPage() {
  const [searchParams] = useSearchParams()
  const [data,    setData]    = useState({ items: [], totalPages: 1, total: 0 })
  const [page,    setPage]    = useState(1)
  const [filter,  setFilter]  = useState('')
  const [loading, setLoading] = useState(true)
  const [modal,   setModal]   = useState(null)
  const machineId = searchParams.get('machineId') || ''

  useEffect(() => {
    setPage(1)
  }, [machineId])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = { page, pageSize: 15, excludeSystemAutoPause: true }
      if (filter !== '') params.finished = filter
      if (machineId) params.machineId = machineId
      const [r, u] = await Promise.all([
        api.searchOccurrences(params),
        api.searchUsersPaginated({ page: 1, pageSize: 2000 }),
      ])
      const operatorIds = new Set((u.data?.items || u.data || []).filter(isIndustriaOperatorUser).map(x => x.id))
      const items = (r.data?.items || []).filter(
        o => (!o.user || (o.user?.id && operatorIds.has(o.user.id))) && !isSystemOutOfShiftOccurrence(o),
      )
      setData({ ...(r.data || {}), items })
    } catch {
      setData({ items: [], totalPages: 1, total: 0 })
    } finally {
      setLoading(false)
    }
  }, [page, filter, machineId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (o) => {
    if (!confirm(`Excluir ocorrência "${o.codeOccurrence}"?`)) return
    try {
      await api.deleteOccurrence(o.id)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao excluir')
    }
  }

  const handleFinalize = async (o) => {
    if (!confirm(`Finalizar ocorrência "${o.codeOccurrence}"?\nO tempo total será registrado.`)) return
    try {
      await api.finalizeOccurrence(o.id)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao finalizar')
    }
  }

  const handleSaved = () => { setModal(null); load() }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ocorrências</h1>
          <p className="text-sm text-slate-400">{data.total} ocorrências</p>
        </div>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={e => { setFilter(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none bg-white"
          >
            <option value="">Todas</option>
            <option value="false">Em aberto</option>
            <option value="true">Finalizadas</option>
          </select>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-orange-400 hover:text-orange-600 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => setModal('new')}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
          >
            <Plus size={14} /> Nova ocorrência
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : (data.items || []).length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 size={28} className="text-green-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma ocorrência encontrada</p>
            <button onClick={() => setModal('new')} className="mt-3 text-sm text-orange-500 hover:underline">
              Registrar primeira ocorrência
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Código', 'Máquina', 'Operador', 'Tipo', 'Descrição', 'Início', 'Status', ''].map((h, i) => (
                  <th key={i} className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map(o => (
                <tr key={o.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${!o.finished ? 'bg-orange-50/20' : ''}`}>
                  <td className="py-3 px-4 text-xs font-mono text-slate-500">{o.codeOccurrence || '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-700 font-medium">{o.machine?.name || '—'}</td>
                  <td className="py-3 px-4 text-sm text-slate-600">{o.user?.name || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{o.occurrenceType?.name || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-[180px] truncate" title={o.description}>{o.description || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{formatDateTimePtBrSP(o.startDate)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      o.finished ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {o.finished ? 'Finalizada' : 'Em aberto'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-0.5 justify-end">
                      {!o.finished && (
                        <button
                          onClick={() => handleFinalize(o)}
                          title="Finalizar"
                          className="p-1.5 rounded-lg text-slate-300 hover:text-green-600 hover:bg-green-50 transition-colors"
                        >
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => setModal(o)}
                        title="Editar"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(o)}
                        title="Excluir"
                        className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-orange-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{page} / {data.totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-orange-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {modal === 'new' && (
        <OccurrenceModal onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal && modal !== 'new' && (
        <OccurrenceModal occurrence={modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
