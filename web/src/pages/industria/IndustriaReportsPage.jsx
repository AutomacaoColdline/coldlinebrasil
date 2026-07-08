import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../../services/api'
import { ChevronLeft, ChevronRight, Loader2, RefreshCw } from 'lucide-react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  formatDateTimePtBrSP,
  formatShortDateTimePtBrSP,
  workingSeconds,
  parseProcessDate,
} from '../../utils/industriaWorkTime'
import { isSystemOutOfShiftOccurrence } from '../../utils/industriaOccurrences'
import { isIndustriaOperatorUser } from '../../utils/industriaUsers'

const PERIODS = {
  day: { label: 'Dia' },
  week: { label: 'Semana' },
  month: { label: 'Mes' },
}

const MACHINE_STATUS = {
  1: 'Aguardando',
  2: 'Em processo',
  3: 'Em ocorrencia',
  4: 'Retrabalho',
  5: 'Finalizada',
  6: 'Parada',
}

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#84cc16']
const DAY_MS = 24 * 60 * 60 * 1000

function validDate(iso) {
  if (!iso) return false
  const d = new Date(iso)
  return Number.isFinite(d.getTime()) && d.getFullYear() >= 2000
}

function timeToSeconds(v) {
  if (!v || typeof v !== 'string') return 0
  const [h, m, s] = v.split(':').map(Number)
  if ([h, m, s].some((n) => Number.isNaN(n))) return 0
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

function startOfDay(date) {
  const value = new Date(date)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfDay(date) {
  const value = new Date(date)
  value.setHours(23, 59, 59, 999)
  return value
}

function startOfWeek(date) {
  const value = startOfDay(date)
  const day = value.getDay()
  const offset = day === 0 ? -6 : 1 - day
  value.setDate(value.getDate() + offset)
  return value
}

function endOfWeek(date) {
  const value = startOfWeek(date)
  value.setDate(value.getDate() + 6)
  return endOfDay(value)
}

function startOfMonth(date) {
  const value = new Date(date.getFullYear(), date.getMonth(), 1)
  value.setHours(0, 0, 0, 0)
  return value
}

function endOfMonth(date) {
  const value = new Date(date.getFullYear(), date.getMonth() + 1, 0)
  value.setHours(23, 59, 59, 999)
  return value
}

function shiftAnchorDate(date, period, direction) {
  const value = new Date(date)
  if (period === 'day') value.setDate(value.getDate() + direction)
  if (period === 'week') value.setDate(value.getDate() + direction * 7)
  if (period === 'month') value.setMonth(value.getMonth() + direction)
  return value
}

function getPeriodBounds(period, anchorDate) {
  if (period === 'day') {
    const start = startOfDay(anchorDate)
    const end = endOfDay(anchorDate)
    return {
      start,
      end,
      title: anchorDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }),
      subtitle: 'Visao diaria consolidada.',
    }
  }

  if (period === 'week') {
    const start = startOfWeek(anchorDate)
    const end = endOfWeek(anchorDate)
    return {
      start,
      end,
      title: `${start.toLocaleDateString('pt-BR')} ate ${end.toLocaleDateString('pt-BR')}`,
      subtitle: 'Semana completa com 7 dias, inclusive sem movimento.',
    }
  }

  const start = startOfMonth(anchorDate)
  const end = endOfMonth(anchorDate)
  return {
    start,
    end,
    title: anchorDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
    subtitle: 'Mes completo com todos os dias do calendario.',
  }
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function buildDayBuckets(start, end, period) {
  const buckets = []
  let cursor = startOfDay(start)

  while (cursor.getTime() <= end.getTime()) {
    const value = new Date(cursor)
    const fullLabel = value.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })

    buckets.push({
      key: toDateKey(value),
      date: value,
      label: period === 'month'
        ? value.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
        : value.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
      fullLabel,
      processos: 0,
      ocorrencias: 0,
      processSeconds: 0,
      idleSeconds: 0,
      loss: 0,
      processes: [],
      occurrences: [],
    })

    cursor = new Date(cursor.getTime() + DAY_MS)
  }

  return buckets
}

