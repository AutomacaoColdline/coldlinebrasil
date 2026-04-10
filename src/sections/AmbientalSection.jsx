import { motion } from 'framer-motion'
import { Leaf, Wind, Zap, CheckCircle2 } from 'lucide-react'

const pillars = [
  {
    icon: Leaf,
    title: 'Gás Ecológico',
    desc: 'Refrigerantes de baixo GWP (Global Warming Potential) em conformidade com o Protocolo de Montreal e as normas ambientais nacionais e internacionais.',
    iconClass: 'text-emerald-600 bg-emerald-50',
  },
  {
    icon: Zap,
    title: 'Eficiência Energética',
    desc: 'Sistemas projetados para maximizar a eficiência energética, reduzindo consumo e custos operacionais sem perda de performance.',
    iconClass: 'text-amber-600 bg-amber-50',
  },
  {
    icon: Wind,
    title: 'Sustentabilidade',
    desc: 'Processos e produtos alinhados às melhores práticas de sustentabilidade, contribuindo para operações mais limpas e responsáveis.',
    iconClass: 'text-sky-600 bg-sky-50',
  },
]

const commitments = [
  'Conformidade com normas ABNT e regulamentações ambientais',
  'Equipamentos certificados pelo INMETRO',
  'Refrigerantes aprovados pelo Protocolo de Montreal',
  'Programa de logística reversa de embalagens',
  'Projetos com menor impacto na pegada de carbono',
]

export default function AmbientalSection() {
  return (
    <section className="section bg-white overflow-hidden">
      <div className="wrap">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">

          {/* ── Left ─────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold px-4 py-1.5 rounded-full mb-5 uppercase tracking-wide">
              <Leaf size={12} />
              Compromisso Ambiental
            </span>
            <h2 className="heading">
              Tecnologia responsável com o{' '}
              <span className="text-emerald-600">meio ambiente</span>
            </h2>
            <p className="subheading">
              Desenvolvemos soluções que unem alta tecnologia com responsabilidade
              ambiental, sem abrir mão de performance e durabilidade.
            </p>

            {/* Checklist */}
            <ul className="mt-7 space-y-3">
              {commitments.map((item, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3 text-sm text-gray-600"
                  initial={{ opacity: 0, x: -16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.38, delay: i * 0.07 }}
                >
                  <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0 mt-0.5" strokeWidth={2.2} />
                  {item}
                </motion.li>
              ))}
            </ul>

            {/* ECO Seal */}
            <motion.div
              className="mt-8 inline-flex items-center gap-4 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-2xl p-5"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: 0.35 }}
            >
              <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Leaf size={20} className="text-white" />
              </div>
              <div>
                <div className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Selo ECO</div>
                <div className="text-brand-dark font-bold text-sm">Produto Sustentável Certificado</div>
                <div className="text-gray-400 text-xs mt-0.5">ColdLine Brasil — Linha Verde</div>
              </div>
            </motion.div>
          </motion.div>

          {/* ── Right ─────────────────────────────────────── */}
          <div className="space-y-3">
            {pillars.map(({ icon: Icon, title, desc, iconClass }, i) => (
              <motion.div
                key={i}
                className="card flex gap-4 p-5 sm:p-6 group"
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.48, delay: i * 0.1 }}
              >
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300 ${iconClass}`}>
                  <Icon size={20} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="font-bold text-brand-dark text-sm mb-1">{title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

        </div>
      </div>
    </section>
  )
}
