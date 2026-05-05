import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  ClipboardList, Users, LogOut, Snowflake, ChevronLeft, HardHat, UserCircle,
} from 'lucide-react'

const adminNavItems = [
  { to: '/assistencia',           label: 'Ordens de Serviço', icon: ClipboardList, end: true },
  { to: '/assistencia/clients',   label: 'Clientes',          icon: Users },
  { to: '/assistencia/tecnicos',  label: 'Técnicos',          icon: HardHat },
]

const restrictedNavItems = [
  { to: '/assistencia',           label: 'Ordens de Serviço', icon: ClipboardList, end: true },
  { to: '/assistencia/profile',   label: 'Meu Perfil',        icon: UserCircle },
]

export default function AssistenciaLayout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const navItems = isAdmin ? adminNavItems : restrictedNavItems

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/[0.06] flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/[0.06] flex items-center gap-2.5">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Snowflake size={13} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-bold leading-tight">Coldline</p>
            <p className="text-orange-400 text-[10px] font-semibold leading-tight">Assistência</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-orange-500/15 text-orange-400'
                    : 'text-white/40 hover:text-white hover:bg-white/[0.05]'
                }`
              }
            >
              <Icon size={14} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User / footer */}
        <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
          {isAdmin && (
            <button
              onClick={() => navigate('/home')}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-all"
            >
              <ChevronLeft size={13} />
              Módulos
            </button>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-white/30 hover:text-red-400 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={13} />
            Sair
          </button>
          {user && (
            <p className="px-3 pt-1 text-[10px] text-white/20 truncate">{user.name}</p>
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