function overlapsRange(startIso, endIso, rangeStart, rangeEnd) {
  const start = parseProcessDate(startIso)
  if (!start || Number.isNaN(start.getTime())) return false

  const end = endIso ? parseProcessDate(endIso) : null
  const endTime = end && !Number.isNaN(end.getTime()) ? end.getTime() : Date.now()

  return start.getTime() <= rangeEnd.getTime() && endTime >= rangeStart.getTime()
}

function clampBucketDate(iso, rangeStart, rangeEnd) {
  const parsed = parseProcessDate(iso)
  if (!parsed || Number.isNaN(parsed.getTime())) return null

  const clampedTime = Math.min(Math.max(parsed.getTime(), rangeStart.getTime()), rangeEnd.getTime())
  return startOfDay(new Date(clampedTime))
}

async function fetchAllPages(fetcher, params = {}, pageSize = 500) {
  const firstResponse = await fetcher({ ...params, page: 1, pageSize })
  const firstItems = firstResponse.data?.items || firstResponse.data || []
  const totalPages = firstResponse.data?.totalPages || 1

  if (totalPages <= 1) return firstItems

  const remainingResponses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetcher({ ...params, page: index + 2, pageSize })),
  )

  return firstItems.concat(
    remainingResponses.flatMap((response) => response.data?.items || response.data || []),
  )
}

