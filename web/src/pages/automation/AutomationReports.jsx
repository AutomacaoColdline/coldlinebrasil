import { useEffect, useState } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Loader2, RefreshCw, BarChart2 } from 'lucide-react'
import { automationApi } from '../../services/automationApi'

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS  = ['#06b6d4','#f97316','#10b981','#8b5cf6','#f59e0b','#ef4444']

function StatCard({ label, value, color }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-600">{label}</span>
      <span className={`text-lg font-bold ${color}`}>{value}</span>
    </div>
  )
}

export default function AutomationReports() {
  const [processes,   setProcesses]   = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [loading, setLoading]         = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [pr, or] = await Promise.all([
        automationApi.getProcesses({ page: 1, pageSize: 1000 }),
        automationApi.getOccurrences({ page: 1, pageSize: 1000 }),
      ])
      setProcesses(pr.data?.items || [])
      setOccurrences(or.data?.items || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const procsByDay = Object.entries(
    processes.reduce((acc, p) => {
      if (!p.startDate) return acc
      const key = new Date(p.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).slice(-30).map(([date, count]) => ({ date, count }))

  const occsByDay = Object.entries(
    occurrences.reduce((acc, o) => {
      if (!o.startDate) return acc
      const key = new Date(o.startDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      acc[key] = (acc[key] || 0) + 1
      return acc
    }, {})
  ).slice(-30).map(([date, count]) => ({ date, count }))

  const byMonth = MONTHS.map((month, i) => ({
    month,
    processos:   processes.filter(p => p.startDate && new Date(p.startDate).getMonth() === i).length,
    ocorrencias: occurrences.filter(o => o.startDate && new Date(o.startDate).getMonth() === i).length,
  }))

  const comOcc = processes.filter(p => p.occurrences?.length > 0).length
  const semOcc = processes.length - comOcc
  const rateData = [
    { name: 'Com ocorrência', value: comOcc },
    { name: 'Sem ocorrência', value: semOcc },
  ]

  const avgSeconds = processes.length > 0
    ? Math.round(processes.reduce((a, p) => a + (p.totalSeconds || 0), 0) / processes.length)
    : 0
  const fmtAvg = avgSeconds > 0
    ? `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s`
    : '—'

  if (loading) return (
    <div className="flex justify-center items-center h-64">
      <Loader2 size={24} className="animate-spin text-slate-300" />
    </div>
  )

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-400">{processes.length} processos · {occurrences.length} ocorrências</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 hover:border-cyan-400">
          <RefreshCw size={14} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Processos por dia */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Processos por Dia (últimos 30)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={procsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} dot={false} name="Processos" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Ocorrências por dia */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Ocorrências por Dia (últimos 30)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={occsByDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#f97316" strokeWidth={2} dot={false} name="Ocorrências" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Comparativo mensal */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-4">Comparativo Mensal</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={byMonth}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="processos"   fill="#06b6d4" radius={[4,4,0,0]} name="Processos" />
              <Bar dataKey="ocorrencias" fill="#f97316" radius={[4,4,0,0]} name="Ocorrências" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Taxa + Resumo */}
        <div className="grid grid-rows-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Taxa de Ocorrências</h2>
            <div className="flex items-center gap-6">
              <ResponsiveContainer width="50%" height={120}>
                <PieChart>
                  <Pie data={rateData} cx="50%" cy="50%" outerRadius={50} innerRadius={25} dataKey="value">
                    {rateData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {rateData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i] }} />
                    <span className="text-slate-600">{d.name}</span>
                    <span className="font-bold text-slate-800 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Resumo</h2>
            <StatCard label="Total de Processos"   value={processes.length}   color="text-cyan-600"   />
            <StatCard label="Total de Ocorrências" value={occurrences.length} color="text-orange-600" />
            <StatCard label="Tempo médio/processo" value={fmtAvg}             color="text-slate-700"  />
            <StatCard label="Taxa de ocorrência"
              value={processes.length > 0 ? `${((comOcc/processes.length)*100).toFixed(1)}%` : '0%'}
              color="text-red-500" />
          </div>
        </div>
      </div>
    </div>
  )
}
