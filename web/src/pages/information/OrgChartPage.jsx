import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, ChevronDown, ChevronUp, ClipboardList, Edit, LayoutGrid,
  Loader2, Network, Plus, Trash2, Workflow,
} from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { EntityModal } from './EntityModal'

const TABS = [
  { id: 'positions', label: 'Cargos', icon: ClipboardList },
  { id: 'departments', label: 'Departamentos', icon: Building2 },
  { id: 'chart', label: 'Organograma Unificado', icon: Workflow },
  { id: 'departmentChart', label: 'Organograma por Departamento', icon: LayoutGrid },
]

function ConfirmModal({ title, description, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{description}</p>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-400 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

function sortByName(list) {
  return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

function emptyPositionForm() {
  return { name: '', parentId: '', departmentId: '' }
}

function PositionsTab({ positions, departments, loading, reload }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyPositionForm)

  const positionsById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions])
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const sortedPositions = useMemo(() => sortByName(positions), [positions])
  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.orderIndex - b.orderIndex),
    [departments],
  )

  const openNew = () => {
    setEditing(null)
    setForm(emptyPositionForm())
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name || '', parentId: item.parentId || '', departmentId: item.departmentId || '' })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const parentOptions = sortedPositions
    .filter((p) => p.id !== editing?.id)
    .map((p) => ({ value: p.id, label: p.name }))
  const departmentOptions = sortedDepartments.map((d) => ({ value: d.id, label: d.name }))

  const formFields = [
    { key: 'name', label: 'Cargo', type: 'text', fullWidth: true, placeholder: 'Ex: Analista de Sistemas' },
    { key: 'departmentId', label: 'Departamento', type: 'select', options: departmentOptions, placeholder: 'Sem departamento' },
    {
      key: 'parentId',
      label: 'Abaixo de (Cargo Superior)',
      type: 'select',
      options: parentOptions,
      placeholder: 'Nivel mais alto (sem superior)',
    },
  ]

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = { name: form.name, parentId: form.parentId || null, departmentId: form.departmentId || null }
      if (editing?.id) await informationApi.updatePosition(editing.id, payload)
      else await informationApi.createPosition(payload)
      setIsModalOpen(false)
      setEditing(null)
      setForm(emptyPositionForm())
      await reload()
    } catch (err) {
      setSaveError(err?.response?.data?.message || err?.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await informationApi.deletePosition(deleting.id)
      setDeleting(null)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cargos</h2>
          <p className="text-sm text-slate-500 mt-1">Cadastre os cargos da empresa, vincule a um departamento e defina a hierarquia entre eles.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
        >
          <Plus size={14} />
          Novo Cargo
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : sortedPositions.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList size={24} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum cargo cadastrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedPositions.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.departmentId && departmentsById.get(item.departmentId) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-50 text-pink-500 border border-pink-100 text-xs font-medium">
                        {departmentsById.get(item.departmentId).name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {item.parentId ? `Abaixo de: ${positionsById.get(item.parentId)?.name || 'Cargo removido'}` : 'Nivel mais alto'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEdit(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500 bg-white">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => setDeleting(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600 bg-white">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isModalOpen && (
        <EntityModal
          title={editing?.id ? 'Editar Cargo' : 'Novo Cargo'}
          fields={formFields}
          form={form}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
          onClose={() => { setIsModalOpen(false); setEditing(null); setForm(emptyPositionForm()); setSaveError(null) }}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Excluir cargo"
          description="Cargos que estiverem abaixo dele passarao a ficar no nivel mais alto."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}
    </div>
  )
}

function emptyDepartmentForm() {
  return { name: '' }
}

function DepartmentsTab({ departments, positions, loading, reload }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyDepartmentForm)
  const [reordering, setReordering] = useState(false)

  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.orderIndex - b.orderIndex),
    [departments],
  )

  const positionsByDepartment = useMemo(() => {
    const map = new Map()
    positions.forEach((p) => {
      if (!p.departmentId) return
      if (!map.has(p.departmentId)) map.set(p.departmentId, [])
      map.get(p.departmentId).push(p)
    })
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    return map
  }, [positions])

  const openNew = () => {
    setEditing(null)
    setForm(emptyDepartmentForm())
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name || '' })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      if (editing?.id) await informationApi.updateOrgDepartment(editing.id, { name: form.name })
      else await informationApi.createOrgDepartment({ name: form.name })
      setIsModalOpen(false)
      setEditing(null)
      setForm(emptyDepartmentForm())
      await reload()
    } catch (err) {
      setSaveError(err?.response?.data?.message || err?.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await informationApi.deleteOrgDepartment(deleting.id)
      setDeleting(null)
      await reload()
    } finally {
      setSaving(false)
    }
  }

  const move = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sortedDepartments.length) return
    const reordered = [...sortedDepartments]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    setReordering(true)
    try {
      await informationApi.reorderOrgDepartments(reordered.map((d) => d.id))
      await reload()
    } finally {
      setReordering(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Departamentos</h2>
          <p className="text-sm text-slate-500 mt-1">Cadastre os departamentos e ajuste a ordem de exibicao no organograma.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
        >
          <Plus size={14} />
          Novo Departamento
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : sortedDepartments.length === 0 ? (
          <div className="py-16 text-center">
            <Building2 size={24} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum departamento cadastrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sortedDepartments.map((item, index) => {
              const linked = positionsByDepartment.get(item.id) || []
              return (
                <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex flex-col shrink-0">
                      <button
                        onClick={() => move(index, -1)}
                        disabled={index === 0 || reordering}
                        className="w-7 h-6 rounded-t-lg border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-pink-200 hover:text-pink-500"
                      >
                        <ChevronUp size={13} />
                      </button>
                      <button
                        onClick={() => move(index, 1)}
                        disabled={index === sortedDepartments.length - 1 || reordering}
                        className="w-7 h-6 rounded-b-lg border border-t-0 border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-30 hover:border-pink-200 hover:text-pink-500"
                      >
                        <ChevronDown size={13} />
                      </button>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-xs text-slate-400 mt-1 truncate">
                        {linked.length > 0 ? `Cargos: ${linked.map((p) => p.name).join(', ')}` : 'Nenhum cargo vinculado'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => openEdit(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500 bg-white">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setDeleting(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600 bg-white">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {isModalOpen && (
        <EntityModal
          title={editing?.id ? 'Editar Departamento' : 'Novo Departamento'}
          fields={[{ key: 'name', label: 'Nome do Departamento', type: 'text', fullWidth: true, placeholder: 'Ex: Departamento Administrativo' }]}
          form={form}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
          onClose={() => { setIsModalOpen(false); setEditing(null); setForm(emptyDepartmentForm()); setSaveError(null) }}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Excluir departamento"
          description="Cargos vinculados a este departamento ficarao sem departamento."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}
    </div>
  )
}

function OrgChartNode({ node, childrenMap, departmentsById, visited }) {
  if (visited.has(node.id)) return null
  const nextVisited = new Set(visited)
  nextVisited.add(node.id)
  const children = childrenMap.get(node.id) || []
  const departmentName = node.departmentId ? departmentsById.get(node.departmentId)?.name : null

  return (
    <li>
      <div className="org-card">
        <p className="org-card-name">{node.name}</p>
        {departmentName && <p className="org-card-area">{departmentName}</p>}
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <OrgChartNode key={child.id} node={child} childrenMap={childrenMap} departmentsById={departmentsById} visited={nextVisited} />
          ))}
        </ul>
      )}
    </li>
  )
}

function ChartTab({ positions, departments, loading }) {
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const { roots, childrenMap } = useMemo(() => {
    const byId = new Map(positions.map((p) => [p.id, p]))
    const map = new Map()
    const rootNodes = []
    positions.forEach((p) => {
      if (p.parentId && p.parentId !== p.id && byId.has(p.parentId)) {
        if (!map.has(p.parentId)) map.set(p.parentId, [])
        map.get(p.parentId).push(p)
      } else {
        rootNodes.push(p)
      }
    })
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    rootNodes.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    return { roots: rootNodes, childrenMap: map }
  }, [positions])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Organograma Unificado</h2>
        <p className="text-sm text-slate-500 mt-1">Visualizacao completa da hierarquia de cargos cadastrada.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-x-auto">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : roots.length === 0 ? (
          <div className="py-16 text-center">
            <Network size={24} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Cadastre cargos na aba Cargos para montar o organograma.</p>
          </div>
        ) : (
          <div className="org-tree">
            <ul>
              {roots.map((root) => (
                <OrgChartNode key={root.id} node={root} childrenMap={childrenMap} departmentsById={departmentsById} visited={new Set()} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function DepartmentChartTab({ positions, departments, loading }) {
  const sortedDepartments = useMemo(
    () => [...departments].sort((a, b) => a.orderIndex - b.orderIndex),
    [departments],
  )

  const positionsByDepartment = useMemo(() => {
    const map = new Map()
    positions.forEach((p) => {
      if (!p.departmentId) return
      if (!map.has(p.departmentId)) map.set(p.departmentId, [])
      map.get(p.departmentId).push(p)
    })
    map.forEach((list) => list.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
    return map
  }, [positions])

  const unassigned = useMemo(
    () => sortByName(positions.filter((p) => !p.departmentId)),
    [positions],
  )

  const hasContent = sortedDepartments.length > 0 || unassigned.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Organograma por Departamento</h2>
        <p className="text-sm text-slate-500 mt-1">Cargos agrupados por departamento, na ordem definida na aba Departamentos.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : !hasContent ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <LayoutGrid size={24} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Cadastre departamentos e cargos para montar esta visualizacao.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDepartments.map((department) => {
            const linked = positionsByDepartment.get(department.id) || []
            return (
              <div key={department.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <h3 className="text-sm font-bold text-slate-800">{department.name}</h3>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {linked.length === 0 ? (
                    <span className="text-xs text-slate-400">Nenhum cargo vinculado.</span>
                  ) : (
                    linked.map((p) => (
                      <span key={p.id} className="inline-flex items-center px-3 py-1 rounded-full bg-pink-50 text-pink-500 border border-pink-100 text-xs font-medium">
                        {p.name}
                      </span>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {unassigned.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
              <h3 className="text-sm font-bold text-slate-800">Sem Departamento</h3>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                {unassigned.map((p) => (
                  <span key={p.id} className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 text-slate-500 border border-slate-200 text-xs font-medium">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function OrgChartPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'positions'
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
  const [loadingPositions, setLoadingPositions] = useState(true)
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const loadPositions = useCallback(async () => {
    setLoadingPositions(true)
    try {
      const response = await informationApi.getPositions()
      setPositions(response.data?.items || [])
    } finally {
      setLoadingPositions(false)
    }
  }, [])

  const loadDepartments = useCallback(async () => {
    setLoadingDepartments(true)
    try {
      const response = await informationApi.getOrgDepartments()
      setDepartments(response.data?.items || [])
    } finally {
      setLoadingDepartments(false)
    }
  }, [])

  const reloadAll = useCallback(async () => {
    await Promise.all([loadPositions(), loadDepartments()])
  }, [loadPositions, loadDepartments])

  useEffect(() => {
    loadPositions()
    loadDepartments()
  }, [loadPositions, loadDepartments])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">Setor Interno</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Organograma</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl">
          Cadastre os cargos e departamentos da empresa e visualize o organograma unificado ou agrupado por departamento.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setSearchParams({ tab: id })}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active
                    ? 'bg-pink-400 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'departments' && (
        <DepartmentsTab departments={departments} positions={positions} loading={loadingDepartments} reload={reloadAll} />
      )}
      {activeTab === 'chart' && (
        <ChartTab positions={positions} departments={departments} loading={loadingPositions || loadingDepartments} />
      )}
      {activeTab === 'departmentChart' && (
        <DepartmentChartTab positions={positions} departments={departments} loading={loadingPositions || loadingDepartments} />
      )}
      {activeTab === 'positions' && (
        <PositionsTab positions={positions} departments={departments} loading={loadingPositions} reload={reloadAll} />
      )}
    </div>
  )
}
