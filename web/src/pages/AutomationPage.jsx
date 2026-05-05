import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import {
  Cog, Activity, AlertTriangle, CheckCircle,
  Clock, Loader2, RefreshCw, Zap, Users, Hash
} from 'lucide-react'

const STATUS_MAP = {
  1: { label: 'Aguardando',    color: 'bg-slate-100 text-slate-600',   dot: 'bg-slate-400'  },
  2: { label: 'Em Progresso',  color: 'bg-blue-100 text-blue-700',     dot: 'bg-blue-500'   },
  3: { label: 'Ocorrência',    color: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  4: { label: 'Retrabalho',    color: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  5: { label: 'Finalizada',    color: 'bg-green-100 text-green-700',   dot: 'bg-green-500'  },
  6: { label: 'Parada',        color: 'bg-red-100 text-red-700',       dot: 'bg-red-500'    },
}

function MachineCard({ machine }) {
  const s = STATUS_MAP[machine.status] || STATUS_MAP[1]
  const hasProcess = !!machine.process
  const hasUsers   = machine.users?.length > 0

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-3 transition-all
      ${machine.status === 3 ? 'border-orange-200 ring-1 ring-orange-200' :
        machine.status === 2 ? 'border-blue-100' : 'border-slate-100'}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-bold text-slate-800 text-base">{machine.identificationNumber}</p>
          {machine.customerName && (
            <p className="text-xs text-slate-400 mt-0.5">{machine.customerName}</p>
          )}
        </div>
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.color}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
          {s.label}
        </span>
      </div>

      {/* Specs */}
      <div className="flex gap-4 text-xs text-slate-400">
        {machine.phase && <span>Fase: <span className="text-slate-600 font-medium">{machine.phase}</span></span>}
        {machine.voltage && <span>Tensão: <span className="text-slate-600 font-medium">{machine.voltage}</span></span>}
        {machine.machineType?.name && <span>Tipo: <span className="text-slate-600 font-medium">{machine.machineType.name}</span></span>}
      </div>

      {/* Processo ativo */}
      {hasProcess && (
        <div className="bg-blue-50 rounded-xl px-3 py-2 flex items-center gap-2">
          <Activity size={13} className="text-blue-500 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-blue-700 truncate">
              Processo #{machine.process.name || machine.process.id?.slice(-6)}
            </p>
          </div>
        </div>
      )}

      {/* Usuários */}
      {hasUsers && (
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Users size={12} />
          <span>{machine.users.map(u => u.name).join(', ')}</span>
        </div>
      )}

      {/* Tempo */}
      {machine.time && (
        <div className="flex items-center gap-1.5 text-xs text-slate-400 border-t border-slate-50 pt-2">
          <Clock size={12} />
          <span>{machine.time}</span>
        </div>
      )}
    </div>
  )
}

function ProcessRow({ process }) {
  const elapsed = process.startDate
    ? Math.floor((Date.now() - new Date(process.startDate)) / 60000)
    : 0

  return (
    <div className={`flex items-center gap-4 py-3.5 px-5 border-b border-slate-50 last:border-0
      ${process.inOccurrence ? 'bg-orange-50/50' : 'hover:bg-slate-50/50'} transition-colors`}>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`w-2 h-2 rounded-full ${process.inOccurrence ? 'bg-orange-500' : 'bg-blue-500'}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800 truncate">{process.user?.name || '—'}</p>
        <p className="text-xs text-slate-400 truncate">{process.processType?.name}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-mono text-slate-500">#{process.identificationNumber}</p>
        <p className="text-xs text-slate-400">{elapsed}min</p>
      </div>
      {process.inOccurrence && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 shrink-0">
          OCORRÊNCIA
        </span>
      )}
    </div>
  )
}

export default function AutomationPage() {
  const [machines, setMachines]     = useState([])
  const [processes, setProcesses]   = useState([])
  const [stats, setStats]           = useState({})
  const [loading, setLoading]       = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [filter, setFilter]         = useState('all')

  const load = useCallback(async () => {
    try {
      const [mr, pr, dr] = await Promise.all([
        api.getMachines(),
        api.getProcesses({ finished: false }),
        api.getDashboard(),
      ])
      setMachines(mr.data  || [])
      setProcesses(pr.data || [])
      setStats(dr.data?.stats || {})
      setLastUpdate(new Date())
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Auto-refresh a cada 30s
  useEffect(() => {
    const t = setInterval(load, 30000)
    return () => clearInterval(t)
  }, [load])

  const filteredMachines = filter === 'all'
    ? machines
    : machines.filter(m => String(m.status) === filter)

  const activeProcesses = processes.filter(p => !p.finished)

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Automação</h1>
            <p className="text-sm text-slate-500">
              Painel de produção em tempo real
              {lastUpdate && (
                <span className="ml-2 text-slate-400">
                  · atualizado {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <button onClick={load}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-brand-mid hover:text-brand-mid transition-colors">
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total',        value: machines.length,                  color: 'text-slate-700', bg: 'bg-slate-50'    },
            { label: 'Aguardando',   value: machines.filter(m=>m.status===1).length, color: 'text-slate-500', bg: 'bg-slate-50'    },
            { label: 'Em Progresso', value: machines.filter(m=>m.status===2).length, color: 'text-blue-600',  bg: 'bg-blue-50'     },
            { label: 'Ocorrência',   value: machines.filter(m=>m.status===3).length, color: 'text-orange-600',bg: 'bg-orange-50'   },
            { label: 'Finalizadas',  value: machines.filter(m=>m.status===5).length, color: 'text-green-600', bg: 'bg-green-50'    },
          ].map(({ label, value, color, bg }) => (
            <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
              <p className={`text-2xl font-bold ${color}`}>{loading ? '—' : value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Máquinas */}
          <div className="xl:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Máquinas</h2>
              {/* Filtro rápido */}
              <div className="flex gap-1 bg-slate-100 p-1 rounded-lg">
                {[
                  { key: 'all', label: 'Todas' },
                  { key: '2',   label: 'Ativas'   },
                  { key: '3',   label: 'Ocorrência'},
                  { key: '1',   label: 'Aguardando'},
                ].map(({ key, label }) => (
                  <button key={key} onClick={() => setFilter(key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      filter === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 size={24} className="animate-spin text-slate-300" />
              </div>
            ) : filteredMachines.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 py-14 text-center">
                <Cog size={28} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhuma máquina neste filtro</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {filteredMachines.map(m => <MachineCard key={m.id} machine={m} />)}
              </div>
            )}
          </div>

          {/* Processos ativos */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">
                Processos Ativos
                <span className="ml-2 text-xs font-normal text-slate-400">({activeProcesses.length})</span>
              </h2>
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 size={20} className="animate-spin text-slate-300" />
                </div>
              ) : activeProcesses.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle size={24} className="text-green-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Nenhum processo ativo</p>
                </div>
              ) : (
                <div className="max-h-[480px] overflow-y-auto">
                  {activeProcesses.map(p => <ProcessRow key={p.id} process={p} />)}
                </div>
              )}
            </div>

            {/* Ocorrências abertas */}
            {stats.activeOccurrences > 0 && (
              <div className="mt-4 bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3">
                <AlertTriangle size={18} className="text-orange-500 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-orange-800">
                    {stats.activeOccurrences} ocorrência{stats.activeOccurrences > 1 ? 's' : ''} aberta{stats.activeOccurrences > 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-orange-600">Requer atenção imediata</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}
