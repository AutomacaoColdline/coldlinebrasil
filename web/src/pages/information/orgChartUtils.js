// Funções compartilhadas entre as telas de gestão do organograma
// (OrgChartListPage/OrgChartDetailPage) e a página de visualização/
// impressão (OrgChartPrintPage), para não duplicar a lógica de
// ordenação/montagem da árvore nos vários lugares.

export function sortByName(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export function sortDepartments(departments) {
  return [...departments].sort((a, b) => a.orderIndex - b.orderIndex)
}

// Monta a árvore de cargos (raízes + mapa de filhos por id do cargo pai),
// tratando cargos com parentId inválido/ciclico como raiz.
export function buildPositionTree(positions) {
  const byId = new Map(positions.map((p) => [p.id, p]))
  const childrenMap = new Map()
  const roots = []
  positions.forEach((p) => {
    if (p.parentId && p.parentId !== p.id && byId.has(p.parentId)) {
      if (!childrenMap.has(p.parentId)) childrenMap.set(p.parentId, [])
      childrenMap.get(p.parentId).push(p)
    } else {
      roots.push(p)
    }
  })
  childrenMap.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
  roots.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  return { roots, childrenMap }
}
