import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2, Maximize, Shrink } from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { buildPositionTree } from './orgChartUtils'
import coldlineLogo from '../../assets/coldline-logo-white.svg'

const PAGE_MARGIN_MM = 12
const MM_TO_PX = 96 / 25.4

// Modo "Documento completo": a página do PDF é criada sob medida pro
// tamanho do organograma (largura/altura reais + margem), então nada
// precisa ser encolhido e nada pode ficar de fora. Adiciona uma folga
// extra (em mm) pra absorver pequenas diferenças de arredondamento entre
// o que a tela mede e o que a impressão realmente renderiza.
const CUSTOM_PAGE_BUFFER_MM = 6

// Modo "Ajustar em A4": encolhe pra caber numa folha padrão. Usa as
// medidas do RETRATO (a orientação padrão de qualquer caixa de
// impressão/PDF — nem todo navegador respeita "size: landscape" do CSS),
// garantindo que o conteúdo nunca ultrapasse a largura disponível.
const A4_PRINTABLE_WIDTH_PX = (210 - PAGE_MARGIN_MM * 2) * MM_TO_PX
const A4_PRINTABLE_HEIGHT_PX = (297 - PAGE_MARGIN_MM * 2) * MM_TO_PX

function PrintOrgNode({ node, childrenMap, departmentsById, visited }) {
  if (visited.has(node.id)) return null
  const nextVisited = new Set(visited)
  nextVisited.add(node.id)
  const children = childrenMap.get(node.id) || []
  const departmentName = node.departmentId ? departmentsById.get(node.departmentId)?.name : null

  return (
    <li>
      <div className="org-print-card">
        <p className="org-print-card-name">{node.name}</p>
        {departmentName && <p className="org-print-card-area">{departmentName}</p>}
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <PrintOrgNode key={child.id} node={child} childrenMap={childrenMap} departmentsById={departmentsById} visited={nextVisited} />
          ))}
        </ul>
      )}
    </li>
  )
}

