import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Building2,
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
  Paperclip,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  Upload,
  Users,
  X,
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
} from 'recharts'
import { informationApi } from '../../services/informationApi'

const BASE_URL = import.meta.env.VITE_API_URL || ''
const DEMAND_CATEGORIES = ['Sistema', 'ERP Albatroz', 'CRM', 'Dashboard', 'Processo', 'Automacao', 'Treinamento', 'Documentacao', 'Relatorio', 'Outros']
const DEMAND_PRIORITIES = ['Baixa', 'Media', 'Alta', 'Urgente']
const DEMAND_STATUSES = ['Aberto', 'Em andamento', 'Aguardando aprovacao', 'Concluido', 'Cancelado']
const DEMAND_APPROVALS = ['Sim', 'Nao', 'Aguardando']
const PROCESS_TYPES = ['Novo', 'Revisao', 'Automacao']
const PROCESS_STATUSES = ['Em andamento', 'Concluido', 'Cancelado']
const ROUTINE_STATUSES = ['Nao iniciado', 'Em andamento', 'Concluido', 'Cancelado']
const INFORMATION_DEPARTMENTS = [
  'Rel. Comercial',
  'Faturamento',
  'Financeiro',
  'Diretoria',
  'Comercial',
  'Projetos',
  'Obras',
  'Engenharia',
  'Automacao',
  'Compras',
  'Logistica',
  'Almoxarifado',
  'Producao',
  'Informacao',
  'Assistencia Tecnica',
]

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: FolderKanban },
  { id: 'demands', label: 'Demandas', icon: ClipboardList },
  { id: 'trainings', label: 'Treinamentos', icon: GraduationCap },
  { id: 'processes', label: 'Processos', icon: Activity },
  { id: 'routines', label: 'Rotinas Diarias', icon: Hourglass },
  { id: 'checklist', label: 'Checklist Diario', icon: CheckSquare },
  { id: 'meetings', label: 'Reunioes', icon: CalendarDays },
]

function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

function toDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${toDateInput(value)}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function toIsoDate(value) {
  if (!value) return null
  return `${value}T00:00:00Z`
}

function toIsoDateTime(value) {
  if (!value) return null
  return `${value.length === 16 ? `${value}:00` : value}Z`
}

function nowDateTimeInput() {
  return toDateTimeInput(new Date().toISOString())
}

function todayDateInput() {
  return toDateInput(new Date().toISOString())
}

function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}

function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${formatDate(value)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

function formatLiveDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('pt-BR')
}

function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

function formatHours(value) {
  const totalMinutes = Math.round(Number(value || 0) * 60)
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 min'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

function formatMinutes(totalMinutes) {
  const minutes = Number(totalMinutes || 0)
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  if (rest === 0) return `${hours}h`
  return `${hours}h ${rest}min`
}

function splitTrainingParticipants(value) {
  return String(value || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function countTrainingParticipants(value) {
  return splitTrainingParticipants(value).length
}

function calculateHoursBetween(startValue, endValue) {
  if (!startValue || !endValue) return 0
  const start = new Date(toIsoDateTime(startValue))
  const end = new Date(toIsoDateTime(endValue))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0
  return Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2))
}

function resolveAssetUrl(url) {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  return `${BASE_URL}${url}`
}

async function loadAllPages(fetcher, params = {}, pageSize = 200) {
  const first = await fetcher({ ...params, page: 1, pageSize })
  const firstItems = first.data?.items || []
  const totalPages = first.data?.totalPages || 1

  if (totalPages <= 1) return firstItems

  const responses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetcher({ ...params, page: index + 2, pageSize })),
  )

  return firstItems.concat(responses.flatMap((response) => response.data?.items || []))
}

