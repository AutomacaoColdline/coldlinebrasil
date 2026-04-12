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

export default function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}
