import { motion } from 'framer-motion'
import { ChevronDown, Snowflake } from 'lucide-react'
import CTAButton from '../components/CTAButton'

const stats = [
  { value: '+26 anos', label: 'de experiência' },
  { value: '+10.000', label: 'clientes atendidos' },
  { value: '3 linhas', label: 'de produto' },
  { value: '24h/365', label: 'suporte técnico' },
]

export default function HeroSection() {
  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-hero-gradient"
    >
      {/* ── Glow blobs ─────────────────────────────────── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-32 -left-32 w-80 h-80 sm:w-[480px] sm:h-[480px] bg-brand-mid/25 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 -right-32 w-72 h-72 sm:w-[420px] sm:h-[420px] bg-brand-light/15 rounded-full blur-[80px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-400/8 rounded-full blur-[60px]" />
      </div>

      {/* ── Grid overlay ────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.035]"
        aria-hidden
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />

      {/* ── Floating snowflakes — hidden on xs ──────────── */}
      {[
        { top: '18%', left: '6%',   size: 24, delay: 0 },
        { top: '22%', right: '8%',  size: 20, delay: 0.6 },
        { bottom: '28%', left: '5%', size: 18, delay: 1.1 },
        { bottom: '22%', right: '6%', size: 22, delay: 0.3 },
      ].map(({ size, delay, ...pos }, i) => (
        <motion.div
          key={i}
          className="absolute hidden sm:block text-white/8 pointer-events-none"
          style={pos}
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 5 + i * 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
          aria-hidden
        >
          <Snowflake size={size} strokeWidth={1.4} />
        </motion.div>
      ))}

      {/* ── Content ─────────────────────────────────────── */}
      <div className="relative z-10 wrap text-center pt-28 pb-10 sm:pt-32 sm:pb-14">

        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-brand-ice/90 text-xs font-semibold px-4 py-2 rounded-full mb-7 sm:mb-9"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <Snowflake size={12} strokeWidth={2.5} />
          Especialistas em Climatização e Refrigeração desde 1998
        </motion.div>

        {/* H1 */}
        <motion.h1
          className="text-[2rem] leading-tight sm:text-4xl lg:text-5xl xl:text-6xl font-extrabold text-white tracking-tight text-balance max-w-4xl mx-auto"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.1 }}
        >
          Soluções inteligentes em{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-200 to-brand-ice">
            climatização e refrigeração
          </span>
        </motion.h1>

        {/* Sub */}
        <motion.p
          className="mt-5 text-base sm:text-lg text-white/80 max-w-xl mx-auto leading-relaxed"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.18 }}
        >
          Controle preciso de temperatura e umidade com alta performance
          e eficiência energética para o agronegócio e a indústria.
        </motion.p>

        {/* CTA */}
        <motion.div
          className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.26 }}
        >
          <CTAButton size="lg" />
          <a
            href="#sobre"
            onClick={e => { e.preventDefault(); document.querySelector('#sobre')?.scrollIntoView({ behavior: 'smooth' }) }}
            className="flex items-center gap-1.5 text-white/65 hover:text-white text-sm font-medium transition-colors duration-200 min-h-[44px]"
          >
            Conheça a empresa
            <ChevronDown size={15} />
          </a>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          className="mt-14 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-px bg-white/10 rounded-2xl overflow-hidden max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.42 }}
        >
          {stats.map(({ value, label }, i) => (
            <div key={i} className="bg-brand-dark/60 backdrop-blur-sm px-4 py-5 text-center">
              <div className="text-xl sm:text-2xl font-extrabold text-white">{value}</div>
              <div className="mt-0.5 text-[10px] sm:text-xs text-white/65 uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Scroll cue ──────────────────────────────────── */}
      <motion.button
        className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white/50 hover:text-white/80 transition-colors min-h-[44px] flex items-end"
        onClick={() => document.querySelector('#diferenciais')?.scrollIntoView({ behavior: 'smooth' })}
        animate={{ y: [0, 7, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
        aria-label="Ir para próxima seção"
      >
        <ChevronDown size={26} strokeWidth={1.5} />
      </motion.button>
    </section>
  )
}
