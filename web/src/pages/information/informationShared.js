export const BASE_URL = import.meta.env.VITE_API_URL || ''

export function resolveAssetUrl(url) {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  return `${BASE_URL}${url}`
}

export const DEMAND_CATEGORIES = ['Sistema', 'ERP Albatroz', 'CRM', 'Dashboard', 'Processo', 'Automacao', 'Treinamento', 'Documentacao', 'Relatorio', 'Outros']
export const DEMAND_PRIORITIES = ['Baixa', 'Media', 'Alta', 'Urgente']
export const DEMAND_STATUSES = ['Aberto', 'Em andamento', 'Aguardando aprovacao', 'Concluido', 'Cancelado']
export const DEMAND_APPROVALS = ['Sim', 'Nao', 'Aguardando']
export const INFORMATION_DEPARTMENTS = [
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

export function toDateInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export function toDateTimeInput(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${toDateInput(value)}T${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

export function toIsoDate(value) {
  if (!value) return null
  return `${value}T00:00:00Z`
}

export function toIsoDateTime(value) {
  if (!value) return null
  return `${value.length === 16 ? `${value}:00` : value}Z`
}

export function nowDateTimeInput() {
  return toDateTimeInput(new Date().toISOString())
}

export function todayDateInput() {
  return toDateInput(new Date().toISOString())
}

export function formatDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${String(date.getUTCDate()).padStart(2, '0')}/${String(date.getUTCMonth() + 1).padStart(2, '0')}/${date.getUTCFullYear()}`
}

export function formatDateTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${formatDate(value)} ${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

export function formatTime(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

export function formatNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value || 0))
}

export function formatHours(value) {
  const totalMinutes = Math.round(Number(value || 0) * 60)
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '0 min'

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes} min`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}min`
}

export function formatPercent(numerator, denominator) {
  const total = Number(denominator || 0)
  if (!Number.isFinite(total) || total <= 0) return '-'
  const ratio = (Number(numerator || 0) / total) * 100
  return `${ratio.toFixed(0)}%`
}

export function formatDays(value) {
  const days = Number(value || 0)
  if (!Number.isFinite(days) || days <= 0) return '-'
  return `${days.toFixed(1)} dias`
}

export function formatMonthLabel(monthKey) {
  const [year, month] = String(monthKey || '').split('-')
  if (!year || !month) return monthKey || '-'
  const date = new Date(Number(year), Number(month) - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  return `${label.charAt(0).toUpperCase()}${label.slice(1)}/${year.slice(2)}`
}

export function calculateHoursBetween(startValue, endValue) {
  if (!startValue || !endValue) return 0
  const start = new Date(toIsoDateTime(startValue))
  const end = new Date(toIsoDateTime(endValue))
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) return 0
  return Number(((end.getTime() - start.getTime()) / (1000 * 60 * 60)).toFixed(2))
}

export async function loadAllPages(fetcher, params = {}, pageSize = 200) {
  const first = await fetcher({ ...params, page: 1, pageSize })
  const firstItems = first.data?.items || []
  const totalPages = first.data?.totalPages || 1

  if (totalPages <= 1) return firstItems

  const responses = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) => fetcher({ ...params, page: index + 2, pageSize })),
  )

  return firstItems.concat(responses.flatMap((response) => response.data?.items || []))
}

export const demandFormFields = [
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
]

export function demandEmptyForm() {
  return {
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
  }
}

export function demandToForm(item) {
  return {
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
  }
}

export function demandToPayload(form) {
  return {
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
  }
}

export function demandNormalizeFormChange(next, key) {
  if (key === 'createdDate' || key === 'completedDate') {
    return { ...next, hoursSpent: calculateHoursBetween(next.createdDate, next.completedDate) }
  }
  return next
}

// Treinamentos: formulario compartilhado pela aba Treinamentos e pelo Calendario.
function splitTrainingParticipants(value) {
  return String(value || '')
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function countTrainingParticipants(value) {
  return splitTrainingParticipants(value).length
}

export const trainingFormFields = [
  { key: 'date', label: 'Data', type: 'date' },
  { key: 'department', label: 'Departamento', type: 'select', options: INFORMATION_DEPARTMENTS },
  { key: 'startTime', label: 'Horario de inicio', type: 'time' },
  { key: 'endTime', label: 'Horario de termino', type: 'time' },
  { key: 'theme', label: 'Tema', type: 'text', fullWidth: true },
  {
    key: 'modulesCovered',
    label: 'Modulos Abordados',
    type: 'textarea',
    fullWidth: true,
    rows: 4,
    placeholder: 'Um modulo por linha. Ex.: Cadastro de Clientes, Debito a Prazo, Cadastro de Estoque...',
  },
  {
    key: 'questionsCovered',
    label: 'Duvidas Repassadas nos Treinamentos',
    type: 'textarea',
    fullWidth: true,
    rows: 4,
    placeholder: 'Uma duvida/topico por linha. Ex.: Formacao de Carga, Expedicao de Carga...',
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
]

export function trainingEmptyForm() {
  return { date: todayDateInput(), department: '', startTime: '', endTime: '', theme: '', modulesCovered: '', questionsCovered: '', participantNames: '', trainedCount: 0, attachments: [], hours: '' }
}

export function trainingToForm(item) {
  return {
    date: toDateInput(item.date),
    department: item.department || '',
    startTime: item.startTime || '',
    endTime: item.endTime || '',
    theme: item.theme || '',
    modulesCovered: item.modulesCovered || '',
    questionsCovered: item.questionsCovered || '',
    participantNames: item.participantNames || '',
    trainedCount: item.trainedCount ?? 0,
    attachments: item.attachments || [],
    hours: item.hours ?? '',
  }
}

export function trainingToPayload(form) {
  return {
    date: toIsoDate(form.date),
    department: form.department,
    startTime: form.startTime || '',
    endTime: form.endTime || '',
    theme: form.theme,
    modulesCovered: form.modulesCovered,
    questionsCovered: form.questionsCovered,
    participantNames: form.participantNames,
    trainedCount: countTrainingParticipants(form.participantNames),
    attachments: form.attachments || [],
    hours: Number(form.hours || 0),
  }
}

export function trainingNormalizeFormChange(next, key) {
  if (key === 'participantNames') {
    return { ...next, trainedCount: countTrainingParticipants(next.participantNames) }
  }
  // Com inicio e fim preenchidos, Horas = duracao (a API recalcula igual).
  if ((key === 'startTime' || key === 'endTime') && next.startTime && next.endTime) {
    const toMinutes = (value) => {
      const [hours, minutes] = value.split(':').map(Number)
      return hours * 60 + minutes
    }
    const duration = toMinutes(next.endTime) - toMinutes(next.startTime)
    if (duration > 0) return { ...next, hours: Math.round((duration / 60) * 100) / 100 }
  }
  return next
}
