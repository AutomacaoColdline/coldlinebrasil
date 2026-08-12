import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Edit, Loader2, Plus, Trash2, Workflow } from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { EntityModal } from './EntityModal'
import { ConfirmModal } from './OrgChartShared'

function emptyForm() {
  return { name: '' }
}

export default function OrgChartListPage() {
  const navigate = useNavigate()
  const [charts, setCharts] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await informationApi.getOrgCharts()
      setCharts(response.data?.items || [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(emptyForm())
    setSaveError(null)
    setIsModalOpen(true)
  }

  const openEdit = (chart) => {
    setEditing(chart)
    setForm({ name: chart.name || '' })
    setSaveError(null)
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      if (editing?.id) {
        await informationApi.updateOrgChart(editing.id, { name: form.name })
        setIsModalOpen(false)
        setEditing(null)
        setForm(emptyForm())
        await load()
      } else {
        const response = await informationApi.createOrgChart({ name: form.name })
        setIsModalOpen(false)
        setForm(emptyForm())
        navigate(`/departamento-informacao/organograma/${response.data.id}`)
      }
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
      await informationApi.deleteOrgChart(deleting.id)
      setDeleting(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">Setor Interno</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Organogramas</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-3xl">
          Cadastre um organograma para cada empresa/CNPJ do grupo. Cada um tem seus próprios cargos e título de impressão.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-lg font-bold text-slate-900">Meus organogramas</h2>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
        >
          <Plus size={14} />
          Novo Organograma
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-20 flex items-center justify-center">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : charts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm py-16 text-center">
          <Workflow size={24} className="text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-400">Nenhum organograma cadastrado ainda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {charts.map((chart) => (
            <div
              key={chart.id}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 hover:border-pink-200 transition-colors cursor-pointer group"
              onClick={() => navigate(`/departamento-informacao/organograma/${chart.id}`)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-500 flex items-center justify-center shrink-0">
                  <Workflow size={18} />
                </div>
                <div className="flex items-center gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(chart) }}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500 bg-white"
                  >
                    <Edit size={13} />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setDeleting(chart) }}
                    className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600 bg-white"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-base font-bold text-slate-800 mt-3 truncate">{chart.name}</p>
              <p className="text-xs text-slate-400 mt-1">Clique para abrir</p>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <EntityModal
          title={editing?.id ? 'Renomear Organograma' : 'Novo Organograma'}
          fields={[{ key: 'name', label: 'Nome do Organograma', type: 'text', fullWidth: true, placeholder: 'Ex: Matriz, Empresa Sul...' }]}
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
          title="Excluir organograma"
          description={`Isso apaga "${deleting.name}" e todos os cargos e areas cadastrados nele. Essa acao nao pode ser desfeita.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}
    </div>
  )
}
