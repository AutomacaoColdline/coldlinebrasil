import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { buildPositionTree } from './orgChartUtils'

// Ponto onde a reta entre os centros de dois retângulos cruza a borda de
// `rect` (retângulo "de origem"), na direção do centro de `towardRect`.
// Usado pra fazer a linha pontilhada de superior extra encostar exatamente
// na borda do card, e não sair/chegar do meio dele.
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

function OrgNode({ node, childrenMap, departmentsById, visited, registerCard, classNames }) {
  if (visited.has(node.id)) return null
  const nextVisited = new Set(visited)
  nextVisited.add(node.id)
  const children = childrenMap.get(node.id) || []
  const departmentName = node.departmentId ? departmentsById.get(node.departmentId)?.name : null

  return (
    <li>
      <div className={classNames.card} ref={(el) => registerCard(node.id, el)}>
        <p className={classNames.cardName}>{node.name}</p>
        {departmentName && <p className={classNames.cardArea}>{departmentName}</p>}
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <OrgNode
              key={child.id}
              node={child}
              childrenMap={childrenMap}
              departmentsById={departmentsById}
              visited={nextVisited}
              registerCard={registerCard}
              classNames={classNames}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

const DEFAULT_CLASS_NAMES = {
  tree: 'org-tree',
  card: 'org-card',
  cardName: 'org-card-name',
  cardArea: 'org-card-area',
  links: 'org-tree-links',
}

// Árvore de organograma reutilizada tanto na pré-visualização (dentro do
// app) quanto na página de impressão/PDF. Além da árvore principal (uma
// hierarquia estrita, em nested <ul>/<li>), desenha por cima um overlay em
// SVG com uma linha pontilhada pra cada "superior extra" (2º/3º superior)
// de um cargo — já que um cargo só pode ficar posicionado embaixo de UM
// superior "principal" na árvore, mas pode responder a até 3.
//
// `scale` deve ser passado quando o container pai tiver algum
// `transform: scale(...)` aplicado (ex: modo "Ajustar em A4" da impressão),
// pra converter as coordenadas medidas em tela (pós-escala) de volta pras
// coordenadas locais (pré-escala) que o SVG realmente usa.
export function OrgChartTree({ positions, departments, classNames: classNamesProp, scale = 1, emptyMessage }) {
  const classNames = classNamesProp ? { ...DEFAULT_CLASS_NAMES, ...classNamesProp } : DEFAULT_CLASS_NAMES
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const { roots, childrenMap, extraLinks } = useMemo(() => buildPositionTree(positions), [positions])

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

      if (extraLinks.length === 0) {
        setLinkPaths([])
        return
      }

      const containerRect = container.getBoundingClientRect()
      const toLocal = (point) => ({
        x: (point.x - containerRect.left) / scale,
        y: (point.y - containerRect.top) / scale,
      })

      const nextPaths = []
      extraLinks.forEach(({ parentId, childId }) => {
        const parentEl = cardsRef.current.get(parentId)
        const childEl = cardsRef.current.get(childId)
        if (!parentEl || !childEl) return
        const parentRect = parentEl.getBoundingClientRect()
        const childRect = childEl.getBoundingClientRect()
        const start = toLocal(edgePoint(parentRect, childRect))
        const end = toLocal(edgePoint(childRect, parentRect))
        nextPaths.push({ key: `${parentId}-${childId}`, ...start, x2: end.x, y2: end.y })
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
  }, [positions, extraLinks, scale])

  if (roots.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null
  }

  return (
    <div className={classNames.tree} ref={containerRef} style={{ position: 'relative' }}>
      {linkPaths.length > 0 && (
        <svg
          className={classNames.links}
          width={svgSize.width}
          height={svgSize.height}
          style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}
        >
          {linkPaths.map((path) => (
            <line key={path.key} x1={path.x} y1={path.y} x2={path.x2} y2={path.y2} />
          ))}
        </svg>
      )}
      <ul>
        {roots.map((root) => (
          <OrgNode
            key={root.id}
            node={root}
            childrenMap={childrenMap}
            departmentsById={departmentsById}
            visited={new Set()}
            registerCard={registerCard}
            classNames={classNames}
          />
        ))}
      </ul>
    </div>
  )
}

export function hasExtraSuperiorLinks(positions) {
  return positions.some((p) => p.parentId2 || p.parentId3)
}
