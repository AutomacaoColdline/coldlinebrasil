import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import { ClipboardList, Loader2, TrendingUp, AlertTriangle, Activity } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

const COLORS = ['#1E5FAF', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={18} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [machines, setMachines] = useState([])
  const [processes, setProcesses] = useState([])
  const [occurrences, setOccurrences] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.getMachines(), api.getProcesses(), api.getOccurrences()])
      .then(([mr, pr, or]) => {
        setMachines(mr.data || [])
        setProcesses(pr.data || [])
        setOccurrences(or.data || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const machineStatusData = [
    { name: 'Aguardando', value: machines.filter(m => m.status === 1).length },
    { name: 'Em Progresso', value: machines.filter(m => m.status === 2).length },
    { name: 'Ocorrência', value: machines.filter(m => m.status === 3).length },
    { name: 'Retrabalho', value: machines.filter(m => m.status === 4).length },
    { name: 'Finalizada', value: machines.filter(m => m.status === 5).length },
    { name: 'Parada', value: machines.filter(m => m.status === 6).length },
  ].filter(d => d.value > 0)

  const processTypeData = processes.reduce((acc, p) => {
    const name = p.processType?.name || 'Sem tipo'
    const found = acc.find(a => a.name === name)
    if (found) found.total++
    else acc.push({ name, total: 1 })
    return acc
  }, []).sort((a, b) => b.total - a.total).slice(0, 8)

  const occTypeData = occurrences.reduce((acc, o) => {
    const name = o.occurrenceType?.name || 'Sem tipo'
    const found = acc.find(a => a.name === name)
    if (found) found.total++
    else acc.push({ name, total: 1 })
    return acc
  }, []).sort((a, b) => b.total - a.total).slice(0, 8)

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>
          <p className="text-sm text-slate-500">Visão analítica dos dados do sistema</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Máquinas" value={machines.length} icon={TrendingUp} color="bg-brand-mid" />
              <StatCard label="Total Processos" value={processes.length} icon={Activity} color="bg-emerald-500" />
              <StatCard label="Processos Ativos" value={processes.filter(p => !p.finished).length} icon={Activity} color="bg-blue-500" />
              <StatCard label="Ocorrências" value={occurrences.length} icon={AlertTriangle} color="bg-amber-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Machine status pie */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-5">Status das Máquinas</h2>
                {machineStatusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={machineStatusData} cx="50%" cy="50%" outerRadius={90}
                        dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}>
                        {machineStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-300 text-sm">Sem dados</div>
                )}
              </div>

              {/* Process types bar */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h2 className="text-sm font-semibold text-slate-800 mb-5">Processos por Tipo</h2>
                {processTypeData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={processTypeData} margin={{ left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                      <Bar dataKey="total" fill="#1E5FAF" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-60 flex items-center justify-center text-slate-300 text-sm">Sem dados</div>
                )}
              </div>
            </div>

            {/* Occurrence types */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h2 className="text-sm font-semibold text-slate-800 mb-5">Ocorrências por Tipo</h2>
              {occTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={occTypeData} margin={{ left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }} />
                    <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-300 text-sm">Sem dados de ocorrência</div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
