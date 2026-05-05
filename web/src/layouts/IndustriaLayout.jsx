import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Home, Users, Cog, Activity,
  Settings, ClipboardList, ChevronLeft, ChevronRight,
  LogOut, Building2, Tv, ArrowLeft, UserCircle
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
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const nav = isAdmin ? adminNav : restrictedNav

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-[#0f172a] text-white transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <Building2 size={15} className="text-white" />
          </div>
          {!collapsed && <span className="font-bold text-base text-white">Indústria</span>}
        </div>

        {/* Nav */}
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

          {/* TV mode — só admin */}
          {isAdmin && !collapsed && (
            <a href="/industria/tv" target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-all mt-1">
              <Tv size={18} className="shrink-0" />
              <span>Modo TV</span>
            </a>
          )}
        </nav>

        {/* Footer */}
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
      </aside>

      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
