import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Edit, ClipboardList, Loader2, Network, Plus, Trash2, Workflow } from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { EntityModal } from './EntityModal'
import { ORG_AREAS } from './informationShared'

const TABS = [
  { id: 'positions', label: 'Cargos', icon: ClipboardList },
  { id: 'chart', label: 'Organograma', icon: Workflow },
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

function emptyForm() {
  return { name: '', area: '', parentId: '' }
}

function PositionsTab({ positions, loading, reload }) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const byId = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions])
  const sortedPositions = useMemo(
    () => [...positions].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [positions],
  )

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm())
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name || '', area: item.area || '', parentId: item.parentId || '' })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const parentOptions = sortedPositions
    .filter((p) => p.id !== editing?.id)
    .map((p) => ({ value: p.id, label: p.name }))

  const formFields = [
    { key: 'name', label: 'Cargo', type: 'text', fullWidth: true, placeholder: 'Ex: Analista de Sistemas' },
    { key: 'area', label: 'Area', type: 'text', list: ORG_AREAS, placeholder: 'Ex: Administrativo, Operacional, Producao' },
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
      const payload = { name: form.name, area: form.area, parentId: form.parentId || null }
      if (editing?.id) await informationApi.updatePosition(editing.id, payload)
      else await informationApi.createPosition(payload)
      setIsModalOpen(false)
      setEditing(null)
      setForm(emptyForm())
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
          <p className="text-sm text-slate-500 mt-1">Cadastre os cargos da empresa e defina a hierarquia entre eles.</p>
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
                    {item.area && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-pink-50 text-pink-500 border border-pink-100 text-xs font-medium">
                        {item.area}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {item.parentId ? `Abaixo de: ${byId.get(item.parentId)?.name || 'Cargo removido'}` : 'Nivel mais alto'}
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
          onClose={() => { setIsModalOpen(false); setEditing(null); setForm(emptyForm()); setSaveError(null) }}
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

function OrgChartNode({ node, childrenMap, visited }) {
  if (visited.has(node.id)) return null
  const nextVisited = new Set(visited)
  nextVisited.add(node.id)
  const children = childrenMap.get(node.id) || []

  return (
    <li>
      <div className="org-card">
        <p className="org-card-name">{node.name}</p>
        {node.area && <p className="org-card-area">{node.area}</p>}
      </div>
      {children.length > 0 && (
        <ul>
          {children.map((child) => (
            <OrgChartNode key={child.id} node={child} childrenMap={childrenMap} visited={nextVisited} />
          ))}
        </ul>
      )}
    </li>
  )
}

function ChartTab({ positions, loading }) {
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
        <h2 className="text-xl font-bold text-slate-900">Organograma</h2>
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
                <OrgChartNode key={root.id} node={root} childrenMap={childrenMap} visited={new Set()} />
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

export default function OrgChartPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'positions'
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await informationApi.getPositions()
      setPositions(response.data?.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">Setor Interno</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Organograma</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl">
          Cadastre os cargos da empresa, defina a hierarquia entre eles e visualize o organograma completo.
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

      {activeTab === 'chart' ? (
        <ChartTab positions={positions} loading={loading} />
      ) : (
        <PositionsTab positions={positions} loading={loading} reload={load} />
      )}
    </div>
  )
}
