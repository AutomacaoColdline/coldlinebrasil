import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Building2,
  Calendar,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  ClipboardList,
  Download,
  Edit,
  Eye,
  FolderKanban,
  GraduationCap,
  Hourglass,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts'
import { informationApi } from '../../services/informationApi'
import { EntityModal } from './EntityModal'
import CalendarTab from './CalendarTab'
import TrainingInviteModal from './TrainingInviteModal'
import {
  DEMAND_CATEGORIES,
  DEMAND_PRIORITIES,
  DEMAND_STATUSES,
  DEMAND_APPROVALS,
  INFORMATION_DEPARTMENTS,
  toDateInput,
  toDateTimeInput,
  toIsoDate,
  toIsoDateTime,
  nowDateTimeInput,
  todayDateInput,
  formatDate,
  formatDateTime,
  formatNumber,
  formatHours,
  formatPercent,
  formatDays,
  formatMonthLabel,
  calculateHoursBetween,
  loadAllPages,
  demandFormFields,
  demandEmptyForm,
  demandToForm,
  demandToPayload,
  demandNormalizeFormChange,
  trainingFormFields,
  trainingEmptyForm,
  trainingToForm,
  trainingToPayload,
  trainingNormalizeFormChange,
} from './informationShared'

const PROCESS_TYPES = ['Novo', 'Revisao', 'Automacao']
const PROCESS_STATUSES = ['Em andamento', 'Concluido', 'Cancelado']
const ROUTINE_STATUSES = ['Nao iniciado', 'Em andamento', 'Concluido', 'Cancelado']

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: FolderKanban },
  { id: 'demands', label: 'Demandas', icon: ClipboardList },
  { id: 'calendar', label: 'Calendario', icon: Calendar },
  { id: 'trainings', label: 'Treinamentos', icon: GraduationCap },
  { id: 'processes', label: 'Processos', icon: Activity },
]

function formatLiveDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR')
}

function formatMinutes(totalMinutes) {
  const minutes = Number(totalMinutes || 0)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}min`
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#a855f7', '#eab308', '#64748b', '#0ea5e9']

const PRIORITY_COLORS = { Urgente: '#ef4444', Alta: '#f59e0b', Media: '#3b82f6', Baixa: '#10b981' }

function exportCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v).replace(/"/g, '""')
    if (s.includes(';') || s.includes('\n') || s.includes('"')) return `"${s}"`
    return s
  }
  const lines = [headers.join(';'), ...rows.map(r => headers.map(h => escape(r[h])).join(';'))]
  const csv = '\ufeff' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function DashboardCard({ title, value, helper, icon: Icon, tone }) {
  const tones = {
    pink: 'bg-pink-50 text-pink-500 border-pink-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 h-full flex flex-col items-center text-center">
      <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${tones[tone] || tones.slate}`}>
        <Icon size={18} />
      </div>
      <p className="text-xs uppercase tracking-wide text-slate-400 mt-3">{title}</p>
      <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
      {helper && <p className="text-xs text-slate-500 mt-2">{helper}</p>}
    </div>
  )
}

function FilterField({ field, value, onChange }) {
  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
      >
        <option value="">{field.placeholder || 'Todos'}</option>
        {(field.options || []).map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type={field.type || 'text'}
      value={value}
      onChange={(event) => onChange(field.key, event.target.value)}
      placeholder={field.placeholder}
      className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
    />
  )
}

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

