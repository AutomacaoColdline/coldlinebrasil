import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { buildPositionTree, groupPositionsByDepartment, sortByName, sortDepartments } from './orgChartUtils'
import coldlineLogo from '../../assets/coldline-logo-white.svg'

const TAB_INFO = {
  chart: {
    title: 'Organograma Unificado',
    subtitle: 'Visualização completa da hierarquia de cargos cadastrada.',
    backTab: 'chart',
  },
  departmentChart: {
    title: 'Organograma por Departamento',
    subtitle: 'Cargos agrupados por departamento, na ordem definida no cadastro.',
    backTab: 'departmentChart',
  },
}

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
  const [searchParams] = useSearchParams()
  const tab = TAB_INFO[searchParams.get('tab')] ? searchParams.get('tab') : 'chart'
  const info = TAB_INFO[tab]

  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([informationApi.getPositions(), informationApi.getOrgDepartments()])
      .then(([positionsRes, departmentsRes]) => {
        setPositions(positionsRes.data?.items || [])
        setDepartments(departmentsRes.data?.items || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const { roots, childrenMap } = useMemo(() => buildPositionTree(positions), [positions])
  const sortedDepartments = useMemo(() => sortDepartments(departments), [departments])
  const positionsByDepartment = useMemo(() => groupPositionsByDepartment(positions), [positions])
  const unassigned = useMemo(() => sortByName(positions.filter((p) => !p.departmentId)), [positions])

  const generatedAt = useMemo(
    () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    [],
  )

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
        <Link
          to={`/departamento-informacao/organograma?tab=${info.backTab}`}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </Link>
        <button
          onClick={() => window.print()}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-700 text-white rounded-xl text-sm font-semibold hover:bg-blue-600 transition-colors disabled:opacity-60"
        >
          <Download size={15} /> Baixar PDF
        </button>
      </div>

      <div className="org-print-sheet mx-auto bg-white shadow-lg print:shadow-none">
        <header className="org-print-header">
          <div className="org-print-brand">
            <img src={coldlineLogo} alt="Cold Line Brasil" className="org-print-logo" />
            <div className="org-print-brand-text">
              <span className="org-print-brand-name">Cold Line Brasil</span>
              <span className="org-print-brand-sub">Departamento de Informação</span>
            </div>
          </div>
          <span className="org-print-header-date">{generatedAt}</span>
        </header>

        <div className="org-print-body">
          <h1 className="org-print-title">{info.title}</h1>
          <p className="org-print-subtitle">{info.subtitle}</p>

          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 size={24} className="animate-spin text-blue-300" />
            </div>
          ) : tab === 'departmentChart' ? (
            <div className="org-print-department-list">
              {sortedDepartments.map((department) => {
                const linked = positionsByDepartment.get(department.id) || []
                return (
                  <div key={department.id} className="org-print-department-card">
                    <h3>{department.name}</h3>
                    <div className="org-print-chips">
                      {linked.length === 0 ? (
                        <span className="org-print-empty">Nenhum cargo vinculado.</span>
                      ) : (
                        linked.map((p) => (
                          <span key={p.id} className="org-print-chip">{p.name}</span>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
              {unassigned.length > 0 && (
                <div className="org-print-department-card is-muted">
                  <h3>Sem Departamento</h3>
                  <div className="org-print-chips">
                    {unassigned.map((p) => (
                      <span key={p.id} className="org-print-chip is-muted">{p.name}</span>
                    ))}
                  </div>
                </div>
              )}
              {sortedDepartments.length === 0 && unassigned.length === 0 && (
                <p className="org-print-empty">Nenhum cargo ou departamento cadastrado.</p>
              )}
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

        <footer className="org-print-footer">
          Cold Line Brasil · Departamento de Informação · {positions.length} cargo(s) · {departments.length} departamento(s)
        </footer>
      </div>

      <style>{`
        .org-print-sheet {
          width: 100%;
          max-width: 1400px;
          margin-top: 16px;
          margin-bottom: 16px;
          border-radius: 20px;
          overflow: hidden;
        }

        .org-print-header {
          background: linear-gradient(120deg, #1b2a6b 0%, #2c3691 55%, #2563eb 100%);
          padding: 22px 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .org-print-brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .org-print-logo {
          height: 34px;
          width: auto;
        }

        .org-print-brand-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-left: 14px;
          border-left: 1px solid rgba(255, 255, 255, 0.3);
        }

        .org-print-brand-name {
          color: #fff;
          font-size: 0.85rem;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .org-print-brand-sub {
          color: #bfdbfe;
          font-size: 0.68rem;
          font-weight: 500;
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
        }

        .org-print-subtitle {
          font-size: 0.9rem;
          color: #64748b;
          margin-top: 6px;
          margin-bottom: 28px;
        }

        .org-print-footer {
          padding: 16px 40px 28px;
          font-size: 0.7rem;
          color: #94a3b8;
          border-top: 1px solid #e2e8f0;
          margin-top: 12px;
        }

        .org-print-empty {
          font-size: 0.85rem;
          color: #94a3b8;
          padding: 40px 0;
          text-align: center;
        }

        /* Árvore do organograma unificado */
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

        /* Organograma por departamento */
        .org-print-department-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
          padding-bottom: 24px;
        }

        .org-print-department-card {
          border: 1px solid #dbeafe;
          background: #f8fbff;
          border-radius: 16px;
          padding: 18px 22px;
          break-inside: avoid;
        }

        .org-print-department-card.is-muted {
          background: #f8fafc;
          border-color: #e2e8f0;
        }

        .org-print-department-card h3 {
          font-size: 0.95rem;
          font-weight: 800;
          color: #1b2a6b;
        }

        .org-print-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 10px;
        }

        .org-print-chip {
          display: inline-flex;
          align-items: center;
          padding: 5px 14px;
          border-radius: 999px;
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #bfdbfe;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .org-print-chip.is-muted {
          background: #f1f5f9;
          color: #64748b;
          border-color: #e2e8f0;
        }

        @media print {
          @page {
            margin: 12mm;
          }

          body {
            background: #fff;
          }

          .org-print-sheet {
            margin: 0;
            border-radius: 0;
            max-width: none;
          }

          .org-print-header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .org-print-chip,
          .org-print-card {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  )
}
