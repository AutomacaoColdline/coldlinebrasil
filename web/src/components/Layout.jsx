import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard, Users, Cog, AlertTriangle,
  Settings, ChevronLeft, ChevronRight, LogOut,
  Snowflake, Activity, ClipboardList, Zap, Building2
} from 'lucide-react'

const adminNavItems = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Início'        },
  { to: '/industria',  icon: Building2,       label: 'Indústria'     },
  { to: '/automation', icon: Zap,             label: 'Automação'     },
  { to: '/machines',   icon: Cog,             label: 'Máquinas'      },
  { to: '/processes',  icon: Activity,        label: 'Processos'     },
  { to: '/occurrences',icon: AlertTriangle,   label: 'Ocorrências'   },
  { to: '/users',      icon: Users,           label: 'Usuários'      },
  { to: '/reports',    icon: ClipboardList,   label: 'Relatórios'    },
  { to: '/config',     icon: Settings,        label: 'Configurações' },
]

const industriaNavItems = [
  { to: '/industria', icon: Building2, label: 'Indústria' },
]

export default function Layout({ children }) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, logout, isAdmin, isIndustria } = useAuth()
  const navigate = useNavigate()
  const navItems = isAdmin ? adminNavItems : isIndustria ? industriaNavItems : []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-[#0f172a] text-white transition-all duration-300 ease-in-out shrink-0 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-brand-mid rounded-lg flex items-center justify-center shrink-0">
            <Snowflake size={16} className="text-white" />
          </div>
          {!collapsed && (
            <span className="font-bold text-base tracking-tight text-white">Coldline</span>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-mid text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={18} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* User + collapse */}
        <div className="border-t border-white/10 p-3 space-y-1">
          {!collapsed && user && (
            <div className="px-2 py-2 rounded-lg bg-white/5 mb-2">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.department?.name || 'Sem departamento'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all ${collapsed ? 'justify-center' : ''}`}
            title="Sair"
          >
            <LogOut size={16} />
            {!collapsed && <span>Sair</span>}
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            {!collapsed && <span>Recolher</span>}
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