export default function IndustriaReportsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [processes, setProcesses] = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [occurrenceTypes, setOccurrenceTypes] = useState([])
  const [machines, setMachines] = useState([])
  const [users, setUsers] = useState([])
  const [nowMs, setNowMs] = useState(Date.now())
  const [period, setPeriod] = useState('month')
  const [userId, setUserId] = useState('')
  const [anchorDate, setAnchorDate] = useState(() => new Date())
  const [selectedDayKey, setSelectedDayKey] = useState('')

  const periodBounds = useMemo(
    () => getPeriodBounds(period, anchorDate),
    [period, anchorDate],
  )

  const load = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true)
    else setRefreshing(true)

    try {
      const rangeParams = {
        rangeStart: periodBounds.start.toISOString(),
        rangeEnd: periodBounds.end.toISOString(),
      }

      const [allUsers, processItems, occurrenceItems, machinesRes, occurrenceTypesRes] = await Promise.all([
        fetchAllPages(api.searchUsersPaginated, {}, 100),
        fetchAllPages(api.searchProcesses, rangeParams, 500),
        fetchAllPages(api.searchOccurrences, rangeParams, 500),
        api.getMachines(),
        api.getOccurrenceTypes(),
      ])

      const operatorUsers = allUsers.filter(isIndustriaOperatorUser)
      const operatorIds = new Set(operatorUsers.map((item) => item.id))
      const onlyOperatorById = (item) => !item.user || (item.user?.id && operatorIds.has(item.user.id))

      setProcesses(processItems.filter(onlyOperatorById))
      setOccurrences(occurrenceItems.filter(onlyOperatorById))
      setOccurrenceTypes(occurrenceTypesRes.data || [])
      setMachines(machinesRes.data || [])
      setUsers(operatorUsers)
    } finally {
      if (showLoader) setLoading(false)
      else setRefreshing(false)
    }
  }, [periodBounds.end, periodBounds.start])

  useEffect(() => {
    load(true)
  }, [load])

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const report = useMemo(() => {
    const rangeStart = periodBounds.start
    const rangeEnd = periodBounds.end

    const byUser = (entity) => !userId || entity.user?.id === userId

    const validOccurrenceTypes = occurrenceTypes.filter(
      (item) => !String(item?.name || '').toLowerCase().includes('sistema - fora do expediente'),
    )
    const validOccurrenceTypeIds = new Set(validOccurrenceTypes.map((item) => item?.id).filter(Boolean))
    const occurrenceTypeNameById = new Map(
      validOccurrenceTypes
        .filter((item) => item?.id && String(item?.name || '').trim() !== '')
        .map((item) => [item.id, item.name]),
    )

    const scopedProcesses = processes.filter(
      (item) => byUser(item) && overlapsRange(item.startDate, item.endDate, rangeStart, rangeEnd),
    )
    const scopedOccurrences = occurrences.filter(
      (item) =>
        byUser(item) &&
        overlapsRange(item.startDate, item.endDate, rangeStart, rangeEnd) &&
        validOccurrenceTypeIds.has(item?.occurrenceType?.id) &&
        occurrenceTypeNameById.has(item?.occurrenceType?.id) &&
        !isSystemOutOfShiftOccurrence(item),
    )

    const processSeconds = (item) => {
      if (item.finished) return timeToSeconds(item.processTime)
      const startDate = parseProcessDate(item.startDate)
      if (!startDate || Number.isNaN(startDate.getTime())) return 0
      const occStart = parseProcessDate(item.occurrenceStartDate)
      const pausedAt = item.inOccurrence && occStart && !Number.isNaN(occStart.getTime()) ? occStart.getTime() : nowMs
      return Math.max(0, workingSeconds(startDate.getTime(), pausedAt) - (item.totalOccurrenceSeconds || 0))
    }

    const occurrenceSeconds = (item) => {
      if (item.finished) return timeToSeconds(item.processTime)
      const startDate = parseProcessDate(item.startDate)
      if (!startDate || Number.isNaN(startDate.getTime())) return 0
      return workingSeconds(startDate.getTime(), nowMs)
    }

    const totalProcessSeconds = scopedProcesses.reduce((sum, item) => sum + processSeconds(item), 0)
    const idleSeconds = scopedOccurrences.reduce((sum, item) => sum + occurrenceSeconds(item), 0)

    const lossByOccurrenceTypeMap = {}
    const lossByUserMap = {}
    let totalLoss = 0
    let occurrencesWithoutHourCost = 0

    const dailyBuckets = buildDayBuckets(rangeStart, rangeEnd, period)
    const bucketMap = new Map(dailyBuckets.map((item) => [item.key, item]))

    for (const occ of scopedOccurrences) {
      const occSecs = occurrenceSeconds(occ)
      const occHours = occSecs / 3600
      const user = users.find((item) => item.id === occ.user?.id)
      const hourCost = parseHourCost(user?.workHourCost)
      if (hourCost <= 0) occurrencesWithoutHourCost += 1

      const loss = occHours * hourCost
      totalLoss += loss

      const type = occurrenceTypeNameById.get(occ?.occurrenceType?.id)
      if (type) {
        if (!lossByOccurrenceTypeMap[type]) {
          lossByOccurrenceTypeMap[type] = { type, count: 0, idleSeconds: 0, loss: 0 }
        }
        lossByOccurrenceTypeMap[type].count += 1
        lossByOccurrenceTypeMap[type].idleSeconds += occSecs
        lossByOccurrenceTypeMap[type].loss += loss
      }

      const userName = occ.user?.name || 'Sem usuario'
      if (!lossByUserMap[userName]) {
        lossByUserMap[userName] = { user: userName, processes: 0, occurrences: 0, idleSeconds: 0, loss: 0 }
      }
      lossByUserMap[userName].occurrences += 1
      lossByUserMap[userName].idleSeconds += occSecs
      lossByUserMap[userName].loss += loss

      const bucketDate = clampBucketDate(occ.startDate || occ.endDate, rangeStart, rangeEnd)
      const bucket = bucketDate ? bucketMap.get(toDateKey(bucketDate)) : null
      if (bucket) {
        bucket.ocorrencias += 1
        bucket.idleSeconds += occSecs
        bucket.loss += loss
        bucket.occurrences.push({
          id: occ.id,
          code: occ.codeOccurrence || '-',
          user: occ.user?.name || 'Sem usuario',
          type: occ.occurrenceType?.name || 'Sem tipo',
          machine: occ.machine?.name || '-',
          start: formatDateTimePtBrSP(occ.startDate),
          duration: formatSeconds(occSecs),
          status: occ.finished ? 'Finalizada' : 'Em andamento',
        })
      }
    }

    for (const proc of scopedProcesses) {
      const secs = processSeconds(proc)
      const userName = proc.user?.name || 'Sem usuario'
      if (!lossByUserMap[userName]) {
        lossByUserMap[userName] = { user: userName, processes: 0, occurrences: 0, idleSeconds: 0, loss: 0 }
      }
      lossByUserMap[userName].processes += 1

      const bucketDate = clampBucketDate(proc.startDate || proc.endDate, rangeStart, rangeEnd)
      const bucket = bucketDate ? bucketMap.get(toDateKey(bucketDate)) : null
      if (bucket) {
        bucket.processos += 1
        bucket.processSeconds += secs
        bucket.processes.push({
          id: proc.id,
          code: proc.identificationNumber || '-',
          user: proc.user?.name || 'Sem usuario',
          type: proc.processType?.name || 'Sem tipo',
          machine: proc.machine?.name || '-',
          start: formatDateTimePtBrSP(proc.startDate),
          duration: formatSeconds(secs),
          status: proc.finished ? 'Finalizado' : proc.inOccurrence ? 'Em ocorrencia' : 'Em andamento',
        })
      }
    }

    for (const bucket of dailyBuckets) {
      bucket.processes.sort((a, b) => b.start.localeCompare(a.start))
      bucket.occurrences.sort((a, b) => b.start.localeCompare(a.start))
    }

    const timeline = dailyBuckets.map((bucket) => ({
      label: bucket.label,
      processos: bucket.processos,
      ocorrencias: bucket.ocorrencias,
    }))

    const machineStatusCounts = Object.entries(MACHINE_STATUS).map(([status, name]) => ({
      name,
      status: Number(status),
      total: machines.filter((item) => item.status === Number(status)).length,
    }))

    const occurrencesMissingCost = scopedOccurrences
      .filter((item) => {
        const user = users.find((value) => value.id === item.user?.id)
        return parseHourCost(user?.workHourCost) <= 0
      })
      .map((item) => ({
        code: item.codeOccurrence || '-',
        user: item.user?.name || 'Sem usuario',
        type: item.occurrenceType?.name || 'Sem tipo',
        machine: item.machine?.name || '-',
        start: validDate(item.startDate) ? formatShortDateTimePtBrSP(item.startDate) : '-',
        idle: formatSeconds(occurrenceSeconds(item)),
      }))

    const machineReasonsMap = {}
    for (const item of scopedOccurrences.filter((occ) => !occ.finished)) {
      const reason = item.occurrenceType?.name || item.description || 'Sem motivo'
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
      dailyBreakdown: dailyBuckets,
      machineStatusCounts,
      lossByOccurrenceType: Object.values(lossByOccurrenceTypeMap).sort((a, b) => b.loss - a.loss),
      perUser: Object.values(lossByUserMap).sort((a, b) => b.loss - a.loss),
      machineReasons: Object.values(machineReasonsMap).sort((a, b) => b.total - a.total),
    }
  }, [period, userId, users, processes, occurrences, occurrenceTypes, machines, nowMs, periodBounds.end, periodBounds.start])

  useEffect(() => {
    if (!users.some((item) => item.id === userId)) {
      setUserId('')
    }
  }, [userId, users])

  useEffect(() => {
    if (report.dailyBreakdown.length === 0) {
      if (selectedDayKey !== '') setSelectedDayKey('')
      return
    }

    const existing = report.dailyBreakdown.some((item) => item.key === selectedDayKey)
    if (existing) return

    const todayKey = toDateKey(new Date())
    const fallback = report.dailyBreakdown.find((item) => item.key === todayKey)?.key || report.dailyBreakdown[0].key
    setSelectedDayKey(fallback)
  }, [report.dailyBreakdown, selectedDayKey])

  const selectedDay = report.dailyBreakdown.find((item) => item.key === selectedDayKey) || report.dailyBreakdown[0] || null

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatorios</h1>
          <p className="text-sm text-slate-400">Processos e ocorrencias consolidados por periodo, usuario e impacto financeiro.</p>
        </div>
        <button
          onClick={() => load(false)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-blue-400 disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> Atualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 grid grid-cols-1 lg:grid-cols-[220px,1fr,260px] gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Periodo</label>
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

        <div className="rounded-2xl border border-slate-100 p-3 bg-slate-50">
          <p className="text-xs text-slate-500">Janela selecionada</p>
          <p className="text-base font-semibold text-slate-900 mt-1 capitalize">{periodBounds.title}</p>
          <p className="text-xs text-slate-500 mt-1">{periodBounds.subtitle}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <button
              onClick={() => setAnchorDate((current) => shiftAnchorDate(current, period, -1))}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-400"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              onClick={() => setAnchorDate(new Date())}
              className="inline-flex items-center px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-400"
            >
              Hoje
            </button>
            <button
              onClick={() => setAnchorDate((current) => shiftAnchorDate(current, period, 1))}
              className="inline-flex items-center gap-1 px-3 py-2 text-sm rounded-xl border border-slate-200 bg-white text-slate-600 hover:border-blue-400"
            >
              Proximo <ChevronRight size={14} />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs text-slate-500 mb-1">Usuario</label>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          >
            <option value="">Todos</option>
            {users.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Metric label="Processos no periodo" value={report.scopedProcesses.length} />
        <Metric label="Ocorrencias no periodo" value={report.scopedOccurrences.length} />
        <Metric label="Tempo produtivo" value={formatSeconds(report.totalProcessSeconds)} />
        <Metric label="Tempo ocioso" value={formatSeconds(report.idleSeconds)} />
        <Metric label="Perda estimada" value={formatCurrency(report.totalLoss)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Processos x ocorrencias por dia</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={report.timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} angle={report.timeline.length > 10 ? -35 : 0} textAnchor={report.timeline.length > 10 ? 'end' : 'middle'} height={report.timeline.length > 10 ? 70 : 30} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="processos" fill="#3b82f6" name="Processos" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ocorrencias" fill="#f97316" name="Ocorrencias" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Status das maquinas</h2>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={report.machineStatusCounts.filter((item) => item.total > 0)} dataKey="total" nameKey="name" outerRadius={90} label>
                {report.machineStatusCounts.filter((item) => item.total > 0).map((_, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <TableCard
        title="Detalhamento diario do periodo"
        headers={['Dia', 'Processos', 'Ocorrencias', 'Tempo produtivo', 'Tempo ocioso', 'Perda', 'Analise']}
        rows={report.dailyBreakdown.map((item) => ([
          item.fullLabel,
          item.processos,
          item.ocorrencias,
          formatSeconds(item.processSeconds),
          formatSeconds(item.idleSeconds),
          formatCurrency(item.loss),
          <button
            key={`day-${item.key}`}
            onClick={() => setSelectedDayKey(item.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
              selectedDayKey === item.key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
            }`}
          >
            Ver dia
          </button>,
        ]))}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Analise detalhada do dia</h2>
            <p className="text-sm text-slate-500 mt-1">{selectedDay?.fullLabel || 'Sem dia selecionado.'}</p>
          </div>
          {selectedDay && (
            <div className="flex gap-2 flex-wrap">
              <Pill label={`${selectedDay.processos} processos`} />
              <Pill label={`${selectedDay.ocorrencias} ocorrencias`} />
              <Pill label={`Produtivo ${formatSeconds(selectedDay.processSeconds)}`} />
              <Pill label={`Ocioso ${formatSeconds(selectedDay.idleSeconds)}`} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <DetailList
            title="Processos do dia"
            emptyLabel="Nenhum processo registrado neste dia."
            items={(selectedDay?.processes || []).map((item) => ({
              id: item.id,
              title: `${item.code} - ${item.type}`,
              subtitle: `${item.user} · ${item.machine}`,
              meta: `${item.start} · ${item.duration} · ${item.status}`,
            }))}
          />

          <DetailList
            title="Ocorrencias do dia"
            emptyLabel="Nenhuma ocorrencia registrada neste dia."
            items={(selectedDay?.occurrences || []).map((item) => ({
              id: item.id,
              title: `${item.code} - ${item.type}`,
              subtitle: `${item.user} · ${item.machine}`,
              meta: `${item.start} · ${item.duration} · ${item.status}`,
            }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TableCard
          title="Ociosidade e custo por tipo de ocorrencia"
          headers={['Tipo', 'Qtd', 'Tempo ocioso', 'Perda estimada']}
          rows={report.lossByOccurrenceType.map((item) => ([
            item.type,
            item.count,
            formatSeconds(item.idleSeconds),
            formatCurrency(item.loss),
          ]))}
        />

        <TableCard
          title="Produtividade por usuario"
          headers={['Usuario', 'Processos', 'Ocorrencias', 'Tempo ocioso', 'Perda']}
          rows={report.perUser.map((item) => ([
            item.user,
            item.processes,
            item.occurrences,
            formatSeconds(item.idleSeconds),
            formatCurrency(item.loss),
          ]))}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Motivos de maquinas em ocorrencia no periodo</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {report.machineReasons.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhuma ocorrencia aberta dentro da janela selecionada.</p>
          ) : report.machineReasons.map((item) => (
            <div key={item.reason} className="border border-slate-100 rounded-xl p-3">
              <p className="text-sm text-slate-700 font-medium">{item.reason}</p>
              <p className="text-xs text-slate-400 mt-1">{item.total} maquina(s) impactada(s)</p>
            </div>
          ))}
        </div>
      </div>

      <TableCard
        title="Ocorrencias sem custo/hora cadastrado"
        headers={['Codigo', 'Operador', 'Tipo', 'Maquina', 'Inicio', 'Tempo']}
        rows={report.occurrencesMissingCost.map((item) => ([
          item.code,
          item.user,
          item.type,
          item.machine,
          item.start,
          item.idle,
        ]))}
      />

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Totais de maquinas por status</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {report.machineStatusCounts.map((item) => (
            <div key={item.status} className="rounded-xl border border-slate-100 p-3">
              <p className="text-xs text-slate-500">{item.name}</p>
              <p className="text-xl font-bold text-slate-800">{item.total}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">Resumo operacional</h2>
        <p className="text-sm text-slate-600 leading-relaxed">
          Tempo produtivo: <span className="font-semibold text-blue-600">{formatSeconds(report.totalProcessSeconds)}</span> ·
          Tempo ocioso: <span className="font-semibold text-orange-600"> {formatSeconds(report.idleSeconds)}</span> ·
          Potencial nao aproveitado: <span className="font-semibold text-red-600"> {formatCurrency(report.totalLoss)}</span> ·
          Ocorrencias sem custo/hora: <span className="font-semibold text-slate-900"> {report.occurrencesWithoutHourCost}</span>
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

function Pill({ label }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">
      {label}
    </span>
  )
}

function DetailList({ title, emptyLabel, items }) {
  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="rounded-xl border border-slate-100 p-3">
              <p className="text-sm font-medium text-slate-800">{item.title}</p>
              <p className="text-xs text-slate-500 mt-1">{item.subtitle}</p>
              <p className="text-xs text-slate-400 mt-2">{item.meta}</p>
            </div>
          ))}
        </div>
      )}
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
            {headers.map((header) => (
              <th key={header} className="text-left py-2 text-xs uppercase tracking-wide text-slate-500">{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={headers.length} className="py-4 text-slate-400 text-sm">Sem dados no periodo.</td></tr>
          ) : rows.map((cols, index) => (
            <tr key={index} className="border-b border-slate-50 last:border-0 align-top">
              {cols.map((value, valueIndex) => (
                <td key={`${index}-${valueIndex}`} className="py-2 text-slate-700">{value}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
