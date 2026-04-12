import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { apiClient } from '../services/api'
import { LogOut, Users, Briefcase, Mail, Activity, Shield } from 'lucide-react'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiClient.getDashboard()
      .then(data => setDashboardData(data))
      .catch(err => setError(err.message || 'Erro ao carregar dashboard'))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const stats = dashboardData?.stats || {}

  const statCards = [
    {
      label: 'Usuários',
      value: stats.totalUsers ?? '—',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'Serviços',
      value: stats.totalServices ?? '—',
      icon: Briefcase,
      color: 'bg-green-500',
    },
    {
      label: 'Contatos',
      value: stats.totalContacts ?? '—',
      icon: Mail,
      color: 'bg-yellow-500',
    },
    {
      label: 'Uptime',
      value: stats.uptime ?? '—',
      icon: Activity,
      color: 'bg-purple-500',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-dark to-brand-mid shadow-md">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield size={28} className="text-white" />
            <div>
              <h1 className="text-white font-bold text-xl">ColdLine Brasil</h1>
              <p className="text-white/70 text-sm">Painel Administrativo</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/80 text-sm hidden sm:block">
              {dashboardData?.user?.name || user?.name || user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg transition text-sm font-medium"
            >
              <LogOut size={16} />
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Welcome */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">
            {loading
              ? 'Carregando...'
              : dashboardData?.message || 'Bem-vindo!'}
          </h2>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('pt-BR', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-4 mb-6">
            {error}
          </div>
        )}

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center gap-4"
            >
              <div className={`${color} p-3 rounded-lg text-white`}>
                <Icon size={22} />
              </div>
              <div>
                <p className="text-gray-500 text-sm">{label}</p>
                <p className="text-2xl font-bold text-gray-800">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Info card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-700 mb-3">Informações do Usuário</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-400 block">Nome</span>
              <span className="text-gray-800 font-medium">
                {dashboardData?.user?.name || user?.name || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Email</span>
              <span className="text-gray-800 font-medium">
                {dashboardData?.user?.email || user?.email || '—'}
              </span>
            </div>
            <div>
              <span className="text-gray-400 block">Perfil</span>
              <span className="inline-block bg-brand-mid/10 text-brand-mid font-semibold px-3 py-0.5 rounded-full text-xs">
                {dashboardData?.user?.role || 'ADMIN'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
