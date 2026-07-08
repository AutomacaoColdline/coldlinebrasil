import { useEffect, useState, useCallback } from 'react'
import { atendimentoApi } from '../../services/atendimentoApi'
import { useNavigate } from 'react-router-dom'
import {
  Headphones, RefreshCw, BarChart3, ListChecks, Activity, Clock,
  TrendingUp, Users, Wrench, Building2, AlertTriangle, CheckCircle, FileText,
} from 'lucide-react'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts'

const STATUS_LABEL = {
  ABERTO: 'Aberto',
  EM_ANDAMENTO: 'Em andamento',
  AGUARDANDO_CLIENTE: 'Aguardando cliente',
  AGUARDANDO_PECA: 'Aguardando peça',
  RESOLVIDO: 'Resolvido',
  ENCERRADO: 'Encerrado',
}

const COLORS = {
  ABERTO: '#3b82f6',
  EM_ANDAMENTO: '#eab308',
  AGUARDANDO_CLIENTE: '#a855f7',
  AGUARDANDO_PECA: '#f97316',
  RESOLVIDO: '#10b981',
  ENCERRADO: '#64748b',
}

function fmtMinutes(m) {
  if (!m || m <= 0) return '—'
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  if (h > 0) return `${h}h ${min}min`
  return `${min}min`
}

function KpiCard({ label, value, icon: Icon, color, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}>
          <Icon size={15} className="text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

export default function AutomationAtendimentoDashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const r = await atendimentoApi.dashboard()
      setData(r.data)
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao carregar dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RefreshCw size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <AlertTriangle size={24} className="text-red-500 mx-auto mb-2" />
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={load}
            className="mt-3 text-xs px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  const d = data || {}
  const statusData = (d.byStatus || []).map(s => ({
    name: STATUS_LABEL[s.status] || s.status,
    value: s.count,
    color: COLORS[s.status] || '#94a3b8',
  }))
  const techData = (d.byTechnician || []).map(t => ({ name: t.name || '—', value: t.count }))
  const clientData = (d.byClient || []).map(c => ({ name: c.name || '—', value: c.count }))
  const monthData = (d.byMonth || []).map(m => ({ name: m.month, value: m.count }))
  const causeData = (d.byCause || []).map(c => ({ name: c.cause?.length > 30 ? c.cause.slice(0, 28) + '…' : c.cause, value: c.count }))
  const equipData = (d.byEquipment || []).map(e => ({ name: e.equipment, value: e.count }))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-cyan-600" />
            Indicadores de Atendimentos
          </h1>
          <p className="text-sm text-slate-400">Visão geral e métricas de desempenho técnico</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/automation/atendimentos')}
            className="text-xs px-3 py-2 border border-slate-200 text-slate-600 rounded-lg hover:border-cyan-400 hover:text-cyan-600 flex items-center gap-1"
          >
            <ListChecks size={13} /> Listar atendimentos
          </button>
          <button
            onClick={load}
            className="text-xs px-3 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 flex items-center gap-1"
          >
            <RefreshCw size={13} /> Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Total de Atendimentos" value={d.total || 0} icon={Headphones} color="bg-cyan-500" />
        <KpiCard label="Em Aberto"              value={d.open || 0}   icon={Activity}     color="bg-amber-500" sub={`${d.total ? Math.round((d.open / d.total) * 100) : 0}% do total`} />
        <KpiCard label="Encerrados"             value={d.closed || 0} icon={CheckCircle}  color="bg-emerald-500" sub={`${d.total ? Math.round((d.closed / d.total) * 100) : 0}% do total`} />
        <KpiCard
          label="Tempo Médio de Resolução"
          value={fmtMinutes(d.avgResolutionMinutes)}
          icon={Clock}
          color="bg-indigo-500"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Status (Pie) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Activity size={14} className="text-cyan-600" /> Distribuição por Status
          </h3>
          {statusData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={50}
                  paddingAngle={2}
                >
                  {statusData.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Por mês (Area) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp size={14} className="text-cyan-600" /> Atendimentos por Mês
          </h3>
          {monthData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={monthData}>
                <defs>
                  <linearGradient id="colorMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" style={{ fontSize: 10 }} />
                <YAxis style={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Area type="monotone" dataKey="value" stroke="#06b6d4" fillOpacity={1} fill="url(#colorMonth)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Por técnico (Bar) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Users size={14} className="text-cyan-600" /> Atendimentos por Técnico
          </h3>
          {techData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={techData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" style={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" style={{ fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#06b6d4" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>

        {/* Por cliente (Bar) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Building2 size={14} className="text-cyan-600" /> Atendimentos por Cliente
          </h3>
          {clientData.length ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={clientData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" style={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" style={{ fontSize: 10 }} width={100} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </div>
      </div>

      {/* Charts Row 3 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Causas (Bar) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} className="text-amber-600" /> Principais Causas de Falha
          </h3>
          {causeData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, causeData.length * 28)}>
              <BarChart data={causeData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" style={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" style={{ fontSize: 10 }} width={150} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#f59e0b" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Sem diagnósticos registrados" />}
        </div>

        {/* Equipamentos (Bar) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <Wrench size={14} className="text-cyan-600" /> Equipamentos com Mais Ocorrências
          </h3>
          {equipData.length ? (
            <ResponsiveContainer width="100%" height={Math.max(220, equipData.length * 28)}>
              <BarChart data={equipData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" style={{ fontSize: 10 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" style={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart message="Sem equipamentos registrados" />}
        </div>
      </div>
    </div>
  )
}

function EmptyChart({ message = 'Sem dados suficientes' }) {
  return (
    <div className="h-[200px] flex flex-col items-center justify-center text-slate-300">
      <BarChart3 size={32} className="mb-2" />
      <p className="text-xs">{message}</p>
    </div>
  )
}
