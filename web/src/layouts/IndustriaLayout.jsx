import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Home, Users, Cog, Activity,
  Settings, ClipboardList, ChevronLeft, ChevronRight,
  LogOut, Building2, Tv, ArrowLeft, UserCircle, Menu, X, Search,
} from 'lucide-react'

const adminNav = [
  { to: '/industria',             icon: Home,          label: 'Início',        end: true },
  { to: '/industria/users',       icon: Users,         label: 'Usuários'       },
  { to: '/industria/machines',    icon: Cog,           label: 'Máquinas'       },
  { to: '/industria/processes',   icon: Activity,      label: 'Processos'      },
  { to: '/industria/config',      icon: Settings,      label: 'Configurações'  },
  { to: '/industria/reports',     icon: ClipboardList, label: 'Relatórios'     },
]

const restrictedNav = [
  { to: '/industria',             icon: Home,          label: 'Início',        end: true },
  { to: '/industria/machines',    icon: Cog,           label: 'Máquinas'       },
  { to: '/industria/processes',   icon: Activity,      label: 'Processos'      },
  { to: '/industria/profile',     icon: UserCircle,    label: 'Meu Perfil'     },
]

export default function IndustriaLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { user, logout, isAdmin, hasServiceAccess } = useAuth()
  const navigate = useNavigate()

  const nav = isAdmin ? adminNav : restrictedNav

  // Fecha drawer mobile ao trocar de rota
  useEffect(() => {
    if (!mobileOpen) return
    const close = () => setMobileOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [mobileOpen])

  const sidebar = (
    <aside className="flex flex-col bg-[#0f172a] text-white w-64 h-full">
      <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          <span className="font-bold text-base text-white truncate">Indústria</span>
        </div>
        <button
          onClick={() => { setMobileOpen(false); setCollapsed(c => !c) }}
          className="md:hidden text-slate-400 hover:text-white p-1"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 py-4 overflow-y-auto">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all ${
                isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={18} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}

        {isAdmin && (
          <a href="/industria/tv" target="_blank" rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1">
            <Tv size={18} className="shrink-0" />
            <span>Modo TV</span>
          </a>
        )}
        {hasServiceAccess('pesquisa') && (
          <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1">
            <Search size={18} className="shrink-0" />
            <span>Pesquisa</span>
          </a>
        )}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        {user && (
          <div className="px-2 py-2 rounded-lg bg-white/5 mb-2">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.department?.name || 'Indústria'}</p>
          </div>
        )}
        {isAdmin && (
          <button onClick={() => navigate('/home')}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <ArrowLeft size={16} />
            <span>Início</span>
          </button>
        )}
        <button onClick={() => { logout(); navigate('/login') }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={16} />
          <span>Sair</span>
        </button>
        <button
          onClick={() => setCollapsed(c => !c)}
          className="hidden md:flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          title={collapsed ? 'Expandir' : 'Recolher'}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          <span>Recolher</span>
        </button>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar desktop */}
      <div className={`hidden md:flex flex-col bg-[#0f172a] text-white transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          {!collapsed && <span className="font-bold text-base text-white">Indústria</span>}
        </div>
        <nav className="flex-1 py-4 overflow-y-auto">
          {nav.map(({ to, icon: Icon, label, end }) => (
            <NavLink key={to} to={to} end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all ${
                  isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
          {isAdmin && !collapsed && (
            <a href="/industria/tv" target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1">
              <Tv size={18} className="shrink-0" />
              <span>Modo TV</span>
            </a>
          )}
          {hasServiceAccess('pesquisa') && !collapsed && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1">
              <Search size={18} className="shrink-0" />
              <span>Pesquisa</span>
            </a>
          )}
        </nav>
        <div className="border-t border-white/10 p-3 space-y-1">
          {!collapsed && user && (
            <div className="px-2 py-2 rounded-lg bg-white/5 mb-2">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.department?.name || 'Indústria'}</p>
            </div>
          )}
          {isAdmin && (
            <button onClick={() => navigate('/home')}
              className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
              title="Início">
              <ArrowLeft size={16} />
              {!collapsed && <span>Início</span>}
            </button>
          )}
          <button onClick={() => { logout(); navigate('/login') }}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}
            title="Sair">
            <LogOut size={16} />
            {!collapsed && <span>Sair</span>}
          </button>
          <button onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </div>

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-64 max-w-[80vw] shadow-2xl">
            {sidebar}
          </div>
        </div>
      )}

      {/* Conteúdo principal */}
      <main className="flex-1 overflow-y-auto min-w-0">
        {/* Barra mobile */}
        <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <Building2 size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-800 truncate">Indústria</span>
          </div>
          {hasServiceAccess('pesquisa') && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-600 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-all shrink-0">
              <Search size={13} />
              <span className="hidden sm:inline">Pesquisa</span>
            </a>
          )}
        </div>
        <Outlet />
      </main>
    </div>
  )
}
