import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sprout, Factory, Layers, Sparkles, X,
  CheckCircle2, ArrowRight, Snowflake, Thermometer,
  Radio, Gauge, Zap, Box, PackageOpen, DoorOpen,
  FlaskConical, Truck, Cpu, LayoutGrid,
  ChevronLeft, ChevronRight,
} from 'lucide-react'
import CTAButton from '../components/CTAButton'

// ── WhatsApp ────────────────────────────────────────────────────────────────────
const WA_BASE = 'https://wa.me/5567992933820?text=Ol%C3%A1%2C%20gostaria%20de%20solicitar%20um%20or%C3%A7amento%20do%20'

function waLink(product) {
  return WA_BASE + encodeURIComponent(product) + '.'
}

// ── Product data ─────────────────────────────────────────────────────────────────
const LINES = [
  {
    id: 'agro',
    label: 'Linha Agro',
    icon: Sprout,
    color: { from: '#16a34a', to: '#0f766e' },     // emerald → teal
    bgClass: 'from-emerald-600 to-teal-700',
    textAccent: 'text-emerald-600',
    bgAccent: 'bg-emerald-50',
    borderAccent: 'border-emerald-200',
  },
  {
    id: 'industrial',
    label: 'Linha Industrial',
    icon: Factory,
    color: { from: '#0A3D62', to: '#1E5FAF' },
    bgClass: 'from-brand-dark to-brand-mid',
    textAccent: 'text-brand-mid',
    bgAccent: 'bg-brand-ice',
    borderAccent: 'border-brand-ice-2',
  },
  {
    id: 'frigorifica',
    label: 'Linha Frigorífica',
    icon: Layers,
    color: { from: '#334155', to: '#1e293b' },
    bgClass: 'from-slate-600 to-slate-800',
    textAccent: 'text-slate-600',
    bgAccent: 'bg-slate-50',
    borderAccent: 'border-slate-200',
  },
  {
    id: 'coldg2',
    label: 'Cold G2',
    icon: Sparkles,
    color: { from: '#0A3D62', to: '#3B82F6' },
    bgClass: 'from-brand-dark to-brand-light',
    textAccent: 'text-brand-mid',
    bgAccent: 'bg-brand-ice',
    borderAccent: 'border-brand-ice-2',
    isNew: true,
  },
]

