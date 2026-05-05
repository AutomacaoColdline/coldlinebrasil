import { useEffect, useState, useCallback } from 'react'
import { tvApi as api } from '../services/tvApi'
import { Snowflake } from 'lucide-react'
import {
  operatorOccurrenceFromProc,
  tvProcessDisplaySeconds,
  isWorkingNow,
} from '../utils/industriaWorkTime'
import { isIndustriaOperatorUser } from '../utils/industriaUsers'

const BASE_URL = import.meta.env.VITE_API_URL || ''

const notTest = (p) => {
  const n = (p.user?.name || '').toLowerCase()
  return n !== 'teste' && !n.includes('admin')
}

function processStartMs(p) {
  if (!p?.startDate) return 0
  const d = new Date(p.startDate)
  const t = d.getTime()
  return Number.isNaN(t) ? 0 : t
}

// Quando o operador tem mais de um processo ativo, exibe o "de trabalho":
// 1) não pausado (inOccurrence=false), 2) mais recente por startDate.
function pickDisplayedProcessForUser(user, activeProcs) {
  const byUser = activeProcs.filter(p => p.user?.id === user.id && !p.finished)
  if (byUser.length === 0) return null

  const sorted = [...byUser].sort((a, b) => processStartMs(b) - processStartMs(a))
  const running = sorted.find(p => !p.inOccurrence)
  if (running) return running

  // Fallback: segue currentProcess se ainda existir entre os ativos.
  if (user.currentProcess?.id) {
    const linked = sorted.find(p => p.id === user.currentProcess.id)
    if (linked) return linked
  }

  // Último recurso: processo mais recente (mesmo pausado).
  return sorted[0]
}

function formatTimer(secs) {
  if (secs == null || secs < 0) return '00:00:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function processKind(p) {
  if (!p) return null
  if (p.processType?.name) return p.processType.name
  if (p.preIndustrialization) return 'Pré-Ind.'
  if (p.reWork)               return 'Retrabalho'
  if (p.prototype)            return 'Protótipo'
  return 'Produção'
}

