import { motion } from 'framer-motion'
import { Target, Eye, Heart, CheckCircle2 } from 'lucide-react'

const blocks = [
  {
    icon: Target, label: 'Missão', title: 'Nosso propósito',
    text: 'Oferecer aos clientes produtos e serviços no segmento de instalações frigoríficas agregando qualidade, desenvolvimento, suporte técnico profissional e o melhor custo-benefício do mercado, visando a satisfação do cliente, a valorização dos colaboradores e promovendo a melhoria contínua.',
    iconClass: 'text-brand-mid bg-brand-ice',
  },
  {
    icon: Eye, label: 'Visão', title: 'Onde queremos chegar',
    text: 'Ser conhecida pelo mercado como marco de referência na construção de instalações frigoríficas, reconhecida pela excelência técnica, inovação constante e pela solidez de mais de 26 anos de entregas com qualidade.',
    iconClass: 'text-brand-700 bg-brand-ice-2',
  },
]

const valores = [
  'Ética em todas as relações',
  'Respeito ao cliente e às suas necessidades',
  'Valorização profissional de nossa equipe',
  'Busca contínua pela qualidade',
  'Compromisso com a sustentabilidade',
]

export default function SobreDetalhadoSection() {
  return (
    <section className="section bg-white">
      <div className="wrap">

        <motion.div
          className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <span className="label">Identidade Corporativa</span>
          <h2 className="heading">Missão, Visão e Valores</h2>
          <p className="subheading">
            Os princípios que guiam cada decisão e cada projeto da ColdLine Brasil.
          </p>
        </motion.div>

        {/* Missão + Visão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          {blocks.map(({ icon: Icon, label, title, text, iconClass }, i) => (
            <motion.div
              key={i}
              className="card p-6 sm:p-8"
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
            >
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center mb-5 ${iconClass}`}>
                <Icon size={20} strokeWidth={1.8} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-brand-mid">{label}</span>
              <h3 className="mt-1 text-lg font-bold text-brand-dark">{title}</h3>
              <p className="mt-3 text-gray-500 text-sm leading-relaxed">{text}</p>
            </motion.div>
          ))}
        </div>

        {/* Valores */}
        <motion.div
          className="bg-hero-gradient rounded-2xl sm:rounded-3xl p-7 sm:p-12 text-white relative overflow-hidden"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <div className="absolute -top-16 -right-16 w-56 h-56 bg-brand-light/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-44 h-44 bg-blue-300/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center">
                  <Heart size={18} className="text-white" strokeWidth={1.8} />
                </div>
                <span className="text-white/75 text-xs font-bold uppercase tracking-[0.15em]">Valores</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white">
                Os princípios que nos guiam todos os dias
              </h3>
              <p className="mt-4 text-white/70 leading-relaxed text-sm">
                Mais do que regras corporativas, nossos valores são compromissos
                reais com clientes, colaboradores e com o futuro.
              </p>
            </div>

            <div className="space-y-2.5">
              {valores.map((v, i) => (
                <motion.div
                  key={i}
                  className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3.5 border border-white/10"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.38, delay: i * 0.07 }}
                >
                  <CheckCircle2 size={16} className="text-brand-ice flex-shrink-0" strokeWidth={2.2} />
                  <span className="text-white/85 text-sm font-medium">{v}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

      </div>
    </section>
  )
}
