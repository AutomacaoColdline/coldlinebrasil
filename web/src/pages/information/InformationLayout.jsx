import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, LogOut, ArrowLeft, ChevronLeft, ChevronRight, Database, Loader2, Menu, X,
} from 'lucide-react'

const navItems = [
  { to: '/departamento-informacao', icon: LayoutDashboard, label: 'Departamento', end: true },
]

export default function InformationLayout() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-emerald-400" />
      </div>
    )
  }

  const mobileSidebar = (
    <aside className="w-64 max-w-[80vw] h-full bg-[#0f172a] text-white flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <Database size={16} className="text-white" />
          </div>
          <span className="font-bold text-sm text-white truncate">Departamento</span>
        </div>
        <button onClick={() => setMobileOpen(false)} className="text-white/40 hover:text-white p-1" aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>

      {user && (
        <div className="px-4 py-3 border-b border-white/10">
          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
          <p className="text-xs text-white/40 truncate">{user.department?.name || user.userType?.name || 'Admin'}</p>
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
                isActive ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3 space-y-1">
        <button onClick={() => { setMobileOpen(false); navigate('/home') }}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          <ArrowLeft size={15} />
          <span>Inicio</span>
        </button>
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
      <aside className={`hidden md:flex flex-col bg-[#0f172a] text-white transition-all duration-300 shrink-0 ${collapsed ? 'w-16' : 'w-64'}`}>
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-white/10 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
            <Database size={16} className="text-white" />
          </div>
          {!collapsed && <span className="font-bold text-sm text-white">Departamento de Informacao</span>}
        </div>

        {!collapsed && user && (
          <div className="px-4 py-3 border-b border-white/10">
            <p className="text-xs font-semibold text-white truncate">{user.name}</p>
            <p className="text-xs text-white/40 truncate">{user.department?.name || user.userType?.name || 'Admin'}</p>
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
                  isActive ? 'bg-emerald-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                } ${collapsed ? 'justify-center px-0' : ''}`
              }
              title={collapsed ? label : undefined}
            >
              <Icon size={17} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-1">
          <button
            onClick={() => navigate('/home')}
            className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all ${collapsed ? 'justify-center' : ''}`}
          >
            <ArrowLeft size={15} />
            {!collapsed && <span>Inicio</span>}
          </button>
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

      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{mobileSidebar}</div>
        </div>
      )}

      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="md:hidden sticky top-0 z-30 bg-[#0f172a] border-b border-white/10 px-4 py-2 flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white/70 hover:text-white p-1"
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center shrink-0">
              <Database size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-white truncate">Departamento</span>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  )
}
