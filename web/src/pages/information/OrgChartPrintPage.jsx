import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, ImageDown, Loader2, Maximize, Shrink } from 'lucide-react'
import { toCanvas } from 'html-to-image'
import { informationApi } from '../../services/informationApi'
import { OrgChartTree, hasExtraSuperiorLinks } from './OrgChartTree'
import coldlineLogo from '../../assets/coldline-logo-white.svg'

const PRINT_TREE_CLASS_NAMES = {
  tree: 'org-print-tree',
  card: 'org-print-card',
  cardName: 'org-print-card-name',
  cardArea: 'org-print-card-area',
  links: 'org-print-tree-links',
}

const PAGE_MARGIN_MM = 12
const MM_TO_PX = 96 / 25.4

// Modo "Documento completo": a página do PDF é criada sob medida pro
// tamanho do organograma (largura/altura reais + margem), então nada
// precisa ser encolhido e nada pode ficar de fora. Adiciona uma folga
// extra (em mm) pra absorver pequenas diferenças de arredondamento entre
// o que a tela mede e o que a impressão realmente renderiza.
const CUSTOM_PAGE_BUFFER_MM = 6

// Modos "Ajustar em A4"/"Ajustar em A2": encolhe pra caber numa folha
// padrão. Usa as medidas do RETRATO (a orientação padrão de qualquer caixa
// de impressão/PDF — nem todo navegador respeita "size: landscape" do CSS),
// garantindo que o conteúdo nunca ultrapasse a largura disponível.
//
// O A4 fica "solto" (não força @page size), deixando o usuário escolher o
// papel/orientação na própria caixa de impressão. Já o A2 força o tamanho
// exato da folha (420 x 594mm) via @page — como não é um papel padrão que
// toda impressora/driver "Salvar como PDF" oferece na lista, forçar o
// tamanho é o jeito de garantir que o PDF gerado saia nessas medidas.
const FIT_PAGE_SIZES_MM = {
  a4: { width: 210, height: 297 },
  a2: { width: 420, height: 594 },
}

// Resolução do PNG baixado (independente do zoom/escala da tela — a página
// só usa 96dpi como referência de CSS, aqui é a densidade real do arquivo).
// 200dpi já fica nítido numa impressão grande de plotter/gráfica sem gerar
// um arquivo gigante (num A2 dá uma imagem de ~3300 x 4675px).
const IMAGE_EXPORT_DPI = 200

