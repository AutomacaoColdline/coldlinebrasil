import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronDown, ChevronUp, ClipboardList, Edit, LayoutGrid, Loader2, Maximize2, Network, Plus, Tag, Trash2,
  Workflow, X,
} from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { EntityModal } from './EntityModal'
import { ConfirmModal } from './OrgChartShared'
import { OrgChartTree, hasExtraSuperiorLinks } from './OrgChartTree'
import { OrgChartBlocks } from './OrgChartBlocks'
import { sortDepartments, sortPositions } from './orgChartUtils'

const TABS = [
  { id: 'structure', label: 'Nomenclatura e Estrutura', icon: ClipboardList },
  { id: 'chart', label: 'Organograma', icon: Workflow },
  { id: 'blocks', label: 'Organograma por blocos', icon: LayoutGrid },
]

function emptyPositionForm() {
  return { name: '', parentId: '', parentId2: '', parentId3: '', departmentId: '' }
}

function DepartmentTags({ departments, positions, orgChartId, reload }) {
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const positionsByDepartment = useMemo(() => {
    const map = new Map()
    positions.forEach((p) => {
      if (!p.departmentId) return
      map.set(p.departmentId, (map.get(p.departmentId) || 0) + 1)
    })
    return map
  }, [positions])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    setSaving(true)
    try {
      await informationApi.createOrgDepartment({ name, orgChartId })
      setNewName('')
      await reload()
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

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center gap-2">
        <Tag size={15} className="text-pink-400" />
        <h3 className="text-sm font-bold text-slate-800">Áreas (opcional)</h3>
      </div>
      <p className="text-xs text-slate-400 mt-1">Marque um cargo com uma área pra dar mais contexto no organograma, se quiser.</p>

      <div className="flex items-center gap-2 mt-4 flex-wrap">
        {sortDepartments(departments).map((dept) => (
          <span
            key={dept.id}
            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-pink-50 text-pink-600 border border-pink-100 text-xs font-medium"
          >
            {dept.name}
            {positionsByDepartment.get(dept.id) > 0 && (
              <span className="text-pink-400">({positionsByDepartment.get(dept.id)})</span>
            )}
            <button
              onClick={() => setDeleting(dept)}
              className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-pink-200 text-pink-500"
            >
              <X size={10} />
            </button>
          </span>
        ))}
        {departments.length === 0 && (
          <span className="text-xs text-slate-400">Nenhuma área cadastrada.</span>
        )}
      </div>

      <div className="flex items-center gap-2 mt-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
          placeholder="Nova área, ex: Financeiro"
          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newName.trim()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 text-slate-600 text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
        >
          {saving ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Adicionar
        </button>
      </div>

      {deleting && (
        <ConfirmModal
          title="Excluir área"
          description={`Cargos marcados com "${deleting.name}" ficarão sem área.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}
    </div>
  )
}

function StructureTab({ orgChartId, positions, departments, loading, reload }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyPositionForm)
  const [reorderingId, setReorderingId] = useState(null)

  const positionsById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions])
  const departmentsById = useMemo(() => new Map(departments.map((d) => [d.id, d])), [departments])
  const sortedPositions = useMemo(() => sortPositions(positions), [positions])
  const sortedDepartments = useMemo(() => sortDepartments(departments), [departments])

  const moveItem = async (index, direction) => {
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= sortedPositions.length) return
    const reordered = [...sortedPositions]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(targetIndex, 0, moved)
    setReorderingId(moved.id)
    try {
      await informationApi.reorderPositions(reordered.map((p) => p.id))
      await reload()
    } finally {
      setReorderingId(null)
    }
  }

  const openNew = () => {
    setEditing(null)
    setForm(emptyPositionForm())
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      name: item.name || '',
      parentId: item.parentId || '',
      parentId2: item.parentId2 || '',
      parentId3: item.parentId3 || '',
      departmentId: item.departmentId || '',
    })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const parentOptions = sortedPositions
    .filter((p) => p.id !== editing?.id)
    .map((p) => ({ value: p.id, label: p.name }))
  const departmentOptions = sortedDepartments.map((d) => ({ value: d.id, label: d.name }))

  const formFields = [
    { key: 'name', label: 'Cargo', type: 'text', fullWidth: true, placeholder: 'Ex: Analista de Sistemas' },
    { key: 'departmentId', label: 'Área', type: 'select', options: departmentOptions, placeholder: 'Sem área' },
    {
      key: 'parentId',
      label: 'Abaixo de (Superior 1)',
      type: 'select',
      options: parentOptions,
      placeholder: 'Nivel mais alto (sem superior)',
    },
    {
      key: 'parentId2',
      label: 'Também abaixo de (Superior 2, opcional)',
      type: 'select',
      options: parentOptions,
      placeholder: 'Sem 2º superior',
    },
    {
      key: 'parentId3',
      label: 'Também abaixo de (Superior 3, opcional)',
      type: 'select',
      options: parentOptions,
      placeholder: 'Sem 3º superior',
    },
  ]

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      // Ignora superiores repetidos (ex: mesmo cargo escolhido em 2 e 3).
      const chosenParentIds = [...new Set([form.parentId, form.parentId2, form.parentId3].filter(Boolean))]
      const payload = {
        name: form.name,
        parentId: chosenParentIds[0] || null,
        parentId2: chosenParentIds[1] || null,
        parentId3: chosenParentIds[2] || null,
        departmentId: form.departmentId || null,
        orgChartId,
      }
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
      <DepartmentTags departments={departments} positions={positions} orgChartId={orgChartId} reload={reload} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Cargos</h2>
          <p className="text-sm text-slate-500 mt-1">Cadastre os cargos deste organograma e defina a hierarquia entre eles.</p>
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
            {sortedPositions.map((item, index) => (
              <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col flex-shrink-0">
                  <button
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0 || !!reorderingId}
                    title="Mover para cima"
                    className="w-6 h-5 flex items-center justify-center text-slate-400 hover:text-pink-500 disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveItem(index, 1)}
                    disabled={index === sortedPositions.length - 1 || !!reorderingId}
                    title="Mover para baixo"
                    className="w-6 h-5 flex items-center justify-center text-slate-400 hover:text-pink-500 disabled:opacity-30 disabled:hover:text-slate-400"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">{item.name}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {item.departmentId && departmentsById.get(item.departmentId) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-50 text-pink-500 border border-pink-100 text-xs font-medium">
                        {departmentsById.get(item.departmentId).name}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {(() => {
                        const superiorNames = [item.parentId, item.parentId2, item.parentId3]
                          .filter(Boolean)
                          .map((id) => positionsById.get(id)?.name || 'Cargo removido')
                        return superiorNames.length > 0 ? `Abaixo de: ${superiorNames.join(', ')}` : 'Nivel mais alto'
                      })()}
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

function ChartTab({ orgChartId, positions, departments, loading }) {
  const hasRoots = positions.length > 0
  const showExtraLinksHint = hasExtraSuperiorLinks(positions)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Visualização</h2>
          <p className="text-sm text-slate-500 mt-1">
            Pré-visualização da hierarquia (na ordem de cadastro). O título usado na impressão é o nome do organograma.
            {showExtraLinksHint && ' Linhas pontilhadas com seta indicam um 2º/3º superior (a seta aponta pro cargo subordinado).'}
          </p>
        </div>
        {hasRoots && (
          <Link
            to={`/departamento-informacao/organograma/${orgChartId}/visualizar`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-pink-200 hover:text-pink-500 bg-white"
          >
            <Maximize2 size={14} />
            Visualizar / Gerar PDF
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-x-auto">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : !hasRoots ? (
          <div className="py-16 text-center">
            <Network size={24} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Cadastre cargos na aba Nomenclatura e Estrutura para montar o organograma.</p>
          </div>
        ) : (
          <OrgChartTree positions={positions} departments={departments} />
        )}
      </div>
    </div>
  )
}

function BlocksTab({ orgChartId, positions, departments, loading }) {
  const hasRoots = positions.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Organograma por blocos</h2>
          <p className="text-sm text-slate-500 mt-1">
            Todos os cargos abaixo da raiz agrupados em blocos — um bloco por cargo da 2ª linha, na ordem de cadastro.
          </p>
        </div>
        {hasRoots && (
          <Link
            to={`/departamento-informacao/organograma/${orgChartId}/visualizar?view=blocks`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-pink-200 hover:text-pink-500 bg-white"
          >
            <Maximize2 size={14} />
            Visualizar / Gerar PDF
          </Link>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 overflow-x-auto">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : !hasRoots ? (
          <div className="py-16 text-center">
            <LayoutGrid size={24} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Cadastre cargos na aba Nomenclatura e Estrutura para montar o organograma.</p>
          </div>
        ) : (
          <OrgChartBlocks positions={positions} departments={departments} />
        )}
      </div>
    </div>
  )
}

export default function OrgChartDetailPage() {
  const { orgChartId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'structure'

  const [orgChart, setOrgChart] = useState(null)
  const [chartLoading, setChartLoading] = useState(true)
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
  const [loadingPositions, setLoadingPositions] = useState(true)
  const [loadingDepartments, setLoadingDepartments] = useState(true)

  const [renaming, setRenaming] = useState(false)
  const [renameForm, setRenameForm] = useState({ name: '', revision: '' })
  const [renameSaving, setRenameSaving] = useState(false)
  const [renameError, setRenameError] = useState(null)

  const loadChart = useCallback(async () => {
    setChartLoading(true)
    try {
      const response = await informationApi.getOrgChartById(orgChartId)
      setOrgChart(response.data)
    } catch (err) {
      navigate('/departamento-informacao/organograma', { replace: true })
    } finally {
      setChartLoading(false)
    }
  }, [orgChartId, navigate])

  const loadPositions = useCallback(async () => {
    setLoadingPositions(true)
    try {
      const response = await informationApi.getPositions(orgChartId)
      setPositions(response.data?.items || [])
    } finally {
      setLoadingPositions(false)
    }
  }, [orgChartId])

  const loadDepartments = useCallback(async () => {
    setLoadingDepartments(true)
    try {
      const response = await informationApi.getOrgDepartments(orgChartId)
      setDepartments(response.data?.items || [])
    } finally {
      setLoadingDepartments(false)
    }
  }, [orgChartId])

  const reloadAll = useCallback(async () => {
    await Promise.all([loadPositions(), loadDepartments()])
  }, [loadPositions, loadDepartments])

  useEffect(() => {
    loadChart()
    loadPositions()
    loadDepartments()
  }, [loadChart, loadPositions, loadDepartments])

  const openRename = () => {
    setRenameForm({ name: orgChart?.name || '', revision: orgChart?.revision || '' })
    setRenameError(null)
    setRenaming(true)
  }

  const handleRename = async () => {
    setRenameSaving(true)
    setRenameError(null)
    try {
      await informationApi.updateOrgChart(orgChartId, { name: renameForm.name, revision: renameForm.revision })
      setRenaming(false)
      await loadChart()
    } catch (err) {
      setRenameError(err?.response?.data?.message || err?.message || 'Erro ao salvar. Tente novamente.')
    } finally {
      setRenameSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <Link to="/departamento-informacao/organograma" className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 mb-3">
          <ArrowLeft size={13} /> Todos os organogramas
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          {chartLoading ? (
            <Loader2 size={20} className="animate-spin text-slate-300" />
          ) : (
            <>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">{orgChart?.name}</h1>
              {orgChart?.revision && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-semibold">
                  {orgChart.revision}
                </span>
              )}
              <button
                onClick={openRename}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-500 hover:border-pink-200 hover:text-pink-500 bg-white"
              >
                <Edit size={12} /> Editar
              </button>
            </>
          )}
        </div>
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

      {activeTab === 'chart' ? (
        <ChartTab orgChartId={orgChartId} positions={positions} departments={departments} loading={loadingPositions || loadingDepartments} />
      ) : activeTab === 'blocks' ? (
        <BlocksTab orgChartId={orgChartId} positions={positions} departments={departments} loading={loadingPositions || loadingDepartments} />
      ) : (
        <StructureTab
          orgChartId={orgChartId}
          positions={positions}
          departments={departments}
          loading={loadingPositions || loadingDepartments}
          reload={reloadAll}
        />
      )}

      {renaming && (
        <EntityModal
          title="Editar Organograma"
          fields={[
            { key: 'name', label: 'Nome do Organograma', type: 'text', fullWidth: true },
            {
              key: 'revision',
              label: 'Revisão',
              type: 'text',
              fullWidth: true,
              placeholder: 'Ex: REV01 24/01/2025',
            },
          ]}
          form={renameForm}
          onChange={(key, value) => setRenameForm((current) => ({ ...current, [key]: value }))}
          onClose={() => setRenaming(false)}
          onSave={handleRename}
          saving={renameSaving}
          saveError={renameError}
        />
      )}
    </div>
  )
}
