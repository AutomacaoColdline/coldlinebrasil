import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard, LogOut, ArrowLeft, Database, Loader2, Menu, X, Search,
  PanelLeftClose, PanelLeftOpen, Sun, Moon, Workflow,
} from 'lucide-react'
import './information-theme.css'

const navItems = [
  { to: '/departamento-informacao', icon: LayoutDashboard, label: 'Departamento', end: true },
  { to: '/departamento-informacao/organograma', icon: Workflow, label: 'Organograma', end: false },
]

export default function InformationLayout() {
  const { user, logout, loading, hasServiceAccess } = useAuth()
  const navigate = useNavigate()
  const [sidebarHidden, setSidebarHidden] = useState(() => localStorage.getItem('info-sidebar-hidden') === '1')
  const [theme, setTheme] = useState(() => localStorage.getItem('info-theme') || 'light')
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

  useEffect(() => {
    localStorage.setItem('info-sidebar-hidden', sidebarHidden ? '1' : '0')
  }, [sidebarHidden])

  useEffect(() => {
    localStorage.setItem('info-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-pink-300" />
      </div>
    )
  }

  const mobileSidebar = (
    <aside className="w-64 max-w-[80vw] h-full bg-[#0f172a] text-white flex flex-col">
      <div className="flex items-center justify-between gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 bg-pink-400 rounded-lg flex items-center justify-center shrink-0">
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
                isActive ? 'bg-pink-400 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
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
        <button onClick={toggleTheme}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all">
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
        </button>
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
      <aside className={`hidden md:flex flex-col bg-[#0f172a] text-white transition-all duration-300 shrink-0 overflow-hidden ${sidebarHidden ? 'w-0' : 'w-64'}`}>
        <div className="w-64 h-full flex flex-col">
          <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
            <div className="w-8 h-8 bg-pink-400 rounded-lg flex items-center justify-center shrink-0">
              <Database size={16} className="text-white" />
            </div>
            <span className="font-bold text-sm text-white">Departamento de Informacao</span>
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
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 mx-2 rounded-lg text-sm font-medium transition-all ${
                    isActive ? 'bg-pink-400 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
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
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo escuro'}</span>
            </button>
            <button
              onClick={() => navigate('/home')}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <ArrowLeft size={15} />
              <span>Inicio</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={15} />
              <span>Sair</span>
            </button>
            <button
              onClick={() => setSidebarHidden(true)}
              className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-all"
            >
              <PanelLeftClose size={15} />
              <span>Esconder menu</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarHidden && (
        <button
          onClick={() => setSidebarHidden(false)}
          className="hidden md:flex fixed top-4 left-3 z-30 items-center justify-center w-9 h-9 rounded-xl bg-[#0f172a] text-white/70 hover:text-white shadow-lg border border-white/10 transition-all"
          aria-label="Mostrar menu"
          title="Mostrar menu"
        >
          <PanelLeftOpen size={16} />
        </button>
      )}

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
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-7 h-7 bg-pink-400 rounded-lg flex items-center justify-center shrink-0">
              <Database size={14} className="text-white" />
            </div>
            <span className="font-semibold text-sm text-white truncate">Departamento</span>
          </div>
          <button onClick={toggleTheme} className="text-white/70 hover:text-white p-1 shrink-0" aria-label="Alternar tema">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          {hasServiceAccess('pesquisa') && (
            <a href="https://pesquisa.coldline.com.br" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-purple-300 bg-purple-500/10 border border-purple-500/20 rounded-lg hover:bg-purple-500/20 transition-all shrink-0">
              <Search size={13} />
              <span className="hidden sm:inline">Pesquisa</span>
            </a>
          )}
        </div>
        <div className={theme === 'dark' ? 'info-dark min-h-full' : 'min-h-full'}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
