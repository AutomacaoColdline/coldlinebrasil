import { motion } from 'framer-motion'
import { Droplets, Thermometer, Zap, Leaf, Shield, Wifi } from 'lucide-react'

// Paleta unificada — apenas azuis da marca
const cards = [
  {
    icon: Droplets,
    title: 'Controle de Umidade',
    desc: 'Sistema de desumidificação incorporado ao circuito. Garante homogeneidade de umidade relativa, prevenindo a deterioração de sementes e produtos armazenados.',
  },
  {
    icon: Thermometer,
    title: 'Controle de Temperatura',
    desc: 'Faixa de operação de -30 °C a +15 °C com variação mínima. Reduz o metabolismo e o processo de deterioração, mantendo vigor e poder de germinação.',
  },
  {
    icon: Zap,
    title: 'Alta Performance',
    desc: 'Nova Linha Agro com exclusivo sistema de proteção PHP e condensação modelo X para altas temperaturas. Equipamentos de alto rendimento para operação contínua.',
  },
  {
    icon: Leaf,
    title: 'Eficiência Energética',
    desc: 'Gás ecológico com baixo GWP em todos os equipamentos. Alta eficiência energética que reduz custos operacionais sem perda de performance.',
  },
  {
    icon: Shield,
    title: 'Painéis Isotérmicos',
    desc: 'Frigoríficos construídos com exclusivo sistema de encaixe macho-fêmea e sobreposição de chapas — perfeita vedação, isolamento máximo e rigidez contra impacto.',
  },
  {
    icon: Wifi,
    title: 'Monitoramento Remoto',
    desc: 'Operação e monitoramento à distância em todos os equipamentos. Acompanhe temperatura e umidade em tempo real, com suporte técnico 24h/365 dias.',
  },
]

export default function DiferenciaisSection() {
  return (
    <section id="diferenciais" className="section bg-section-alt">
      <div className="wrap">

        {/* Header */}
        <motion.div
          className="text-center max-w-xl mx-auto mb-10 sm:mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <span className="label">Por que escolher a ColdLine</span>
          <h2 className="heading">Tecnologia e precisão em cada detalhe</h2>
          <p className="subheading">
            Nossas soluções unem alta performance, durabilidade e custo-benefício
            para o seu negócio.
          </p>
        </motion.div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {cards.map(({ icon: Icon, title, desc }, i) => (
            <motion.div
              key={i}
              className="card p-6 group"
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.48, delay: i * 0.07 }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-brand-ice flex items-center justify-center mb-5 group-hover:bg-brand-ice-2 transition-colors duration-300">
                <Icon size={22} className="text-brand-mid" strokeWidth={1.8} />
              </div>

              <h3 className="text-base font-bold text-brand-dark mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>

              {/* Bottom accent */}
              <div className="mt-5 h-px bg-gradient-to-r from-brand-ice via-brand-mid/20 to-transparent" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
