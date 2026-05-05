import { useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { Loader2, RefreshCw } from 'lucide-react'
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { formatShortDateTimePtBrSP } from '../../utils/industriaWorkTime'
import { isIndustriaOperatorUser } from '../../utils/industriaUsers'

const PERIODS = {
  day: { label: 'Dia', days: 1 },
  week: { label: 'Semana', days: 7 },
  month: { label: 'Mês', days: 31 },
}

const MACHINE_STATUS = {
  1: 'Aguardando',
  2: 'Em processo',
  3: 'Em ocorrência',
  4: 'Retrabalho',
  5: 'Finalizada',
  6: 'Parada',
}

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16']

function validDate(iso) {
  if (!iso) return false
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) && d.getFullYear() >= 2000
}

function timeToSeconds(v) {
  if (!v || typeof v !== 'string') return 0
  const [h, m, s] = v.split(':').map(Number)
  if ([h, m, s].some(n => Number.isNaN(n))) return 0
  return h * 3600 + m * 60 + s
}

function formatSeconds(total) {
  const secs = Math.max(0, Math.floor(total || 0))
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function formatCurrency(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0)
}

function parseHourCost(raw) {
  if (raw == null || raw === '') return 0
  const parsed = Number(String(raw).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : 0
}

function rangeStart(period) {
  const now = new Date()
  const days = PERIODS[period]?.days ?? 31
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}

export default function IndustriaReportsPage() {
  const [loading, setLoading] = useState(true)
  const [processes, setProcesses] = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [machines, setMachines] = useState([])
  const [users, setUsers] = useState([])

  const [period, setPeriod] = useState('month')
  const [userId, setUserId] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [pr, or, mr, ur] = await Promise.all([
        api.searchProcesses({ page: 1, pageSize: 5000 }),
        api.searchOccurrences({ page: 1, pageSize: 5000 }),
        api.getMachines(),
        api.searchUsersPaginated({ page: 1, pageSize: 1000 }),
      ])
      const allUsers = ur.data?.items || ur.data || []
      const operatorIds = new Set(allUsers.filter(isIndustriaOperatorUser).map(x => x.id))
      const onlyOperatorById = (item) => !item.user || (item.user?.id && operatorIds.has(item.user.id))
      setProcesses((pr.data?.items || []).filter(onlyOperatorById))
      setOccurrences((or.data?.items || []).filter(onlyOperatorById))
      setMachines(mr.data || [])
      setUsers(allUsers.filter(isIndustriaOperatorUser))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const report = useMemo(() => {
    const start = rangeStart(period)

    const inRange = (iso) => validDate(iso) && new Date(iso) >= start
    const byUser = (entity) => !userId || entity.user?.id === userId

    const scopedProcesses = processes.filter(p => byUser(p) && (inRange(p.startDate) || inRange(p.endDate)))
    const scopedOccurrences = occurrences.filter(o => byUser(o) && (inRange(o.startDate) || inRange(o.endDate)))

    const totalProcessSeconds = scopedProcesses.reduce((sum, p) => sum + timeToSeconds(p.processTime), 0)
    const idleSeconds = scopedOccurrences.reduce((sum, o) => sum + timeToSeconds(o.processTime), 0)

    const lossByOccurrenceTypeMap = {}
    const lossByUserMap = {}
    let totalLoss = 0
    let occurrencesWithoutHourCost = 0

    for (const occ of scopedOccurrences) {
      const occSecs = timeToSeconds(occ.processTime)
      const occHours = occSecs / 3600
      const u = users.find(x => x.id === occ.user?.id)
      const hourCost = parseHourCost(u?.workHourCost)
      if (hourCost <= 0) occurrencesWithoutHourCost += 1
      const loss = occHours * hourCost
      totalLoss += loss

      const type = occ.occurrenceType?.name || 'Sem tipo'
      if (!lossByOccurrenceTypeMap[type]) {
        lossByOccurrenceTypeMap[type] = { type, count: 0, idleSeconds: 0, loss: 0 }
      }
      lossByOccurrenceTypeMap[type].count += 1
      lossByOccurrenceTypeMap[type].idleSeconds += occSecs
      lossByOccurrenceTypeMap[type].loss += loss

      const uname = occ.user?.name || 'Sem usuário'
      if (!lossByUserMap[uname]) {
        lossByUserMap[uname] = { user: uname, processes: 0, occurrences: 0, idleSeconds: 0, loss: 0 }
      }
      lossByUserMap[uname].occurrences += 1
      lossByUserMap[uname].idleSeconds += occSecs
      lossByUserMap[uname].loss += loss
    }

    for (const p of scopedProcesses) {
      const uname = p.user?.name || 'Sem usuário'
      if (!lossByUserMap[uname]) {
        lossByUserMap[uname] = { user: uname, processes: 0, occurrences: 0, idleSeconds: 0, loss: 0 }
      }
      lossByUserMap[uname].processes += 1
    }

    const processCountByBucket = {}
    const occurrenceCountByBucket = {}
    const bucketLabel = (iso) => {
      const d = new Date(iso)
      if (period === 'day') return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      if (period === 'week') return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    }
    for (const p of scopedProcesses) {
      const key = bucketLabel(p.startDate || p.endDate)
      processCountByBucket[key] = (processCountByBucket[key] || 0) + 1
    }
    for (const o of scopedOccurrences) {
      const key = bucketLabel(o.startDate || o.endDate)
      occurrenceCountByBucket[key] = (occurrenceCountByBucket[key] || 0) + 1
    }
    const timeline = Object.keys({ ...processCountByBucket, ...occurrenceCountByBucket }).map(label => ({
      label,
      processos: processCountByBucket[label] || 0,
      ocorrencias: occurrenceCountByBucket[label] || 0,
    }))

    const machineStatusCounts = Object.entries(MACHINE_STATUS).map(([status, name]) => ({
      name,
      status: Number(status),
      total: machines.filter(m => m.status === Number(status)).length,
    }))

    const occurrencesMissingCost = scopedOccurrences
      .filter((o) => {
        const u = users.find(x => x.id === o.user?.id)
        return parseHourCost(u?.workHourCost) <= 0
      })
      .map((o) => ({
        code: o.codeOccurrence || '—',
        user: o.user?.name || 'Sem usuário',
        type: o.occurrenceType?.name || 'Sem tipo',
        machine: o.machine?.name || '—',
        start: validDate(o.startDate) ? formatShortDateTimePtBrSP(o.startDate) : '—',
        idle: formatSeconds(timeToSeconds(o.processTime)),
      }))

    const openOccurrences = occurrences.filter(o => !o.finished)
    const machineReasonsMap = {}
    for (const o of openOccurrences) {
      const reason = o.occurrenceType?.name || o.description || 'Sem motivo'
      if (!machineReasonsMap[reason]) machineReasonsMap[reason] = { reason, total: 0 }
      machineReasonsMap[reason].total += 1
    }

    return {
      scopedProcesses,
      scopedOccurrences,
      totalProcessSeconds,
      idleSeconds,
      totalLoss,
      occurrencesWithoutHourCost,
      occurrencesMissingCost,
      timeline,
      machineStatusCounts,
      lossByOccurrenceType: Object.values(lossByOccurrenceTypeMap).sort((a, b) => b.loss - a.loss),
      perUser: Object.values(lossByUserMap).sort((a, b) => b.loss - a.loss),
      machineReasons: Object.values(machineReasonsMap).sort((a, b) => b.total - a.total),
    }
  }, [period, userId, users, processes, occurrences, machines])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-400">Processos e ocorrências por período, usuário e impacto financeiro</p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-blue-400"
        >
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Período</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          >
            {Object.entries(PERIODS).map(([key, value]) => (
              <option key={key} value={key}>{value.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Usuário</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric label="Processos no período" value={report.scopedProcesses.length} />
        <Metric label="Ocorrências no período" value={report.scopedOccurrences.length} />
        <Metric label="Tempo ocioso total" value={formatSeconds(report.idleSeconds)} />
        <Metric label="Perda estimada" value={formatCurrency(report.totalLoss)} />
        <Metric label="Ocorrências sem custo/h" value={report.occurrencesWithoutHourCost} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Processos x Ocorrências ({PERIODS[period].label})</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={report.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="processos" fill="#3b82f6" name="Processos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ocorrencias" fill="#f97316" name="Ocorrências" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Status das Máquinas</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={report.machineStatusCounts.filter(x => x.total > 0)} dataKey="total" nameKey="name" outerRadius={90} label>
                {report.machineStatusCounts.filter(x => x.total > 0).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableCard
          title="Ociosidade e custo por tipo de ocorrência"
          headers={['Tipo', 'Qtd', 'Tempo ocioso', 'Perda estimada']}
          rows={report.lossByOccurrenceType.map(item => ([
            item.type,
            item.count,
            formatSeconds(item.idleSeconds),
            formatCurrency(item.loss),
          ]))}
        />

        <TableCard
          title="Produtividade por usuário"
          headers={['Usuário', 'Processos', 'Ocorrências', 'Tempo ocioso', 'Perda']}
          rows={report.perUser.map(item => ([
            item.user,
            item.processes,
            item.occurrences,
            formatSeconds(item.idleSeconds),
            formatCurrency(item.loss),
          ]))}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Motivos de máquinas em ocorrência (abertas)</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.machineReasons.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma ocorrência aberta no momento.</p>
          ) : report.machineReasons.map(item => (
            <div key={item.reason} className="border border-slate-100 rounded-xl p-3">
              <p className="text-sm text-slate-700 font-medium">{item.reason}</p>
              <p className="text-xs text-slate-400 mt-1">{item.total} máquina(s) impactada(s)</p>
            </div>
          ))}
        </div>
      </div>

      <TableCard
        title="Ocorrências sem custo/hora cadastrado"
        headers={['Código', 'Operador', 'Tipo', 'Máquina', 'Início', 'Tempo']}
        rows={report.occurrencesMissingCost.map(item => ([
          item.code,
          item.user,
          item.type,
          item.machine,
          item.start,
          item.idle,
        ]))}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Totais de máquinas por status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {report.machineStatusCounts.map(s => (
            <div key={s.status} className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">{s.name}</p>
              <p className="text-xl font-bold text-slate-800">{s.total}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Resumo operacional</h2>
        <p className="text-sm text-slate-600">
          Tempo produtivo: <span className="font-semibold text-blue-600">{formatSeconds(report.totalProcessSeconds)}</span> ·
          Tempo ocioso: <span className="font-semibold text-orange-600"> {formatSeconds(report.idleSeconds)}</span> ·
          Potencial não aproveitado: <span className="font-semibold text-red-600"> {formatCurrency(report.totalLoss)}</span>
        </p>
      </div>
    </div>
  )
}

function Metric({ label, value }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  )
}

function TableCard({ title, headers, rows }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 overflow-x-auto">
      <h2 className="text-sm font-semibold text-slate-700 mb-4">{title}</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100">
            {headers.map(h => (
              <th key={h} className="text-left py-2 text-xs uppercase tracking-wide text-slate-500">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="py-4 text-slate-400 text-sm">Sem dados no período.</td></tr>
          ) : rows.map((cols, i) => (
            <tr key={i} className="border-b border-slate-50 last:border-0">
              {cols.map((v, idx) => (
                <td key={`${i}-${idx}`} className="py-2 text-slate-700">{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