const CHART_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6', '#a855f7', '#eab308', '#64748b', '#0ea5e9']

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
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
    violet: 'bg-violet-50 text-violet-600 border-violet-100',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
    slate: 'bg-slate-50 text-slate-600 border-slate-100',
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {helper && <p className="text-xs text-slate-500 mt-2">{helper}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${tones[tone] || tones.slate}`}>
          <Icon size={18} />
        </div>
      </div>
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

function FormField({ field, value, onChange, form }) {
  if (field.type === 'attachments') {
    const items = Array.isArray(value) ? value : []
    const [isDragActive, setIsDragActive] = useState(false)

    const handleDrag = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.type === "dragenter" || e.type === "dragover") {
        setIsDragActive(true)
      } else if (e.type === "dragleave") {
        setIsDragActive(false)
      }
    }

    const handleDrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files)
        if (field.onFilesSelected) {
          field.onFilesSelected(files)
        }
      }
    }

    return (
      <div className="space-y-3">
        {!field.disabled && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-6 transition-all duration-200 flex flex-col items-center justify-center text-center ${
              isDragActive
                ? 'border-emerald-500 bg-emerald-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <Upload size={24} className="text-slate-400 mb-2" />
            <div className="flex flex-col items-center gap-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
                <Upload size={14} className="text-slate-500" />
                Adicionar arquivos
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || [])
                    if (files.length > 0 && field.onFilesSelected) {
                      field.onFilesSelected(files)
                    }
                    event.target.value = ''
                  }}
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">ou arraste e solte seus arquivos aqui</p>
              <span className="text-[10px] text-slate-400">
                (Selecione varios de uma vez segurando CTRL)
              </span>
            </div>
            {field.helper && (
              <span className={`text-xs mt-3 block ${field.helperIsError ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
                {field.helperIsError ? '⚠️ ' : ''}{field.helper}
              </span>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400 text-center">
            Nenhum anexo adicionado.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id || item.url || `${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 bg-white shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate font-medium">{item.name || 'Arquivo'}</p>
                  <p className="text-xs text-slate-400">
                    {item.size ? `${formatNumber(item.size)} bytes` : 'Anexo'}{item.uploadedAt ? ` · ${formatDateTime(item.uploadedAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.url && (
                    <a
                      href={resolveAssetUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:underline px-2 py-1 rounded-lg hover:bg-emerald-50 transition-colors"
                    >
                      <Paperclip size={12} />
                      Abrir
                    </a>
                  )}
                  {!field.disabled && (
                    <button
                      type="button"
                      onClick={() => field.onRemove?.(item, form, index)}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={field.rows || 4}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        readOnly={field.readOnly}
        disabled={field.disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        disabled={field.disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
      >
        <option value="">{field.placeholder || 'Selecione'}</option>
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
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(event) => onChange(field.key, field.type === 'number' ? event.target.value : event.target.value)}
      placeholder={field.placeholder}
      readOnly={field.readOnly}
      disabled={field.disabled}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
    />
  )
}

function EntityModal({ title, fields, form, onChange, onClose, onSave, saving, saveError, readOnly, maxWidth = 'max-w-3xl', gridCols = 'md:grid-cols-2' }) {
  const renderedFields = readOnly
    ? fields.map((f) => ({ ...f, disabled: true, onFilesSelected: undefined, onRemove: undefined }))
    : fields
  const fullSpan = gridCols === 'md:grid-cols-3' ? 'md:col-span-3' : 'md:col-span-2'

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{readOnly ? 'Visualizacao do registro.' : 'Preencha os campos e salve.'}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300">
            <X size={16} />
          </button>
        </div>
        <div className={`p-5 grid grid-cols-1 ${gridCols} gap-3 max-h-[78vh] overflow-y-auto`}>
          {renderedFields.map((field) => (
            <div key={field.key} className={field.fullWidth ? fullSpan : ''}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {field.label}
              </label>
              <FormField field={field} value={form[field.key] ?? ''} onChange={readOnly ? () => {} : onChange} form={form} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          {saveError && !readOnly && (
            <p className="text-xs text-rose-500 mr-auto max-w-xs leading-relaxed">
              ⚠️ {saveError}
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">{readOnly ? 'Fechar' : 'Cancelar'}</button>
            {!readOnly && (
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400"
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
            {data.items.map((item) => (
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
                    <button onClick={() => openEdit(item)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-emerald-300 hover:text-emerald-600 bg-white">
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
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-400"
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
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${data.completionPercentage || 0}%` }} />
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
                              ? 'bg-emerald-500 border-emerald-500 text-white'
                              : 'bg-white border-slate-200 text-slate-400'
                          }`}
                        >
                          <CheckCircle2 size={16} />
                        </button>
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setForm({ id: item.templateId, activity: item.activity, orderIndex: item.orderIndex })} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-emerald-300 hover:text-emerald-600">
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

function DashboardTab({ filters, setFilters, data, loading, onRefresh }) {
  const cards = [
    { title: 'Demandas Recebidas', value: formatNumber(data.demandsReceived), icon: ClipboardList, tone: 'blue', helper: 'Total registrado no periodo selecionado.' },
    { title: 'Demandas Concluidas', value: formatNumber(data.demandsCompleted), icon: CheckCircle2, tone: 'emerald', helper: 'Considera status concluido com data de conclusao.' },
    { title: 'Em Andamento', value: formatNumber(data.demandsInProgress), icon: Activity, tone: 'amber', helper: 'Demandas que seguem em execucao.' },
    { title: 'Aguardando Aprovacao', value: formatNumber(data.demandsWaitingApproval), icon: ShieldCheck, tone: 'rose', helper: 'Inclui demandas e aprovacoes vinculadas pendentes.' },
    { title: 'Horas em Projetos', value: formatHours(data.projectHours), icon: FolderKanban, tone: 'violet', helper: 'Somatorio de horas em demandas e apoios.' },
    { title: 'Horas em Treinamentos', value: formatHours(data.trainingHours), icon: BookOpen, tone: 'cyan', helper: 'Horas registradas em treinamentos.' },
    { title: 'Horas em Reunioes', value: formatHours(data.meetingHours), icon: CalendarDays, tone: 'slate', helper: 'Duracao acumulada das reunioes.' },
    { title: 'Processos Criados', value: formatNumber(data.processesCreated), icon: ClipboardCheck, tone: 'blue', helper: 'Processos com tipo Novo.' },
    { title: 'Treinamentos Realizados', value: formatNumber(data.trainingsPerformed), icon: GraduationCap, tone: 'emerald', helper: 'Total de treinamentos do periodo.' },
    { title: 'Departamentos Atendidos', value: formatNumber(data.departmentsAttended), icon: Building2, tone: 'amber', helper: 'Departamentos atendidos em registros do modulo.' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500 mt-1">Resumo consolidado do Departamento de Informacao.</p>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-emerald-300"
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
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {cards.map((card) => <DashboardCard key={card.title} {...card} />)}
          </div>

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
        </div>
      )}
    </div>
  )
}

export default function InformationPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'dashboard'
  const [dashboardFilters, setDashboardFilters] = useState({ department: '', startDate: '', endDate: '' })
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
        formFields={[
          { key: 'createdDate', label: 'Data de Criacao', type: 'datetime-local' },
          { key: 'completedDate', label: 'Data de Conclusao', type: 'datetime-local' },
          { key: 'requestingDepartment', label: 'Departamento Solicitante', type: 'select', options: INFORMATION_DEPARTMENTS },
          { key: 'requester', label: 'Solicitante', type: 'text' },
          { key: 'description', label: 'Descricao', type: 'textarea', fullWidth: true },
          { key: 'category', label: 'Categoria', type: 'select', options: DEMAND_CATEGORIES },
          { key: 'priority', label: 'Prioridade', type: 'select', options: DEMAND_PRIORITIES },
          { key: 'status', label: 'Status', type: 'select', options: DEMAND_STATUSES },
          { key: 'approval', label: 'Aprovacao', type: 'select', options: DEMAND_APPROVALS },
          {
            key: 'attachments',
            label: 'Anexos',
            type: 'attachments',
            fullWidth: true,
            helper: 'Adicione documentos, imagens ou comprovantes relacionados a demanda.',
          },
          { key: 'hoursSpent', label: 'Horas Gastas', type: 'number', step: '0.25', min: '0', readOnly: true },
        ]}
      emptyForm={() => ({
        createdDate: nowDateTimeInput(),
        completedDate: '',
        requestingDepartment: '',
        requester: '',
        description: '',
        category: '',
        priority: '',
        status: 'Aberto',
        approval: 'Aguardando',
        attachments: [],
        hoursSpent: 0,
      })}
      toForm={(item) => ({
        createdDate: toDateTimeInput(item.createdDate),
        completedDate: toDateTimeInput(item.completedDate),
        requestingDepartment: item.requestingDepartment || '',
        requester: item.requester || '',
        description: item.description || '',
        category: item.category || '',
        priority: item.priority || '',
        status: item.status || '',
        approval: item.approval || '',
        attachments: item.attachments || [],
        hoursSpent: item.hoursSpent ?? '',
      })}
      toPayload={(form) => ({
        createdDate: toIsoDateTime(form.createdDate),
        completedDate: form.completedDate ? toIsoDateTime(form.completedDate) : null,
        requestingDepartment: form.requestingDepartment,
        requester: form.requester,
        description: form.description,
        category: form.category,
        priority: form.priority,
        status: form.status,
        approval: form.approval,
        attachments: form.attachments || [],
        hoursSpent: Number(form.hoursSpent || 0),
      })}
      normalizeFormChange={(next, key) => {
        if (key === 'createdDate' || key === 'completedDate') {
          return { ...next, hoursSpent: calculateHoursBetween(next.createdDate, next.completedDate) }
        }
        return next
      }}
      onChanged={async () => {
        await loadDashboard()
        await loadDemandOptions()
      }}
      modalMaxWidth="max-w-5xl"
      modalGridCols="md:grid-cols-3"
      extraActions={
        <button
          onClick={handleExportDemands}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-emerald-300 hover:text-emerald-600 transition-colors disabled:opacity-60"
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
          { key: 'department', label: 'Departamento' },
          { key: 'theme', label: 'Tema' },
          { key: 'modulesCovered', label: 'Modulos Abordados', render: (item) => item.modulesCovered || '-' },
        {
          key: 'participantNames',
          label: 'Participantes',
          render: (item) => item.participantNames || '-',
          },
          { key: 'trainedCount', label: 'Quantidade Treinadas', render: (item) => formatNumber(item.trainedCount) },
          { key: 'attachments', label: 'Anexos', render: (item) => formatNumber((item.attachments || []).length) },
          { key: 'hours', label: 'Horas', render: (item) => formatHours(item.hours) },
        ]}
      formFields={[
        { key: 'date', label: 'Data', type: 'date' },
        { key: 'department', label: 'Departamento', type: 'select', options: INFORMATION_DEPARTMENTS },
        { key: 'theme', label: 'Tema', type: 'text', fullWidth: true },
        {
          key: 'modulesCovered',
          label: 'Modulos Abordados',
          type: 'textarea',
          fullWidth: true,
          rows: 3,
          placeholder: 'Descreva os modulos, topicos ou conteudos abordados no treinamento.',
        },
        {
          key: 'participantNames',
          label: 'Participantes',
          type: 'textarea',
          fullWidth: true,
          rows: 5,
          placeholder: 'Informe os nomes em linhas separadas, ou separados por virgula/;.',
        },
        {
          key: 'trainedCount',
          label: 'Quantidade Treinadas',
          type: 'number',
          min: '0',
          step: '1',
          readOnly: true,
        },
        {
          key: 'attachments',
          label: 'Anexos',
          type: 'attachments',
          fullWidth: true,
          helper: 'Adicione materiais, listas de presenca ou comprovantes do treinamento.',
        },
        { key: 'hours', label: 'Horas', type: 'number', min: '0', step: '0.25' },
      ]}
      emptyForm={() => ({ date: todayDateInput(), department: '', theme: '', modulesCovered: '', participantNames: '', trainedCount: 0, attachments: [], hours: '' })}
      toForm={(item) => ({
        date: toDateInput(item.date),
        department: item.department || '',
        theme: item.theme || '',
        modulesCovered: item.modulesCovered || '',
        participantNames: item.participantNames || '',
        trainedCount: item.trainedCount ?? 0,
        attachments: item.attachments || [],
        hours: item.hours ?? '',
      })}
      toPayload={(form) => ({
        date: toIsoDate(form.date),
        department: form.department,
        theme: form.theme,
        modulesCovered: form.modulesCovered,
        participantNames: form.participantNames,
        trainedCount: countTrainingParticipants(form.participantNames),
        attachments: form.attachments || [],
        hours: Number(form.hours || 0),
      })}
      normalizeFormChange={(next, key) => {
        if (key === 'participantNames') {
          return { ...next, trainedCount: countTrainingParticipants(next.participantNames) }
        }
        return next
      }}
      summaryBuilder={(items) => {
        const departmentSet = new Set(items.map((item) => item.department).filter(Boolean))
        const totalHours = items.reduce((sum, item) => sum + Number(item.hours || 0), 0)
        const totalParticipants = items.reduce((sum, item) => sum + Number(item.trainedCount || 0), 0)
        return [
          { title: 'Treinamentos', value: formatNumber(items.length), icon: GraduationCap, tone: 'emerald' },
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
    trainings: trainingTab,
    processes: processTab,
    routines: routinesTab,
    checklist: <ChecklistTab />,
    meetings: meetingsTab,
  }), [dashboardData, dashboardFilters, dashboardLoading, demandTab, loadDashboard, meetingsTab, processTab, routinesTab, setDashboardFilters, trainingTab])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-500 font-semibold">Setor Interno</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Departamento de Informacao</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Painel unificado para registrar demandas, treinamentos, processos, rotinas, checklist semanal
              e reunioes com persistencia real no banco.
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-50 border border-emerald-100 px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-emerald-600">Ultima atualizacao</p>
            <p className="text-sm font-semibold text-emerald-900 mt-1">{formatLiveDateTime(new Date().toISOString())}</p>
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
                    ? 'bg-emerald-500 text-white shadow-sm'
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
    </div>
  )
}
