// Expediente alinhado à API (default MS/Campo Grande): 07:30–11:30 e 13:00–17:30

export const EXPEDIENTE_TZ = import.meta.env.VITE_WORK_TZ || 'America/Campo_Grande'

export const SHIFT_WINDOWS = [
  { start: 7 * 60 + 30, end: 11 * 60 + 30 },
  { start: 13 * 60, end: 17 * 60 + 30 },
]

/** Partes do relógio civil em São Paulo para um instante UTC (ms). */
export function getSpYmdHm(utcMs) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: EXPEDIENTE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs))
  const o = {}
  for (const p of parts) {
    if (p.type !== 'literal') o[p.type] = p.value
  }
  return {
    y: +o.year,
    mon: +o.month,
    d: +o.day,
    hour: +o.hour,
    minute: +o.minute,
    second: +o.second,
  }
}

function compareSpWall(a, b) {
  if (a.y !== b.y) return a.y - b.y
  if (a.mon !== b.mon) return a.mon - b.mon
  if (a.d !== b.d) return a.d - b.d
  if (a.hour !== b.hour) return a.hour - b.hour
  if (a.minute !== b.minute) return a.minute - b.minute
  return (a.second || 0) - (b.second || 0)
}

/**
 * Converte um horário civil em São Paulo para instante UTC (ms).
 */
export function spLocalToUtc(y, mon, d, hour, minute, second = 0) {
  const target = { y, mon, d, hour, minute, second }
  let lo = Date.UTC(y, mon - 1, d) - 48 * 3600000
  let hi = Date.UTC(y, mon - 1, d) + 48 * 3600000
  for (let i = 0; i < 48; i++) {
    const mid = Math.floor((lo + hi) / 2)
    const c = compareSpWall(getSpYmdHm(mid), target)
    if (c === 0) return mid
    if (c < 0) lo = mid + 1
    else hi = mid - 1
  }
  return Math.floor((lo + hi) / 2)
}

/** Próximo início de dia civil (00:00) em SP, estritamente após o dia que contém utcMs. */
export function nextSpMidnightUtc(utcMs) {
  const { y, mon, d } = getSpYmdHm(utcMs)
  const dayStart = spLocalToUtc(y, mon, d, 0, 0, 0)
  let t = dayStart + 25 * 3600000
  const p = getSpYmdHm(t)
  return spLocalToUtc(p.y, p.mon, p.d, 0, 0, 0)
}

export function spMinuteOfDay(utcMs) {
  const p = getSpYmdHm(utcMs)
  return p.hour * 60 + p.minute
}

/** 0 = domingo … 6 = sábado (em São Paulo). */
export function spWeekdaySun0(utcMs) {
  const w = new Intl.DateTimeFormat('en-US', {
    timeZone: EXPEDIENTE_TZ,
    weekday: 'short',
  }).format(new Date(utcMs))
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(w)
}

/**
 * Segundos úteis entre dois instantes UTC, contando apenas interseção com janelas
 * de expediente em dias úteis (seg–sex) no fuso de São Paulo (igual ao backend Go).
 */
export function workingSeconds(startMs, endMs) {
  if (endMs <= startMs) return 0
  let total = 0
  let cursor = startMs
  let guard = 0
  while (cursor < endMs && guard++ < 4000) {
    const { y, mon, d } = getSpYmdHm(cursor)
    const wd = spWeekdaySun0(cursor)
    if (wd !== 0 && wd !== 6) {
      for (const w of SHIFT_WINDOWS) {
        const h1 = Math.floor(w.start / 60)
        const m1 = w.start % 60
        const h2 = Math.floor(w.end / 60)
        const m2 = w.end % 60
        const ws = spLocalToUtc(y, mon, d, h1, m1, 0)
        const we = spLocalToUtc(y, mon, d, h2, m2, 0)
        const oStart = Math.max(ws, startMs)
        const oEnd = Math.min(we, endMs)
        if (oEnd > oStart) total += (oEnd - oStart) / 1000
      }
    }
    const next = nextSpMidnightUtc(cursor)
    if (next <= cursor) break
    cursor = next
  }
  return Math.floor(total)
}

/** Agora está dentro de alguma janela de expediente (em São Paulo)? */
export function isWorkingNow(nowMs) {
  const wd = spWeekdaySun0(nowMs)
  if (wd === 0 || wd === 6) return false
  const min = spMinuteOfDay(nowMs)
  return SHIFT_WINDOWS.some(w => min >= w.start && min < w.end)
}

export function parseProcessDate(d) {
  if (!d) return null
  if (d && typeof d === 'object' && d.Time) return new Date(d.Time)
  return new Date(d)
}

/** Data/hora em pt-BR no fuso de expediente (São Paulo), alinhado à operação da fábrica. */
export function formatDateTimePtBrSP(isoOrDate) {
  if (!isoOrDate) return '—'
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: EXPEDIENTE_TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Só dia/mês/hora (sem ano longo) em São Paulo — útil em tabelas compactas. */
export function formatShortDateTimePtBrSP(isoOrDate) {
  if (!isoOrDate) return '—'
  const d = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate)
  if (Number.isNaN(d.getTime()) || d.getFullYear() < 2000) return '—'
  return d.toLocaleString('pt-BR', {
    timeZone: EXPEDIENTE_TZ,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** Ocorrência do operador (não pausa automática do sistema). */
export function operatorOccurrenceFromProc(proc) {
  if (!proc) return false
  if (Object.prototype.hasOwnProperty.call(proc, 'inOperatorOccurrence')) {
    return proc.inOperatorOccurrence === true
  }
  return !!proc.inOccurrence
}

/**
 * Segundos úteis a exibir na TV na coluna "Tempo de Processo".
 * Em ocorrência do operador: igual ao cronômetro de ocorrência (útil desde occurrenceStartDate).
 * Em pausa automática: congela no momento da pausa.
 * Em andamento: útil desde início menos totalOccurrenceSeconds já contabilizado.
 */
export function tvProcessDisplaySeconds(proc, nowMs) {
  if (!proc?.startDate) return null
  const start = parseProcessDate(proc.startDate)
  if (!start || start.getFullYear() < 2000) return null

  const paused = !!proc.inOccurrence
  const opOcc = operatorOccurrenceFromProc(proc)
  const occStart = proc.occurrenceStartDate ? parseProcessDate(proc.occurrenceStartDate) : null
  const occOk = occStart && occStart.getFullYear() >= 2000

  if (paused && opOcc && occOk) {
    return workingSeconds(occStart.getTime(), nowMs)
  }
  if (paused) {
    const freezeAt = occOk ? occStart.getTime() : nowMs
    return Math.max(
      0,
      workingSeconds(start.getTime(), freezeAt) - (proc.totalOccurrenceSeconds || 0),
    )
  }
  return Math.max(
    0,
    workingSeconds(start.getTime(), nowMs) - (proc.totalOccurrenceSeconds || 0),
  )
}
