import { motion } from 'framer-motion'
import { MapPin, Globe, Users, Award } from 'lucide-react'
import CTAButton from '../components/CTAButton'

const metrics = [
  { value: '1998', label: 'Fundação', icon: Award },
  { value: '+10k', label: 'Clientes', icon: Users },
  { value: 'Nacional', label: 'Atuação', icon: MapPin },
  { value: 'Internacional', label: 'Exportação', icon: Globe },
]

const tags = ['Projetos Personalizados', 'Suporte 24h/365', 'Gás Ecológico', 'Atuação Nacional']

export default function SobreSection() {
  return (
    <section id="sobre" className="section bg-white">
      <div className="wrap">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ── Visual card (stacks first on mobile) ─────── */}
          <motion.div
            className="relative"
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65 }}
          >
            <div className="relative bg-hero-gradient rounded-3xl p-7 sm:p-10 text-white overflow-hidden shadow-glow">
              {/* Glow orbs */}
              <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-light/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />

              <div className="relative z-10">
                <span className="text-brand-ice/60 text-xs font-semibold uppercase tracking-[0.15em]">
                  Sobre a ColdLine Brasil
                </span>
                <h3 className="mt-2 text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                  Mais de duas décadas liderando o setor
                </h3>
                <p className="mt-4 text-white/80 leading-relaxed text-sm">
                  Fundada em 1998, a ColdLine Brasil é referência nacional na fabricação
                  de equipamentos frigoríficos e instalações para controle de temperatura
                  e umidade — do agronegócio à indústria.
                </p>
              </div>

              {/* Metric grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3 mt-7">
                {metrics.map(({ value, label, icon: Icon }, i) => (
                  <div key={i} className="bg-white/10 rounded-2xl p-4 border border-white/10">
                    <Icon size={16} className="text-brand-ice mb-2 opacity-80" strokeWidth={1.8} />
                    <div className="text-lg sm:text-xl font-extrabold text-white">{value}</div>
                    <div className="text-[10px] text-white/65 mt-0.5 uppercase tracking-wide">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Floating badge */}
            <motion.div
              className="absolute -bottom-4 -right-3 sm:-bottom-5 sm:-right-5 bg-white rounded-2xl px-4 py-3 shadow-card-hover border border-gray-100 flex items-center gap-3"
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut' }}
            >
              <div className="w-9 h-9 bg-gradient-to-br from-brand-mid to-brand-light rounded-xl flex items-center justify-center flex-shrink-0">
                <Award size={16} className="text-white" />
              </div>
              <div className="leading-none">
                <div className="text-[10px] text-gray-400 font-medium">Qualidade</div>
                <div className="text-sm font-bold text-brand-dark">Certificada</div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Text ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.65, delay: 0.08 }}
          >
            <span className="label">Nossa História</span>
            <h2 className="heading">
              Experiência que gera{' '}
              <span className="text-brand-mid">confiança e resultados</span>
            </h2>

            <div className="mt-5 space-y-4 text-gray-500 text-sm sm:text-base leading-relaxed">
              <p>
                Fundada em abril de 1998, a ColdLine Brasil é especialista na fabricação
                e desenvolvimento de equipamentos frigoríficos e instalações para controle
                de temperatura e umidade — desde câmaras de sementes até grandes frigoríficos industriais.
              </p>
              <p>
                Com mais de 26 anos, já atendemos mais de 10.000 clientes em diversos
                segmentos: indústrias e distribuidoras de alimentos, frigoríficos, supermercados,
                farmacêutica e empresas do agronegócio focadas em armazenagem de sementes.
              </p>
              <p>
                Nossa equipe técnica desenvolve projetos personalizados — do dimensionamento
                à entrega — com o melhor custo-benefício e suporte técnico 24h/365 dias.
              </p>
            </div>

            {/* Tags */}
            <div className="mt-6 flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="bg-brand-ice text-brand-dark text-xs font-semibold px-3.5 py-1.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>

            <div className="mt-8">
              <CTAButton size="md" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