const PRODUCTS = {
  agro: [
    {
      id: 'cold5s', icon: Radio, name: 'Cold 5S', badge: 'Monobloco Plug-in',
      short: 'Climatizador compacto de alta potência para conservação de sementes. Instalação rápida e operação simples — inclusive por controle remoto.',
      highlights: [
        'Equipamento monobloco plug-in — sem obra civil',
        'Garante homogeneidade de temperatura e umidade',
        'Operação e monitoramento remoto',
        'Sistema de desumidificação incorporado',
        'Baixo custo de implantação e manutenção',
        'Garantia de 12 meses contra defeitos de fabricação',
      ],
      tags: ['Plug-in', 'Remoto', 'Compacto'],
    },
    {
      id: 'cold10s', icon: Gauge, name: 'Cold 10S', badge: 'Monobloco',
      short: 'Monobloco frigorífico com desumidificação incorporada e monitoramento remoto. Alta eficiência energética com garantia de 12 meses.',
      highlights: [
        'Sistema de desumidificação incorporado ao circuito',
        'Monitoramento à distância em tempo real',
        'Alta eficiência energética',
        'Mantém poder de germinação e vigor das sementes',
        'Fácil instalação e operação simples',
        'Garantia de 12 meses',
      ],
      tags: ['Desumidificação', 'Remoto', 'Alta eficiência'],
    },
    {
      id: 'cold12sx', icon: Zap, name: 'Cold 12SX', badge: 'Industrial',
      short: 'Equipamento industrial para grandes propriedades rurais e sementeiras. Mantém certificação e aumenta a longevidade das sementes.',
      highlights: [
        'Capacidade industrial para grandes volumes',
        'Mantém poder de germinação e vigor das sementes',
        'Garante a certificação da semente',
        'Aumenta a longevidade e o rendimento produtivo',
        'Sistema exclusivo PHP de proteção',
        'Condensação modelo X para altas temperaturas',
      ],
      tags: ['Grande volume', 'Certificação', 'PHP'],
    },
    {
      id: 'cold15sx', icon: Zap, name: 'Cold 15SX', badge: 'Industrial — Maior Capacidade',
      short: 'Maior capacidade da linha Agro. Ideal para cooperativas e sementeiras de grande porte com elevadas exigências de controle climático.',
      highlights: [
        'Maior capacidade da linha ColdLine Agro',
        'Projetado para cooperativas e sementeiras de grande porte',
        'Sistema exclusivo PHP de proteção',
        'Condensação modelo X para altas temperaturas',
        'Controle preciso de temperatura e umidade',
        'Suporte técnico especializado 24h',
      ],
      tags: ['Maior capacidade', 'Cooperativas', 'PHP'],
    },
    {
      id: 'camara-sementes', icon: Box, name: 'Câmara para Sementes', badge: 'Projeto Completo',
      short: 'Câmaras frigoríficas projetadas e construídas sob medida em Painéis Isotérmicos para armazenagem profissional de sementes.',
      highlights: [
        'Projeto personalizado conforme necessidade do cliente',
        'Construção em Painéis Isotérmicos de alta performance',
        'Controle preciso de temperatura e umidade',
        'Inclui sala de máquinas com projeto exclusivo',
        'Solução completa: projeto, construção e instalação',
        'Suporte pós-instalação garantido',
      ],
      tags: ['Sob medida', 'Painéis Isotérmicos', 'Completo'],
    },
  ],
  industrial: [
    {
      id: 'refrig-industrial', icon: Cpu, name: 'Refrigeração Industrial', badge: '-30 °C a +15 °C',
      short: 'Racks construídos com compressores semi-herméticos ou herméticos. Faixa de -30 °C a +15 °C para operação industrial contínua.',
      highlights: [
        'Faixa de operação: -30 °C a +15 °C',
        'Compressores semi-herméticos ou herméticos conforme projeto',
        'Alta confiabilidade para demanda contínua',
        'Dimensionamento personalizado por projeto',
        'Alta eficiência energética e baixo custo operacional',
        'Suporte técnico 24h/365 dias',
      ],
      tags: ['-30°C a +15°C', 'Semi-hermético', 'Contínuo'],
    },
    {
      id: 'frigorificos', icon: PackageOpen, name: 'Frigoríficos', badge: 'Painéis Isotérmicos',
      short: 'Frigoríficos construídos com exclusivo sistema de encaixe macho-fêmea e sala de máquinas com a mais alta tecnologia do mercado.',
      highlights: [
        'Painéis Isotérmicos com sistema exclusivo macho-fêmea',
        'Sobreposição de chapas para vedação perfeita',
        'Máximo isolamento térmico e rigidez contra impacto',
        'Sala de máquinas com projeto exclusivo ColdLine',
        'Soluções para congelamento, resfriamento e antecâmaras',
        'Câmaras dimensionadas conforme volume e temperatura',
      ],
      tags: ['Macho-fêmea', 'Vedação perfeita', 'Sala de máquinas'],
    },
    {
      id: 'laboratorios', icon: FlaskConical, name: 'Laboratórios e Farmacêutica', badge: 'Precisão Regulatória',
      short: 'Controle de temperatura e umidade para laboratórios, biotecnologia e farmacêutica. Conformidade com exigências regulatórias.',
      highlights: [
        'Precisão regulatória para conservação de insumos e amostras',
        'Conformidade com normas ANVISA e regulatórias',
        'Controle rigoroso de temperatura e umidade',
        'Ideal para biotecnologia, farmacêutica e pesquisa',
        'Registros e rastreabilidade de temperatura',
        'Projeto adaptado às normas do setor farmacêutico',
      ],
      tags: ['Regulatório', 'Biotecnologia', 'Farmacêutica'],
    },
    {
      id: 'armazenagem', icon: Truck, name: 'Armazenagem e Distribuição', badge: 'Cold Chain',
      short: 'Câmaras e sistemas de cold chain para distribuidoras, supermercados e centros logísticos com garantia de temperatura em todo o ciclo.',
      highlights: [
        'Câmaras frigoríficas para distribuição de alimentos',
        'Temperatura garantida em todo o ciclo de estoque',
        'Soluções para supermercados e distribuidoras',
        'Cold chain do armazenamento à expedição',
        'Capacidades customizadas conforme o volume',
        'Suporte técnico especializado 24h',
      ],
      tags: ['Cold chain', 'Distribuidoras', 'Supermercados'],
    },
  ],
  frigorifica: [
    {
      id: 'paineis', icon: LayoutGrid, name: 'Painéis Isotérmicos', badge: 'Sistema Macho-Fêmea',
      short: 'Painéis sandwich com exclusivo encaixe macho-fêmea e sobreposição de chapas. Vedação perfeita, máximo isolamento e rigidez estrutural.',
      highlights: [
        'Exclusivo sistema de encaixe tipo macho-fêmea',
        'Sobreposição de chapas para isolamento máximo',
        'Perfeita vedação e rigidez contra impacto',
        'Disponível em diferentes espessuras e acabamentos',
        'Ideal para câmaras frigoríficas e divisórias',
        'Alta durabilidade e facilidade de montagem',
      ],
      tags: ['Macho-fêmea', 'Alta isolação', 'Sandwich'],
    },
    {
      id: 'telhas', icon: Layers, name: 'Telhas Térmicas', badge: 'Cobertura Isotérmica',
      short: 'Telhas termoisolantes que reduzem significativamente a carga térmica em ambientes refrigerados, aumentando a eficiência energética.',
      highlights: [
        'Redução significativa da carga térmica',
        'Maior eficiência energética do sistema de refrigeração',
        'Alta durabilidade e resistência às intempéries',
        'Compatíveis com as câmaras e painéis ColdLine',
        'Disponível em diferentes perfis e espessuras',
        'Instalação ágil e prática',
      ],
      tags: ['Redução de carga', 'Eficiência', 'Cobertura'],
    },
    {
      id: 'portas', icon: DoorOpen, name: 'Portas Frigoríficas', badge: 'Alta Vedação',
      short: 'Portas de alta vedação para câmaras frigoríficas. Modelos deslizantes, de abrir e portinholas com borracha de longa durabilidade.',
      highlights: [
        'Alta vedação com borracha de longa durabilidade',
        'Modelos: deslizante, de abrir e portinhola',
        'Adequadas para ambientes de baixa e alta temperatura',
        'Acionamento manual ou automático conforme projeto',
        'Compatíveis com os painéis ColdLine',
        'Fácil substituição de vedação e acessórios',
      ],
      tags: ['Deslizante', 'De abrir', 'Portinhola'],
    },
    {
      id: 'construcao', icon: Box, name: 'Construção Civil', badge: 'Projeto Completo',
      short: 'Projetos completos de câmaras frigoríficas do dimensionamento arquitetônico à entrega, com equipe técnica especializada.',
      highlights: [
        'Projeto arquitetônico e técnico personalizado',
        'Dimensionamento conforme carga térmica e volume',
        'Construção e reforma de câmaras frigoríficas',
        'Materiais de alta qualidade e durabilidade',
        'Equipe técnica especializada em instalações frigoríficas',
        'Entrega com garantia e suporte pós-obra',
      ],
      tags: ['Projeto completo', 'Reforma', 'Especializado'],
    },
    {
      id: 'acessorios', icon: Sparkles, name: 'Acessórios', badge: 'Linha Completa',
      short: 'Linha completa de acessórios certificados: cortinas de PVC, iluminação frigorífica, termômetros, controladores e muito mais.',
      highlights: [
        'Cortinas de PVC para câmaras frigoríficas',
        'Iluminação frigorífica de alto rendimento',
        'Termômetros e controladores de temperatura',
        'Componentes certificados para refrigeração',
        'Acessórios para instalação e manutenção',
        'Reposição rápida de peças e componentes',
      ],
      tags: ['PVC', 'Controladores', 'Certificados'],
    },
  ],
  coldg2: [
    {
      id: 'coldg2', icon: Sparkles, name: 'Cold G2', badge: 'Lançamento 2026',
      short: 'Nova geração de climatização ColdLine. Tecnologia avançada para controle de temperatura e umidade com máxima eficiência e conectividade.',
      highlights: [
        'Tecnologia de próxima geração ColdLine',
        'Máxima eficiência energética e performance',
        'Controle avançado de temperatura e umidade',
        'Conectividade e monitoramento de nova geração',
        'Design compacto e instalação simplificada',
        'Entre em contato para especificações completas',
      ],
      tags: ['Novo', '2026', 'Next-gen'],
    },
  ],
}

