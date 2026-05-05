import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Loader2 } from 'lucide-react'

// Public
import LoginPage   from './pages/LoginPage'
import HomePage    from './pages/HomePage'
import TVLoginPage from './pages/TVLoginPage'

// Indústria
import IndustriaLayout          from './layouts/IndustriaLayout'
import IndustriaPage            from './pages/IndustriaPage'
import IndustriaTVPage          from './pages/IndustriaTVPage'
import IndustriaUsersPage       from './pages/industria/IndustriaUsersPage'
import IndustriaMachinesPage       from './pages/industria/IndustriaMachinesPage'
import IndustriaMachineDetailPage  from './pages/industria/IndustriaMachineDetailPage'
import IndustriaOccurrencesPage from './pages/industria/IndustriaOccurrencesPage'
import IndustriaProcessesPage   from './pages/industria/IndustriaProcessesPage'
import IndustriaConfigPage      from './pages/industria/IndustriaConfigPage'
import IndustriaReportsPage     from './pages/industria/IndustriaReportsPage'
import IndustriaProfilePage     from './pages/industria/IndustriaProfilePage'

// Automação
import AutomationLayout     from './pages/automation/AutomationLayout'
import AutomationHome       from './pages/automation/AutomationHome'
import AutomationMonitoring from './pages/automation/AutomationMonitoring'
import AutomationColdvisio  from './pages/automation/AutomationColdvisio'

// Assistência Técnica
import AssistenciaLayout   from './pages/assistencia/AssistenciaLayout'
import AssistenciaOSPage   from './pages/assistencia/AssistenciaOSPage'
import AssistenciaOSDetail from './pages/assistencia/AssistenciaOSDetail'
import AssistenciaClients  from './pages/assistencia/AssistenciaClients'
import AssistenciaTecnicos from './pages/assistencia/AssistenciaTecnicosPage'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 size={22} className="animate-spin text-brand-mid" />
    </div>
  )
}

// Verifica autenticação
function Auth({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// Garante que o usuário só acessa o módulo do seu departamento
// Admin pode acessar qualquer módulo
function ModuleGuard({ module, children }) {
  const { isAdmin, userModule, modulePath, loading } = useAuth()
  if (loading) return <Spinner />
  if (!isAdmin && userModule !== module) return <Navigate to={modulePath} replace />
  return children
}

// Bloqueia rotas que só admin pode acessar; redireciona para `fallback`
function AdminOnly({ fallback, children }) {
  const { isAdmin, modulePath } = useAuth()
  if (!isAdmin) return <Navigate to={fallback || modulePath} replace />
  return children
}

// Auth independente para o Modo TV (usa coldline_tv_token, não o token principal)
function TVAuth({ children }) {
  const token = localStorage.getItem('coldline_tv_token')
  if (!token) return <Navigate to="/industria/tv/login" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Auth */}
        <Route path="/login" element={<LoginPage />} />

        {/* Hub — só admin acessa */}
        <Route path="/home" element={
          <Auth><AdminOnly><HomePage /></AdminOnly></Auth>
        } />

        {/* TV — fluxo de auth próprio, independente do sistema principal */}
        <Route path="/industria/tv/login" element={<TVLoginPage />} />
        <Route path="/industria/tv"       element={<TVAuth><IndustriaTVPage /></TVAuth>} />

        {/* Indústria */}
        <Route path="/industria" element={
          <Auth><ModuleGuard module="industria"><IndustriaLayout /></ModuleGuard></Auth>
        }>
          <Route index              element={<IndustriaPage />} />
          <Route path="profile"     element={<IndustriaProfilePage />} />
          <Route path="machines"        element={<IndustriaMachinesPage />} />
          <Route path="machines/:id"    element={<IndustriaMachineDetailPage />} />
          <Route path="occurrences" element={<IndustriaOccurrencesPage />} />
          <Route path="processes"   element={<IndustriaProcessesPage />} />
          {/* Restrito a admin */}
          <Route path="users"   element={<AdminOnly fallback="/industria"><IndustriaUsersPage /></AdminOnly>} />
          <Route path="config"  element={<AdminOnly fallback="/industria"><IndustriaConfigPage /></AdminOnly>} />
          <Route path="reports" element={<AdminOnly fallback="/industria"><IndustriaReportsPage /></AdminOnly>} />
        </Route>

        {/* Automação */}
        <Route path="/automation" element={
          <Auth><ModuleGuard module="automation"><AutomationLayout /></ModuleGuard></Auth>
        }>
          <Route index             element={<AutomationHome />} />
          <Route path="profile"    element={<IndustriaProfilePage />} />
          <Route path="monitoring" element={<AutomationMonitoring />} />
          <Route path="coldvisio"  element={<AutomationColdvisio />} />
        </Route>

        {/* Assistência Técnica */}
        <Route path="/assistencia" element={
          <Auth><ModuleGuard module="assistencia"><AssistenciaLayout /></ModuleGuard></Auth>
        }>
          <Route index          element={<AssistenciaOSPage />} />
          <Route path="os/:id"  element={<AssistenciaOSDetail />} />
          <Route path="profile" element={<IndustriaProfilePage />} />
          <Route path="clients" element={<AssistenciaClients />} />
          {/* Restrito a admin */}
          <Route path="tecnicos" element={<AdminOnly fallback="/assistencia"><AssistenciaTecnicos /></AdminOnly>} />
        </Route>

        {/* Redirects */}
        <Route path="/"          element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="*"          element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
