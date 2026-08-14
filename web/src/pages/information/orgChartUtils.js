// Funções compartilhadas entre as telas de gestão do organograma
// (OrgChartListPage/OrgChartDetailPage) e a página de visualização/
// impressão (OrgChartPrintPage), para não duplicar a lógica de
// ordenação/montagem da árvore nos vários lugares.

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
// O primeiro superior válido de cada cargo é o vínculo "principal" — decide
// onde o card fica posicionado na árvore. Os demais viram "vínculos extras",
// desenhados como linhas pontilhadas adicionais por cima da árvore (ver
// OrgChartTree.jsx).
function parentCandidates(position) {
  return [position.parentId, position.parentId2, position.parentId3].filter(Boolean)
}

// Monta a árvore de cargos (raízes + mapa de filhos por id do cargo pai +
// lista de vínculos extras pra desenhar como linha pontilhada), mantendo a
// ordem de cadastro (ordem em que os itens chegam em `positions`) em vez de
// ordenar por nome. Cargos com todos os superiores inválidos/cíclicos viram
// raiz.
export function buildPositionTree(positions) {
  const byId = new Map(positions.map((p) => [p.id, p]))
  const childrenMap = new Map()
  const roots = []
  const extraLinks = []

  positions.forEach((position) => {
    const validParentIds = [...new Set(parentCandidates(position))].filter(
      (parentId) => parentId !== position.id && byId.has(parentId),
    )
    const [primaryParentId, ...secondaryParentIds] = validParentIds

    if (primaryParentId) {
      if (!childrenMap.has(primaryParentId)) childrenMap.set(primaryParentId, [])
      childrenMap.get(primaryParentId).push(position)
    } else {
      roots.push(position)
    }

    secondaryParentIds.forEach((parentId) => {
      extraLinks.push({ parentId, childId: position.id })
    })
  })

  return { roots, childrenMap, extraLinks }
}
