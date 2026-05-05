import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, Users, Monitor, Eye, LogOut, Snowflake,
  ChevronLeft, ChevronRight, ArrowLeft, Loader2, UserCircle
} from 'lucide-react'

const adminNavItems = [
  { to: '/automation',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
  { to: '/automation/users',      icon: Users,           label: 'Usuários'              },
  { to: '/automation/monitoring', icon: Monitor,         label: 'Monitoramento'         },
  { to: '/automation/coldvisio',  icon: Eye,             label: 'Coldvisio'             },
]

const restrictedNavItems = [
  { to: '/automation',            icon: LayoutDashboard, label: 'Dashboard',     end: true },
  { to: '/automation/monitoring', icon: Monitor,         label: 'Monitoramento'         },
  { to: '/automation/coldvisio',  icon: Eye,             label: 'Coldvisio'             },
  { to: '/automation/profile',    icon: UserCircle,      label: 'Meu Perfil'            },
]

const BASE_URL = import.meta.env.VITE_API_URL || ''

export default function AutomationLayout() {
  const { user, logout, loading, isAdmin } = useAuth()
  const navigate                  = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  const navItems = isAdmin ? adminNavItems : restrictedNavItems

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 size={24} className="animate-spin text-cyan-500" />
    </div>
  )

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className={`flex flex-col bg-[#0f172a] text-white transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-60'}`}>
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center shrink-0">
            <Snowflake size={15} className="text-white" />
          </div>
          {!collapsed && <span className="font-bold text-sm text-white">Automação</span>}
        </div>

        {/* User */}
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

        {/* Nav */}
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
        </nav>

        {/* Footer */}
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

      {/* Content */}
      <main className="flex-1 overflow-y-auto relative">
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
