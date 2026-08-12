// Funções compartilhadas entre a tela de gestão do organograma (OrgChartPage)
// e a página de visualização/impressão (OrgChartPrintPage), para não duplicar
// a lógica de ordenação/agrupamento nos dois lugares.

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

export function groupPositionsByDepartment(positions) {
  const map = new Map()
  positions.forEach((p) => {
    if (!p.departmentId) return
    if (!map.has(p.departmentId)) map.set(p.departmentId, [])
    map.get(p.departmentId).push(p)
  })
  map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
  return map
}