export default function OrgChartPrintPage() {
  const { orgChartId } = useParams()

  const [orgChart, setOrgChart] = useState(null)
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  // 'full'  = página do PDF no tamanho exato do organograma (nada é cortado)
  // 'a4'    = encolhe pra caber numa folha A4 comum
  // 'a2'    = encolhe pra caber numa folha A2 (42 x 59,4cm), forçando esse
  //           tamanho exato no PDF/impressão
  const [mode, setMode] = useState('full')
  const [scale, setScale] = useState(1)
  const [pageSizeMM, setPageSizeMM] = useState({ width: 210, height: 297 })
  const [downloadingImage, setDownloadingImage] = useState(false)
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

  const isFull = mode === 'full'
  const title = orgChart?.name || 'Organograma'
  const revision = orgChart?.revision?.trim()

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
        const { width: fitWidthMM, height: fitHeightMM } = FIT_PAGE_SIZES_MM[mode]
        const printableWidthPx = (fitWidthMM - PAGE_MARGIN_MM * 2) * MM_TO_PX
        const printableHeightPx = (fitHeightMM - PAGE_MARGIN_MM * 2) * MM_TO_PX
        const next = Math.min(printableWidthPx / naturalWidth, printableHeightPx / naturalHeight, 1) * 0.97
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
  }, [isFull, mode, loading, positions, departments])

  const pageHeight = !isFull && sheetRef.current ? sheetRef.current.scrollHeight * scale : undefined

  // Gera um PNG do organograma encolhido pra caber numa folha A2 (mesma
  // matemática de "fit" da impressão, só que renderizada num DPI de
  // verdade em vez de escalada por CSS) e centralizado numa página em
  // branco A2 — o equivalente em imagem do modo "Ajustar em A2". Ignora o
  // modo/escala que estiver ativo na tela: sempre recalcula do zero pra
  // dar o mesmo resultado não importa qual aba estiver selecionada.
  const handleDownloadImage = async () => {
    const sheet = sheetRef.current
    if (!sheet || downloadingImage) return
    setDownloadingImage(true)

    // Captura sempre em escala natural (sem o transform de zoom da tela,
    // se houver algum aplicado no momento), pra não capturar em cima de um
    // encolhimento que já foi feito por CSS.
    const previousTransform = sheet.style.transform
    sheet.style.transform = 'none'

    try {
      const naturalWidth = sheet.scrollWidth
      const naturalHeight = sheet.scrollHeight
      const { width: pageWidthMM, height: pageHeightMM } = FIT_PAGE_SIZES_MM.a2
      const mmToOutPx = IMAGE_EXPORT_DPI / 25.4
      const pageWidthPx = Math.round(pageWidthMM * mmToOutPx)
      const pageHeightPx = Math.round(pageHeightMM * mmToOutPx)
      const marginPx = Math.round(PAGE_MARGIN_MM * mmToOutPx)
      const printableWidthPx = pageWidthPx - marginPx * 2
      const printableHeightPx = pageHeightPx - marginPx * 2
      const contentScale =
        Math.min(printableWidthPx / naturalWidth, printableHeightPx / naturalHeight) * 0.98

      const sheetCanvas = await toCanvas(sheet, {
        pixelRatio: contentScale,
        backgroundColor: '#ffffff',
      })

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = pageWidthPx
      pageCanvas.height = pageHeightPx
      const ctx = pageCanvas.getContext('2d')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageWidthPx, pageHeightPx)
      ctx.drawImage(sheetCanvas, Math.round((pageWidthPx - sheetCanvas.width) / 2), marginPx)

      const blob = await new Promise((resolve) => pageCanvas.toBlob(resolve, 'image/png'))
      const fileSlug = (title || 'organograma').trim().replace(/[^\p{L}\p{N}]+/gu, '-')
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${fileSlug}-A2.png`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Falha ao gerar imagem do organograma', err)
      window.alert('Não foi possível gerar a imagem. Tente novamente.')
    } finally {
      sheet.style.transform = previousTransform
      setDownloadingImage(false)
    }
  }

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
                mode === 'a4' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Shrink size={13} /> Ajustar em A4
            </button>
            <button
              onClick={() => setMode('a2')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                mode === 'a2' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Shrink size={13} /> Ajustar em A2
            </button>
          </div>
          <button
            onClick={handleDownloadImage}
            disabled={loading || downloadingImage}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-60"
          >
            {downloadingImage ? <Loader2 size={15} className="animate-spin" /> : <ImageDown size={15} />}
            Baixar imagem (A2)
          </button>
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
      ) : mode === 'a2' ? (
        <p className="print:hidden max-w-4xl mx-auto px-4 pt-3 text-xs text-slate-400 text-center">
          Encolhe pra caber numa folha A2 (42 x 59,4cm) — o PDF já sai com esse tamanho exato de página, com a margem de {PAGE_MARGIN_MM}mm. Escolha "Salvar como PDF" na caixa de impressão.
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
            {revision && <span className="org-print-header-date">{revision}</span>}
          </header>

          <div className="org-print-body">
            <h1 className="org-print-title">{title}</h1>
            {!loading && hasExtraSuperiorLinks(positions) && (
              <p className="org-print-legend">Linha pontilhada com seta = também subordinado ao cargo de origem da seta</p>
            )}

            {loading ? (
              <div className="py-24 flex items-center justify-center">
                <Loader2 size={24} className="animate-spin text-blue-300" />
              </div>
            ) : positions.length === 0 ? (
              <p className="org-print-empty">Nenhum cargo cadastrado.</p>
            ) : (
              <OrgChartTree
                positions={positions}
                departments={departments}
                classNames={PRINT_TREE_CLASS_NAMES}
                scale={isFull ? 1 : scale}
              />
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
          padding-top: 30px;
          position: relative;
          margin: 0;
        }

        .org-print-tree li {
          display: flex;
          flex-direction: column;
          align-items: center;
          list-style-type: none;
          position: relative;
          padding: 28px 4px 0 4px;
        }

        .org-print-tree li::before,
        .org-print-tree li::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          width: 50%;
          height: 28px;
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
          height: 28px;
          border-left: 2px solid #93c5fd;
        }

        .org-print-legend {
          font-size: 0.7rem;
          color: #64748b;
          text-align: center;
          margin-top: -20px;
          margin-bottom: 16px;
        }

        .org-print-tree-links {
          color: #f59e0b;
        }

        .org-print-tree-links line {
          stroke: currentColor;
          stroke-width: 1.5;
          stroke-dasharray: 4 3;
        }

        /* Cards compactos: quebram o texto em vez de esticar a largura,
           pra caber mais colunas lado a lado sem o organograma ficar
           gigante na horizontal. */
        .org-print-card {
          display: inline-flex;
          flex-direction: column;
          align-items: center;
          min-width: 88px;
          max-width: 132px;
          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid #bfdbfe;
          background: #eff6ff;
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
        }

        .org-print-card-name {
          font-size: 0.78rem;
          font-weight: 700;
          color: #1e3a8a;
          line-height: 1.2;
          text-align: center;
          word-break: break-word;
        }

        .org-print-card-area {
          font-size: 0.65rem;
          color: #2563eb;
          margin-top: 2px;
          line-height: 1.15;
          text-align: center;
          word-break: break-word;
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

      {/* Regra @page dinâmica dos modos "Documento completo" (tamanho
          calculado do conteúdo, ver recalc acima) e "Ajustar em A2"
          (tamanho fixo 420x594mm) — num <style> separado, depois do bloco
          estático (pra ter prioridade no CSS cascade). O tamanho do modo
          "Documento completo" é aplicado de forma imperativa dentro do
          recalc além de declarado aqui, pra garantir que o valor esteja
          certo mesmo se o "beforeprint" disparar antes do React
          re-renderizar; o do A2 é fixo, não depende de medição. */}
      <style ref={pageStyleRef}>{
        isFull
          ? `@media print { @page { size: ${pageSizeMM.width}mm ${pageSizeMM.height}mm; margin: ${PAGE_MARGIN_MM}mm; } }`
          : mode === 'a2'
            ? `@media print { @page { size: ${FIT_PAGE_SIZES_MM.a2.width}mm ${FIT_PAGE_SIZES_MM.a2.height}mm; margin: ${PAGE_MARGIN_MM}mm; } }`
            : ''
      }</style>
    </div>
  )
}