export default function OrgChartPrintPage() {
  const { orgChartId } = useParams()

  const [orgChart, setOrgChart] = useState(null)
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  // 'full'  = página do PDF no tamanho exato do organograma (nada é cortado)
  // 'a4'    = encolhe pra caber numa folha A4 comum
  const [mode, setMode] = useState('full')
  const [scale, setScale] = useState(1)
  const [pageSizeMM, setPageSizeMM] = useState({ width: 210, height: 297 })
  const sheetRef = useRef(null)
  const pageRef = useRef(null)
  const pageStyleRef = useRef(null)

  useEffect(() => {
    Promise.all([
      informationApi.getOrgChartById(orgChartId),
      informationApi.getPositions(orgChartId),
      informationApi.getOrgDepartments(orgChartId),
    ])
      .then(([chartRes, positionsRes, departmentsRes]) => {
        setOrgChart(chartRes.data)
        setPositions(positionsRes.data?.items || [])
        setDepartments(departmentsRes.data?.items || [])
      })
      .finally(() => setLoading(false))
  }, [orgChartId])

  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const { roots, childrenMap } = useMemo(() => buildPositionTree(positions), [positions])

  const generatedAt = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    [],
  )

  const isFull = mode === 'full'
  const title = orgChart?.name || 'Organograma'

  // Mede o tamanho natural da folha inteira (cabeçalho + título + conteúdo)
  // e recalcula em três momentos: assim que os dados carregam, quando a
  // fonte (Inter, via Google Fonts com display=swap) termina de trocar —
  // ela muda a largura real do texto depois da primeira medição — e de
  // novo no "beforeprint", como rede de segurança bem em cima da hora de
  // imprimir. As mudanças são aplicadas direto no DOM (síncrono), porque
  // não dá pra confiar que o re-render do React termine a tempo do
  // navegador capturar a página pra impressão.
  useLayoutEffect(() => {
    if (loading) return
    const el = sheetRef.current
    if (!el) return
    const recalc = () => {
      const naturalWidth = el.scrollWidth
      const naturalHeight = el.scrollHeight
      if (!naturalWidth || !naturalHeight) return

      if (isFull) {
        const widthMM = naturalWidth / MM_TO_PX + PAGE_MARGIN_MM * 2 + CUSTOM_PAGE_BUFFER_MM
        const heightMM = naturalHeight / MM_TO_PX + PAGE_MARGIN_MM * 2 + CUSTOM_PAGE_BUFFER_MM
        if (pageStyleRef.current) {
          pageStyleRef.current.textContent = `@media print { @page { size: ${widthMM}mm ${heightMM}mm; margin: ${PAGE_MARGIN_MM}mm; } }`
        }
        setPageSizeMM({ width: widthMM, height: heightMM })
      } else {
        const next = Math.min(A4_PRINTABLE_WIDTH_PX / naturalWidth, A4_PRINTABLE_HEIGHT_PX / naturalHeight, 1) * 0.97
        el.style.transform = `scale(${next})`
        if (pageRef.current) pageRef.current.style.height = `${naturalHeight * next}px`
        setScale(next)
      }
    }
    recalc()
    window.addEventListener('resize', recalc)
    window.addEventListener('beforeprint', recalc)
    document.fonts?.ready?.then(recalc)
    return () => {
      window.removeEventListener('resize', recalc)
      window.removeEventListener('beforeprint', recalc)
    }
  }, [isFull, loading, positions, departments])

  const pageHeight = !isFull && sheetRef.current ? sheetRef.current.scrollHeight * scale : undefined

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <Link
          to={`/departamento-informacao/organograma/${orgChartId}?tab=chart`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="flex items-center gap-2 ml-auto">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setMode('full')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isFull ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Maximize size={13} /> Documento completo
            </button>
            <button
              onClick={() => setMode('a4')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                !isFull ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Shrink size={13} /> Ajustar em A4
            </button>
          </div>
          <button
            onClick={() => window.print()}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
          >
            <Download size={15} /> Baixar PDF
          </button>
        </div>
      </div>

      {isFull ? (
        <p className="print:hidden max-w-4xl mx-auto px-4 pt-3 text-xs text-slate-400 text-center">
          O PDF sai numa única página no tamanho exato do organograma — nada fica de fora. Ideal pra depois imprimir grande (gráfica/plotter) ou reduzir na hora de imprimir.
        </p>
      ) : (
        <p className="print:hidden max-w-4xl mx-auto px-4 pt-3 text-xs text-slate-400 text-center">
          Encolhe pra caber numa folha A4 comum — pode ficar pequeno em organogramas grandes. Escolha retrato ou paisagem na caixa de impressão como preferir.
        </p>
      )}

      <div ref={pageRef} className="org-print-page" style={pageHeight ? { height: pageHeight } : undefined}>
        <div
          ref={sheetRef}
          className="org-print-sheet bg-white shadow-lg print:shadow-none"
          style={!isFull ? { transform: `scale(${scale})` } : undefined}
        >
          <header className="org-print-header">
            <img src={coldlineLogo} alt="Cold Line Brasil" className="org-print-logo" />
            <span className="org-print-header-date">{generatedAt}</span>
          </header>

          <div className="org-print-body">
            <h1 className="org-print-title">{title}</h1>

            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-300" />
              </div>
            ) : roots.length === 0 ? (
              <p className="org-print-empty">Nenhum cargo cadastrado.</p>
            ) : (
              <div className="org-print-tree">
                <ul>
                  {roots.map((root) => (
                    <PrintOrgNode key={root.id} node={root} childrenMap={childrenMap} departmentsById={departmentsById} visited={new Set()} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .org-print-page {
          text-align: center;
          padding: 16px 16px 32px;
          overflow: hidden;
        }

        .org-print-sheet {
          display: inline-block;
          text-align: left;
          min-width: 640px;
          border-radius: 20px;
          overflow: hidden;
          transform-origin: top center;
        }

        .org-print-header {
          background: linear-gradient(120deg, #1b2a6b 0%, #2c3691 55%, #2563eb 100%);
          padding: 22px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .org-print-logo {
          height: 34px;
          width: auto;
        }

        .org-print-header-date {
          color: #dbeafe;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .org-print-body {
          padding: 32px 40px 12px;
        }

        .org-print-title {
          font-size: 2.25rem;
          line-height: 1.15;
          font-weight: 800;
          color: #1b2a6b;
          letter-spacing: -0.01em;
          text-align: center;
          margin-bottom: 28px;
        }

        .org-print-empty {
          font-size: 0.85rem;
          color: #94a3b8;
          padding: 40px 0;
          text-align: center;
        }

        /* Árvore do organograma */
        .org-print-tree {
          display: flex;
          justify-content: center;
          min-width: max-content;
          padding-bottom: 24px;
        }

        .org-print-tree ul {
          display: flex;
          justify-content: center;
          padding-top: 24px;
          position: relative;
          margin: 0;
        }

        .org-print-tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          list-style-type: none;
          position: relative;
          padding: 24px 10px 0 10px;
        }

        .org-print-tree li::before,
        .org-print-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          width: 50%;
          height: 24px;
          border-top: 2px solid #93c5fd;
        }

        .org-print-tree li::after {
          right: auto;
          left: 50%;
          border-left: 2px solid #93c5fd;
        }

        .org-print-tree li:only-child::before,
        .org-print-tree li:only-child::after {
          display: none;
        }

        .org-print-tree li:only-child {
          padding-top: 0;
        }

        .org-print-tree li:first-child::before,
        .org-print-tree li:last-child::after {
          border: 0 none;
        }

        .org-print-tree li:last-child::before {
          border-right: 2px solid #93c5fd;
          border-radius: 0 6px 0 0;
        }

        .org-print-tree li:first-child::after {
          border-radius: 6px 0 0 0;
        }

        .org-print-tree ul ul::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 24px;
          border-left: 2px solid #93c5fd;
        }

        .org-print-card {
          display: inline-block;
          padding: 10px 18px;
          border-radius: 14px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
          white-space: nowrap;
        }

        .org-print-card-name {
          font-size: 0.85rem;
          font-weight: 700;
          color: #1e3a8a;
        }

        .org-print-card-area {
          font-size: 0.7rem;
          color: #2563eb;
          margin-top: 2px;
        }

        @media print {
          @page {
            margin: ${PAGE_MARGIN_MM}mm;
          }

          body {
            background: #fff;
          }

          .org-print-page {
            padding: 0;
          }

          .org-print-sheet {
            border-radius: 0;
          }

          .org-print-header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .org-print-card {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>

      {/* Regra @page dinâmica do modo "Documento completo" — num <style>
          separado, depois do bloco estático (pra ter prioridade no CSS
          cascade), e atualizada de forma imperativa (ver recalc acima) pra
          garantir que o valor esteja certo mesmo se o "beforeprint" disparar
          antes do React re-renderizar. */}
      <style ref={pageStyleRef}>{
        isFull ? `@media print { @page { size: ${pageSizeMM.width}mm ${pageSizeMM.height}mm; margin: ${PAGE_MARGIN_MM}mm; } }` : ''
      }</style>
    </div>
  )
}
