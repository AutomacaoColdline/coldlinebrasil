import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Layout from '../components/Layout'
import { Building2, Zap, Wrench, ArrowRight, Activity, Users, Cog, AlertTriangle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api } from '../services/api'

const modules = [
  {
    title: 'Indústria',
    description: 'Monitoramento em tempo real de operadores, processos e máquinas do setor industrial.',
    icon: Building2,
    to: '/industria',
    gradient: 'from-blue-500 to-blue-700',
    shadow: 'shadow-blue-200',
    status: 'active',
  },
  {
    title: 'Automação',
    description: 'Painel de produção com status das máquinas e processos ativos em tempo real.',
    icon: Zap,
    to: '/automation',
    gradient: 'from-emerald-500 to-emerald-700',
    shadow: 'shadow-emerald-200',
    status: 'active',
  },
  {
    title: 'Assistência Técnica',
    description: 'Gestão de ordens de serviço, técnicos e ocorrências da assistência técnica.',
    icon: Wrench,
    to: '#',
    gradient: 'from-orange-400 to-orange-600',
    shadow: 'shadow-orange-200',
    status: 'soon',
  },
]

function QuickStat({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={14} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-base font-bold text-slate-800">{value ?? '—'}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({})

  useEffect(() => {
    api.getDashboard()
      .then(res => setStats(res.data?.stats || {}))
      .catch(() => {})
  }, [])

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  return (
    <Layout>
      <div className="p-6 lg:p-10 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <QuickStat icon={Users}         label="Usuários"     value={stats.totalUsers}       color="bg-brand-mid" />
          <QuickStat icon={Cog}           label="Máquinas"     value={stats.totalMachines}    color="bg-slate-600" />
          <QuickStat icon={Activity}      label="Em processo"  value={stats.activeProcesses}  color="bg-emerald-500" />
          <QuickStat icon={AlertTriangle} label="Ocorrências"  value={stats.activeOccurrences} color="bg-amber-500" />
        </div>

        {/* Module cards */}
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Módulos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {modules.map(({ title, description, icon: Icon, to, gradient, shadow, status }) => (
            <Link
              key={title}
              to={to}
              className={`group relative bg-white rounded-2xl border border-slate-100 p-6 flex flex-col gap-4 hover:border-transparent hover:shadow-xl ${shadow} transition-all duration-200 ${status === 'soon' ? 'pointer-events-none opacity-70' : ''}`}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-sm`}>
                <Icon size={22} className="text-white" />
              </div>

              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-800 text-base">{title}</h3>
                  {status === 'soon' && (
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-400 rounded-full">Em breve</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
              </div>

              {status === 'active' && (
                <div className="flex items-center gap-1 text-xs font-semibold text-brand-mid group-hover:gap-2 transition-all">
                  Acessar
                  <ArrowRight size={13} />
                </div>
              )}
            </Link>
          ))}
        </div>
      </div>
    </Layout>
  )
}
