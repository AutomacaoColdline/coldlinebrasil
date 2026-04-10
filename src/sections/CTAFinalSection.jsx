import { motion } from 'framer-motion'
import { Snowflake } from 'lucide-react'
import CTAButton from '../components/CTAButton'

const trust = ['+26 Anos', '+10.000 Clientes', 'Suporte 24h/365', 'Gás Ecológico']

export default function CTAFinalSection() {
  return (
    <section className="section bg-section-alt">
      <div className="wrap">
        <motion.div
          className="relative bg-hero-gradient rounded-2xl sm:rounded-3xl overflow-hidden text-center px-6 py-14 sm:py-20 lg:py-28"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65 }}
        >
          {/* Glows */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute -top-24 -left-24 w-80 h-80 bg-brand-mid/25 rounded-full blur-[100px]" />
            <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-brand-light/20 rounded-full blur-[80px]" />
          </div>

          {/* Snowflakes — hidden on mobile */}
          {[
            { top: '14%', left: '7%',   size: 28, delay: 0 },
            { top: '18%', right: '9%',  size: 22, delay: 0.7 },
            { bottom: '18%', left: '10%', size: 18, delay: 1.1 },
            { bottom: '14%', right: '7%', size: 26, delay: 0.3 },
          ].map(({ size, delay, ...pos }, i) => (
            <motion.div
              key={i}
              className="absolute hidden sm:block text-white/8 pointer-events-none"
              style={pos}
              animate={{ y: [0, -10, 0], rotate: [0, 25, 0] }}
              transition={{ duration: 5.5 + i * 0.6, repeat: Infinity, delay, ease: 'easeInOut' }}
              aria-hidden
            >
              <Snowflake size={size} strokeWidth={1.4} />
            </motion.div>
          ))}

          {/* Content */}
          <div className="relative z-10 max-w-2xl mx-auto">
            <motion.div
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-brand-ice/85 text-xs font-semibold px-4 py-2 rounded-full mb-6"
              initial={{ opacity: 0, y: -10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.15 }}
            >
              <Snowflake size={12} />
              Atendimento rápido e personalizado
            </motion.div>

            <motion.h2
              className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight text-balance"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.22 }}
            >
              Solicite agora um orçamento{' '}
              <span className="text-brand-ice">personalizado</span>
            </motion.h2>

            <motion.p
              className="mt-4 text-white/80 text-sm sm:text-base leading-relaxed max-w-lg mx-auto"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.3 }}
            >
              Nossa equipe técnica está pronta para analisar sua necessidade
              e apresentar a solução ideal para o seu projeto.
            </motion.p>

            <motion.div
              className="mt-8 cta-row"
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.55, delay: 0.38 }}
            >
              <CTAButton size="lg" />
              <p className="text-white/60 text-xs hidden sm:block">
                Resposta em até 2 horas úteis
              </p>
            </motion.div>

            {/* Trust badges */}
            <motion.div
              className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-2"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              {trust.map((t, i) => (
                <span key={i} className="flex items-center gap-2 text-white/60 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">
                  {i > 0 && <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:inline-block" />}
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