function ResourceTab({
  title,
  description,
  createLabel,
  list,
  create,
  update,
  remove,
  filters,
  defaultFilters,
  columns,
  formFields,
  emptyForm,
  toForm = (item) => item,
  toPayload = (form) => form,
  normalizeFormChange,
  summaryBuilder,
  onChanged,
  modalMaxWidth,
  modalGridCols,
  extraActions,
  renderItem,
}) {
  const [query, setQuery] = useState(defaultFilters)
  const [data, setData] = useState({ items: [], page: 1, pageSize: 10, total: 0, totalPages: 1 })
  const [allItems, setAllItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [editing, setEditing] = useState(null)
  const [viewing, setViewing] = useState(null)
  const buildEmptyForm = useCallback(() => (typeof emptyForm === 'function' ? emptyForm() : emptyForm), [emptyForm])
  const [form, setForm] = useState(buildEmptyForm)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await list(query)
      setData(response.data)
      if (summaryBuilder) {
        const items = await loadAllPages(list, { ...query, page: undefined, pageSize: undefined })
        setAllItems(items)
      }
    } finally {
      setLoading(false)
    }
  }, [list, query, summaryBuilder])

  useEffect(() => {
    load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setForm(buildEmptyForm())
    setIsModalOpen(true)
    setSaveError(null)
    setUploadError(null)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm(toForm(item))
    setIsModalOpen(true)
    setSaveError(null)
    setUploadError(null)
  }

  const openView = (item) => {
    setViewing(item)
    setEditing(null)
    setForm(toForm(item))
    setIsModalOpen(true)
    setSaveError(null)
    setUploadError(null)
  }

  const handleAttachmentUpload = async (key, files) => {
    setUploading(true)
    setUploadError(null)
    try {
      const results = await Promise.allSettled(
        files.map(async (file) => {
          const response = await informationApi.uploadAttachment(file)
          return response.data
        }),
      )
      const succeeded = results.filter((r) => r.status === 'fulfilled').map((r) => r.value)
      const failed = results.filter((r) => r.status === 'rejected')
      if (succeeded.length > 0) {
        setForm((current) => ({ ...current, [key]: [...(current[key] || []), ...succeeded] }))
      }
      if (failed.length > 0) {
        const reason = failed[0].reason
        const errMsg = reason?.response?.data?.message || reason?.message || 'Erro desconhecido'
        setUploadError(
          `${failed.length} arquivo(s) falharam ao enviar: ${errMsg}. Verifique o tamanho (máx. 50 MB) e tente novamente.`,
        )
      }
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = toPayload(form)
      if (editing?.id) await update(editing.id, payload)
      else await create(payload)
      setForm(buildEmptyForm())
      setEditing(null)
      setIsModalOpen(false)
      setSaveError(null)
      setUploadError(null)
      await load()
      if (onChanged) await onChanged()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao salvar. Verifique os campos e tente novamente.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await remove(deleting.id)
      setDeleting(null)
      await load()
      if (onChanged) await onChanged()
    } finally {
      setSaving(false)
    }
  }

  const summary = summaryBuilder ? summaryBuilder(allItems, data) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          {extraActions}
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
          >
            <Plus size={14} />
            {createLabel}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {filters.map((field) => (
            <FilterField
              key={field.key}
              field={field}
              value={query[field.key] ?? ''}
              onChange={(key, value) => setQuery((current) => ({ ...current, [key]: value, page: 1 }))}
            />
          ))}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {summary.map((item) => (
            <DashboardCard
              key={item.title}
              title={item.title}
              value={item.value}
              helper={item.helper}
              icon={item.icon}
              tone={item.tone}
            />
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : (data.items || []).length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardList size={24} className="text-slate-200 mx-auto mb-3" />
            <p className="text-sm text-slate-400">Nenhum registro encontrado.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.items.map((item) => renderItem ? (
              // Layout em cartao (sem rolagem horizontal) quando a aba fornece renderItem.
              <div key={item.id} className="flex flex-col md:flex-row md:items-stretch hover:bg-slate-50/50 transition-colors">
                <div className="flex-1 min-w-0 px-5 py-4">{renderItem(item)}</div>
                <div className="px-4 py-3 md:border-l border-slate-100 flex md:flex-col items-center justify-center gap-2">
                  <button onClick={() => openView(item)} title="Visualizar" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-sky-300 hover:text-sky-600 bg-white">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => openEdit(item)} title="Editar" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500 bg-white">
                    <Edit size={14} />
                  </button>
                  <button onClick={() => setDeleting(item)} title="Excluir" className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600 bg-white">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ) : (
              <div key={item.id} className="overflow-x-auto hover:bg-slate-50/50 transition-colors">
                <div className="flex items-stretch min-w-max">
                  {columns.map((column) => (
                    <div
                      key={column.key}
                      style={{ minWidth: column.minWidth || 130, maxWidth: column.maxWidth || undefined }}
                      className="px-4 py-3 flex-shrink-0 overflow-hidden"
                    >
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5 select-none">
                        {column.label}
                      </p>
                      <div className="text-sm text-slate-700">
                        {column.render ? column.render(item) : item[column.key] || '-'}
                      </div>
                    </div>
                  ))}
                  <div className="px-4 py-3 flex-shrink-0 min-w-[140px] sticky right-0 bg-white border-l border-slate-100 flex items-center justify-end gap-2 shadow-[-8px_0_12px_-4px_rgba(0,0,0,0.04)]">
                    <button onClick={() => openView(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-sky-300 hover:text-sky-600 bg-white">
                      <Eye size={14} />
                    </button>
                    <button onClick={() => openEdit(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500 bg-white">
                      <Edit size={14} />
                    </button>
                    <button onClick={() => setDeleting(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600 bg-white">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-slate-500">{data.total || 0} registro(s)</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuery((current) => ({ ...current, page: Math.max(1, (current.page || 1) - 1) }))}
            disabled={(query.page || 1) === 1}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{query.page || 1} / {data.totalPages || 1}</span>
          <button
            onClick={() => setQuery((current) => ({ ...current, page: Math.min(data.totalPages || 1, (current.page || 1) + 1) }))}
            disabled={(query.page || 1) >= (data.totalPages || 1)}
            className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 disabled:opacity-40"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {isModalOpen && (
        <EntityModal
          title={viewing ? `Visualizar ${createLabel}` : (editing?.id ? `Editar ${createLabel}` : createLabel)}
          readOnly={!!viewing}
          maxWidth={modalMaxWidth || 'max-w-3xl'}
          gridCols={modalGridCols || 'md:grid-cols-2'}
          fields={formFields.map((field) => field.type !== 'attachments' ? field : ({
            ...field,
            helper: uploading
              ? 'Enviando arquivos, aguarde...'
              : uploadError || field.helper,
            helperIsError: !!uploadError && !uploading,
            onFilesSelected: (files) => {
              setUploadError(null)
              handleAttachmentUpload(field.key, files)
            },
            onRemove: (_, __, index) => setForm((current) => ({
              ...current,
              [field.key]: (current[field.key] || []).filter((__, itemIndex) => itemIndex !== index),
            })),
          }))}
          form={form}
          onChange={(key, value) => setForm((current) => {
            const next = { ...current, [key]: value }
            return normalizeFormChange ? normalizeFormChange(next, key, value) : next
          })}
          onClose={() => {
            setEditing(null)
            setViewing(null)
            setForm(buildEmptyForm())
            setIsModalOpen(false)
            setSaveError(null)
            setUploadError(null)
          }}
          onSave={handleSave}
          saving={saving || uploading}
          saveError={saveError}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Excluir registro"
          description="Essa acao nao pode ser desfeita."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}
    </div>
  )
}

function ChecklistTab() {
  const [weekStart, setWeekStart] = useState(() => {
    const date = new Date()
    const day = date.getUTCDay()
    const offset = day === 0 ? -6 : 1 - day
    date.setUTCDate(date.getUTCDate() + offset)
    return toDateInput(date.toISOString())
  })
  const [data, setData] = useState({ items: [], completionPercentage: 0 })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await informationApi.getChecklist(weekStart)
      setData(response.data)
    } finally {
      setLoading(false)
    }
  }, [weekStart])

  useEffect(() => {
    load()
  }, [load])

  const updateEntry = async (entryId, patch) => {
    setSaving(true)
    try {
      await informationApi.updateChecklistEntry(entryId, patch)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const saveTemplate = async () => {
    setSaving(true)
    try {
      if (form.id) await informationApi.updateChecklistItem(form.id, { activity: form.activity, orderIndex: Number(form.orderIndex || 0) })
      else await informationApi.createChecklistItem({ activity: form.activity, orderIndex: Number(form.orderIndex || 0) })
      setForm(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const removeTemplate = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await informationApi.deleteChecklistItem(deleting.templateId)
      setDeleting(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  const shiftWeek = (direction) => {
    const date = new Date(`${weekStart}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + direction * 7)
    setWeekStart(toDateInput(date.toISOString()))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Checklist Diario</h2>
          <p className="text-sm text-slate-500 mt-1">Gerencie a rotina semanal fixa do departamento.</p>
        </div>
        <button
          onClick={() => setForm({ activity: '', orderIndex: data.items.length + 1 })}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
        >
          <Plus size={14} />
          Nova Atividade
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <button onClick={() => shiftWeek(-1)} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500">
            <ChevronLeft size={16} />
          </button>
          <input
            type="date"
            value={weekStart}
            onChange={(event) => setWeekStart(event.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />
          <button onClick={() => shiftWeek(1)} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500">
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="min-w-[220px]">
          <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
            <span>Conclusao da semana</span>
            <span className="font-semibold">{Math.round(data.completionPercentage || 0)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-pink-400 rounded-full" style={{ width: `${data.completionPercentage || 0}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex items-center justify-center">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Atividade', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Acoes'].map((label) => (
                    <th key={label} className="px-4 py-3 text-left text-xs uppercase tracking-wide text-slate-500 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(data.items || []).map((item) => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                    <td className="px-4 py-3 text-sm text-slate-800 font-medium">{item.activity}</td>
                    {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map((dayKey) => (
                      <td key={dayKey} className="px-4 py-3">
                        <button
                          onClick={() => updateEntry(item.id, { [dayKey]: !item[dayKey] })}
                          disabled={saving}
                          className={`w-10 h-10 rounded-xl border flex items-center justify-center ${
                            item[dayKey]
                              ? 'bg-pink-400 border-pink-400 text-white'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setForm({ id: item.templateId, activity: item.activity, orderIndex: item.orderIndex })} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => setDeleting(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {form && (
        <EntityModal
          title={form.id ? 'Editar atividade' : 'Nova atividade'}
          fields={[
            { key: 'activity', label: 'Atividade', type: 'text', fullWidth: true },
            { key: 'orderIndex', label: 'Ordem', type: 'number', min: 1 },
          ]}
          form={form}
          onChange={(key, value) => setForm((current) => ({ ...current, [key]: value }))}
          onClose={() => setForm(null)}
          onSave={saveTemplate}
          saving={saving}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Excluir atividade"
          description="A atividade sera removida desta e das demais semanas salvas."
          onCancel={() => setDeleting(null)}
          onConfirm={removeTemplate}
          loading={saving}
        />
      )}
    </div>
  )
}

function splitLines(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
}

function TrainingListSection({ title, lines, emptyLabel }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">{title}</p>
      {lines.length === 0 ? (
        <p className="text-sm text-slate-400">{emptyLabel}</p>
      ) : (
        <ul className="space-y-1">
          {lines.map((line, index) => (
            <li key={`${line}-${index}`} className="text-sm text-slate-700 flex gap-2">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-pink-400 shrink-0" />
              <span className="min-w-0 break-words">{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Cartao de um treinamento na lista (no lugar da linha de colunas com
// rolagem horizontal, que ficava ilegivel com modulos/duvidas longos).
function TrainingCard({ item, onInvite }) {
  const participants = String(item.participantNames || '')
    .split(/[\n,;/]+/)
    .map((name) => name.trim())
    .filter(Boolean)

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-44 shrink-0 flex lg:flex-col gap-3 lg:gap-1.5 items-center lg:items-start flex-wrap">
        <p className="text-lg font-bold text-slate-900">{formatDate(item.date)}</p>
        <p className="text-sm text-slate-500">
          {item.startTime && item.endTime ? `${item.startTime} as ${item.endTime}` : 'Sem horario'}
        </p>
        {item.department && (
          <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-pink-50 text-pink-600 border border-pink-100">
            {item.department}
          </span>
        )}
        <p className="text-xs text-slate-400">{formatHours(item.hours)}</p>
      </div>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h4 className="text-base font-semibold text-slate-900">{item.theme || 'Treinamento'}</h4>
          <div className="flex items-center gap-2">
            {item.inviteSentAt && (
              <span className="text-[11px] text-slate-400">Agenda enviada {formatDate(item.inviteSentAt)}</span>
            )}
            <button
              type="button"
              onClick={() => onInvite(item)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-400 text-white text-xs font-medium hover:bg-pink-300 whitespace-nowrap"
            >
              <CalendarDays size={13} />
              {item.inviteSentAt ? 'Reenviar agenda' : 'Enviar agenda'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TrainingListSection title="Modulos abordados" lines={splitLines(item.modulesCovered)} emptyLabel="-" />
          <TrainingListSection title="Duvidas repassadas" lines={splitLines(item.questionsCovered)} emptyLabel="-" />
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1.5">
            Participantes ({participants.length})
          </p>
          {participants.length === 0 ? (
            <p className="text-sm text-slate-400">-</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {participants.map((name, index) => (
                <span key={`${name}-${index}`} className="text-xs px-2 py-1 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
                  {name}
                </span>
              ))}
            </div>
          )}
        </div>

        {(item.attachments || []).length > 0 && (
          <p className="text-xs text-slate-400">{item.attachments.length} anexo(s)</p>
        )}
      </div>
    </div>
  )
}

// Trimestre civil -> datas (AAAA-MM-DD) usadas pelo filtro startDate/endDate.
function quarterRange(year, quarter) {
  const startMonth = (quarter - 1) * 3 + 1
  const lastDay = new Date(year, startMonth + 2, 0).getDate()
  const pad = (value) => String(value).padStart(2, '0')
  return {
    startDate: `${year}-${pad(startMonth)}-01`,
    endDate: `${year}-${pad(startMonth + 2)}-${pad(lastDay)}`,
  }
}

// Qual trimestre as datas atuais representam (0 = nenhum / periodo livre).
function quarterFromFilters(filters) {
  const year = Number(String(filters.startDate || '').slice(0, 4))
  if (!year) return { year: null, quarter: 0 }
  for (let quarter = 1; quarter <= 4; quarter += 1) {
    const range = quarterRange(year, quarter)
    if (range.startDate === filters.startDate && range.endDate === filters.endDate) return { year, quarter }
  }
  return { year, quarter: 0 }
}

function DashboardTab({ filters, setFilters, data, loading, onRefresh }) {
  const currentYear = new Date().getFullYear()
  const quarterYearOptions = Array.from({ length: 5 }, (_, index) => currentYear - index)
  const detectedQuarter = quarterFromFilters(filters)
  const [quarterYear, setQuarterYear] = useState(detectedQuarter.year || currentYear)
  const selectedQuarter = detectedQuarter.quarter

  const applyQuarter = (year, quarter) => {
    setFilters((current) => ({ ...current, ...quarterRange(year, quarter) }))
  }

  const executiveCards = [
    { title: 'Taxa de Conclusao', value: formatPercent(data.demandsCompleted, data.demandsReceived), icon: CheckCircle2, tone: 'violet', helper: 'Concluidas sobre o total recebido no periodo.' },
    { title: 'Urgentes em Aberto', value: formatNumber(data.demandsUrgentOpen), icon: Activity, tone: 'rose', helper: 'Prioridade Urgente ainda nao concluida/cancelada. Atencao imediata.' },
    { title: 'Aguardando Aprovacao', value: formatNumber(data.demandsWaitingApproval), icon: Hourglass, tone: 'amber', helper: 'Demandas travadas esperando aprovacao da diretoria/gestao.' },
    { title: 'Tempo Medio de Resolucao', value: formatDays(data.avgResolutionDays), icon: ClipboardCheck, tone: 'cyan', helper: 'Media entre abertura e conclusao das demandas concluidas.' },
  ]

  const operationalCards = [
    { title: 'Demandas Recebidas', value: formatNumber(data.demandsReceived), icon: ClipboardList, tone: 'blue', helper: 'Total registrado no periodo selecionado.' },
    { title: 'Demandas Concluidas', value: formatNumber(data.demandsCompleted), icon: CheckCircle2, tone: 'pink', helper: 'Considera status concluido com data de conclusao.' },
    { title: 'Em Andamento', value: formatNumber(data.demandsInProgress), icon: Activity, tone: 'amber', helper: 'Demandas que seguem em execucao.' },
    { title: 'Horas em Treinamentos', value: formatHours(data.trainingHours), icon: BookOpen, tone: 'cyan', helper: 'Horas registradas em treinamentos.' },
    { title: 'Horas em Projetos/Suporte', value: formatHours(data.projectHours), icon: Activity, tone: 'blue', helper: 'Horas de demandas e suporte prestado a outros departamentos.' },
    { title: 'Processos Criados', value: formatNumber(data.processesCreated), icon: ClipboardCheck, tone: 'blue', helper: 'Processos com tipo Novo.' },
    { title: 'Treinamentos Realizados', value: formatNumber(data.trainingsPerformed), icon: GraduationCap, tone: 'pink', helper: 'Total de treinamentos do periodo.' },
  ]

  const hasMonthlyTrend = (data.monthlyTrend || []).some((point) => point.received > 0 || point.completed > 0)
  const hasPriorityBreakdown = data.demandsByPriority && data.demandsByPriority.length > 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Resumo consolidado do Departamento de Informacao.</p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-pink-200"
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3 flex-wrap">
          <select
            value={filters.department}
            onChange={(event) => setFilters((current) => ({ ...current, department: event.target.value }))}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          >
            <option value="">Todos os departamentos</option>
            {INFORMATION_DEPARTMENTS.map((department) => (
              <option key={department} value={department}>{department}</option>
            ))}
          </select>
        <select
          value={quarterYear}
          onChange={(event) => {
            const year = Number(event.target.value)
            setQuarterYear(year)
            if (selectedQuarter) applyQuarter(year, selectedQuarter)
          }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          {quarterYearOptions.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <select
          value={selectedQuarter}
          onChange={(event) => {
            const quarter = Number(event.target.value)
            if (quarter) applyQuarter(quarterYear, quarter)
            else setFilters((current) => ({ ...current, startDate: '', endDate: '' }))
          }}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
        >
          <option value={0}>{filters.startDate || filters.endDate ? 'Periodo personalizado' : 'Todo o periodo'}</option>
          {[1, 2, 3, 4].map((quarter) => (
            <option key={quarter} value={quarter}>{quarter}º Trimestre</option>
          ))}
        </select>
        <span className="text-sm text-slate-400">ou</span>
        <input
          type="date"
          value={filters.startDate}
          onChange={(event) => setFilters((current) => ({ ...current, startDate: event.target.value }))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filters.endDate}
          onChange={(event) => setFilters((current) => ({ ...current, endDate: event.target.value }))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <Loader2 size={26} className="animate-spin text-slate-300" />
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Indicadores para a Diretoria</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {executiveCards.map((card) => <DashboardCard key={card.title} {...card} />)}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Indicadores Operacionais</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {operationalCards.map((card) => <DashboardCard key={card.title} {...card} />)}
            </div>
          </div>

          {hasMonthlyTrend && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Evolucao Mensal: Recebidas vs Concluidas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.monthlyTrend} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="month" tickFormatter={formatMonthLabel} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    labelFormatter={formatMonthLabel}
                    formatter={(value, name) => [value, name === 'received' ? 'Recebidas' : 'Concluidas']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend formatter={(value) => (value === 'received' ? 'Recebidas' : 'Concluidas')} />
                  <Line type="monotone" dataKey="received" name="received" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="completed" name="completed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {hasPriorityBreakdown && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Demandas Abertas por Prioridade</h3>
              <p className="text-xs text-slate-400 mb-4">Backlog atual (nao concluido/cancelado) — ajuda a priorizar o que precisa de atencao da diretoria.</p>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.demandsByPriority} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="priority" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value) => [value, 'Quantidade']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" name="Quantidade" radius={[8, 8, 0, 0]}>
                    {data.demandsByPriority.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.demandsCompletedByDepartment && data.demandsCompletedByDepartment.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Demandas Concluidas por Departamento</h3>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={data.demandsCompletedByDepartment}
                    dataKey="count"
                    nameKey="department"
                    cx="50%"
                    cy="50%"
                    outerRadius={120}
                    label={({ department, count }) => `${department}: ${count}`}
                  >
                    {data.demandsCompletedByDepartment.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [value, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.demandsByCategory && data.demandsByCategory.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-1 text-center">Categoria por Demandas</h3>
              <p className="text-xs text-slate-400 mb-2 text-center">Todas as demandas recebidas no periodo, por categoria.</p>
              <ResponsiveContainer width="100%" height={340}>
                <PieChart>
                  <Pie
                    data={data.demandsByCategory}
                    dataKey="count"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={125}
                    paddingAngle={1}
                    labelLine={false}
                    label={({ percent }) => (percent >= 0.03 ? `${Math.round(percent * 100)}%` : '')}
                  >
                    {data.demandsByCategory.map((entry, index) => (
                      <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${value} demanda(s)`, name]}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.departmentsAttendedBreakdown && data.departmentsAttendedBreakdown.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-base font-semibold text-slate-800 mb-4">Departamentos Atendidos</h3>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={data.departmentsAttendedBreakdown} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="department" tick={{ fontSize: 12, fill: '#64748b' }} interval={0} angle={-20} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value) => [value, 'Quantidade']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" name="Quantidade" fill="#f472b6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function InformationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'
  const [dashboardFilters, setDashboardFilters] = useState({ department: '', startDate: '', endDate: '' })
  const [invitingTraining, setInvitingTraining] = useState(null)
  const [dashboardData, setDashboardData] = useState({})
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [exporting, setExporting] = useState(false)

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const response = await informationApi.getDashboard(dashboardFilters)
      setDashboardData(response.data || {})
    } finally {
      setDashboardLoading(false)
    }
  }, [dashboardFilters])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const commonDateFilters = [
    { key: 'startDate', type: 'date' },
    { key: 'endDate', type: 'date' },
  ]

  const handleExportDemands = async () => {
    setExporting(true)
    try {
      const items = await loadAllPages(informationApi.getDemands, {})
    const columns = [
      { key: 'Data de Criacao', get: (item) => formatDateTime(item.createdDate) },
      { key: 'Data de Conclusao', get: (item) => formatDateTime(item.completedDate) },
      { key: 'Departamento Solicitante', get: (item) => item.requestingDepartment || '' },
      { key: 'Solicitante', get: (item) => item.requester || '' },
      { key: 'Descricao', get: (item) => item.description || '' },
      { key: 'Categoria', get: (item) => item.category || '' },
      { key: 'Prioridade', get: (item) => item.priority || '' },
      { key: 'Status', get: (item) => item.status || '' },
      { key: 'Aprovacao', get: (item) => item.approval || '' },
      { key: 'Horas Gastas', get: (item) => String(item.hoursSpent ?? '') },
    ]
    const headers = columns.map((c) => c.key)
    const escape = (v) => {
      if (v === null || v === undefined) return ''
      const s = String(v).replace(/"/g, '""')
      if (s.includes(';') || s.includes('\n') || s.includes('"')) return `"${s}"`
      return s
    }
    const lines = [
      headers.join(';'),
      ...items.map((item) => columns.map((c) => escape(c.get(item))).join(';')),
    ]
    const csv = '\ufeff' + lines.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `demandas_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const demandTab = (
    <ResourceTab
      title="Demandas"
      description="Controle principal das solicitacoes recebidas pelo departamento."
      createLabel="Nova Demanda"
      list={informationApi.getDemands}
      create={informationApi.createDemand}
      update={informationApi.updateDemand}
      remove={informationApi.deleteDemand}
        defaultFilters={{ q: '', department: '', category: '', priority: '', status: '', approval: '', startDate: '', endDate: '', page: 1, pageSize: 10 }}
        filters={[
          { key: 'q', placeholder: 'Buscar por solicitante ou descricao' },
          { key: 'department', type: 'select', options: INFORMATION_DEPARTMENTS, placeholder: 'Departamento solicitante' },
          { key: 'category', type: 'select', options: DEMAND_CATEGORIES, placeholder: 'Categoria' },
          { key: 'priority', type: 'select', options: DEMAND_PRIORITIES, placeholder: 'Prioridade' },
          { key: 'status', type: 'select', options: DEMAND_STATUSES, placeholder: 'Status' },
          { key: 'approval', type: 'select', options: DEMAND_APPROVALS, placeholder: 'Aprovacao' },
          ...commonDateFilters,
      ]}
        columns={[
          { key: 'createdDate', label: 'Criacao', minWidth: 155, maxWidth: 155, render: (item) => formatDateTime(item.createdDate) },
          { key: 'completedDate', label: 'Conclusao', minWidth: 155, maxWidth: 155, render: (item) => formatDateTime(item.completedDate) },
          { key: 'requestingDepartment', label: 'Departamento', minWidth: 150, maxWidth: 160, render: (item) => <span className="truncate block">{item.requestingDepartment || '-'}</span> },
          { key: 'requester', label: 'Solicitante', minWidth: 140, maxWidth: 150, render: (item) => <span className="truncate block">{item.requester || '-'}</span> },
          { key: 'category', label: 'Categoria', minWidth: 120, maxWidth: 130, render: (item) => <span className="truncate block">{item.category || '-'}</span> },
          { key: 'status', label: 'Status', minWidth: 140, maxWidth: 160, render: (item) => <span className="truncate block">{item.status || '-'}</span> },
          { key: 'hoursSpent', label: 'Horas', minWidth: 80, maxWidth: 90, render: (item) => formatHours(item.hoursSpent) },
        ]}
        formFields={demandFormFields}
      emptyForm={demandEmptyForm}
      toForm={demandToForm}
      toPayload={demandToPayload}
      normalizeFormChange={demandNormalizeFormChange}
      onChanged={loadDashboard}
      modalMaxWidth="max-w-5xl"
      modalGridCols="md:grid-cols-3"
      extraActions={
        <button
          onClick={handleExportDemands}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-pink-200 hover:text-pink-500 transition-colors disabled:opacity-60"
          title="Exportar demandas para Excel"
        >
          {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
          {exporting ? 'Exportando...' : 'Exportar Excel'}
        </button>
      }
    />
  )

  const trainingTab = (
    <ResourceTab
      title="Treinamentos"
      description="Registre treinamentos realizados, participantes e horas aplicadas."
      createLabel="Novo Treinamento"
      list={informationApi.getTrainings}
      create={informationApi.createTraining}
      update={informationApi.updateTraining}
      remove={informationApi.deleteTraining}
      defaultFilters={{ q: '', department: '', startDate: '', endDate: '', page: 1, pageSize: 10 }}
      filters={[
        { key: 'department', type: 'select', options: INFORMATION_DEPARTMENTS, placeholder: 'Departamento' },
        { key: 'theme', placeholder: 'Tema' },
        ...commonDateFilters,
      ]}
        columns={[
          { key: 'date', label: 'Data', render: (item) => formatDate(item.date) },
          {
            key: 'time',
            label: 'Horario',
            render: (item) => (item.startTime && item.endTime ? `${item.startTime} as ${item.endTime}` : '-'),
          },
          { key: 'department', label: 'Departamento' },
          { key: 'theme', label: 'Tema' },
          {
            key: 'modulesCovered',
            label: 'Modulos Abordados',
            render: (item) => <span className="whitespace-pre-line">{item.modulesCovered || '-'}</span>,
          },
          {
            key: 'questionsCovered',
            label: 'Duvidas Repassadas',
            render: (item) => <span className="whitespace-pre-line">{item.questionsCovered || '-'}</span>,
          },
        {
          key: 'participantNames',
          label: 'Participantes',
          render: (item) => item.participantNames || '-',
          },
          { key: 'trainedCount', label: 'Quantidade Treinadas', render: (item) => formatNumber(item.trainedCount) },
          { key: 'attachments', label: 'Anexos', render: (item) => formatNumber((item.attachments || []).length) },
          { key: 'hours', label: 'Horas', render: (item) => formatHours(item.hours) },
          {
            key: 'invite',
            label: 'Agenda',
            render: (item) => (
              <div className="flex flex-col items-start gap-1">
                <button
                  type="button"
                  onClick={() => setInvitingTraining(item)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-pink-400 text-white text-xs font-medium hover:bg-pink-300 whitespace-nowrap"
                >
                  <CalendarDays size={13} />
                  {item.inviteSentAt ? 'Reenviar agenda' : 'Enviar agenda'}
                </button>
                {item.inviteSentAt && (
                  <span className="text-[11px] text-slate-400 whitespace-nowrap">Enviada {formatDate(item.inviteSentAt)}</span>
                )}
              </div>
            ),
          },
        ]}
      renderItem={(item) => <TrainingCard item={item} onInvite={setInvitingTraining} />}
      formFields={trainingFormFields}
      emptyForm={trainingEmptyForm}
      toForm={trainingToForm}
      toPayload={trainingToPayload}
      normalizeFormChange={trainingNormalizeFormChange}
      summaryBuilder={(items) => {
        const departmentSet = new Set(items.map((item) => item.department).filter(Boolean))
        const totalHours = items.reduce((sum, item) => sum + Number(item.hours || 0), 0)
        const totalParticipants = items.reduce((sum, item) => sum + Number(item.trainedCount || 0), 0)
        return [
          { title: 'Treinamentos', value: formatNumber(items.length), icon: GraduationCap, tone: 'pink' },
          { title: 'Participantes', value: formatNumber(totalParticipants), icon: Users, tone: 'blue' },
          { title: 'Horas Treinadas', value: formatHours(totalHours), icon: BookOpen, tone: 'amber' },
          { title: 'Departamentos', value: formatNumber(departmentSet.size), icon: Building2, tone: 'violet' },
        ]
      }}
      onChanged={loadDashboard}
    />
  )

  const processTab = (
    <ResourceTab
      title="Processos"
      description="Mapeie novos processos, revisoes e automacoes em andamento."
      createLabel="Novo Processo"
      list={informationApi.getProcesses}
      create={informationApi.createProcess}
      update={informationApi.updateProcess}
      remove={informationApi.deleteProcess}
      defaultFilters={{ department: '', type: '', status: '', startDate: '', endDate: '', page: 1, pageSize: 10 }}
      filters={[
        { key: 'department', type: 'select', options: INFORMATION_DEPARTMENTS, placeholder: 'Departamento' },
        { key: 'type', type: 'select', options: PROCESS_TYPES, placeholder: 'Tipo' },
        { key: 'status', type: 'select', options: PROCESS_STATUSES, placeholder: 'Status' },
        ...commonDateFilters,
      ]}
      columns={[
        { key: 'date', label: 'Data', render: (item) => formatDate(item.date) },
        { key: 'department', label: 'Departamento' },
        { key: 'process', label: 'Processo', render: (item) => item.process || '-' },
        { key: 'type', label: 'Tipo' },
        { key: 'status', label: 'Status' },
      ]}
      formFields={[
        { key: 'date', label: 'Data', type: 'date' },
        { key: 'department', label: 'Departamento', type: 'select', options: INFORMATION_DEPARTMENTS },
        { key: 'process', label: 'Processo', type: 'textarea', fullWidth: true },
        { key: 'type', label: 'Tipo', type: 'select', options: PROCESS_TYPES },
        { key: 'status', label: 'Status', type: 'select', options: PROCESS_STATUSES },
      ]}
      emptyForm={{ date: '', department: '', process: '', type: '', status: '' }}
      toForm={(item) => ({
        date: toDateInput(item.date),
        department: item.department || '',
        process: item.process || '',
        type: item.type || '',
        status: item.status || '',
      })}
      toPayload={(form) => ({
        date: toIsoDate(form.date),
        department: form.department,
        process: form.process,
        type: form.type,
        status: form.status,
      })}
      onChanged={loadDashboard}
    />
  )

  const routinesTab = (
    <ResourceTab
      title="Rotinas Diarias"
      description="Registre atividades recorrentes e acompanhe o tempo gasto."
      createLabel="Nova Rotina"
      list={informationApi.getDailyRoutines}
      create={informationApi.createDailyRoutine}
      update={informationApi.updateDailyRoutine}
      remove={informationApi.deleteDailyRoutine}
      defaultFilters={{ activity: '', status: '', startDate: '', endDate: '', page: 1, pageSize: 10 }}
      filters={[
        { key: 'activity', placeholder: 'Atividade' },
        { key: 'status', type: 'select', options: ROUTINE_STATUSES, placeholder: 'Status' },
        ...commonDateFilters,
      ]}
      columns={[
        { key: 'date', label: 'Data', render: (item) => formatDate(item.date) },
        { key: 'activity', label: 'Atividade' },
        { key: 'status', label: 'Status' },
        { key: 'durationMinutes', label: 'Tempo', render: (item) => formatMinutes(item.durationMinutes) },
      ]}
      formFields={[
        { key: 'date', label: 'Data', type: 'date' },
        { key: 'activity', label: 'Atividade', type: 'textarea', fullWidth: true },
        { key: 'status', label: 'Status', type: 'select', options: ROUTINE_STATUSES },
        { key: 'durationMinutes', label: 'Tempo (minutos)', type: 'number', min: '0', step: '1' },
      ]}
      emptyForm={() => ({ date: todayDateInput(), activity: '', status: 'Nao iniciado', durationMinutes: '' })}
      toForm={(item) => ({
        date: toDateInput(item.date),
        activity: item.activity || '',
        status: item.status || 'Nao iniciado',
        durationMinutes: item.durationMinutes ?? '',
      })}
      toPayload={(form) => ({
        date: toIsoDate(form.date),
        activity: form.activity,
        status: form.status,
        durationMinutes: Number(form.durationMinutes || 0),
      })}
      summaryBuilder={(_, data) => [
        { title: 'Tempo no periodo', value: formatMinutes(data.totalMinutes), icon: Hourglass, tone: 'cyan', helper: 'Somatorio do filtro aplicado.' },
      ]}
    />
  )

  const meetingsTab = (
    <ResourceTab
      title="Reunioes"
      description="Acompanhe reunioes internas e apoios de alinhamento com os setores."
      createLabel="Nova Reuniao"
      list={informationApi.getMeetings}
      create={informationApi.createMeeting}
      update={informationApi.updateMeeting}
      remove={informationApi.deleteMeeting}
      defaultFilters={{ department: '', subject: '', startDate: '', endDate: '', page: 1, pageSize: 10 }}
      filters={[
        { key: 'department', type: 'select', options: INFORMATION_DEPARTMENTS, placeholder: 'Departamento' },
        { key: 'subject', placeholder: 'Assunto' },
        ...commonDateFilters,
      ]}
      columns={[
        { key: 'date', label: 'Data', render: (item) => formatDate(item.date) },
        { key: 'department', label: 'Departamento' },
        { key: 'subject', label: 'Assunto' },
        { key: 'durationHours', label: 'Duracao', render: (item) => formatHours(item.durationHours) },
      ]}
      formFields={[
        { key: 'date', label: 'Data', type: 'date' },
        { key: 'department', label: 'Departamento', type: 'select', options: INFORMATION_DEPARTMENTS },
        { key: 'subject', label: 'Assunto', type: 'textarea', fullWidth: true },
        { key: 'durationHours', label: 'Duracao (horas)', type: 'number', min: '0', step: '0.25' },
      ]}
      emptyForm={{ date: '', department: '', subject: '', durationHours: '' }}
      toForm={(item) => ({
        date: toDateInput(item.date),
        department: item.department || '',
        subject: item.subject || '',
        durationHours: item.durationHours ?? '',
      })}
      toPayload={(form) => ({
        date: toIsoDate(form.date),
        department: form.department,
        subject: form.subject,
        durationHours: Number(form.durationHours || 0),
      })}
      onChanged={loadDashboard}
    />
  )

  const content = useMemo(() => ({
    dashboard: <DashboardTab filters={dashboardFilters} setFilters={setDashboardFilters} data={dashboardData} loading={dashboardLoading} onRefresh={loadDashboard} />,
    demands: demandTab,
    calendar: <CalendarTab onChanged={loadDashboard} onInvite={setInvitingTraining} />,
    trainings: trainingTab,
    processes: processTab,
  }), [dashboardData, dashboardFilters, dashboardLoading, demandTab, loadDashboard, meetingsTab, processTab, routinesTab, setDashboardFilters, trainingTab])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">Setor Interno</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Departamento de Informacao</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Painel unificado para registrar demandas, treinamentos, processos, rotinas, checklist semanal
              e reunioes com persistencia real no banco.
            </p>
          </div>
          <div className="rounded-2xl bg-pink-50 border border-pink-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-pink-500">Ultima atualizacao</p>
            <p className="text-sm font-semibold text-pink-600 mt-1">{formatLiveDateTime(new Date().toISOString())}</p>
          </div>
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

      {content[activeTab] || content.dashboard}

      {invitingTraining && (
        <TrainingInviteModal training={invitingTraining} onClose={() => setInvitingTraining(null)} />
      )}
    </div>
  )
}
