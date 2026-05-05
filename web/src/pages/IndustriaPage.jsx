import { useEffect, useState, useCallback } from 'react'
import { api } from '../services/api'
import { RefreshCw, Loader2, Cog, AlertTriangle } from 'lucide-react'

const STATUS = {
  1: { label: 'Aguardando',   cls: 'bg-slate-100 text-slate-500',   dot: 'bg-slate-400'  },
  2: { label: 'Em Processo',  cls: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'   },
  3: { label: 'Ocorrência',   cls: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  4: { label: 'Retrabalho',   cls: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  5: { label: 'Finalizada',   cls: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  6: { label: 'Parada',       cls: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
}

function StatsBar({ stats, loading }) {
  const items = [
    { label: 'Total',        value: stats.totalMachines,    cls: 'text-slate-700'  },
    { label: 'Aguardando',   value: stats.machinesWaiting,  cls: 'text-slate-500'  },
    { label: 'Em Processo',  value: stats.activeMachines,   cls: 'text-blue-600'   },
    { label: 'Ocorrência',   value: stats.machinesInOcc,    cls: 'text-orange-600' },
    { label: 'Finalizadas',  value: stats.machinesFinished, cls: 'text-green-600'  },
  ]
  return (
    <div className="sticky top-0 z-10 bg-white border-b border-slate-100 px-6 py-3 flex gap-3 overflow-x-auto">
      {items.map(({ label, value, cls }) => (
        <div key={label} className="rounded-xl px-4 py-2 flex flex-col items-center min-w-[80px] shrink-0 bg-slate-50">
          <span className={`text-xl font-bold ${cls}`}>{loading ? '—' : (value ?? 0)}</span>
          <span className="text-[11px] text-slate-400 mt-0.5">{label}</span>
        </div>
      ))}
    </div>
  )
}

export default function IndustriaPage() {
  const [machines, setMachines]   = useState([])
  const [processes, setProcesses] = useState([])
  const [stats, setStats]         = useState({})
  const [loading, setLoading]     = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [filter, setFilter]       = useState('active') // 'all' | 'active' | 'waiting'

  const load = useCallback(async () => {
    try {
      const [mr, dr] = await Promise.all([
        api.getMachines(),
        api.getDashboard(),
      ])
      const notTest = (p) => {
        const n = (p.user?.name || '').toLowerCase()
        return n !== 'teste' && !n.includes('admin')
      }
      setMachines(mr.data || [])
      setProcesses((dr.data?.activeProcesses || []).filter(notTest))
      setStats(dr.data?.stats || {})
      setLastUpdate(new Date())
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  // Match process to machine by id or identificationNumber
  const getMachineProcess = (machine) =>
    processes.find(p =>
      p.machine?.id === machine.id ||
      p.machine?.name === machine.identificationNumber
    )

  const filtered = machines.filter(m => {
    if (filter === 'active')  return m.status === 2 || m.status === 3 || m.status === 4
    if (filter === 'waiting') return m.status === 1
    return true
  })

  // Sort: occurrence → active → rework → waiting → finished → stopped
  const ORDER = { 3: 0, 2: 1, 4: 2, 1: 3, 5: 4, 6: 5 }
  const sorted = [...filtered].sort((a, b) => (ORDER[a.status] ?? 9) - (ORDER[b.status] ?? 9))

  const tabs = [
    { key: 'active',  label: `Em Atividade (${machines.filter(m => m.status === 2 || m.status === 3 || m.status === 4).length})` },
    { key: 'waiting', label: `Aguardando (${machines.filter(m => m.status === 1).length})` },
    { key: 'all',     label: `Todas (${machines.length})` },
  ]

  return (
    <div>
      <StatsBar stats={stats} loading={loading} />

      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Máquinas</h1>
            <p className="text-sm text-slate-400">
              {sorted.length} máquinas
              {lastUpdate && (
                <span className="ml-2 text-slate-300">
                  · {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-brand-mid hover:text-brand-mid transition-colors"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-5">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                filter === key
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
            <Cog size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma máquina neste filtro</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['Máquina', 'Identificação', 'Fase / Tensão', 'Processo (OS#)', 'Operador', 'Status'].map(h => (
                    <th key={h} className="py-3 px-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map(m => {
                  const s    = STATUS[m.status] || STATUS[1]
                  const proc = getMachineProcess(m)
                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-slate-50 hover:bg-slate-50/40 ${m.status === 3 ? 'bg-orange-50/30' : ''}`}
                    >
                      {/* Máquina */}
                      <td className="py-3 px-5">
                        <p className="text-sm font-semibold text-slate-800">{m.machineType?.name || '—'}</p>
                      </td>

                      {/* Identificação */}
                      <td className="py-3 px-5">
                        <span className="text-sm font-mono text-slate-600">{m.identificationNumber || '—'}</span>
                      </td>

                      {/* Fase / Tensão */}
                      <td className="py-3 px-5 text-xs text-slate-500">
                        {m.phase || m.voltage
                          ? <span>{m.phase}{m.phase && m.voltage ? ' · ' : ''}{m.voltage}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>

                      {/* Processo */}
                      <td className="py-3 px-5">
                        {proc ? (
                          <span className="text-xs font-mono font-semibold text-blue-600">
                            #{proc.identificationNumber}
                          </span>
                        ) : m.process?.name ? (
                          <span className="text-xs font-mono text-slate-500">#{m.process.name}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Operador */}
                      <td className="py-3 px-5 text-sm text-slate-700">
                        {proc?.user?.name || <span className="text-slate-300 text-xs">—</span>}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.cls}`}>
                          {m.status === 3 && <AlertTriangle size={10} />}
                          {m.status !== 3 && <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
                          {s.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
