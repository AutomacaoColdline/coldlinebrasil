import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workOrderApi } from '../../services/assistenciaApi'
import { FileText, RefreshCw, Search, ChevronRight } from 'lucide-react'

function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

function hasMeaningfulReport(report) {
  if (!report) return false
  const vals = [
    report.problemDescription,
    report.diagnosis,
    report.workPerformed,
    report.partsUsed,
    report.notes,
  ]
  return vals.some(v => String(v || '').trim() !== '')
}

export default function AssistenciaReportsHistoryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const r = await workOrderApi.search({ page: 1, pageSize: 5000 })
      const all = r.data?.items || []
      setItems(all.filter(os => hasMeaningfulReport(os.report)))
    } catch {
      setItems([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return items
    return items.filter(os =>
      (os.osNumber || '').toLowerCase().includes(s) ||
      (os.client?.name || '').toLowerCase().includes(s) ||
      (os.description || '').toLowerCase().includes(s),
    )
  }, [items, q])

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-lg">Histórico de Relatórios</h1>
          <p className="text-white/40 text-xs mt-0.5">{filtered.length} relatório(s) registrados</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-white/[0.1] text-white/50 hover:text-white hover:border-white/20 transition-all"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      <div className="mb-5 relative">
        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
        <input
          className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none focus:border-orange-500/40"
          placeholder="Buscar por OS, cliente ou descrição..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={18} className="animate-spin text-white/20" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <FileText size={32} className="mb-3" />
          <p className="text-sm">Nenhum relatório encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(os => (
            <button
              key={os.id}
              onClick={() => navigate(`/assistencia/os/${os.id}`)}
              className="w-full bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-xl p-4 text-left transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-orange-400 text-xs font-mono font-semibold">{os.osNumber}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/50">
                      {os.status}
                    </span>
                  </div>
                  <p className="text-white text-sm font-medium truncate">{os.description || '—'}</p>
                  <div className="mt-1 text-[11px] text-white/35 flex flex-wrap gap-x-4 gap-y-1">
                    <span>Cliente: <span className="text-white/50">{os.client?.name || '—'}</span></span>
                    <span>Atualizado: <span className="text-white/50">{fmtDate(os.report?.lastUpdatedAt || os.updatedAt)}</span></span>
                  </div>
                </div>
                <ChevronRight size={15} className="text-white/20 flex-shrink-0 mt-1" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
