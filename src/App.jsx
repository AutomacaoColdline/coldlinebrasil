import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Navbar from './components/Navbar'
import FloatingWhatsApp from './components/FloatingWhatsApp'
import HeroSection from './sections/HeroSection'
import DiferenciaisSection from './sections/DiferenciaisSection'
import SobreSection from './sections/SobreSection'
import SolucoesSection from './sections/SolucoesSection'
import AmbientalSection from './sections/AmbientalSection'
import QualidadeSection from './sections/QualidadeSection'
import SobreDetalhadoSection from './sections/SobreDetalhadoSection'
import CTAFinalSection from './sections/CTAFinalSection'
import FooterSection from './sections/FooterSection'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import ProtectedRoute from './components/ProtectedRoute'

function LandingPage() {
  return (
    <div className="overflow-x-hidden">
      <Navbar />
      <main>
        <HeroSection />
        <SobreSection />
        <DiferenciaisSection />
        <SolucoesSection />
        <AmbientalSection />
        <QualidadeSection />
        <SobreDetalhadoSection />
        <CTAFinalSection />
      </main>
      <FooterSection />
      <FloatingWhatsApp />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  )
}
