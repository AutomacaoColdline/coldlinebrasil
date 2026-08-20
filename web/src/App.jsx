import { Routes, Route, Navigate, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Loader2 } from 'lucide-react'

import LoginPage from './pages/LoginPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ChangePasswordPage from './pages/ChangePasswordPage'
import HomePage from './pages/HomePage'
import TVLoginPage from './pages/TVLoginPage'

import IndustriaLayout from './layouts/IndustriaLayout'
import IndustriaPage from './pages/IndustriaPage'
import IndustriaTVPage from './pages/IndustriaTVPage'
import IndustriaUsersPage from './pages/industria/IndustriaUsersPage'
import IndustriaMachinesPage from './pages/industria/IndustriaMachinesPage'
import IndustriaMachineDetailPage from './pages/industria/IndustriaMachineDetailPage'
import IndustriaMachineQrPage from './pages/industria/IndustriaMachineQrPage'
import IndustriaOccurrencesPage from './pages/industria/IndustriaOccurrencesPage'
import IndustriaProcessesPage from './pages/industria/IndustriaProcessesPage'
import IndustriaConfigPage from './pages/industria/IndustriaConfigPage'
import IndustriaReportsPage from './pages/industria/IndustriaReportsPage'
import IndustriaProfilePage from './pages/industria/IndustriaProfilePage'

import AutomationLayout from './pages/automation/AutomationLayout'
import AutomationHome from './pages/automation/AutomationHome'
import AutomationMonitoring from './pages/automation/AutomationMonitoring'
import AutomationColdvisio from './pages/automation/AutomationColdvisio'
import AutomationAtendimentos from './pages/automation/AutomationAtendimentos'
import AutomationAtendimentoDetail from './pages/automation/AutomationAtendimentoDetail'
import AutomationAtendimentoDashboard from './pages/automation/AutomationAtendimentoDashboard'
import AutomationAtendimentoReports from './pages/automation/AutomationAtendimentoReports'
import AutomationPesquisas from './pages/automation/AutomationPesquisas'

import InformationLayout from './pages/information/InformationLayout'
import InformationPage from './pages/information/InformationPage'
import OrgChartListPage from './pages/information/OrgChartListPage'
import OrgChartDetailPage from './pages/information/OrgChartDetailPage'
import OrgChartPrintPage from './pages/information/OrgChartPrintPage'
import ProductionPage from './pages/information/production/ProductionPage'
import ProductionModelPage from './pages/information/production/ProductionModelPage'

import AccessControlPage from './pages/admin/AccessControlPage'

import AssistenciaLayout from './pages/assistencia/AssistenciaLayout'
import AssistenciaOSPage from './pages/assistencia/AssistenciaOSPage'
import AssistenciaOSDetail from './pages/assistencia/AssistenciaOSDetail'
import AssistenciaClients from './pages/assistencia/AssistenciaClients'
import AssistenciaTecnicos from './pages/assistencia/AssistenciaTecnicosPage'

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center">
      <Loader2 size={22} className="animate-spin text-brand-mid" />
    </div>
  )
}

function Auth({ children }) {
  const { isAuthenticated, loading, user } = useAuth()
  const location = window.location
  if (loading) return <Spinner />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.mustChangePassword && !location.pathname.includes('/trocar-senha')) {
    return <Navigate to="/trocar-senha" replace />
  }
  return children
}

function ModuleGuard({ module, children }) {
  const { isAdmin, hasServiceAccess, modulePath, loading } = useAuth()
  if (loading) return <Spinner />
  if (!isAdmin && !hasServiceAccess(module)) return <Navigate to={modulePath} replace />
  return children
}

function AdminOnly({ fallback, children }) {
  const { isAdmin, modulePath } = useAuth()
  if (!isAdmin) return <Navigate to={fallback || modulePath} replace />
  return children
}

function SuperAdminOnly({ children }) {
  const { isSuperAdmin, modulePath } = useAuth()
  if (!isSuperAdmin) return <Navigate to={modulePath} replace />
  return children
}

function TVAuth({ children }) {
  const token = localStorage.getItem('coldline_tv_token')
  if (!token) return <Navigate to="/industria/tv/login" replace />
  return children
}