// ── ProductCard ───────────────────────────────────────────────────────────────
function ProductCard({ product, line, onSelect }) {
  const Icon = product.icon
  return (
    <motion.button
      onClick={() => onSelect(product)}
      className="group text-left w-full bg-white rounded-2xl shadow-card border border-gray-100 overflow-hidden flex flex-col cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-mid"
      whileHover={{ y: -5, boxShadow: '0 12px 40px rgba(10,61,98,0.14)' }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 340, damping: 26 }}
    >
      {/* Gradient top */}
      <div className={`relative bg-gradient-to-br ${line.bgClass} p-5 overflow-hidden`}>
        {/* Shimmer */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          style={{ background: 'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.12) 0%, transparent 60%)' }} />

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Icon size={20} className="text-white" strokeWidth={1.8} />
          </div>
          {product.badge && (
            <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wide whitespace-nowrap">
              {product.badge}
            </span>
          )}
        </div>
        <h3 className="relative z-10 mt-4 text-lg font-extrabold text-white tracking-tight leading-tight">
          {product.name}
        </h3>
      </div>

      {/* Body */}
      <div className="p-5 flex flex-col flex-1">
        <p className="text-gray-500 text-sm leading-relaxed flex-1">{product.short}</p>

        {/* Tags */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {product.tags.map(t => (
            <span key={t}
              className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${line.bgAccent} ${line.textAccent} ${line.borderAccent}`}>
              {t}
            </span>
          ))}
        </div>

        {/* Footer link */}
        <div className={`mt-5 pt-4 border-t border-gray-100 flex items-center justify-between`}>
          <span className={`text-xs font-semibold ${line.textAccent} flex items-center gap-1.5 group-hover:gap-2.5 transition-all duration-200`}>
            Ver detalhes
            <ArrowRight size={13} />
          </span>
          <div className={`w-7 h-7 rounded-lg ${line.bgAccent} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200`}>
            <ArrowRight size={13} className={line.textAccent} />
          </div>
        </div>
      </div>
    </motion.button>
  )
}

// ── ProductCarousel ────────────────────────────────────────────────────────────
function ProductCarousel({ products, line, onSelect }) {
  const [idx, setIdx] = useState(0)
  const idxRef = useRef(0)
  const trackRef = useRef(null)
  const rootRef = useRef(null)
  const visibleRef = useRef(false)

  // Scroll apenas dentro do container — nunca mexe na página
  function scrollToCard(i) {
    const track = trackRef.current
    const card = track?.children[i]
    if (track && card) {
      track.scrollTo({ left: card.offsetLeft, behavior: 'smooth' })
    }
  }

  function goTo(i) {
    const n = ((i % products.length) + products.length) % products.length
    idxRef.current = n
    setIdx(n)
    scrollToCard(n)
  }

  // Pausa o auto-avanço quando a seção não está visível na tela
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting },
      { threshold: 0.3 }
    )
    if (rootRef.current) obs.observe(rootRef.current)
    return () => obs.disconnect()
  }, [])

  // Auto-advance só acontece quando visível
  useEffect(() => {
    const t = setInterval(() => {
      if (!visibleRef.current) return
      const next = (idxRef.current + 1) % products.length
      idxRef.current = next
      setIdx(next)
      scrollToCard(next)
    }, 6000)
    return () => clearInterval(t)
  }, [products.length])

  // Sincroniza idx ao fazer scroll manual
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const onScroll = () => {
      const cardWidth = track.children[0]?.offsetWidth || 1
      const n = Math.round(track.scrollLeft / (cardWidth + 16))
      const clamped = Math.max(0, Math.min(n, products.length - 1))
      if (clamped !== idxRef.current) {
        idxRef.current = clamped
        setIdx(clamped)
      }
    }
    track.addEventListener('scroll', onScroll, { passive: true })
    return () => track.removeEventListener('scroll', onScroll)
  }, [products.length])

  return (
    <div ref={rootRef}>
      {/* Track */}
      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {products.map(p => (
          <div
            key={p.id}
            className="snap-start flex-shrink-0 w-full sm:w-[calc(50%-8px)] lg:w-[calc(33.333%-10.67px)]"
          >
            <ProductCard product={p} line={line} onSelect={onSelect} />
          </div>
        ))}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <button
          onClick={() => goTo(idx - 1)}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:border-brand-mid hover:shadow-sm flex items-center justify-center text-gray-400 hover:text-brand-mid transition-all duration-150"
          aria-label="Anterior"
        >
          <ChevronLeft size={15} />
        </button>

        <div className="flex items-center gap-2">
          {products.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Produto ${i + 1}`}
              className={`rounded-full transition-all duration-300 ${
                i === idx
                  ? 'w-6 h-2 bg-brand-mid'
                  : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
              }`}
            />
          ))}
        </div>

        <button
          onClick={() => goTo(idx + 1)}
          className="w-9 h-9 rounded-xl bg-white border border-gray-200 hover:border-brand-mid hover:shadow-sm flex items-center justify-center text-gray-400 hover:text-brand-mid transition-all duration-150"
          aria-label="Próximo"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  )
}

