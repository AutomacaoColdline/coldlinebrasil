import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../../services/api'
import {
  ArrowLeft, RefreshCw, Cog, AlertTriangle, Activity,
  CheckCircle, Clock, ChevronLeft, ChevronRight, QrCode, Package, Flag, Timer,
} from 'lucide-react'
import { formatDateTimePtBrSP } from '../../utils/industriaWorkTime'
import { isSystemOutOfShiftOccurrence } from '../../utils/industriaOccurrences'

// Última etapa de fabricação — sua conclusão libera "Finalizar Máquina".
const FINAL_STAGE_NAME = 'Finalização'

function parseTimeToSeconds(t) {
  const parts = String(t || '').split(':').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return 0
  return parts[0] * 3600 + parts[1] * 60 + parts[2]
}

function fmtSecs(s) {
  if (!s || s < 0) s = 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = Math.floor(s % 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
}

// Soma o tempo de fabricação finalizado por etapa (Elétrica/Soldagem/...) e
// indica se já existe uma Finalização concluída (libera "Finalizar Máquina").
function computeStageSummary(processes) {
  const totals = {}
  let totalSeconds = 0
  let hasFinishedFinalStage = false
  for (const p of processes) {
    if (!p.finished || !p.processType?.name) continue
    // Existência da etapa final concluída independe da duração — mesmo um
    // processo de 0s finalizado conta pra liberar "Finalizar Máquina".
    if (p.processType.name.trim() === FINAL_STAGE_NAME) hasFinishedFinalStage = true
    const secs = parseTimeToSeconds(p.processTime)
    if (secs <= 0) continue
    totals[p.processType.name] = (totals[p.processType.name] || 0) + secs
    totalSeconds += secs
  }
  return { totals, totalSeconds, hasFinishedFinalStage }
}

async function loadAllPages(fetcher, params = {}, pageSize = 200) {
  const first = await fetcher({ ...params, page: 1, pageSize })
  const items = first.data?.items || []
  const totalPages = first.data?.totalPages || 1

  if (totalPages <= 1) return items

  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetcher({ ...params, page: index + 2, pageSize })),
  )

  return items.concat(rest.flatMap((response) => response.data?.items || []))
}

// ── helpers ───────────────────────────────────────────────────────────────────

