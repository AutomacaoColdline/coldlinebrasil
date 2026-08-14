import { useMemo } from 'react'
import { buildPositionBlocks } from './orgChartUtils'
import { OrgChartTree } from './OrgChartTree'

const DEFAULT_CLASS_NAMES = {
  wrapper: 'org-blocks',
  group: 'org-blocks-group',
  root: 'org-blocks-root',
  stackList: 'org-blocks-stack-list',
  stack: 'org-blocks-stack',
  empty: 'org-blocks-empty',
}

const DEFAULT_TREE_CLASS_NAMES = {
  tree: 'org-tree',
  card: 'org-card',
  cardName: 'org-card-name',
  cardArea: 'org-card-area',
  links: 'org-tree-links',
}

// Visão alternativa à árvore única (ver OrgChartTree): mostra a raiz (ex:
// Diretoria Executiva) como um rótulo no topo e, abaixo, uma "pilha" por
// cargo da 2ª linha — cada pilha é a própria mini-árvore desse ramo
// (cabeçalho + tudo abaixo dele), com as mesmas caixinhas e linhas de
// conexão do organograma normal, só que empilhadas verticalmente em vez de
// uma árvore só espalhada na horizontal. Reutilizada tanto na
// pré-visualização quanto na página de impressão/PDF, igual o OrgChartTree.
export function OrgChartBlocks({
  positions,
  departments,
  classNames: classNamesProp,
  treeClassNames: treeClassNamesProp,
  emptyMessage,
}) {
  const classNames = classNamesProp ? { ...DEFAULT_CLASS_NAMES, ...classNamesProp } : DEFAULT_CLASS_NAMES
  const treeClassNames = treeClassNamesProp
    ? { ...DEFAULT_TREE_CLASS_NAMES, ...treeClassNamesProp }
    : DEFAULT_TREE_CLASS_NAMES
  const groups = useMemo(() => buildPositionBlocks(positions), [positions])

  if (groups.length === 0) {
    return emptyMessage ? <>{emptyMessage}</> : null
  }

  return (
    <div className={classNames.wrapper}>
      {groups.map(({ root, blocks }) => (
        <div key={root.id} className={classNames.group}>
          <div className={classNames.root}>{root.name}</div>
          {blocks.length > 0 ? (
            <div className={classNames.stackList}>
              {blocks.map(({ header, positions: stackPositions }) => (
                <div key={header.id} className={classNames.stack}>
                  <OrgChartTree positions={stackPositions} departments={departments} classNames={treeClassNames} />
                </div>
              ))}
            </div>
          ) : (
            <p className={classNames.empty}>Nenhum cargo abaixo de {root.name}.</p>
          )}
        </div>
      ))}
    </div>
  )
}