// ── ProductModal ──────────────────────────────────────────────────────────────
function ProductModal({ product, line, onClose }) {
  const Icon = product.icon
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-brand-900/70 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal panel */}
      <motion.div
        className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[92vh] flex flex-col"
        initial={{ y: 60, opacity: 0, scale: 0.97 }}
        animate={{ y: 0,  opacity: 1, scale: 1 }}
        exit={{ y: 60,  opacity: 0, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Header */}
        <div className={`relative bg-gradient-to-br ${line.bgClass} px-6 pt-6 pb-8 overflow-hidden flex-shrink-0`}>
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/20 hover:bg-white/35 flex items-center justify-center text-white transition-colors duration-150"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
                <Icon size={22} className="text-white" strokeWidth={1.8} />
              </div>
              {product.badge && (
                <span className="bg-white/20 border border-white/30 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                  {product.badge}
                </span>
              )}
            </div>
            <h2 className="text-2xl font-extrabold text-white">{product.name}</h2>
            <p className="text-white/65 text-sm mt-1 leading-relaxed">{product.short}</p>
          </div>
        </div>

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1 px-6 py-6">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">
            Principais características
          </h4>
          <ul className="space-y-3">
            {product.highlights.map((h, i) => (
              <motion.li
                key={i}
                className="flex items-start gap-3 text-sm text-gray-600"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <CheckCircle2 size={16} className={`flex-shrink-0 mt-0.5 ${line.textAccent}`} strokeWidth={2.2} />
                {h}
              </motion.li>
            ))}
          </ul>

          {/* Tags */}
          <div className="mt-6 flex flex-wrap gap-2">
            {product.tags.map(t => (
              <span key={t}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${line.bgAccent} ${line.textAccent} ${line.borderAccent}`}>
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* CTA footer */}
        <div className="px-6 py-5 border-t border-gray-100 flex-shrink-0 bg-white">
          <motion.a
            href={waLink(product.name)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-3 w-full bg-brand-mid hover:bg-brand-dark text-white font-semibold text-sm px-6 py-4 rounded-2xl transition-colors duration-200"
            style={{ boxShadow: '0 0 20px rgba(30,95,175,0.3)' }}
            whileHover={{ scale: 1.02, boxShadow: '0 0 32px rgba(30,95,175,0.5)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 380, damping: 22 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Solicitar Orçamento — {product.name}
          </motion.a>
          <p className="text-center text-gray-500 text-xs mt-3">
            Resposta rápida · Atendimento especializado 24h
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SolucoesSection() {
  const [activeTab, setActiveTab] = useState('agro')
  const [selected, setSelected] = useState(null)

  const activeLine = LINES.find(l => l.id === activeTab)
  const products   = PRODUCTS[activeTab] ?? []

  const openModal  = useCallback(p => {
    setSelected(p)
    document.body.style.overflow = 'hidden'
  }, [])

  const closeModal = useCallback(() => {
    setSelected(null)
    document.body.style.overflow = ''
  }, [])

  return (
    <section id="solucoes" className="section bg-section-alt">
      <div className="wrap">

        {/* ── Header ─────────────────────────────────── */}
        <motion.div
          className="text-center max-w-xl mx-auto mb-10 sm:mb-12"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
        >
          <span className="label">Portfólio de Soluções</span>
          <h2 className="heading">Soluções ColdLine para cada segmento</h2>
          <p className="subheading">
            Selecione uma linha para explorar os produtos. Clique em qualquer card
            para ver detalhes e solicitar orçamento.
          </p>
        </motion.div>

        {/* ── Tabs ───────────────────────────────────── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none mb-8 -mx-1 px-1">
          {LINES.map(line => {
            const Icon = line.icon
            const isActive = activeTab === line.id
            return (
              <motion.button
                key={line.id}
                onClick={() => setActiveTab(line.id)}
                className={`
                  relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold
                  whitespace-nowrap transition-colors duration-200 min-h-[44px] flex-shrink-0
                  ${isActive
                    ? 'text-white shadow-glow'
                    : 'text-gray-500 hover:text-brand-dark bg-white border border-gray-200'}
                `}
                whileTap={{ scale: 0.97 }}
              >
                {/* Active bg */}
                {isActive && (
                  <motion.div
                    layoutId="tab-bg"
                    className={`absolute inset-0 rounded-xl bg-gradient-to-r ${line.bgClass}`}
                    transition={{ type: 'spring', stiffness: 340, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <Icon size={15} strokeWidth={2} />
                  {line.label}
                  {line.isNew && (
                    <span className="bg-white/25 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none uppercase tracking-wide">
                      Novo
                    </span>
                  )}
                </span>
              </motion.button>
            )
          })}
        </div>

        {/* ── Line description strip ──────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab + '-strip'}
            className={`flex items-center gap-3 mb-6 px-5 py-4 rounded-2xl bg-gradient-to-r ${activeLine.bgClass}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {(() => { const Icon = activeLine.icon; return <Icon size={18} className="text-white/80 flex-shrink-0" strokeWidth={1.8} /> })()}
            <span className="text-white/80 text-sm font-medium">
              {activeTab === 'agro' && 'Nova Linha Agro com sistema de proteção PHP exclusivo e condensação modelo X para altas temperaturas.'}
              {activeTab === 'industrial' && 'Sistemas de refrigeração industrial para frigoríficos, distribuidoras, farmacêutica e logística de frio.'}
              {activeTab === 'frigorifica' && 'Materiais termoisolantes e construção completa de câmaras frigoríficas com máxima eficiência.'}
              {activeTab === 'coldg2' && 'Tecnologia de próxima geração — o mais novo equipamento da família ColdLine, lançamento 2026.'}
            </span>
            <span className="ml-auto text-white/50 text-xs font-semibold whitespace-nowrap hidden sm:block">
              {products.length} produto{products.length > 1 ? 's' : ''}
            </span>
          </motion.div>
        </AnimatePresence>

        {/* ── Carousel ────────────────────────────────── */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
          >
            <ProductCarousel products={products} line={activeLine} onSelect={openModal} />
          </motion.div>
        </AnimatePresence>

        {/* ── Footer note ─────────────────────────────── */}
        <motion.p
          className="mt-8 text-center text-gray-500 text-xs flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <span className="flex items-center gap-1.5">
            <Snowflake size={12} className="text-brand-mid" />
            Gás ecológico com baixo GWP em todos os equipamentos
          </span>
          <span className="hidden sm:block text-gray-200">·</span>
          <span className="flex items-center gap-1.5">
            <Thermometer size={12} className="text-brand-mid" />
            Suporte técnico 24h/365 dias
          </span>
        </motion.p>
      </div>

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <ProductModal
            product={selected}
            line={activeLine}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </section>
  )
}