export default function IndustriaTVPage() {
  const [users, setUsers]               = useState([])
  const [userProcs, setUserProcs]       = useState({})
  const [machineStats, setMachineStats] = useState({ total: 0, waiting: 0, active: 0, inOcc: 0, finished: 0 })
  const [userStats, setUserStats]       = useState({}) // { [userId]: { averageSeconds, averageFormatted } }
  const [lastUpdate, setLastUpdate]     = useState(null)
  const [online, setOnline]             = useState(true)
  const [now, setNow]                   = useState(Date.now())

  // Tick de 1 segundo: só atualiza "agora"; o tempo útil vem de tvProcessDisplaySeconds(proc, now)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const load = useCallback(async () => {
    try {
      const [usersRes, machinesRes, dashRes] = await Promise.all([
        api.searchUsersPaginated({ page: 1, pageSize: 50 }),
        api.getMachines(),
        api.getDashboard(),
      ])

      const operators   = (usersRes.data?.items || []).filter(isIndustriaOperatorUser)
      const machines    = machinesRes.data || []
      const activeProcs = (dashRes.data?.activeProcesses || []).filter(notTest)

      setMachineStats({
        total:    machines.length,
        waiting:  machines.filter(m => m.status === 1).length,
        active:   machines.filter(m => m.status === 2).length,
        inOcc:    machines.filter(m => m.status === 3).length,
        finished: machines.filter(m => m.status === 5).length,
      })

      const newUserProcs = {}
      operators.forEach(user => {
        const proc = pickDisplayedProcessForUser(user, activeProcs)
        if (proc) {
          newUserProcs[user.id] = proc
        }
      })

      setUsers(operators)
      setUserProcs(newUserProcs)
      setLastUpdate(new Date())
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [])

  // Carrega estatísticas por usuário quando os processos mudam
  useEffect(() => {
    const ids = new Set(Object.keys(userProcs))
    ids.forEach(uid => {
      if (!userStats[uid]) {
        api.getProcessUserStats(uid)
          .then(r => setUserStats(prev => ({ ...prev, [uid]: r.data })))
          .catch(() => {})
      }
    })
  }, [userProcs])

  useEffect(() => { load() }, [load])
  useEffect(() => {
    const t = setInterval(load, 1000)
    return () => clearInterval(t)
  }, [load])

  // Ordenação: em processo primeiro, ociosos por último
  const sorted = [...users].sort((a, b) => {
    const pa = !!userProcs[a.id]
    const pb = !!userProcs[b.id]
    if (pa && !pb) return -1
    if (!pa && pb) return 1
    return 0
  })

  const statItems = [
    { label: 'Total',       value: machineStats.total    },
    { label: 'Aguardando',  value: machineStats.waiting  },
    { label: 'Em Processo', value: machineStats.active   },
    { label: 'Ocorrência',  value: machineStats.inOcc    },
    { label: 'Finalizadas', value: machineStats.finished },
  ]

  return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col overflow-hidden">

      {/* Header */}
      <header className="bg-[#0f172a] border-b border-white/[0.07] px-10 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-mid rounded-xl flex items-center justify-center">
            <Snowflake size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-lg">Indústria · Modo TV</p>
            <p className="text-sm text-white/30 tabular-nums">
              {new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </p>
          </div>
        </div>

        {/* Contadores de máquinas */}
        <div className="flex gap-8">
          {statItems.map(({ label, value }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-bold text-white tabular-nums">{value ?? 0}</p>
              <p className="text-xs text-white/40 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className={`text-sm font-medium ${online ? 'text-green-400' : 'text-red-400'}`}>
            {online ? 'Online' : 'Offline'}
          </span>
        </div>
      </header>

      {/* Tabela */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/[0.07] bg-white/[0.03]">
              <th className="py-4 pl-10 pr-4 w-20" />
              <th className="py-4 pr-6 text-left text-sm font-semibold text-white/40 uppercase tracking-widest">Operador</th>
              <th className="py-4 pr-6 text-left text-sm font-semibold text-white/40 uppercase tracking-widest">Máquina</th>
              <th className="py-4 pr-6 text-left text-sm font-semibold text-white/40 uppercase tracking-widest">Processo Atual</th>
              <th className="py-4 pr-6 text-left text-sm font-semibold text-white/40 uppercase tracking-widest">Tempo de Processo</th>
              <th className="py-4 pr-6 text-left text-sm font-semibold text-white/40 uppercase tracking-widest">Tempo Médio</th>
              <th className="py-4 pr-6 text-left text-sm font-semibold text-white/40 uppercase tracking-widest">Ocorrência</th>
              <th className="py-4 pr-10 text-center text-sm font-semibold text-white/40 uppercase tracking-widest">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(user => {
              const proc    = userProcs[user.id]
              const elapsed = tvProcessDisplaySeconds(proc, now)
              const us      = userStats[user.id]
              const opOcc     = operatorOccurrenceFromProc(proc)
              const paused    = proc && !!proc.inOccurrence
              const outsideSp = proc && !isWorkingNow(now)
              const runningOutsideSp = proc && !paused && outsideSp
              const inProc    = !!proc
              const kind      = processKind(proc)
              // Verde: em processo útil em SP, sem pausa/ocorrência
              const isGreen   = inProc && !paused && !outsideSp

              return (
                <tr
                  key={user.id}
                  className={`border-b border-white/[0.05] transition-colors ${
                    opOcc ? 'bg-orange-900/15' :
                    runningOutsideSp ? 'bg-slate-900/40' :
                    !inProc ? 'bg-white/[0.01]' : ''
                  }`}
                >
                  {/* Foto */}
                  <td className="py-5 pl-10 pr-4">
                    {user.urlPhoto ? (
                      <img
                        src={`${BASE_URL}/uploads/${user.urlPhoto}?t=${Math.floor(Date.now() / 60000)}`}
                        alt={user.name}
                        className="w-12 h-12 rounded-full object-cover border border-white/10"
                        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                      />
                    ) : null}
                    <div
                      className="w-12 h-12 rounded-full bg-white/10 items-center justify-center"
                      style={{ display: user.urlPhoto ? 'none' : 'flex' }}
                    >
                      <span className="text-lg font-bold text-white/50">{user.name?.[0]}</span>
                    </div>
                  </td>

                  {/* Operador */}
                  <td className="py-5 pr-6">
                    <p className="text-xl font-semibold text-white leading-tight">{user.name}</p>
                    <p className="text-sm text-white/30 mt-0.5">{user.identificationNumber}</p>
                  </td>

                  {/* Máquina em trabalho */}
                  <td className="py-5 pr-6">
                    <p className={`text-lg font-semibold ${proc?.machine?.name ? 'text-white' : 'text-white/30'}`}>
                      {proc?.machine?.name || '—'}
                    </p>
                  </td>

                  {/* Processo Atual */}
                  <td className="py-5 pr-6">
                    {kind
                      ? <p className="text-xl font-semibold text-blue-300">{kind}</p>
                      : <p className="text-xl text-white/20">Nenhum</p>
                    }
                  </td>

                  {/* Tempo de Processo — útil SP; fora expediente não avança; em ocorrência operador = tempo da ocorrência */}
                  <td className="py-5 pr-6">
                    {elapsed != null ? (
                      <div>
                        <p className={`text-3xl font-mono font-bold tabular-nums ${
                          opOcc
                            ? (outsideSp ? 'text-slate-400' : 'text-orange-400')
                            : (outsideSp ? 'text-slate-400' : 'text-white')
                        }`}>
                          {formatTimer(elapsed)}
                        </p>
                        {outsideSp && inProc && (
                          <p className="text-xs text-slate-500 mt-1">Fora do expediente (MS)</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-3xl font-mono font-bold tabular-nums text-white/15">00:00:00</p>
                    )}
                  </td>

                  {/* Tempo Médio — média de todos os processos do usuário */}
                  <td className="py-5 pr-6">
                    <p className="text-2xl font-mono text-white/50">
                      {us?.averageFormatted && us.averageFormatted !== '—'
                        ? us.averageFormatted
                        : <span className="text-white/20 text-xl">—</span>
                      }
                    </p>
                  </td>

                  {/* Ocorrência (operador); tempo útil em SP — fora expediente o contador principal já não soma */}
                  <td className="py-5 pr-6">
                    {opOcc ? (
                      <div>
                        <p className={`text-lg font-semibold ${outsideSp ? 'text-slate-400' : 'text-orange-400'}`}>
                          {user.currentOccurrence?.name || proc?.occurrences?.[0]?.name || 'Em ocorrência'}
                        </p>
                        {outsideSp && (
                          <p className="text-[11px] text-slate-500 mt-0.5">Fora do expediente (MS)</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xl text-white/20">—</p>
                    )}
                  </td>

                  {/* Indicador */}
                  <td className="py-5 pr-10 text-center">
                    <span className={`inline-block w-5 h-5 rounded-full shadow-lg ${
                      isGreen
                        ? 'bg-green-400 shadow-green-400/40'
                        : 'bg-red-500 shadow-red-500/40'
                    }`} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
