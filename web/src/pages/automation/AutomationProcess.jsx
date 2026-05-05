import { useEffect, useState, useCallback } from 'react'
import { automationApi } from '../../services/automationApi'
import { Activity, Search, Loader2, ChevronLeft, ChevronRight, X, Clock, CheckCircle2, AlertCircle } from 'lucide-react'

function fmt(seconds) {
  if (!seconds) return '—'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function StatusBadge({ finished }) {
  return finished ? (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 font-medium">
      <CheckCircle2 size={10} /> Finalizado
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-medium">
      <Clock size={10} /> Em andamento
    </span>
  )
}

function ProcessDetail({ proc, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-semibold text-slate-800">{proc.processType?.name || 'Processo'}</h3>
            <p className="text-xs text-slate-400">{proc.user?.name || '—'}</p>
          </div>
          <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {[
            { label: 'Status',     value: <StatusBadge finished={proc.finished} /> },
            { label: 'Início',     value: fmtDate(proc.startDate) },
            { label: 'Fim',        value: fmtDate(proc.endDate)   },
            { label: 'Duração',    value: fmt(proc.totalSeconds)  },
            { label: 'Máquina',   value: proc.machine?.name || '—' },
            { label: 'Tipo',       value: proc.processType?.name || '—' },
            { label: 'Usuário',   value: proc.user?.name || '—'   },
            { label: 'Departamento', value: proc.department?.name || '—' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm py-1 border-b border-slate-50 last:border-0">
              <span className="text-slate-500">{label}</span>
              <span className="font-medium text-slate-800">{value}</span>
            </div>
          ))}
          {proc.occurrences?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2 mt-2">Ocorrências ({proc.occurrences.length})</p>
              <div className="space-y-1.5">
                {proc.occurrences.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs bg-orange-50 text-orange-700 rounded-lg px-3 py-2">
                    <AlertCircle size={11} />
                    <span>{o.occurrenceType?.name || 'Ocorrência'}</span>
                    <span className="text-orange-400 ml-auto">{fmtDate(o.startDate)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AutomationProcess() {
  const [data, setData]           = useState({ items: [], totalPages: 1, total: 0 })
  const [processTypes, setTypes]  = useState([])
  const [filter, setFilter]       = useState({ page: 1, pageSize: 15, finished: '' })
  const [loading, setLoad]        = useState(true)
  const [selected, setSelected]   = useState(null)

  const load = useCallback(async () => {
    setLoad(true)
    try {
      const params = { ...filter }
      if (params.finished === '') delete params.finished
      const [r, t] = await Promise.all([
        automationApi.getProcesses(params),
        processTypes.length ? Promise.resolve({ data: processTypes }) : automationApi.getProcessTypes(),
      ])
      setData(r.data)
      if (!processTypes.length) setTypes(t.data || [])
    } catch {}
    setLoad(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setFilter(f => ({ ...f, [k]: v, page: 1 }))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Processos</h1>
          <p className="text-sm text-slate-400">{data.total} registros</p>
        </div>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Usuário..." value={filter.userName || ''} onChange={e => set('userName', e.target.value)}
            className="pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 w-36" />
        </div>
        <select value={filter.processTypeId || ''} onChange={e => set('processTypeId', e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
          <option value="">Todos os tipos</option>
          {processTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <select value={filter.finished} onChange={e => set('finished', e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
          <option value="">Todos</option>
          <option value="true">Finalizados</option>
          <option value="false">Em andamento</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : (data.items || []).length === 0 ? (
          <div className="py-20 text-center">
            <Activity size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum processo encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Tipo', 'Usuário', 'Máquina', 'Início', 'Duração', 'Status'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.items || []).map(p => (
                <tr key={p.id} onClick={() => setSelected(p)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 pl-5">
                    <span className="text-sm font-medium text-slate-800">{p.processType?.name || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.user?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{p.machine?.name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(p.startDate)}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{fmt(p.totalSeconds)}</td>
                  <td className="px-4 py-3"><StatusBadge finished={p.finished} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={filter.page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{filter.page} / {data.totalPages}</span>
          <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={filter.page === data.totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {selected && <ProcessDetail proc={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
