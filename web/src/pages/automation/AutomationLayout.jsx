import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Monitor, Eye, LogOut, Snowflake,
  ChevronLeft, ChevronRight, ArrowLeft, Loader2, UserCircle, Globe2, RadioTower,
  Headphones, BarChart3, FileText, Menu, X, ShieldCheck, Search,
} from 'lucide-react'

const adminNavItems = [
  { to: '/automation',                   icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/automation/monitoring',        icon: Monitor,         label: 'Monitoramento'            },
  { to: '/automation/atendimentos',      icon: Headphones,      label: 'Atendimentos'             },
  { to: '/automation/atendimento-dashboard', icon: BarChart3,    label: 'Indicadores'               },
  { to: '/automation/atendimento-reports',   icon: FileText,     label: 'Relatórios'                },
  { to: '/automation/coldvisio',         icon: Eye,             label: 'Coldvisio'                 },
  { to: '/automation/xweb',              icon: Globe2,          label: 'XWEB'                      },
  { to: '/automation/sitrad',            icon: RadioTower,      label: 'SITRAD'                    },
]

const restrictedNavItems = [
  { to: '/automation',                   icon: LayoutDashboard, label: 'Dashboard',       end: true },
  { to: '/automation/monitoring',        icon: Monitor,         label: 'Monitoramento'            },
  { to: '/automation/atendimentos',      icon: Headphones,      label: 'Atendimentos'             },
  { to: '/automation/coldvisio',         icon: Eye,             label: 'Coldvisio'                 },
  { to: '/automation/xweb',              icon: Globe2,          label: 'XWEB'                      },
  { to: '/automation/sitrad',            icon: RadioTower,      label: 'SITRAD'                    },
  { to: '/automation/profile',           icon: UserCircle,      label: 'Meu Perfil'                },
]

const BASE_URL = import.meta.env.VITE_API_URL || ''

export default function AutomationLayout() {
  const { user, logout, loading, isAdmin, isSuperAdmin, hasServiceAccess } = useAuth()
  const navigate                  = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const baseNavItems = isAdmin ? adminNavItems : restrictedNavItems
  const navItems = isSuperAdmin
    ? [...baseNavItems, { to: '/automation/acessos', icon: ShieldCheck, label: 'Controle de Acessos' }]
    : baseNavItems

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!mobileOpen) return
    const close = () => setMobileOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [mobileOpen])

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-cyan-500" />
    </div>
  )

  const mobileSidebar = (
    <aside className="flex flex-col bg-[#0f172a] text-white w-64 h-full">
      <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shrink-0">
            <Snowflake size={15} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white truncate">Automação</span>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-slate-400 hover:text-white p-1"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            {user.urlPhoto ? (
              <img
                src={`${BASE_URL}/uploads/${user.urlPhoto}?t=${Math.floor(Date.now() / 60000)}`}
                alt={user.name}
                className="w-9 h-9 rounded-full object-cover border border-white/10"
                onError={e => { e.target.style.display = 'none' }}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                {user.name?.[0]}
              </div>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-white/40 truncate">{user.department?.name || '—'}</p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 py-4 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
        {hasServiceAccess('pesquisa') && (
          <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1">
            <Search size={17} className="shrink-0" />
            <span>Pesquisa</span>
          </a>
        )}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        {isAdmin && (
          <button onClick={() => { setMobileOpen(false); navigate('/home') }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={15} />
            <span>Início</span>
          </button>
        )}
        <button onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={15} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar desktop */}
      <aside className={`hidden md:flex flex-col bg-[#0f172a] text-white transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shrink-0">
            <Snowflake size={15} className="text-white" />
          </div>
          {!collapsed && <span className="font-bold text-sm text-white">Automação</span>}
        </div>

        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              {user.urlPhoto ? (
                <img
                  src={`${BASE_URL}/uploads/${user.urlPhoto}?t=${Math.floor(Date.now() / 60000)}`}
                  alt={user.name}
                  className="w-9 h-9 rounded-full object-cover border border-white/10"
                  onError={e => { e.target.style.display = 'none' }}
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold">
                  {user.name?.[0]}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                <p className="text-xs text-white/40 truncate">{user.department?.name || '—'}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
          {hasServiceAccess('pesquisa') && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1 ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? 'Pesquisa' : undefined}>
              <Search size={17} className="shrink-0" />
              {!collapsed && <span>Pesquisa</span>}
            </a>
          )}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-1">
          {isAdmin && (
            <button
              onClick={() => navigate('/home')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
            >
              <ArrowLeft size={15} />
              {!collapsed && <span>Início</span>}
            </button>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={15} />
            {!collapsed && <span>Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80vw] shadow-2xl">
            {mobileSidebar}
          </div>
        </div>
      )}

      {/* Content */}
      <main className="flex-1 overflow-y-auto relative min-w-0">
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center shrink-0">
              <Snowflake size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-800 truncate">Automação</span>
          </div>
          {hasServiceAccess('pesquisa') && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all shrink-0">
              <Search size={13} />
              <span className="hidden sm:inline">Pesquisa</span>
            </a>
          )}
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
          <Snowflake size={400} className="text-slate-900/[0.03]" strokeWidth={0.5} />
        </div>
        <div className="relative z-10">
          <Outlet context={{ user }} />
        </div>
      </main>
    </div>
  )
}
