import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Building2, Zap, Wrench, LogOut, Snowflake, ChevronRight, Database, Search } from 'lucide-react'

export default function HomePage() {
  const { user, logout, hasServiceAccess } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const modules = [
    {
      key: 'industria',
      label: 'Industria',
      desc: 'Maquinas, processos, ocorrencias e operadores em tempo real.',
      icon: Building2,
      color: 'bg-blue-600',
      hover: 'hover:border-blue-400 hover:shadow-blue-100',
      badge: 'bg-blue-50 text-blue-700 border-blue-200',
      path: '/industria',
      enabled: hasServiceAccess('industria'),
    },
    {
      key: 'automation',
      label: 'Automacao',
      desc: 'Monitoramento remoto, atendimentos tecnicos, notas e gestao de equipamentos.',
      icon: Zap,
      color: 'bg-cyan-500',
      hover: 'hover:border-cyan-400 hover:shadow-cyan-100',
      badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      path: '/automation',
      enabled: hasServiceAccess('automation'),
    },
    {
      key: 'information',
      label: 'Departamento de Informacao',
      desc: 'Demandas, treinamentos, processos, rotinas e reunioes.',
      icon: Database,
      color: 'bg-pink-400',
      hover: 'hover:border-pink-300 hover:shadow-pink-100',
      badge: 'bg-pink-50 text-pink-600 border-pink-200',
      path: '/departamento-informacao',
      enabled: hasServiceAccess('departamento'),
    },
    {
      key: 'assistencia',
      label: 'Assistencia Tecnica',
      desc: 'Gestao de chamados, clientes e ordens de servico.',
      icon: Wrench,
      color: 'bg-orange-500',
      hover: 'hover:border-orange-300 hover:shadow-orange-100',
      badge: 'bg-orange-50 text-orange-700 border-orange-200',
      path: '/assistencia',
      enabled: hasServiceAccess('assistencia'),
      visible: false,
    },
    {
      key: 'pesquisa',
      label: 'Pesquisa',
      desc: 'Sistema de pesquisas Coldline.',
      icon: Search,
      color: 'bg-purple-500',
      hover: 'hover:border-purple-400 hover:shadow-purple-100',
      badge: 'bg-purple-50 text-purple-700 border-purple-200',
      path: 'https://pesquisa.coldline.com.br',
      external: true,
      enabled: hasServiceAccess('pesquisa'),
    },
  ]

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-5 border-b border-white/[0.06] gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-brand-mid rounded-lg flex items-center justify-center shrink-0">
            <Snowflake size={15} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm truncate">Coldline Brasil</span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          {user && (
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-white leading-tight">{user.name}</p>
              <p className="text-[11px] text-white/40">{user.department?.name || user.userType?.name || ''}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/50 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={14} />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-6 sm:py-12">
        <div className="mb-6 sm:mb-12 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
            Ola{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
          </h1>
          <p className="text-white/40 text-sm">Selecione o modulo que deseja acessar</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-5 w-full max-w-5xl">
          {modules.filter(({ visible = true }) => visible).map(({ key, label, desc, icon: Icon, color, hover, badge, path, enabled, external }) => (
            <button
              key={key}
              onClick={() => {
                if (!enabled || !path) return
                if (external) window.open(path, '_blank', 'noopener,noreferrer')
                else navigate(path)
              }}
              disabled={!enabled}
              className={`relative bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4 sm:p-6 text-left transition-all duration-200 group ${
                enabled ? `cursor-pointer ${hover} hover:bg-white/[0.06] hover:shadow-lg` : 'cursor-not-allowed opacity-40'
              }`}
            >
              <div className={`w-10 sm:w-11 h-10 sm:h-11 rounded-xl ${color} flex items-center justify-center mb-3 sm:mb-4 shadow-lg`}>
                <Icon size={20} className="text-white" />
              </div>

              <p className="font-semibold text-white mb-1.5 text-base">{label}</p>
              <p className="text-white/40 text-xs leading-relaxed">{desc}</p>

              <div className="mt-3 sm:mt-4 flex items-center justify-between">
                {enabled ? (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge}`}>
                    Disponivel
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-white/10 text-white/30">
                    Em breve
                  </span>
                )}
                {enabled && (
                  <ChevronRight size={14} className="text-white/20 group-hover:text-white/60 transition-colors" />
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <footer className="text-center py-5 text-[11px] text-white/20">
        &copy; {new Date().getFullYear()} Coldline Brasil · Campo Grande, MS
      </footer>
    </div>
  )
}
