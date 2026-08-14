// Funções compartilhadas entre as telas de gestão do organograma
// (OrgChartListPage/OrgChartDetailPage) e a página de visualização/
// impressão (OrgChartPrintPage), para não duplicar a lógica de
// ordenação/montagem das linhas nos vários lugares.

export function sortDepartments(departments) {
  return [...departments].sort((a, b) => a.orderIndex - b.orderIndex)
}

// Cargos aparecem na ordem de cadastro/reordenação manual (orderIndex),
// nunca alfabética — tanto na lista da aba "Estrutura" quanto no organograma.
export function sortPositions(positions) {
  return [...positions].sort((a, b) => a.orderIndex - b.orderIndex)
}

// Um cargo pode ter até 3 "superiores" (parentId, parentId2, parentId3),
// pois na prática um departamento às vezes responde a mais de um "mestre".
// O primeiro superior válido de cada cargo é o vínculo "principal" — usado
// pra calcular a linha do cargo por padrão. Os demais viram "vínculos
// extras", desenhados como linha pontilhada com seta (ver OrgChartTree.jsx).
function parentCandidates(position) {
  return [position.parentId, position.parentId2, position.parentId3].filter(Boolean)
}

// Monta as "linhas" (fileiras) do organograma + a lista de ligações a
// desenhar entre os cards.
//
// A linha de cada cargo é `position.line` quando preenchido manualmente
// (>= 1), ou — por padrão — a linha do superior principal + 1 (raiz = 1).
// Isso permite fixar um cargo numa linha específica (ex: "Gestor de
// Negócios" na Linha 3, mesmo respondendo direto pra Diretoria Executiva,
// que ficaria na Linha 1) sem precisar preencher a linha de todo mundo: os
// subordinados dele continuam calculando a própria linha automaticamente a
// partir da linha (manual ou não) do superior.
export function buildPositionRows(positions) {
  const byId = new Map(positions.map((p) => [p.id, p]))
  const primaryParentOf = new Map()
  const edges = []

  positions.forEach((position) => {
    const validParentIds = [...new Set(parentCandidates(position))].filter(
      (parentId) => parentId !== position.id && byId.has(parentId),
    )
    const [primaryParentId, ...secondaryParentIds] = validParentIds
    primaryParentOf.set(position.id, primaryParentId || null)
    if (primaryParentId) {
      edges.push({ parentId: primaryParentId, childId: position.id, kind: 'primary' })
    }
    secondaryParentIds.forEach((parentId) => {
      edges.push({ parentId, childId: position.id, kind: 'secondary' })
    })
  })

  const effectiveLine = new Map()
  const resolving = new Set() // guarda contra ciclo (A superior de B, B superior de A)
  function resolveLine(id) {
    if (effectiveLine.has(id)) return effectiveLine.get(id)
    if (resolving.has(id)) return 1 // ciclo: trata como raiz pra nao recursar pra sempre
    resolving.add(id)
    const position = byId.get(id)
    let line
    if (position.line && position.line > 0) {
      line = position.line
    } else {
      const parentId = primaryParentOf.get(id)
      line = parentId ? resolveLine(parentId) + 1 : 1
    }
    resolving.delete(id)
    effectiveLine.set(id, line)
    return line
  }
  positions.forEach((position) => resolveLine(position.id))

  const rowsByLine = new Map()
  positions.forEach((position) => {
    const line = effectiveLine.get(position.id)
    if (!rowsByLine.has(line)) rowsByLine.set(line, [])
    rowsByLine.get(line).push(position)
  })

  const rows = [...rowsByLine.entries()]
    .sort(([lineA], [lineB]) => lineA - lineB)
    .map(([line, items]) => ({ line, items }))

  return { rows, edges }
}

export function hasExtraSuperiorLinks(positions) {
  return positions.some((p) => p.parentId2 || p.parentId3)
}
