import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildPositionRows } from './orgChartUtils'

// Ponto onde a reta entre os centros de dois retângulos cruza a borda de
// `rect` (retângulo "de origem"), na direção do centro de `towardRect`.
// Usado pra fazer a linha de ligação encostar exatamente na borda do card,
// e não sair/chegar do meio dele.
function edgePoint(rect, towardRect) {
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const tx = towardRect.left + towardRect.width / 2
  const ty = towardRect.top + towardRect.height / 2
  const dx = tx - cx
  const dy = ty - cy
  if (dx === 0 && dy === 0) return { x: cx, y: cy }
  const scaleX = dx !== 0 ? (rect.width / 2) / Math.abs(dx) : Infinity
  const scaleY = dy !== 0 ? (rect.height / 2) / Math.abs(dy) : Infinity
  const s = Math.min(scaleX, scaleY)
  return { x: cx + dx * s, y: cy + dy * s }
}

const DEFAULT_CLASS_NAMES = {
  tree: 'org-tree',
  row: 'org-tree-row',
  card: 'org-card',
  cardName: 'org-card-name',
  cardArea: 'org-card-area',
  linkPrimary: 'org-tree-link-primary',
  linkSecondary: 'org-tree-link-secondary',
}

// Árvore de organograma reutilizada tanto na pré-visualização (dentro do
// app) quanto na página de impressão/PDF.
//
// Diferente da técnica clássica de "lista aninhada" (onde a linha de um
// card é sempre a profundidade dele na árvore), aqui cada cargo cai numa
// "linha" (fileira) independente — calculada por padrão a partir do
// superior principal (linha do superior + 1, raiz = linha 1), mas que pode
// ser fixada manualmente (campo "Linha" do cargo) pra empurrar um cargo pra
// uma fileira específica sem mexer na hierarquia (ver buildPositionRows em
// orgChartUtils.js). Por isso TODAS as ligações — inclusive a do superior
// principal, que antes vinha "de graça" da lista aninhada — precisam ser
// desenhadas por cima, num overlay em SVG: uma linha sólida por vínculo
// principal, e uma linha pontilhada com seta por vínculo extra (2º/3º
// superior).
//
// `scale` deve ser passado quando o container pai tiver algum
// `transform: scale(...)` aplicado (ex: modo "Ajustar em A4" da impressão),
// pra converter as coordenadas medidas em tela (pós-escala) de volta pras
// coordenadas locais (pré-escala) que o SVG realmente usa.
export function OrgChartTree({ positions, departments, classNames: classNamesProp, scale = 1, emptyMessage }) {
  const classNames = classNamesProp ? { ...DEFAULT_CLASS_NAMES, ...classNamesProp } : DEFAULT_CLASS_NAMES
  // Id único da seta (marker) — evita colisão se a árvore renderizar mais de
  // uma vez na mesma página.
  const arrowId = `org-tree-arrow-${useId().replace(/[^a-zA-Z0-9]/g, '')}`
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const { rows, edges } = useMemo(() => buildPositionRows(positions), [positions])

  const containerRef = useRef(null)
  const cardsRef = useRef(new Map())
  const [linkPaths, setLinkPaths] = useState([])
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 })

  const registerCard = (id, el) => {
    if (el) cardsRef.current.set(id, el)
    else cardsRef.current.delete(id)
  }

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    const recalc = () => {
      setSvgSize({ width: container.scrollWidth, height: container.scrollHeight })

      if (edges.length === 0) {
        setLinkPaths([])
        return
      }

      const containerRect = container.getBoundingClientRect()
      const toLocal = (point) => ({
        x: (point.x - containerRect.left) / scale,
        y: (point.y - containerRect.top) / scale,
      })

      const nextPaths = []
      edges.forEach(({ parentId, childId, kind }) => {
        const parentEl = cardsRef.current.get(parentId)
        const childEl = cardsRef.current.get(childId)
        if (!parentEl || !childEl) return
        const parentRect = parentEl.getBoundingClientRect()
        const childRect = childEl.getBoundingClientRect()
        const start = toLocal(edgePoint(parentRect, childRect))
        const end = toLocal(edgePoint(childRect, parentRect))
        nextPaths.push({ key: `${parentId}-${childId}-${kind}`, kind, ...start, x2: end.x, y2: end.y })
      })
      setLinkPaths(nextPaths)
    }

    recalc()
    const timeoutId = window.setTimeout(recalc, 60) // depois do 1º layout/fontes assentarem
    window.addEventListener('resize', recalc)
    document.fonts?.ready?.then(recalc)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', recalc)
    }
  }, [positions, edges, scale])

  if (rows.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null
  }

  return (
    <div className={classNames.tree} ref={containerRef} style={{ position: 'relative' }}>
      {linkPaths.length > 0 && (
        <svg
          width={svgSize.width}
          height={svgSize.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          <defs>
            {/* Seta só pra indicar a direção do vínculo extra (2º/3º
                superior) — não muda o significado da linha pontilhada. O
                vínculo principal (linha sólida) não leva seta. */}
            <marker
              id={arrowId}
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              markerUnits="userSpaceOnUse"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="#f59e0b" />
            </marker>
          </defs>
          {linkPaths.map((path) => (
            <line
              key={path.key}
              x1={path.x}
              y1={path.y}
              x2={path.x2}
              y2={path.y2}
              className={path.kind === 'secondary' ? classNames.linkSecondary : classNames.linkPrimary}
              markerEnd={path.kind === 'secondary' ? `url(#${arrowId})` : undefined}
            />
          ))}
        </svg>
      )}
      {rows.map(({ line, items }) => (
        <div key={line} className={classNames.row}>
          {items.map((position) => {
            const departmentName = position.departmentId ? departmentsById.get(position.departmentId)?.name : null
            return (
              <div key={position.id} className={classNames.card} ref={(el) => registerCard(position.id, el)}>
                <p className={classNames.cardName}>{position.name}</p>
                {departmentName && <p className={classNames.cardArea}>{departmentName}</p>}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
