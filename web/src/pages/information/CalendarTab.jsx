import { useCallback, useEffect, useState } from 'react'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, Loader2, Plus } from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { EntityModal } from './EntityModal'
import {
  loadAllPages,
  toDateInput,
  trainingEmptyForm,
  trainingFormFields,
  trainingNormalizeFormChange,
  trainingToForm,
  trainingToPayload,
} from './informationShared'

const WEEKDAY_LABELS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

const CHIP_TONE = 'bg-pink-50 border-pink-100 text-pink-700 hover:bg-pink-100 hover:border-pink-200'

// Calendario dos treinamentos agendados (pela Data + horario de inicio de
// cada treinamento). Clicar num treinamento abre a edicao; o botao + de cada
// dia agenda um treinamento novo naquele dia. onInvite abre o envio da agenda.
export default function CalendarTab({ onChanged, onInvite }) {
  const [monthCursor, setMonthCursor] = useState(() => startOfMonth(new Date()))
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(trainingEmptyForm)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState(null)

  const gridStart = startOfWeek(startOfMonth(monthCursor), { weekStartsOn: 0 })
  const gridEnd = endOfWeek(endOfMonth(monthCursor), { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        startDate: format(gridStart, 'yyyy-MM-dd'),
        endDate: format(gridEnd, 'yyyy-MM-dd'),
      }
      const data = await loadAllPages(informationApi.getTrainings, params)
      setItems(data)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gridStart.getTime(), gridEnd.getTime()])

  useEffect(() => {
    load()
  }, [load])

  const itemsByDay = new Map()
  for (const item of items) {
    const key = toDateInput(item.date)
    if (!key) continue
    if (!itemsByDay.has(key)) itemsByDay.set(key, [])
    itemsByDay.get(key).push(item)
  }
  for (const dayItems of itemsByDay.values()) {
    dayItems.sort((a, b) => String(a.startTime || '99:99').localeCompare(String(b.startTime || '99:99')))
  }

  const openNew = (day) => {
    setEditing(null)
    setForm({ ...trainingEmptyForm(), date: format(day, 'yyyy-MM-dd') })
    setIsModalOpen(true)
    setSaveError(null)
    setUploadError(null)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm(trainingToForm(item))
    setIsModalOpen(true)
    setSaveError(null)
    setUploadError(null)
  }

  const closeModal = () => {
    setEditing(null)
    setIsModalOpen(false)
    setForm(trainingEmptyForm())
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
      const payload = trainingToPayload(form)
      if (editing?.id) await informationApi.updateTraining(editing.id, payload)
      else await informationApi.createTraining(payload)
      closeModal()
      await load()
      if (onChanged) await onChanged()
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao salvar. Verifique os campos e tente novamente.'
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Calendario</h2>
          <p className="text-sm text-slate-500 mt-1">Treinamentos agendados. Clique em um treinamento para editar ou no + do dia para agendar um novo.</p>
        </div>
        <button
          onClick={() => openNew(new Date())}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
        >
          <Plus size={14} />
          Novo Treinamento
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h3 className="text-base font-semibold text-slate-800 capitalize">
            {format(monthCursor, 'MMMM yyyy', { locale: ptBR })}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonthCursor((current) => subMonths(current, 1))}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setMonthCursor(startOfMonth(new Date()))}
              className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-pink-200 hover:text-pink-500"
            >
              Hoje
            </button>
            <button
              onClick={() => setMonthCursor((current) => addMonths(current, 1))}
              className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
            <Loader2 size={24} className="animate-spin text-slate-300" />
          </div>
        )}
        <div className="grid grid-cols-7 border-b border-slate-100">
          {WEEKDAY_LABELS.map((label) => (
            <div key={label} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {label}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayItems = itemsByDay.get(key) || []
            const inMonth = isSameMonth(day, monthCursor)
            const visible = dayItems.slice(0, 3)
            const overflow = dayItems.length - visible.length

            return (
              <div
                key={key}
                className={`min-h-[140px] border-b border-r border-slate-100 p-2 flex flex-col gap-1 group ${inMonth ? 'bg-white' : 'bg-slate-50/50'}`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday(day) ? 'bg-pink-400 text-white' : inMonth ? 'text-slate-600' : 'text-slate-300'
                    }`}
                  >
                    {format(day, 'd')}
                  </span>
                  <button
                    onClick={() => openNew(day)}
                    className="w-5 h-5 rounded-lg border border-slate-200 text-slate-400 opacity-0 group-hover:opacity-100 flex items-center justify-center hover:border-pink-200 hover:text-pink-500 transition-opacity"
                    title="Agendar treinamento neste dia"
                  >
                    <Plus size={11} />
                  </button>
                </div>
                <div className="space-y-1 overflow-hidden">
                  {visible.map((item) => (
                    <div key={item.id} className={`w-full text-[11px] leading-tight px-1.5 py-1 rounded-lg border ${CHIP_TONE}`}>
                      <button onClick={() => openEdit(item)} className="w-full text-left" title={item.modulesCovered || item.theme}>
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-semibold">
                            {item.startTime ? `${item.startTime}${item.endTime ? ` - ${item.endTime}` : ''}` : 'Sem horario'}
                          </span>
                          {item.department && <span className="truncate opacity-75">{item.department}</span>}
                        </div>
                        <div className="truncate">{item.theme || 'Treinamento'}</div>
                      </button>
                      {onInvite && (
                        <button
                          onClick={() => onInvite(item)}
                          className="mt-0.5 inline-flex items-center gap-1 text-[10px] opacity-75 hover:opacity-100"
                          title={item.inviteSentAt ? 'Reenviar agenda' : 'Enviar agenda'}
                        >
                          <CalendarDays size={10} />
                          {item.inviteSentAt ? 'Agenda enviada' : 'Enviar agenda'}
                        </button>
                      )}
                    </div>
                  ))}
                  {overflow > 0 && (
                    <p className="text-[10px] text-slate-400 px-1.5">+{overflow} mais</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {isModalOpen && (
        <EntityModal
          title={editing?.id ? 'Editar Treinamento' : 'Novo Treinamento'}
          fields={trainingFormFields.map((field) => field.type !== 'attachments' ? field : ({
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
          onChange={(key, value) => setForm((current) => trainingNormalizeFormChange({ ...current, [key]: value }, key))}
          onClose={closeModal}
          onSave={handleSave}
          saving={saving || uploading}
          saveError={saveError}
        />
      )}
    </div>
  )
}
