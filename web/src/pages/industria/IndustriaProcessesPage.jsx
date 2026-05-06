import { useEffect, useState, useCallback } from 'react'
import { api } from '../../services/api'
import {
  Plus, RefreshCw, Search, ChevronLeft, ChevronRight,
  StopCircle, Clock, Cog, X, Loader2, Activity,
  CheckCircle, PauseCircle, PlayCircle, Pencil,
} from 'lucide-react'
import {
  workingSeconds,
  isWorkingNow,
  parseProcessDate as parseDate,
  operatorOccurrenceFromProc,
  formatDateTimePtBrSP,
  getSpYmdHm,
  spLocalToUtc,
} from '../../utils/industriaWorkTime'
import { isIndustriaOperatorUser } from '../../utils/industriaUsers'

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtSecs(s) {
  if (s < 0) s = 0
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`
}

function fmtDateTime(d) {
  const dt = parseDate(d)
  if (!dt || dt.getFullYear() < 2000) return '—'
  return formatDateTimePtBrSP(dt)
}

// datetime-local do ajuste usa relógio de São Paulo, independente do fuso do dispositivo.
function toSpInput(d = new Date()) {
  const p = getSpYmdHm(d.getTime())
  const yy = String(p.y).padStart(4, '0')
  const mm = String(p.mon).padStart(2, '0')
  const dd = String(p.d).padStart(2, '0')
  const hh = String(p.hour).padStart(2, '0')
  const mi = String(p.minute).padStart(2, '0')
  return `${yy}-${mm}-${dd}T${hh}:${mi}`
}

function spInputToIso(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || '').trim())
  if (!m) return null
  const y = Number(m[1])
  const mon = Number(m[2])
  const d = Number(m[3])
  const h = Number(m[4])
  const min = Number(m[5])
  const utcMs = spLocalToUtc(y, mon, d, h, min, 0)
  const dt = new Date(utcMs)
  return Number.isNaN(dt.getTime()) ? null : dt.toISOString()
}

function processKind(p) {
  if (p.preIndustrialization) return { label: 'Pré-Ind.',   cls: 'bg-purple-100 text-purple-700' }
  if (p.reWork)               return { label: 'Retrabalho', cls: 'bg-yellow-100 text-yellow-700' }
  if (p.prototype)            return { label: 'Protótipo',  cls: 'bg-pink-100 text-pink-700'     }
  return                             { label: 'Produção',   cls: 'bg-blue-100 text-blue-700'     }
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateModal({ onClose, onCreated }) {
  const [users,    setUsers]    = useState([])
  const [machines, setMachines] = useState([])
  const [ptypes,   setPtypes]   = useState([])
  const [busy,     setBusy]     = useState(true)

  const [form, setForm] = useState({
    userId: '', machineId: '', processTypeId: '',
    startDate: toSpInput(),
    preIndustrialization: false, reWork: false, prototype: false,
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const [uq,     setUq]     = useState('')

  useEffect(() => {
    Promise.all([
      api.searchUsersPaginated({ pageSize: 200 }),
      api.getMachines(),
      api.getProcessTypes(),
    ]).then(([u, m, pt]) => {
      const allUsers = u.data?.items || u.data || []
      setUsers(allUsers.filter(isIndustriaOperatorUser))
      setMachines(m.data || [])
      setPtypes(pt.data || [])
    }).catch(() => {}).finally(() => setBusy(false))
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredUsers = users.filter(u => {
    const q = uq.toLowerCase()
    return !q
      || u.name?.toLowerCase().includes(q)
      || u.identificationNumber?.toLowerCase().includes(q)
  })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.userId || !form.processTypeId) {
      setError('Operador e tipo de processo são obrigatórios')
      return
    }
    setSaving(true)
    try {
      const u  = users.find(u => u.id === form.userId)
      const m  = machines.find(m => m.id === form.machineId)
      const pt = ptypes.find(t => (t.id || t._id) === form.processTypeId)

      await api.createProcess({
        user:        u  ? { id: u.id,          name: u.name }                                           : null,
        machine:     m  ? { id: m.id,          name: m.identificationNumber || m.customerName || m.id } : null,
        processType: pt ? { id: pt.id || pt._id, name: pt.name }                                        : null,
        startDate:   new Date(form.startDate).toISOString(),
        preIndustrialization: form.preIndustrialization,
        reWork:      form.reWork,
        prototype:   form.prototype,
        finished:    false,
        occurrences: [],
      })
      onCreated()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar processo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold">Novo Processo</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>

        {busy ? (
          <div className="flex justify-center py-12"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
        ) : (
          <form onSubmit={submit} className="overflow-y-auto flex-1 p-6 space-y-4">
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
            )}

            {/* Operador */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Operador *</label>
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm mb-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 placeholder-slate-300"
                placeholder="Buscar por nome ou matrícula…"
                value={uq}
                onChange={e => setUq(e.target.value)}
              />
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.userId}
                onChange={e => set('userId', e.target.value)}
                required
                size={5}
              >
                <option value="">— selecione —</option>
                {filteredUsers.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name}{u.identificationNumber ? ` #${u.identificationNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Máquina */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Máquina</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.machineId}
                onChange={e => set('machineId', e.target.value)}
              >
                <option value="">Sem máquina</option>
                {machines.map(m => {
                  const label = m.identificationNumber || m.customerName || m.id?.slice(-6)
                  const sub   = m.identificationNumber && m.customerName ? ` — ${m.customerName}` : ''
                  return (
                    <option key={m.id} value={m.id}>{label}{sub}</option>
                  )
                })}
              </select>
            </div>

            {/* Tipo */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de processo *</label>
              <select
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.processTypeId}
                onChange={e => set('processTypeId', e.target.value)}
                required
              >
                <option value="">— selecione —</option>
                {ptypes.map(t => (
                  <option key={t.id || t._id} value={t.id || t._id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Início */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Horário de início</label>
              <input
                type="datetime-local"
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                value={form.startDate}
                onChange={e => set('startDate', e.target.value)}
              />
            </div>

            {/* Flags */}
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-2">Modalidade</label>
              <div className="flex flex-wrap gap-4">
                {[
                  { k: 'preIndustrialization', label: 'Pré-industrialização' },
                  { k: 'reWork',               label: 'Retrabalho'           },
                  { k: 'prototype',            label: 'Protótipo'            },
                ].map(({ k, label }) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={form[k]}
                      onChange={e => set(k, e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500/20"
                    />
                    <span className="text-sm text-slate-600">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-all">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all">
                {saving ? 'Iniciando…' : 'Iniciar processo'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── End-process confirm ───────────────────────────────────────────────────────

function EndModal({ proc, onClose, onEnded }) {
  const [saving, setSaving] = useState(false)

  const confirm = async () => {
    setSaving(true)
    try {
      await api.endProcess(proc.id)
      onEnded()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao encerrar')
    } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <StopCircle size={20} className="text-red-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Encerrar processo</p>
            <p className="text-xs text-slate-400 mt-0.5">#{proc.identificationNumber} · {proc.user?.name}</p>
          </div>
        </div>
        <p className="text-sm text-slate-600 mb-5">
          O tempo total será calculado e salvo. Esta ação não pode ser desfeita.
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-all">
            Cancelar
          </button>
          <button onClick={confirm} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-all">
            {saving ? 'Encerrando…' : 'Confirmar encerramento'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditHistoryTimeModal({ proc, onClose, onSaved }) {
  const startInit = parseDate(proc?.startDate)
  const endInit = parseDate(proc?.endDate)
  const [startDate, setStartDate] = useState(
    toSpInput(startInit && !Number.isNaN(startInit.getTime()) ? startInit : new Date()),
  )
  const [endDate, setEndDate] = useState(
    toSpInput(endInit && !Number.isNaN(endInit.getTime()) ? endInit : (startInit && !Number.isNaN(startInit.getTime()) ? startInit : new Date())),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!startDate || !endDate) {
      setError('Informe início e fim')
      return
    }
    const sIso = spInputToIso(startDate)
    const eIso = spInputToIso(endDate)
    if (!sIso || !eIso) {
      setError('Datas inválidas — verifique início e fim')
      return
    }
    const s = new Date(sIso)
    const eDate = new Date(eIso)
    if (!(eDate > s)) {
      setError('Fim deve ser maior que início')
      return
    }
    setSaving(true)
    try {
      const payload = {
        startDate: sIso,
        endDate: eIso,
      }
      await api.updateProcessHistoryTime(proc.id, payload)
      onSaved()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao atualizar histórico')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-slate-800 text-sm">Editar histórico</p>
            <p className="text-xs text-slate-400 mt-0.5">#{proc.identificationNumber} · {proc.user?.name || '—'}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Início</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fim</label>
            <input
              type="datetime-local"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all">
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Pause modal ───────────────────────────────────────────────────────────────

function PauseModal({ proc, onClose, onPaused }) {
  const [occurrenceTypes, setOccurrenceTypes] = useState([])
  const [form, setForm] = useState({ occurrenceTypeId: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const selectedType = occurrenceTypes.find((t) => t.id === form.occurrenceTypeId)
  const isOutroType = String(selectedType?.name || '').trim().toLowerCase() === 'outro'

  useEffect(() => {
    api.getOccurrenceTypes().then(r => setOccurrenceTypes(r.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const confirm = async () => {
    setError('')
    if (!form.occurrenceTypeId) {
      setError('Tipo de ocorrência é obrigatório')
      return
    }
    if (isOutroType && !String(form.description || '').trim()) {
      setError('Informe o motivo quando o tipo for "Outro"')
      return
    }
    setSaving(true)
    try {
      await api.pauseProcess(proc.id, form)
      onPaused()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao pausar processo')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl border border-slate-100 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <PauseCircle size={20} className="text-orange-500" />
          </div>
          <div>
            <p className="font-semibold text-slate-800 text-sm">Pausar processo</p>
            <p className="text-xs text-slate-400 mt-0.5">#{proc.identificationNumber} · {proc.user?.name}</p>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-3">{error}</p>
        )}

        <div className="space-y-3 mb-5">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Motivo da ocorrência *</label>
            <select
              value={form.occurrenceTypeId}
              onChange={e => set('occurrenceTypeId', e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
              required
            >
              <option value="">Selecione o motivo...</option>
              {occurrenceTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {isOutroType ? 'Motivo *' : 'Descrição (opcional)'}
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              placeholder={isOutroType ? 'Descreva o motivo para cadastro futuro desse tipo...' : 'Descreva brevemente a ocorrência...'}
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 resize-none"
              required={isOutroType}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-600 hover:border-slate-300 transition-all">
            Cancelar
          </button>
          <button onClick={confirm} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all">
            {saving ? 'Pausando…' : 'Pausar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Active process card ───────────────────────────────────────────────────────

function ActiveCard({ proc, now, onEnd, onPause, onResume }) {
  const start    = parseDate(proc.startDate)
  const occStart = parseDate(proc.occurrenceStartDate)
  const paused   = !!proc.inOccurrence
  const opOcc    = operatorOccurrenceFromProc(proc)
  const offShift = !paused && !isWorkingNow(now)

  // When paused: freeze process timer at the moment the occurrence started.
  // When running: count working seconds since process start minus accumulated occurrence seconds.
  const processElapsed = start
    ? Math.max(0, workingSeconds(start.getTime(), paused && occStart ? occStart.getTime() : now) - (proc.totalOccurrenceSeconds || 0))
    : 0

  // Occurrence timer only ticks during working hours (só para ocorrência do operador)
  const occElapsed = opOcc && occStart
    ? workingSeconds(occStart.getTime(), now)
    : 0

  const kind = processKind(proc)
  const statusBadge = opOcc
    ? { label: 'Ocorrência', cls: 'bg-orange-100 text-orange-700' }
    : paused
      ? { label: 'Pausa automática', cls: 'bg-slate-100 text-slate-600' }
      : offShift
        ? { label: 'Fora expediente', cls: 'bg-slate-100 text-slate-500' }
        : { label: kind.label, cls: kind.cls }

  const cardBorder = opOcc
    ? 'border-orange-200 bg-orange-50/20'
    : paused || offShift
      ? 'border-slate-200 bg-slate-50/40'
      : 'border-slate-100'

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 transition-all ${cardBorder}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{proc.user?.name || '—'}</p>
          {proc.machine?.name && (
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 truncate">
              <Cog size={10} className="flex-shrink-0" /> {proc.machine.name}
            </p>
          )}
        </div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadge.cls}`}>
          {statusBadge.label}
        </span>
      </div>

      {/* Timers */}
      <div className="my-3 space-y-1">
        {/* Process timer — frozen while in occurrence */}
        <div className="flex items-center gap-2">
          <Clock size={14} className={offShift ? 'text-slate-300' : 'text-blue-500'} />
          <span className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${
            offShift ? 'text-slate-400' : 'text-blue-600'
          }`}>
            {fmtSecs(processElapsed)}
          </span>
          {offShift && <span className="text-[10px] text-slate-400">pausado</span>}
        </div>
        {/* Contador secundário — só ocorrência do operador */}
        {opOcc && (
          <div className="flex items-center gap-2">
            <PauseCircle size={12} className="text-orange-400" />
            <span className="font-mono text-sm font-semibold tabular-nums text-orange-500">
              {fmtSecs(occElapsed)}
            </span>
            <span className="text-[10px] text-orange-400">ocorrência</span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-50 gap-2">
        <div className="text-[11px] text-slate-400 truncate min-w-0">
          <span className="font-mono">#{proc.identificationNumber}</span>
          {proc.processType?.name && <span> · {proc.processType.name}</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {paused ? (
            <button
              onClick={() => onResume(proc)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-green-700 bg-green-50 hover:bg-green-100 transition-colors"
            >
              <PlayCircle size={12} /> Retomar
            </button>
          ) : (
            <button
              onClick={() => onPause(proc)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 transition-colors"
            >
              <PauseCircle size={12} /> Pausar
            </button>
          )}
          <button
            onClick={() => onEnd(proc)}
            disabled={paused}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <StopCircle size={12} /> Encerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IndustriaProcessesPage() {
  // ── active state
  const [active,        setActive]        = useState([])
  const [loadingActive, setLoadingActive] = useState(true)

  // ── history state
  const [history,        setHistory]        = useState({ items: [], total: 0, totalPages: 1 })
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [page,           setPage]           = useState(1)
  const [q,              setQ]              = useState('')
  const [filterFinished, setFilterFinished] = useState('true')

  // ── modals
  const [showCreate,  setShowCreate]  = useState(false)
  const [endTarget,   setEndTarget]   = useState(null)
  const [pauseTarget, setPauseTarget] = useState(null)
  const [editTarget,  setEditTarget]  = useState(null)

  // ── 1-second client tick drives all live timers (no extra API calls)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  // ── load active processes
  const loadActive = useCallback(async () => {
    setLoadingActive(true)
    try {
      const [r, u] = await Promise.all([
        api.getProcesses({ finished: false }),
        api.searchUsersPaginated({ page: 1, pageSize: 2000 }),
      ])
      const operatorIds = new Set((u.data?.items || u.data || []).filter(isIndustriaOperatorUser).map(x => x.id))
      setActive((r.data || []).filter(p => p.user?.id && operatorIds.has(p.user.id)))
    } catch { setActive([]) }
    finally { setLoadingActive(false) }
  }, [])

  // ── load history (completed, paginated)
  const loadHistory = useCallback(async () => {
    setLoadingHistory(true)
    try {
      const params = { page, pageSize: 15 }
      if (filterFinished !== '') params.finished = filterFinished
      if (q.trim())               params.identificationNumber = q.trim()
      const [r, u] = await Promise.all([
        api.searchProcesses(params),
        api.searchUsersPaginated({ page: 1, pageSize: 2000 }),
      ])
      const operatorIds = new Set((u.data?.items || u.data || []).filter(isIndustriaOperatorUser).map(x => x.id))
      const ok = item => item.user?.id && operatorIds.has(item.user.id)
      setHistory({ ...r.data, items: (r.data.items || []).filter(ok) })
    } catch { setHistory({ items: [], total: 0, totalPages: 1 }) }
    finally { setLoadingHistory(false) }
  }, [page, q, filterFinished])

  useEffect(() => { loadActive() }, [loadActive])
  useEffect(() => { loadHistory() }, [loadHistory])

  // Auto-refresh active every 30 s (history only reloads on user action)
  useEffect(() => {
    const t = setInterval(loadActive, 30000)
    return () => clearInterval(t)
  }, [loadActive])

  const handleCreated = () => { setShowCreate(false); loadActive() }
  const handleEnded   = () => { setEndTarget(null); loadActive(); loadHistory() }
  const handlePaused  = () => { setPauseTarget(null); loadActive() }

  const handleResume  = async (proc) => {
    try {
      await api.resumeProcess(proc.id)
      loadActive()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao retomar processo')
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Processos</h1>
          <p className="text-sm text-slate-400">
            {active.length} em andamento · {history.total} finalizados
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Novo processo
        </button>
      </div>

      {/* ── Active processes ── */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          <h2 className="text-sm font-semibold text-slate-700">Em andamento</h2>
          <button
            onClick={loadActive}
            className="ml-auto text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <RefreshCw size={13} className={loadingActive ? 'animate-spin' : ''} />
          </button>
        </div>

        {loadingActive ? (
          <div className="flex justify-center py-8">
            <Loader2 size={20} className="animate-spin text-slate-300" />
          </div>
        ) : active.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-10 text-center">
            <CheckCircle size={24} className="text-green-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum processo ativo no momento</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {active.map(proc => (
              <ActiveCard
                key={proc.id}
                proc={proc}
                now={now}
                onEnd={setEndTarget}
                onPause={setPauseTarget}
                onResume={handleResume}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── History ── */}
      <section>
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-700">Histórico</h2>

          <div className="flex-1 relative min-w-48">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={e => { setQ(e.target.value); setPage(1) }}
              placeholder="Buscar por OS#…"
              className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <select
            value={filterFinished}
            onChange={e => { setFilterFinished(e.target.value); setPage(1) }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="">Todos</option>
            <option value="false">Em andamento</option>
            <option value="true">Finalizados</option>
          </select>

          <button
            onClick={loadHistory}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={13} className={loadingHistory ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-300" />
            </div>
          ) : (history.items || []).length === 0 ? (
            <div className="py-12 text-center">
              <Activity size={24} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum processo encontrado</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  {['OS#', 'Operador', 'Máquina', 'Tipo', 'Tempo', 'Ocioso', 'Início', 'Status'].map(h => (
                    <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(history.items || []).map(p => {
                  const kind = processKind(p)
                  const opRow = operatorOccurrenceFromProc(p)
                  const pausedRow = !p.finished && !!p.inOccurrence
                  const statusLabel = p.finished
                    ? 'Finalizado'
                    : opRow
                      ? 'Ocorrência'
                      : pausedRow
                        ? 'Pausa automática'
                        : 'Em andamento'
                  const statusCls = p.finished
                    ? 'bg-green-100 text-green-700'
                    : opRow
                      ? 'bg-orange-100 text-orange-700'
                      : pausedRow
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-100 text-blue-700'
                  return (
                    <tr key={p.id} className={`border-b border-slate-50 hover:bg-slate-50/50 ${opRow ? 'bg-orange-50/30' : ''}`}>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">#{p.identificationNumber}</td>
                      <td className="py-3 px-4 text-sm text-slate-800">{p.user?.name || '—'}</td>
                      <td className="py-3 px-4 text-sm text-slate-600">{p.machine?.name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${kind.cls}`}>
                          {kind.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-600">{p.processTime || '—'}</td>
                      <td className="py-3 px-4 text-xs font-mono text-slate-500">{fmtSecs(p.totalOccurrenceSeconds || 0)}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{fmtDateTime(p.startDate)}</td>
                      <td className="py-3 px-4">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusCls}`}>
                          {statusLabel}
                        </span>
                        {p.finished && (
                          <button
                            onClick={() => setEditTarget(p)}
                            title="Editar início/fim"
                            className="ml-2 inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            <Pencil size={11} /> Ajustar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {history.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none">
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm text-slate-500">{page} / {history.totalPages}</span>
            <button onClick={() => setPage(p => Math.min(history.totalPages, p + 1))} disabled={page === history.totalPages}
              className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-blue-400 disabled:opacity-30 disabled:pointer-events-none">
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </section>

      {/* ── Modals ── */}
      {showCreate   && <CreateModal onClose={() => setShowCreate(false)}   onCreated={handleCreated} />}
      {endTarget    && <EndModal    proc={endTarget}   onClose={() => setEndTarget(null)}   onEnded={handleEnded} />}
      {pauseTarget  && <PauseModal  proc={pauseTarget} onClose={() => setPauseTarget(null)} onPaused={handlePaused} />}
      {editTarget   && <EditHistoryTimeModal proc={editTarget} onClose={() => setEditTarget(null)} onSaved={() => { setEditTarget(null); loadHistory() }} />}
    </div>
  )
}
