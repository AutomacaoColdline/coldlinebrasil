import { motion } from 'framer-motion'
import { BadgeCheck, Headphones, TrendingUp } from 'lucide-react'

const blocks = [
  {
    icon: BadgeCheck,
    title: 'Qualidade Garantida',
    desc: 'Todos os produtos passam por rigoroso controle de qualidade antes da entrega. Componentes certificados e processos industriais que garantem durabilidade e confiabilidade em cada projeto.',
    stat: '100%', statLabel: 'inspecionados',
    gradFrom: '#0A3D62', gradTo: '#1E5FAF',
  },
  {
    icon: Headphones,
    title: 'Suporte Técnico 24h',
    desc: 'Equipe de engenharia disponível 24 horas por dia, 7 dias por semana, 365 dias por ano. Atendemos emergências com agilidade para minimizar impactos operacionais.',
    stat: '24/7', statLabel: 'disponibilidade',
    gradFrom: '#0e4f7e', gradTo: '#1E5FAF',
  },
  {
    icon: TrendingUp,
    title: 'Experiência Comprovada',
    desc: 'Mais de 26 anos atuando no mercado, com expertise em projetos dos mais variados portes e segmentos. Cada desafio fortalece nosso portfólio e consolida nossa liderança.',
    stat: '+26', statLabel: 'anos de mercado',
    gradFrom: '#334155', gradTo: '#0A3D62',
  },
]

export default function QualidadeSection() {
  return (
    <section className="section bg-section-alt">
      <div className="wrap">

        <motion.div
          className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <span className="label">Nossos Pilares</span>
          <h2 className="heading">Qualidade e excelência em cada projeto</h2>
          <p className="subheading">
            Construímos relações de longo prazo com base em três pilares fundamentais.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {blocks.map(({ icon: Icon, title, desc, stat, statLabel, gradFrom, gradTo }, i) => (
            <motion.div
              key={i}
              className="card overflow-hidden"
              initial={{ opacity: 0, y: 32 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              {/* Gradient top */}
              <div
                className="px-6 pt-7 pb-10"
                style={{ background: `linear-gradient(to right, ${gradFrom}, ${gradTo})` }}
              >
                <div className="flex items-start justify-between">
                  <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Icon size={22} className="text-white" strokeWidth={1.8} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl sm:text-3xl font-extrabold text-white">{stat}</div>
                    <div className="text-[10px] text-white/70 uppercase tracking-wider">{statLabel}</div>
                  </div>
                </div>
              </div>

              {/* Body — overlap */}
              <div className="relative -mt-4 bg-white rounded-t-3xl px-6 pt-6 pb-7">
                <h3 className="text-base font-bold text-brand-dark">{title}</h3>
                <p className="mt-2.5 text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  )
}
