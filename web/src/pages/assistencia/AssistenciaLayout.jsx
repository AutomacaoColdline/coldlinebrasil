import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  ClipboardList, Users, LogOut, Snowflake, ChevronLeft, HardHat, UserCircle, Menu, X, Search,
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
  const { user, logout, isAdmin, hasServiceAccess } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = isAdmin ? adminNavItems : restrictedNavItems

  const handleLogout = () => { logout(); navigate('/login', { replace: true }) }

  useEffect(() => {
    if (!mobileOpen) return
    const close = () => setMobileOpen(false)
    window.addEventListener('resize', close)
    return () => window.removeEventListener('resize', close)
  }, [mobileOpen])

  const mobileSidebar = (
    <aside className="w-64 max-w-[80vw] h-full flex-shrink-0 border-r border-white/[0.06] flex flex-col bg-[#0f172a]">
      <div className="px-5 py-5 border-b border-white/[0.06] flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <Snowflake size={13} className="text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold leading-tight">Coldline</p>
            <p className="text-orange-400 text-[10px] font-semibold leading-tight">Assistência</p>
          </div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="text-white/40 hover:text-white p-1"
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
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
        {hasServiceAccess('pesquisa') && (
          <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
            <Search size={14} />
            Pesquisa
          </a>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-white/[0.06] space-y-1">
        {isAdmin && (
          <button
            onClick={() => { setMobileOpen(false); navigate('/home') }}
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
  )

  return (
    <div className="min-h-screen bg-[#0f172a] flex">
      {/* Sidebar desktop */}
      <aside className="hidden md:flex w-56 flex-shrink-0 border-r border-white/[0.06] flex-col">
        <div className="px-5 py-5 border-b border-white/[0.06] flex items-center gap-2.5">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Snowflake size={13} className="text-white" />
          </div>
          <div>
            <p className="text-white text-xs font-bold leading-tight">Coldline</p>
            <p className="text-orange-400 text-[10px] font-semibold leading-tight">Assistência</p>
          </div>
        </div>

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
          {hasServiceAccess('pesquisa') && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
              <Search size={14} />
              Pesquisa
            </a>
          )}
        </nav>

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

      {/* Sidebar mobile (drawer) */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 shadow-2xl">
            {mobileSidebar}
          </div>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 overflow-auto min-w-0">
        <div className="md:hidden sticky top-0 z-30 bg-[#0f172a] border-b border-white/10 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white/70 hover:text-white p-1"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
              <Snowflake size={13} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-bold leading-tight">Coldline</p>
              <p className="text-orange-400 text-[10px] font-semibold leading-tight">Assistência</p>
            </div>
          </div>
          {hasServiceAccess('pesquisa') && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all shrink-0">
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