// Alvo do QR code impresso na máquina: qualquer app de câmera que ler o QR
// abre essa URL, que redireciona pra tela de "Meu Trabalho" já com a máquina
// selecionada (login normal se ainda não estiver autenticado).
function IndustriaScanRedirect() {
  const { machineId } = useParams()
  return <Navigate to={`/industria/processes?scanMachineId=${machineId}`} replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
        <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
        <Route path="/trocar-senha" element={<Auth><ChangePasswordPage /></Auth>} />

        <Route path="/home" element={
          <Auth><HomePage /></Auth>
        } />

        <Route path="/industria/tv/login" element={<TVLoginPage />} />
        <Route path="/industria/tv" element={<TVAuth><IndustriaTVPage /></TVAuth>} />
        <Route path="/industria/machines/:id/qr" element={<Auth><IndustriaMachineQrPage /></Auth>} />
        <Route path="/industria/scan/:machineId" element={<Auth><IndustriaScanRedirect /></Auth>} />

        <Route path="/industria" element={
          <Auth><ModuleGuard module="industria"><IndustriaLayout /></ModuleGuard></Auth>
        }>
          <Route index element={<IndustriaPage />} />
          <Route path="profile" element={<IndustriaProfilePage />} />
          <Route path="machines" element={<IndustriaMachinesPage />} />
          <Route path="machines/:id" element={<IndustriaMachineDetailPage />} />
          <Route path="occurrences" element={<IndustriaOccurrencesPage />} />
          <Route path="processes" element={<IndustriaProcessesPage />} />
          <Route path="users" element={<AdminOnly fallback="/industria"><IndustriaUsersPage /></AdminOnly>} />
          <Route path="config" element={<AdminOnly fallback="/industria"><IndustriaConfigPage /></AdminOnly>} />
          <Route path="reports" element={<AdminOnly fallback="/industria"><IndustriaReportsPage /></AdminOnly>} />
        </Route>

        <Route path="/automation" element={
          <Auth><ModuleGuard module="automation"><AutomationLayout /></ModuleGuard></Auth>
        }>
          <Route index element={<AutomationHome />} />
          <Route path="profile" element={<IndustriaProfilePage />} />
          <Route path="monitoring" element={<AutomationMonitoring />} />
          <Route path="atendimentos" element={<AutomationAtendimentos />} />
          <Route path="atendimentos/:id" element={<AutomationAtendimentoDetail />} />
          <Route path="atendimento-dashboard" element={<AutomationAtendimentoDashboard />} />
          <Route path="atendimento-reports" element={<AutomationAtendimentoReports />} />
          <Route path="pesquisas" element={<AutomationPesquisas />} />
          <Route path="coldvisio" element={<AutomationColdvisio />} />
          <Route path="xweb" element={<AutomationColdvisio productKey="xweb" />} />
          <Route path="sitrad" element={<AutomationColdvisio productKey="sitrad" />} />
          <Route path="acessos" element={<SuperAdminOnly><AccessControlPage /></SuperAdminOnly>} />
        </Route>

        <Route path="/departamento-informacao/organograma/:orgChartId/visualizar" element={
          <Auth><OrgChartPrintPage /></Auth>
        } />

        <Route path="/departamento-informacao" element={
          <Auth><ModuleGuard module="departamento"><InformationLayout /></ModuleGuard></Auth>
        }>
          <Route index element={<InformationPage />} />
          <Route path="organograma" element={<OrgChartListPage />} />
          <Route path="organograma/:orgChartId" element={<OrgChartDetailPage />} />
          <Route path="producao" element={<ProductionPage />} />
          <Route path="producao/:modelId" element={<ProductionModelPage />} />
        </Route>

        <Route path="/assistencia" element={
          <Auth><ModuleGuard module="assistencia"><AssistenciaLayout /></ModuleGuard></Auth>
        }>
          <Route index element={<AssistenciaOSPage />} />
          <Route path="os/:id" element={<AssistenciaOSDetail />} />
          <Route path="profile" element={<IndustriaProfilePage />} />
          <Route path="clients" element={<AssistenciaClients />} />
          <Route path="tecnicos" element={<AdminOnly fallback="/assistencia"><AssistenciaTecnicos /></AdminOnly>} />
        </Route>

        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/dashboard" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  )
}
