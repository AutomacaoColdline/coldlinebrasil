import { useMemo } from 'react'
import { buildPositionBlocks } from './orgChartUtils'

const DEFAULT_CLASS_NAMES = {
  wrapper: 'org-blocks',
  group: 'org-blocks-group',
  root: 'org-blocks-root',
  row: 'org-blocks-row',
  block: 'org-blocks-block',
  blockHeader: 'org-blocks-block-header',
  item: 'org-blocks-item',
  itemName: 'org-blocks-item-name',
  itemArea: 'org-blocks-item-area',
  empty: 'org-blocks-empty',
}

// Visão alternativa à árvore com linhas de conexão (ver OrgChartTree):
// mostra a raiz (ex: Diretoria Executiva) no topo e, abaixo, um bloco por
// cargo da 2ª linha — cada bloco lista todo o ramo abaixo dele, com os
// níveis mais fundos indentados. Reutilizada tanto na pré-visualização
// quanto na página de impressão/PDF, igual o OrgChartTree.
export function OrgChartBlocks({ positions, departments, classNames: classNamesProp, emptyMessage }) {
  const classNames = classNamesProp ? { ...DEFAULT_CLASS_NAMES, ...classNamesProp } : DEFAULT_CLASS_NAMES
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
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
            <div className={classNames.row}>
              {blocks.map(({ header, items }) => (
                <div key={header.id} className={classNames.block}>
                  <div className={classNames.blockHeader}>{header.name}</div>
                  {items.map(({ position, level }) => {
                    const departmentName = position.departmentId
                      ? departmentsById.get(position.departmentId)?.name
                      : null
                    return (
                      <div
                        key={position.id}
                        className={classNames.item}
                        style={{ paddingLeft: `${12 + (level - 1) * 14}px` }}
                      >
                        <span className={classNames.itemName}>{position.name}</span>
                        {departmentName && <span className={classNames.itemArea}>{departmentName}</span>}
                      </div>
                    )
                  })}
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
