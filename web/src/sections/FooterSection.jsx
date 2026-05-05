import { motion } from 'framer-motion'
import {
  MapPin, Phone, MessageCircle, Clock, Mail,
  Snowflake, Instagram, Facebook, Linkedin, Youtube,
} from 'lucide-react'

const FOOTER_BG = '#072233'   // garante cor mesmo se JIT não gerar bg-brand-900

const WA =
  'https://wa.me/5567992933820?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento.'

const navLinks = [
  { label: 'Início',          href: '#hero' },
  { label: 'Sobre a Empresa', href: '#sobre' },
  { label: 'Soluções',        href: '#solucoes' },
  { label: 'Diferenciais',    href: '#diferenciais' },
]

const linhas = [
  'Linha Agro — Cold 5S, Cold 10S, Cold 12SX, Cold 15SX',
  'Linha Industrial — Frigoríficos, Laboratórios, Armazenagem',
  'Linha Frigorífica — Painéis, Telhas, Portas',
  'Cold G2 — Lançamento 2026',
]

const socials = [
  { icon: Instagram, href: '#', label: 'Instagram' },
  { icon: Facebook,  href: '#', label: 'Facebook' },
  { icon: Linkedin,  href: '#', label: 'LinkedIn' },
  { icon: Youtube,   href: '#', label: 'YouTube' },
]

const contact = [
  { icon: MapPin,        value: 'Av. Gury Marques, 3753\nCampo Grande, MS' },
  { icon: Phone,         value: '(67) 3389-0800',           href: 'tel:+556733890800' },
  { icon: MessageCircle, value: '(67) 99293-3820',          href: WA,    external: true },
  { icon: Mail,          value: 'coldline@coldline.com.br',  href: 'mailto:coldline@coldline.com.br' },
  { icon: Clock,         value: 'Seg. a Sex., 7h30 – 17h30' },
]

function scroll(href) {
  document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })
}

export default function FooterSection() {
  return (
    <footer
      id="footer"
      className="text-white"
      style={{ backgroundColor: FOOTER_BG }}
    >
      {/* ── Main grid ─────────────────────────────────── */}
      <div className="wrap pt-14 pb-10 sm:pt-16 sm:pb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-10 xl:gap-8">

          {/* Brand */}
          <div className="sm:col-span-2 xl:col-span-1">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-9 h-9 rounded-xl bg-brand-mid flex items-center justify-center">
                <Snowflake size={17} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="leading-none">
                <span className="block text-white font-extrabold text-base tracking-tight">ColdLine</span>
                <span className="block text-brand-ice text-[9px] font-semibold tracking-[0.2em] uppercase opacity-70">Brasil</span>
              </div>
            </div>
            <p className="text-white/70 text-sm leading-relaxed mb-6 max-w-xs">
              Fabricação e serviços em climatização para o agronegócio e indústrias.
              Desde abril de 1998 — mais de 10.000 clientes atendidos em todo o Brasil.
            </p>
            <div className="flex gap-2.5">
              {socials.map(({ icon: Icon, href, label }) => (
                <motion.a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-10 h-10 rounded-xl hover:bg-brand-mid flex items-center justify-center transition-colors duration-200"
                  style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.94 }}
                >
                  <Icon size={16} className="text-white opacity-80" />
                </motion.a>
              ))}
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-5">
              Navegação
            </h4>
            <ul className="space-y-1">
              {navLinks.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    onClick={e => { e.preventDefault(); scroll(href) }}
                    className="text-white/70 hover:text-white text-sm transition-colors duration-200 flex items-center min-h-[38px]"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Linhas */}
          <div>
            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-5">
              Nossas Linhas
            </h4>
            <ul className="space-y-2.5">
              {linhas.map(linha => (
                <li key={linha} className="text-white/65 text-xs leading-relaxed">{linha}</li>
              ))}
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="text-white/60 text-[10px] font-bold uppercase tracking-[0.18em] mb-5">
              Contato
            </h4>
            <ul className="space-y-4">
              {contact.map(({ icon: Icon, value, href, external }, i) => {
                const content = (
                  <div className="flex items-start gap-3">
                    <Icon size={15} className="text-brand-200 flex-shrink-0 mt-0.5" strokeWidth={1.8} />
                    <span className="text-white/75 text-sm whitespace-pre-line leading-relaxed">{value}</span>
                  </div>
                )
                if (href) return (
                  <li key={i}>
                    <a
                      href={href}
                      target={external ? '_blank' : undefined}
                      rel={external ? 'noopener noreferrer' : undefined}
                      className="hover:text-white transition-colors duration-200 block"
                    >
                      {content}
                    </a>
                  </li>
                )
                return <li key={i}>{content}</li>
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ─────────────────────────────────── */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="wrap py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-white/50 text-xs">
            © {new Date().getFullYear()} ColdLine Brasil. Todos os direitos reservados.
          </p>
          <p className="text-white/40 text-xs">
            Climatização · Refrigeração · Controle de Temperatura e Umidade
          </p>
        </div>
      </div>
    </footer>
  )
}
