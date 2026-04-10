import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Snowflake } from 'lucide-react'
import CTAButton from './CTAButton'

const navLinks = [
  { label: 'Início',       href: '#hero' },
  { label: 'Sobre',        href: '#sobre' },
  { label: 'Diferenciais', href: '#diferenciais' },
  { label: 'Soluções',     href: '#solucoes' },
  { label: 'Contato',      href: '#footer' },
]

function scrollTo(href) {
  const el = document.querySelector(href)
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 32)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  // lock body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleLink = (href) => {
    setOpen(false)
    setTimeout(() => scrollTo(href), 50)
  }

  return (
    <>
      {/* ── Bar ─────────────────────────────────────────── */}
      <motion.header
        className={`
          fixed inset-x-0 top-0 z-50
          transition-all duration-300
          ${scrolled ? 'backdrop-blur-md shadow-lg py-2.5' : 'py-4'}
        `}
        style={{ backgroundColor: scrolled ? 'rgba(10,61,98,0.97)' : 'rgba(10,61,98,0.18)' }}
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
      >
        <div className="wrap flex items-center justify-between">

          {/* Logo */}
          <a
            href="#hero"
            onClick={e => { e.preventDefault(); handleLink('#hero') }}
            className="flex items-center gap-2.5 min-h-[44px]"
            aria-label="ColdLine Brasil – início"
          >
            <div className="w-8 h-8 rounded-xl bg-brand-mid flex items-center justify-center glow-blue">
              <Snowflake size={17} className="text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-none">
              <span className="block text-white font-extrabold text-base tracking-tight">ColdLine</span>
              <span className="block text-brand-ice/70 text-[9px] font-semibold tracking-[0.2em] uppercase">Brasil</span>
            </div>
          </a>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-7" aria-label="Principal">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={e => { e.preventDefault(); handleLink(href) }}
                className="relative text-white/75 hover:text-white text-sm font-medium transition-colors duration-200 group py-1"
              >
                {label}
                <span className="absolute bottom-0 inset-x-0 h-px bg-brand-mid scale-x-0 group-hover:scale-x-100 transition-transform duration-200 origin-left rounded-full" />
              </a>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden lg:block">
            <CTAButton size="sm" />
          </div>

          {/* Hamburger */}
          <button
            className="lg:hidden flex items-center justify-center w-11 h-11 rounded-xl text-white hover:bg-white/10 transition-colors"
            onClick={() => setOpen(v => !v)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </motion.header>

      {/* ── Mobile drawer ───────────────────────────────── */}
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 z-40 bg-brand-900/70 backdrop-blur-sm lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-72 bg-brand-dark flex flex-col lg:hidden"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-brand-mid flex items-center justify-center">
                    <Snowflake size={14} className="text-white" strokeWidth={2.5} />
                  </div>
                  <span className="text-white font-bold text-sm">ColdLine Brasil</span>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-white/75 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label="Fechar menu"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Links */}
              <nav className="flex flex-col p-4 gap-1 flex-1" aria-label="Menu mobile">
                {navLinks.map(({ label, href }, i) => (
                  <motion.a
                    key={href}
                    href={href}
                    onClick={e => { e.preventDefault(); handleLink(href) }}
                    className="flex items-center px-4 py-3.5 rounded-xl text-white/75 hover:text-white hover:bg-white/10 text-base font-medium transition-all duration-150"
                    initial={{ x: 20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    {label}
                  </motion.a>
                ))}
              </nav>

              {/* Bottom CTA */}
              <div className="p-4 border-t border-white/10">
                <CTAButton size="md" className="w-full justify-center" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