const STATUS = {
  1: { label: 'Aguardando',   color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'  },
  2: { label: 'Em Processo',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'   },
  3: { label: 'Ocorrência',   color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  4: { label: 'Retrabalho',   color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  5: { label: 'Finalizada',   color: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  6: { label: 'Parada',       color: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
}

function processKind(p) {
  if (p.preIndustrialization) return { label: 'Pré-Ind.',   cls: 'bg-purple-100 text-purple-700' }
  if (p.reWork)               return { label: 'Retrabalho', cls: 'bg-yellow-100 text-yellow-700' }
  if (p.prototype)            return { label: 'Protótipo',  cls: 'bg-pink-100 text-pink-700'     }
  return                             { label: 'Produção',   cls: 'bg-blue-100 text-blue-700'     }
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function Stat({ icon: Icon, label, value, iconCls }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconCls}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800 leading-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

// ── Info row helper ───────────────────────────────────────────────────────────

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-slate-700">{value || '—'}</span>
    </div>
  )
}

// ── Processes tab ─────────────────────────────────────────────────────────────

function ProcessesTab({ machineId, processes, navigate }) {
  const PAGE = 10
  const [page, setPage] = useState(1)
  const slice = processes.slice((page - 1) * PAGE, page * PAGE)
  const totalPages = Math.ceil(processes.length / PAGE) || 1

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{processes.length} processos</p>
        <button
          onClick={() => navigate(`/industria/processes?machineId=${machineId}`)}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver todos na lista
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {slice.length === 0 ? (
          <div className="py-12 text-center">
            <Activity size={24} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum processo vinculado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['OS#', 'Operador', 'Tipo', 'Tempo', 'Início', 'Status'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map(p => {
                const kind = processKind(p)
                return (
                  <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${p.inOccurrence ? 'bg-orange-50/30' : ''}`}>
                    <td className="py-3 px-4 text-xs font-mono text-slate-500">#{p.identificationNumber}</td>
                    <td className="py-3 px-4 text-sm text-slate-800">{p.user?.name || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${kind.cls}`}>{kind.label}</span>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-600">{p.processTime || '—'}</td>
                    <td className="py-3 px-4 text-xs text-slate-500">{formatDateTimePtBrSP(p.startDate)}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        p.finished       ? 'bg-green-100 text-green-700'  :
                        p.inOccurrence   ? 'bg-orange-100 text-orange-700' :
                                           'bg-blue-100 text-blue-700'
                      }`}>
                        {p.finished ? 'Finalizado' : p.inOccurrence ? 'Ocorrência' : 'Em andamento'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Occurrences tab ───────────────────────────────────────────────────────────

function OccurrencesTab({ machineId, occurrences, navigate }) {
  const PAGE = 10
  const [page, setPage] = useState(1)
  const slice = occurrences.slice((page - 1) * PAGE, page * PAGE)
  const totalPages = Math.ceil(occurrences.length / PAGE) || 1

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">{occurrences.length} ocorrências</p>
        <button
          onClick={() => navigate(`/industria/occurrences?machineId=${machineId}`)}
          className="text-xs text-blue-600 hover:underline"
        >
          Ver todas na lista
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        {slice.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle size={24} className="text-green-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma ocorrência registrada</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Código', 'Operador', 'OS#', 'Descrição', 'Início', 'Status'].map(h => (
                  <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {slice.map(o => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-xs font-mono text-slate-500">{o.codeOccurrence}</td>
                  <td className="py-3 px-4 text-sm text-slate-800">{o.user?.name || '—'}</td>
                  <td className="py-3 px-4 text-xs font-mono text-slate-500">{o.process?.name || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-600 max-w-[180px] truncate">{o.description || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-500">{formatDateTimePtBrSP(o.startDate)}</td>
                  <td className="py-3 px-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                      o.finished ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {o.finished ? 'Finalizada' : 'Em aberto'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'processes',   label: 'Processos',   icon: Activity      },
  { id: 'occurrences', label: 'Ocorrências', icon: AlertTriangle  },
]

export default function IndustriaMachineDetailPage() {
  const { id }    = useParams()
  const navigate  = useNavigate()

  const [detail, setDetail]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]         = useState('processes')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [machineRes, processItems, occurrenceItems] = await Promise.all([
        api.getMachineById(id),
        loadAllPages(api.searchProcesses, { machineId: id }),
        loadAllPages(api.searchOccurrences, { machineId: id, excludeSystemAutoPause: true }),
      ])

      const sortedProcesses = [...processItems].sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0))
      const sortedOccurrences = occurrenceItems
        .filter((item) => !isSystemOutOfShiftOccurrence(item))
        .sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0))

      setDetail({
        machine: machineRes.data,
        stats: {
          totalProcesses: sortedProcesses.length,
          activeProcesses: sortedProcesses.filter(p => !p.finished).length,
          totalOccurrences: sortedOccurrences.length,
          activeOccurrences: sortedOccurrences.filter(o => !o.finished).length,
        },
        recentProcesses: sortedProcesses,
        recentOccurrences: sortedOccurrences,
        stageSummary: computeStageSummary(sortedProcesses),
      })
    } catch {
      navigate('/industria/machines')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  const [finishing, setFinishing] = useState(false)
  const [finishError, setFinishError] = useState('')

  const handleFinish = async () => {
    if (!detail) return
    setFinishing(true)
    setFinishError('')
    try {
      await api.finishMachine(detail.machine.id)
      load()
    } catch (err) {
      setFinishError(err?.response?.data?.message || 'Erro ao finalizar máquina')
    } finally {
      setFinishing(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <RefreshCw size={22} className="animate-spin text-slate-300" />
    </div>
  )

  if (!detail) return null

  const { machine, stats, recentProcesses, recentOccurrences, stageSummary } = detail
  const s = STATUS[machine.status] || STATUS[1]
  const canFinish = stageSummary.hasFinishedFinalStage && machine.status !== 5

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">

      {/* Back + title */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/industria/machines')}
          className="w-9 h-9 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-slate-900">
              {machine.identificationNumber || machine.customerName || 'Máquina'}
            </h1>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
              {s.label}
            </span>
            {machine.isStock && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">
                <Package size={11} /> Estoque
              </span>
            )}
          </div>
          {machine.customerName && (
            <p className="text-sm text-slate-400 mt-0.5">{machine.customerName}</p>
          )}
        </div>
        <button
          onClick={() => navigate(`/industria/machines/${machine.id}/qr`)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <QrCode size={14} /> <span className="hidden sm:inline">QR code</span>
        </button>
        {canFinish && (
          <button
            onClick={handleFinish}
            disabled={finishing}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            <Flag size={14} /> {finishing ? 'Finalizando…' : 'Finalizar máquina'}
          </button>
        )}
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-blue-400 hover:text-blue-600 transition-colors"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      {finishError && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 mb-6">{finishError}</p>
      )}

      {/* Tempo de fabricação por etapa */}
      {stageSummary.totalSeconds > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center">
              <Timer size={15} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-700 text-sm">Tempo de fabricação por etapa</h2>
            <span className="ml-auto text-xs text-slate-400">
              Total: <span className="font-mono font-semibold text-slate-700">{fmtSecs(stageSummary.totalSeconds)}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {Object.entries(stageSummary.totals).map(([name, secs]) => (
              <div key={name} className="bg-slate-50 rounded-xl px-3 py-2.5 text-center">
                <p className="text-xs text-slate-500 truncate">{name}</p>
                <p className="font-mono text-sm font-bold text-slate-800 mt-0.5">{fmtSecs(secs)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat
          icon={Activity}
          label="Total de processos"
          value={stats.totalProcesses}
          iconCls="bg-blue-50 text-blue-600"
        />
        <Stat
          icon={Clock}
          label="Processos ativos"
          value={stats.activeProcesses}
          iconCls="bg-indigo-50 text-indigo-600"
        />
        <Stat
          icon={AlertTriangle}
          label="Total de ocorrências"
          value={stats.totalOccurrences}
          iconCls="bg-orange-50 text-orange-500"
        />
        <Stat
          icon={CheckCircle}
          label="Ocorrências abertas"
          value={stats.activeOccurrences}
          iconCls={stats.activeOccurrences > 0 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left: machine info */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center">
                <Cog size={15} className="text-slate-500" />
              </div>
              <h2 className="font-semibold text-slate-700 text-sm">Dados da máquina</h2>
            </div>

            <Row label="Código"      value={machine.identificationNumber || machine.customerName} />
            <Row label="Cliente / OS" value={machine.customerName} />
            <Row label="Tipo"        value={machine.machineType?.name} />
            <Row label="Fase"        value={machine.phase} />
            <Row label="Tensão"      value={machine.voltage} />
            <Row label="Cadastrada"  value={formatDateTimePtBrSP(machine.createdAt)} />

            {machine.users?.length > 0 && (
              <div className="pt-3 mt-1">
                <p className="text-xs text-slate-400 mb-1.5">Operadores vinculados</p>
                <div className="flex flex-wrap gap-1">
                  {machine.users.map(u => (
                    <span key={u.id} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {u.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: tabbed linked data */}
        <div className="lg:col-span-2">
          {/* Tab bar */}
          <div className="flex gap-1 mb-4 bg-white border border-slate-100 rounded-xl p-1 shadow-sm w-fit">
            {TABS.map(({ id: tid, label, icon: Icon }) => (
              <button
                key={tid}
                onClick={() => setTab(tid)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === tid
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          {tab === 'processes' && (
            <ProcessesTab
              machineId={id}
              processes={recentProcesses || []}
              navigate={navigate}
            />
          )}
          {tab === 'occurrences' && (
            <OccurrencesTab
              machineId={id}
              occurrences={recentOccurrences || []}
              navigate={navigate}
            />
          )}
        </div>
      </div>
    </div>
  )
}
