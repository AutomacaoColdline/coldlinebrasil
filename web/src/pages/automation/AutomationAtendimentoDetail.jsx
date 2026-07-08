import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { atendimentoApi } from '../../services/atendimentoApi'
import { useAuth } from '../../context/AuthContext'
import {
  ArrowLeft, RefreshCw, ChevronDown, Building2, User, Wrench, Tag, MapPin,
  Phone, Mail, FileText, List, Activity, Image as ImageIcon, FolderArchive,
  ClipboardCheck, Clock, History, Upload, Trash2, X, Plus, Edit3, Save,
  Camera, File as FileIcon, CheckCircle, XCircle, AlertTriangle, BookOpen,
  PenTool, Play, Square, ChevronRight, Hash, Calendar, BarChart3, Search,
} from 'lucide-react'

const STATUS = {
  ABERTO:             { label: 'Aberto',             color: 'bg-blue-500/15 text-blue-700 border-blue-200' },
  EM_ANDAMENTO:       { label: 'Em andamento',       color: 'bg-yellow-500/15 text-yellow-700 border-yellow-200' },
  AGUARDANDO_CLIENTE: { label: 'Aguardando cliente', color: 'bg-purple-500/15 text-purple-700 border-purple-200' },
  AGUARDANDO_PECA:    { label: 'Aguardando peça',    color: 'bg-orange-500/15 text-orange-700 border-orange-200' },
  RESOLVIDO:          { label: 'Resolvido',          color: 'bg-emerald-500/15 text-emerald-700 border-emerald-200' },
  ENCERRADO:          { label: 'Encerrado',          color: 'bg-slate-500/15 text-slate-700 border-slate-200' },
}

const PRIORITY = {
  BAIXA:   { label: 'Baixa',   color: 'bg-slate-500/15 text-slate-700 border-slate-200' },
  MEDIA:   { label: 'Média',   color: 'bg-cyan-500/15 text-cyan-700 border-cyan-200' },
  ALTA:    { label: 'Alta',    color: 'bg-amber-500/15 text-amber-700 border-amber-200' },
  CRITICA: { label: 'Crítica', color: 'bg-red-500/15 text-red-700 border-red-200' },
}

const EQUIP_TYPE_LABEL = {
  CLP: 'CLP',
  CONTROLADOR: 'Controlador',
  IHM: 'IHM',
  GATEWAY: 'Gateway',
  SISTEMA_SUPERVISORIO: 'Sistema Supervisório',
  OUTRO: 'Outro',
}

const BASE_URL = import.meta.env.VITE_API_URL || ''

function StatusBadge({ status, size = 'sm' }) {
  const s = STATUS[status] || { label: status, color: 'bg-slate-100 text-slate-600 border-slate-200' }
  const sz = size === 'md' ? 'text-xs px-2.5 py-1' : 'text-[10px] px-2 py-0.5'
  return (
    <span className={`font-semibold rounded-full border whitespace-nowrap ${sz} ${s.color}`}>
      {s.label}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] || { label: priority, color: 'bg-slate-100 text-slate-600 border-slate-200' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${p.color}`}>
      {p.label}
    </span>
  )
}

function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

function fmtMinutes(m) {
  if (!m) return '0 min'
  const h = Math.floor(m / 60)
  const min = m % 60
  if (h > 0) return `${h}h ${min}min`
  return `${min}min`
}

function Field({ label, value, mono, copy }) {
  const [copied, setCopied] = useState(false)
  const doCopy = () => {
    if (!value || !copy) return
    navigator.clipboard?.writeText(String(value))
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="flex gap-3 py-1.5">
      <span className="text-slate-400 text-xs w-32 flex-shrink-0">{label}</span>
      <span
        onClick={doCopy}
        className={`text-slate-700 text-sm flex-1 break-words ${mono ? 'font-mono text-cyan-700' : ''} ${copy ? 'cursor-pointer hover:bg-slate-50 rounded px-1 -mx-1' : ''}`}
      >
        {value || '—'}
        {copy && value && <span className="ml-1.5 text-[10px] text-slate-400">{copied ? '✓ copiado' : 'clique p/ copiar'}</span>}
      </span>
    </div>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function InfoTab({ a, onRefresh, canManage, isAssignee }) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    priority: a.priority,
    status: a.status,
    problemDescription: a.problemDescription,
    equipment: a.equipment,
    equipmentType: a.equipmentType,
    installationLocation: a.installationLocation,
    serialNumber: a.serialNumber,
  })
  const [statusMenu, setStatusMenu] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusNote, setStatusNote] = useState('')

  useEffect(() => {
    setForm({
      priority: a.priority,
      status: a.status,
      problemDescription: a.problemDescription,
      equipment: a.equipment,
      equipmentType: a.equipmentType,
      installationLocation: a.installationLocation,
      serialNumber: a.serialNumber,
    })
  }, [a.id, a.priority, a.status, a.problemDescription, a.equipment, a.equipmentType, a.installationLocation, a.serialNumber])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const saveAll = async () => {
    setSaving(true)
    try {
      await atendimentoApi.update(a.id, form)
      setEditing(false)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const changeStatus = async (s) => {
    setStatusMenu(false)
    try {
      await atendimentoApi.updateStatus(a.id, s, statusNote)
      setStatusNote('')
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao alterar status')
    }
  }

  const writable = canManage || isAssignee

  return (
    <div className="space-y-5">
      {/* Status & Priority */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Status e Prioridade</h3>
          {writable && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              <Edit3 size={11} /> Editar
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Prioridade</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={form.priority}
                  onChange={e => set('priority', e.target.value)}
                >
                  {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={form.status}
                  onChange={e => set('status', e.target.value)}
                >
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setEditing(false); setForm({
                  priority: a.priority, status: a.status, problemDescription: a.problemDescription,
                  equipment: a.equipment, equipmentType: a.equipmentType,
                  installationLocation: a.installationLocation, serialNumber: a.serialNumber,
                }) }}
                className="flex-1 py-2 text-xs border border-slate-200 text-slate-500 rounded-lg hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={saveAll}
                disabled={saving}
                className="flex-1 py-2 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={a.status} size="md" />
            <PriorityBadge priority={a.priority} />
            {writable && (
              <div className="relative ml-auto">
                <button
                  onClick={() => setStatusMenu(!statusMenu)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-all flex items-center gap-1"
                >
                  Alterar status <ChevronDown size={11} />
                </button>
                {statusMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setStatusMenu(false)} />
                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 min-w-[200px] overflow-hidden">
                      <div className="p-2 border-b border-slate-100">
                        <input
                          autoFocus
                          className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                          placeholder="Observação (opcional)..."
                          value={statusNote}
                          onChange={e => setStatusNote(e.target.value)}
                        />
                      </div>
                      {Object.entries(STATUS).map(([k, v]) => (
                        <button
                          key={k}
                          onClick={() => changeStatus(k)}
                          className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                        >
                          <StatusBadge status={k} />
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cliente */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Cliente</h3>
        <Field label="Razão Social" value={a.clientName} />
        <Field label="CNPJ" value={a.clientDocument} mono />
        <Field label="Telefone" value={a.clientPhone} copy />
        <Field label="E-mail" value={a.clientEmail} copy />
        <Field label="Endereço" value={a.clientAddress} />
      </div>

      {/* Responsável */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Responsável</h3>
        <Field label="Técnico" value={a.technician?.name} />
        <Field label="Equipe" value={a.team} />
        <Field label="Criado por" value={a.createdBy?.name} />
        <Field label="Aberto em" value={fmtDate(a.openDate)} />
        <Field label="Encerrado em" value={fmtDate(a.closeDate)} />
      </div>

      {/* Descrição do Chamado */}
      <div className="bg-white rounded-xl border border-slate-100 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Descrição do Chamado</h3>
          {writable && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1"
            >
              <Edit3 size={11} /> Editar
            </button>
          )}
        </div>
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Problema informado</label>
              <textarea
                rows={3}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                value={form.problemDescription}
                onChange={e => set('problemDescription', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Equipamento</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                value={form.equipment}
                onChange={e => set('equipment', e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={form.equipmentType}
                  onChange={e => set('equipmentType', e.target.value)}
                >
                  {Object.entries(EQUIP_TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Local</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={form.installationLocation}
                  onChange={e => set('installationLocation', e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nº de série</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                value={form.serialNumber}
                onChange={e => set('serialNumber', e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { setEditing(false); setForm({
                  priority: a.priority, status: a.status, problemDescription: a.problemDescription,
                  equipment: a.equipment, equipmentType: a.equipmentType,
                  installationLocation: a.installationLocation, serialNumber: a.serialNumber,
                }) }}
                className="flex-1 py-2 text-xs border border-slate-200 text-slate-500 rounded-lg hover:text-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={saveAll}
                disabled={saving}
                className="flex-1 py-2 text-xs bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {saving ? <RefreshCw size={11} className="animate-spin" /> : <Save size={11} />}
                Salvar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-sm text-slate-700 whitespace-pre-wrap">
              {a.problemDescription || '—'}
            </div>
            {a.equipment && (
              <div className="pt-2 grid grid-cols-2 gap-3">
                <Field label="Equipamento" value={a.equipment} />
                <Field label="Tipo" value={EQUIP_TYPE_LABEL[a.equipmentType] || a.equipmentType} />
                <Field label="Local" value={a.installationLocation} />
                <Field label="Nº de série" value={a.serialNumber} mono />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DiagnosisTab({ a, onRefresh, canManage, isAssignee }) {
  const [form, setForm] = useState({
    initialDiagnosis: a.initialDiagnosis || '',
    finalDiagnosis: a.finalDiagnosis || '',
    identifiedCause: a.identifiedCause || '',
    appliedSolution: a.appliedSolution || '',
    correctiveActions: a.correctiveActions || '',
    preventiveActions: a.preventiveActions || '',
    internalObservations: a.internalObservations || '',
  })
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(a.updatedAt)
  const [showKBModal, setShowKBModal] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => {
    setForm({
      initialDiagnosis: a.initialDiagnosis || '',
      finalDiagnosis: a.finalDiagnosis || '',
      identifiedCause: a.identifiedCause || '',
      appliedSolution: a.appliedSolution || '',
      correctiveActions: a.correctiveActions || '',
      preventiveActions: a.preventiveActions || '',
      internalObservations: a.internalObservations || '',
    })
  }, [a.id, a.initialDiagnosis, a.finalDiagnosis, a.identifiedCause, a.appliedSolution, a.correctiveActions, a.preventiveActions, a.internalObservations])

  const writable = canManage || isAssignee

  const set = (k, v) => {
    const next = { ...form, [k]: v }
    setForm(next)
    if (!writable) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => save(next), 1500)
  }

  const save = async (data) => {
    setSaving(true)
    try {
      const r = await atendimentoApi.updateDiagnosis(a.id, data)
      setSavedAt(new Date().toISOString())
      onRefresh({ silent: true })
      return r
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }

  const fields = [
    { key: 'initialDiagnosis',     label: 'Diagnóstico Inicial',  rows: 3, placeholder: 'Análise inicial feita ao chegar no local...' },
    { key: 'finalDiagnosis',       label: 'Diagnóstico Final',    rows: 3, placeholder: 'Análise final após identificar a causa raiz...' },
    { key: 'identifiedCause',      label: 'Causa Identificada',   rows: 2, placeholder: 'Qual foi a causa raiz do problema?' },
    { key: 'appliedSolution',      label: 'Solução Aplicada',     rows: 3, placeholder: 'Descreva a solução aplicada...' },
    { key: 'correctiveActions',    label: 'Ações Corretivas',     rows: 3, placeholder: 'Ações tomadas para corrigir o problema...' },
    { key: 'preventiveActions',    label: 'Ações Preventivas',    rows: 2, placeholder: 'Recomendações para evitar reincidência...' },
    { key: 'internalObservations', label: 'Observações Internas', rows: 2, placeholder: 'Anotações internas (não visível ao cliente)...' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          {savedAt ? `Última atualização: ${fmtDate(savedAt)}` : 'Ainda não salvo'}
        </span>
        <div className="flex items-center gap-2">
          {saving && <RefreshCw size={12} className="animate-spin text-slate-400" />}
          <button
            onClick={() => setShowHistory(true)}
            className="text-slate-500 hover:text-cyan-600 flex items-center gap-1"
          >
            <History size={11} /> Histórico ({a.diagnosisHistory?.length || 0})
          </button>
          {writable && (
            <button
              onClick={() => setShowKBModal(true)}
              className="text-amber-600 hover:text-amber-700 flex items-center gap-1"
            >
              <BookOpen size={11} /> {a.isKnowledgeBase ? 'Editar na Base' : 'Publicar na Base'}
            </button>
          )}
        </div>
      </div>

      {fields.map(f => (
        <div key={f.key}>
          <label className="block text-xs font-semibold text-slate-600 mb-1">{f.label}</label>
          <textarea
            rows={f.rows}
            placeholder={f.placeholder}
            disabled={!writable}
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            value={form[f.key]}
            onChange={e => set(f.key, e.target.value)}
          />
        </div>
      ))}

      {showKBModal && (
        <KnowledgeBaseModal
          a={a}
          onClose={() => setShowKBModal(false)}
          onSaved={() => { setShowKBModal(false); onRefresh() }}
        />
      )}

      {showHistory && (
        <HistoryModal
          a={a}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  )
}

function KnowledgeBaseModal({ a, onClose, onSaved }) {
  const [form, setForm] = useState({
    kbProblem: a.kbProblem || a.problemDescription || '',
    kbCause: a.kbCause || a.identifiedCause || '',
    kbSolution: a.kbSolution || a.appliedSolution || '',
    kbEquipments: a.kbEquipments || (a.equipment ? [a.equipment] : []),
  })
  const [equipInput, setEquipInput] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const addEquip = (e) => {
    if (!e.trim()) return
    if (form.kbEquipments.includes(e)) return
    set('kbEquipments', [...form.kbEquipments, e.trim()])
  }

  const submit = async () => {
    setSaving(true)
    try {
      if (a.isKnowledgeBase) {
        await atendimentoApi.unpublishFromKnowledgeBase(a.id)
      }
      await atendimentoApi.publishToKnowledgeBase(a.id, form)
      onSaved()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center md:p-4 bg-slate-900/70 md:bg-black/60">
      <div className="bg-white rounded-none md:rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold text-base flex items-center gap-2">
            <BookOpen size={16} className="text-amber-600" />
            Publicar na Base de Conhecimento
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Problema *</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
              value={form.kbProblem}
              onChange={e => set('kbProblem', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Causa *</label>
            <textarea
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
              value={form.kbCause}
              onChange={e => set('kbCause', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Solução *</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
              value={form.kbSolution}
              onChange={e => set('kbSolution', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Equipamentos afetados</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.kbEquipments.map(e => (
                <span key={e} className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-medium px-2 py-1 rounded-full">
                  {e}
                  <button onClick={() => set('kbEquipments', form.kbEquipments.filter(x => x !== e))}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Adicionar equipamento + Enter"
              value={equipInput}
              onChange={e => setEquipInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addEquip(equipInput)
                  setEquipInput('')
                }
              }}
            />
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-500 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 disabled:opacity-50 transition-all"
          >
            {saving ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function HistoryModal({ a, onClose }) {
  const items = a.diagnosisHistory || []
  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center md:p-4 bg-slate-900/70 md:bg-black/60">
      <div className="bg-white rounded-none md:rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold text-base">Histórico de Edições</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-2">
          {items.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-10">Nenhuma edição registrada</p>
          ) : (
            items.slice().reverse().map((h, i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-slate-700">{h.field}</span>
                  <span className="text-slate-400">{fmtDate(h.timestamp)}</span>
                </div>
                <div className="space-y-1">
                  {h.oldValue && <p className="text-red-600 line-through">{h.oldValue}</p>}
                  {h.newValue && <p className="text-emerald-700">{h.newValue}</p>}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">por {h.userName}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function AttachmentsTab({ a, onRefresh, canManage, isAssignee }) {
  const writable = canManage || isAssignee
  const [uploading, setUploading] = useState(null)
  const [previewImage, setPreviewImage] = useState(null)
  const [activeTab, setActiveTab] = useState('images')

  const handleUpload = async (kind, files) => {
    if (!files?.length) return
    setUploading(kind)
    try {
      for (const file of files) {
        await atendimentoApi.uploadFile(a.id, file, kind)
      }
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao enviar')
    } finally {
      setUploading(null)
    }
  }

  const deleteFile = async (f, kind) => {
    if (!confirm(`Remover ${f.name}?`)) return
    try {
      await atendimentoApi.deleteFile(a.id, f.id, kind)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao remover')
    }
  }

  const formatSize = (b) => {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  const isImage = (mime) => mime?.startsWith('image/')

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('images')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'images'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                : 'text-slate-500 border border-transparent hover:border-slate-200'
            }`}
          >
            <ImageIcon size={12} className="inline mr-1" />
            Imagens ({a.images?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('documents')}
            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${
              activeTab === 'documents'
                ? 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                : 'text-slate-500 border border-transparent hover:border-slate-200'
            }`}
          >
            <FileIcon size={12} className="inline mr-1" />
            Documentos ({a.documents?.length || 0})
          </button>
        </div>
        {writable && (
          <div>
            <label className="text-xs px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg cursor-pointer flex items-center gap-1">
              {uploading === activeTab.slice(0, -1) ? (
                <RefreshCw size={12} className="animate-spin" />
              ) : (
                <Upload size={12} />
              )}
              Enviar {activeTab === 'images' ? 'imagens' : 'documentos'}
              <input
                type="file"
                multiple
                accept={activeTab === 'images' ? 'image/*' : '.pdf,.doc,.docx,.xls,.xlsx,.txt,.log,.zip,.rar'}
                className="hidden"
                onChange={e => handleUpload(activeTab.slice(0, -1), e.target.files)}
              />
            </label>
          </div>
        )}
      </div>

      {activeTab === 'images' ? (
        a.images?.length ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {a.images.map(img => (
              <div key={img.id} className="relative group rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <button
                  onClick={() => setPreviewImage(img)}
                  className="block w-full aspect-square"
                >
                  <img
                    src={`${BASE_URL}/${img.url}`}
                    alt={img.name}
                    className="w-full h-full object-cover"
                  />
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <p className="text-white text-[10px] truncate">{img.name}</p>
                  <p className="text-white/60 text-[9px]">{fmtDate(img.uploadedAt)}</p>
                </div>
                {writable && (
                  <button
                    onClick={() => deleteFile(img, 'image')}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
            <Camera size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhuma imagem anexada</p>
          </div>
        )
      ) : (
        a.documents?.length ? (
          <div className="space-y-2">
            {a.documents.map(d => (
              <div key={d.id} className="bg-white border border-slate-100 rounded-lg p-3 flex items-center gap-3 group">
                <div className="w-9 h-9 bg-cyan-50 rounded-lg flex items-center justify-center shrink-0">
                  <FileText size={16} className="text-cyan-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-800 text-sm font-medium truncate">{d.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {formatSize(d.size)} · {fmtDate(d.uploadedAt)} · {d.uploadedByName}
                  </p>
                </div>
                <a
                  href={`${BASE_URL}/${d.url}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-600 hover:text-cyan-700 p-2"
                  title="Baixar"
                >
                  <Upload size={13} className="rotate-180" />
                </a>
                {writable && (
                  <button
                    onClick={() => deleteFile(d, 'document')}
                    className="text-slate-300 hover:text-red-500 p-2"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
            <FileText size={28} className="text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum documento anexado</p>
          </div>
        )
      )}

      {previewImage && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={() => setPreviewImage(null)}>
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
          >
            <X size={20} />
          </button>
          <img
            src={`${BASE_URL}/${previewImage.url}`}
            alt={previewImage.name}
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-xs text-center">
            <p className="font-medium">{previewImage.name}</p>
            <p className="text-white/50 text-[10px]">{fmtDate(previewImage.uploadedAt)}</p>
          </div>
        </div>
      )}
    </div>
  )
}

function TimeTab({ a, onRefresh, canManage, isAssignee }) {
  const [actionLoading, setActionLoading] = useState(false)
  const writable = canManage || isAssignee
  const openLog = (a.timeLogs || []).find(l => l.endTime == null)

  const start = async (isTravel) => {
    setActionLoading(true)
    try {
      await atendimentoApi.startTimeLog(a.id, { isTravel })
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setActionLoading(false)
    }
  }

  const stop = async () => {
    setActionLoading(true)
    try {
      await atendimentoApi.stopTimeLog(a.id)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {/* Cards de tempo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
          <p className="text-xs text-cyan-700 font-medium">Tempo total</p>
          <p className="text-2xl font-bold text-cyan-700 mt-1">{fmtMinutes(a.totalTimeMinutes)}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-700 font-medium">Deslocamento</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{fmtMinutes(a.travelTimeMinutes)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <p className="text-xs text-emerald-700 font-medium">Status</p>
          <p className="text-lg font-bold text-emerald-700 mt-1">
            {openLog ? 'Em andamento' : 'Parado'}
          </p>
        </div>
      </div>

      {/* Controles */}
      {writable && (
        <div className="flex gap-2">
          {!openLog ? (
            <>
              <button
                onClick={() => start(false)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play size={13} /> Iniciar trabalho
              </button>
              <button
                onClick={() => start(true)}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-400 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Play size={13} /> Iniciar deslocamento
              </button>
            </>
          ) : (
            <button
              onClick={stop}
              disabled={actionLoading}
              className="flex-1 py-2.5 bg-red-500 text-white text-sm rounded-lg hover:bg-red-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Square size={13} /> Finalizar {openLog.isTravel ? 'deslocamento' : 'trabalho'}
            </button>
          )}
        </div>
      )}

      {/* Histórico */}
      <div>
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Registros de Tempo</h3>
        {a.timeLogs?.length ? (
          <div className="space-y-2">
            {a.timeLogs.slice().reverse().map(l => (
              <div key={l.id} className="bg-white border border-slate-100 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className={`font-medium ${l.isTravel ? 'text-amber-700' : 'text-cyan-700'}`}>
                    {l.isTravel ? 'Deslocamento' : 'Trabalho'}
                  </span>
                  <span className="text-slate-400">{l.userName}</span>
                </div>
                <div className="text-slate-500 mt-1">
                  {fmtDate(l.startTime)} → {l.endTime ? fmtDate(l.endTime) : 'em andamento'}
                </div>
                {l.endTime && (
                  <div className="text-slate-700 font-medium mt-1">
                    Duração: {fmtMinutes(l.duration)}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400 text-sm text-center py-6">Nenhum registro de tempo</p>
        )}
      </div>
    </div>
  )
}

function ChecklistTab({ a, onRefresh, canManage, isAssignee }) {
  const [templates, setTemplates] = useState([])
  const [showApply, setShowApply] = useState(false)
  const [showCreateTpl, setShowCreateTpl] = useState(false)
  const writable = canManage || isAssignee

  useEffect(() => {
    atendimentoApi.listChecklistTemplates().then(r => setTemplates(r.data || [])).catch(() => {})
  }, [])

  const toggle = async (item) => {
    if (!writable) return
    try {
      await atendimentoApi.updateChecklistItem(a.id, item.id, !item.checked)
      onRefresh({ silent: true })
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    }
  }

  const apply = async (templateId) => {
    try {
      await atendimentoApi.applyChecklistTemplate(a.id, templateId)
      setShowApply(false)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    }
  }

  const checked = (a.checklistItems || []).filter(i => i.checked).length
  const total = a.checklistItems?.length || 0

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">
            {a.checklistName || 'Checklist'}
          </h3>
          {total > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">{checked} de {total} itens concluídos</p>
          )}
        </div>
        {writable && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowApply(true)}
              className="text-xs px-3 py-1.5 bg-cyan-50 text-cyan-700 border border-cyan-200 rounded-lg hover:bg-cyan-100"
            >
              <Plus size={11} className="inline mr-1" />
              {a.checklistItems?.length ? 'Trocar template' : 'Aplicar template'}
            </button>
            <button
              onClick={() => setShowCreateTpl(true)}
              className="text-xs px-3 py-1.5 border border-slate-200 text-slate-600 rounded-lg hover:border-slate-300"
            >
              <Plus size={11} className="inline mr-1" /> Novo template
            </button>
          </div>
        )}
      </div>

      {a.checklistItems?.length ? (
        <div className="space-y-1.5">
          {a.checklistItems.map(item => (
            <button
              key={item.id}
              onClick={() => toggle(item)}
              disabled={!writable}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-lg border transition-all ${
                item.checked
                  ? 'bg-emerald-50 border-emerald-200'
                  : 'bg-white border-slate-100 hover:border-slate-200'
              } ${!writable ? 'cursor-default' : ''}`}
            >
              {item.checked ? (
                <CheckCircle size={16} className="text-emerald-600 shrink-0" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.checked ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                  {item.text}
                </p>
                {item.checked && item.checkedBy && (
                  <p className="text-[10px] text-slate-400">por {item.checkedBy}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
          <ClipboardCheck size={28} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum checklist aplicado</p>
          {writable && (
            <button
              onClick={() => setShowApply(true)}
              className="mt-3 text-xs text-cyan-600 hover:text-cyan-700"
            >
              Aplicar template de checklist
            </button>
          )}
        </div>
      )}

      {showApply && (
        <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center md:p-4 bg-slate-900/70 md:bg-black/60">
          <div className="bg-white rounded-none md:rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="text-slate-800 font-semibold text-base">Aplicar Checklist</h2>
              <button onClick={() => setShowApply(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-1.5">
              {templates.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">Nenhum template cadastrado</p>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => apply(t.id)}
                    className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-cyan-300 hover:bg-cyan-50/30 transition-all"
                  >
                    <p className="text-slate-800 font-medium text-sm">{t.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{t.items?.length || 0} itens · {t.category || '—'}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showCreateTpl && (
        <ChecklistTemplateModal
          onClose={() => setShowCreateTpl(false)}
          onSaved={() => {
            setShowCreateTpl(false)
            atendimentoApi.listChecklistTemplates().then(r => setTemplates(r.data || []))
          }}
        />
      )}
    </div>
  )
}

function ChecklistTemplateModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', category: 'INSTALACAO', items: [] })
  const [itemText, setItemText] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const addItem = () => {
    if (!itemText.trim()) return
    set('items', [...form.items, { id: `it_${Date.now()}_${form.items.length}`, text: itemText.trim(), checked: false }])
    setItemText('')
  }

  const submit = async () => {
    if (!form.name.trim()) return
    setSaving(true)
    try {
      await atendimentoApi.createChecklistTemplate(form)
      onSaved()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center md:p-4 bg-slate-900/70 md:bg-black/60">
      <div className="bg-white rounded-none md:rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold text-base">Novo Template de Checklist</h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Ex: Comissionamento de Câmara Fria"
              value={form.name}
              onChange={e => set('name', e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={form.category}
              onChange={e => set('category', e.target.value)}
            >
              <option value="INSTALACAO">Instalação</option>
              <option value="COMISSIONAMENTO">Comissionamento</option>
              <option value="MANUTENCAO_PREVENTIVA">Manutenção Preventiva</option>
              <option value="MANUTENCAO_CORRETIVA">Manutenção Corretiva</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Itens</label>
            <div className="space-y-1.5 mb-2">
              {form.items.map(it => (
                <div key={it.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded">
                  <span className="flex-1 text-xs text-slate-700">{it.text}</span>
                  <button onClick={() => set('items', form.items.filter(x => x.id !== it.id))} className="text-slate-400 hover:text-red-500">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Novo item..."
                value={itemText}
                onChange={e => setItemText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addItem() } }}
              />
              <button onClick={addItem} className="px-3 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400">
                <Plus size={12} />
              </button>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-500 rounded-lg">Cancelar</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Criar Template'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SignaturesTab({ a, onRefresh, canManage, isAssignee }) {
  const [showSignModal, setShowSignModal] = useState(null)
  const writable = canManage || isAssignee

  const onSign = async (data) => {
    try {
      await atendimentoApi.sign(a.id, data)
      setShowSignModal(null)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao assinar')
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Capture a assinatura do técnico responsável e do cliente ao finalizar o atendimento.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { role: 'technician', label: 'Técnico Responsável', sig: a.technicianSignature },
          { role: 'client',     label: 'Cliente',              sig: a.clientSignature },
        ].map(s => (
          <div key={s.role} className="bg-white border border-slate-100 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PenTool size={13} className="text-cyan-600" />
                {s.label}
              </h3>
              {s.sig ? (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Assinado
                </span>
              ) : (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  Pendente
                </span>
              )}
            </div>
            {s.sig ? (
              <div className="space-y-1 text-xs">
                <p className="text-slate-700 font-medium text-base italic border-b border-slate-200 pb-2 mb-2">
                  {s.sig.name}
                </p>
                <p className="text-slate-500">{s.sig.document || '—'}</p>
                <p className="text-slate-400">{fmtDate(s.sig.signedAt)}</p>
                {s.sig.ipAddress && <p className="text-slate-300 text-[10px]">IP: {s.sig.ipAddress}</p>}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-slate-400 text-xs mb-3">Assinatura não registrada</p>
                {writable && (
                  <button
                    onClick={() => setShowSignModal(s.role)}
                    className="text-xs px-3 py-1.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400"
                  >
                    Registrar assinatura
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {showSignModal && (
        <SignModal
          role={showSignModal}
          defaultName={showSignModal === 'technician' ? a.technician?.name : a.clientName}
          onClose={() => setShowSignModal(null)}
          onConfirm={onSign}
        />
      )}
    </div>
  )
}

function SignModal({ role, defaultName, onClose, onConfirm }) {
  const [name, setName] = useState(defaultName || '')
  const [document, setDocument] = useState('')
  const [agree, setAgree] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center md:p-4 bg-slate-900/70 md:bg-black/60">
      <div className="bg-white rounded-none md:rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold text-base">
            Assinatura {role === 'technician' ? 'do Técnico' : 'do Cliente'}
          </h2>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="p-6 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome *</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">CPF / Documento</label>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={document}
              onChange={e => setDocument(e.target.value)}
            />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={e => setAgree(e.target.checked)}
              className="mt-0.5"
            />
            Confirmo que estou de acordo com o atendimento realizado.
          </label>
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Assinatura digital</p>
            <p className="text-lg italic text-cyan-700 mt-2 min-h-[40px]">
              {name || '(seu nome)'}
            </p>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-500 rounded-lg">Cancelar</button>
          <button
            onClick={() => onConfirm({ role, name, document })}
            disabled={!name || !agree}
            className="flex-1 py-2.5 bg-cyan-500 text-white rounded-lg hover:bg-cyan-400 disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}

function TagsTab({ a, onRefresh, canManage, isAssignee }) {
  const [tags, setTags] = useState(a.tags || [])
  const [input, setInput] = useState('')
  const [available, setAvailable] = useState([])
  const [saving, setSaving] = useState(false)
  const writable = canManage || isAssignee

  useEffect(() => {
    setTags(a.tags || [])
  }, [a.id, a.tags])

  useEffect(() => {
    atendimentoApi.listAvailableTags().then(r => setAvailable(r.data || [])).catch(() => {})
  }, [])

  const save = async (newTags) => {
    setSaving(true)
    try {
      await atendimentoApi.updateTags(a.id, newTags)
      onRefresh({ silent: true })
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const add = (t) => {
    if (!t.trim()) return
    if (tags.includes(t)) return
    const next = [...tags, t.trim()]
    setTags(next)
    save(next)
    setInput('')
  }

  const remove = (t) => {
    const next = tags.filter(x => x !== t)
    setTags(next)
    save(next)
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-slate-500">
        Tags facilitam buscas e categorização. Clique em uma tag para adicioná-la.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {tags.map(t => (
          <span key={t} className="inline-flex items-center gap-1.5 bg-cyan-100 text-cyan-700 text-sm font-medium px-3 py-1.5 rounded-full">
            <Tag size={11} />
            {t}
            {writable && (
              <button onClick={() => remove(t)} className="hover:text-cyan-900 ml-1">
                <X size={11} />
              </button>
            )}
          </span>
        ))}
        {tags.length === 0 && (
          <p className="text-sm text-slate-400 italic">Nenhuma tag adicionada</p>
        )}
      </div>

      {writable && (
        <>
          <input
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Digite uma tag e pressione Enter..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(input) } }}
          />
          <div>
            <p className="text-xs text-slate-500 mb-2">Tags sugeridas:</p>
            <div className="flex flex-wrap gap-1.5">
              {available.filter(t => !tags.includes(t)).map(t => (
                <button
                  key={t}
                  onClick={() => add(t)}
                  className="text-xs px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 transition-all"
                >
                  + {t}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {saving && <p className="text-xs text-slate-400 flex items-center gap-1"><RefreshCw size={11} className="animate-spin" /> Salvando...</p>}
    </div>
  )
}

function TimelineTab({ a }) {
  const [obsText, setObsText] = useState('')
  const [adding, setAdding] = useState(false)

  const events = useMemo(() => [...(a.timeline || [])].reverse(), [a.timeline])

  const TYPES = {
    CRIADO:                  { color: 'bg-cyan-100 text-cyan-700',   icon: Plus },
    STATUS_ALTERADO:         { color: 'bg-blue-100 text-blue-700',   icon: Activity },
    TECNICO_ATRIBUIDO:       { color: 'bg-purple-100 text-purple-700', icon: User },
    DIAGNOSTICO_ALTERADO:    { color: 'bg-amber-100 text-amber-700', icon: Edit3 },
    ARQUIVO_ANEXADO:         { color: 'bg-emerald-100 text-emerald-700', icon: ImageIcon },
    ARQUIVO_REMOVIDO:        { color: 'bg-red-100 text-red-700',     icon: Trash2 },
    TEMPO_INICIADO:          { color: 'bg-cyan-100 text-cyan-700',   icon: Play },
    TEMPO_FINALIZADO:        { color: 'bg-slate-100 text-slate-700', icon: Square },
    ASSINATURA_REGISTRADA:   { color: 'bg-pink-100 text-pink-700',   icon: PenTool },
    TAGS_ALTERADAS:          { color: 'bg-indigo-100 text-indigo-700', icon: Tag },
    OBSERVACAO:              { color: 'bg-slate-100 text-slate-700', icon: FileText },
    CHECKLIST_APLICADO:      { color: 'bg-cyan-100 text-cyan-700',   icon: ClipboardCheck },
    PUBLICADO_BASE_CONHECIMENTO: { color: 'bg-amber-100 text-amber-700', icon: BookOpen },
    REMOVIDO_BASE_CONHECIMENTO:  { color: 'bg-slate-100 text-slate-700', icon: BookOpen },
  }

  const addObs = async () => {
    if (!obsText.trim()) return
    setAdding(true)
    try {
      await atendimentoApi.addObservation(a.id, obsText)
      setObsText('')
      // force refresh
      window.dispatchEvent(new Event('atend-refresh'))
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setAdding(false)
    }
  }

  useEffect(() => {
    const handler = () => {
      // parent component handles
    }
    window.addEventListener('atend-refresh', handler)
    return () => window.removeEventListener('atend-refresh', handler)
  }, [])

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-100 rounded-lg p-3 flex gap-2">
        <input
          className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          placeholder="Adicionar observação à linha do tempo..."
          value={obsText}
          onChange={e => setObsText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addObs() } }}
        />
        <button
          onClick={addObs}
          disabled={adding || !obsText.trim()}
          className="px-3 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50"
        >
          {adding ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
        </button>
      </div>

      <div className="space-y-3">
        {events.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-10">Nenhum evento registrado</p>
        ) : (
          events.map((ev, i) => {
            const t = TYPES[ev.type] || TYPES.OBSERVACAO
            const Icon = t.icon
            return (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full ${t.color} flex items-center justify-center shrink-0`}>
                    <Icon size={13} />
                  </div>
                  {i < events.length - 1 && <div className="w-px flex-1 bg-slate-100 mt-1" />}
                </div>
                <div className="pb-4 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-800 text-sm font-semibold">
                      {ev.type.replace(/_/g, ' ').toLowerCase().replace(/^./, c => c.toUpperCase())}
                    </span>
                    <span className="text-slate-400 text-[10px]">por {ev.userName || 'sistema'}</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">{fmtDate(ev.timestamp)}</p>
                  {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                    <div className="mt-1.5 bg-slate-50 border border-slate-100 rounded-lg p-2 text-xs text-slate-600 space-y-0.5">
                      {Object.entries(ev.metadata).map(([k, v]) => (
                        <p key={k}>
                          <span className="text-slate-400">{k}:</span> {typeof v === 'string' ? v : JSON.stringify(v)}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

function ClientHistoryTab({ a }) {
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const clientId = a.client?.id

  useEffect(() => {
    if (!clientId) {
      setLoading(false)
      return
    }
    setLoading(true)
    atendimentoApi.clientHistory(clientId)
      .then(r => setHistory(r.data))
      .catch(() => setHistory(null))
      .finally(() => setLoading(false))
  }, [clientId])

  if (!clientId) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl py-12 text-center">
        <Building2 size={28} className="text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">Nenhum cliente vinculado a este atendimento</p>
      </div>
    )
  }

  if (loading) {
    return <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-slate-300" /></div>
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-800">Histórico do Cliente: {a.client.name}</h3>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-cyan-700 font-medium">Total</p>
          <p className="text-2xl font-bold text-cyan-700 mt-1">{history?.total || 0}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-amber-700 font-medium">Em Aberto</p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{history?.openCount || 0}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-emerald-700 font-medium">Encerrados</p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{history?.closedCount || 0}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
          <p className="text-[10px] text-slate-700 font-medium">Último</p>
          <p className="text-xs font-medium text-slate-700 mt-2">{history?.lastAtendDate ? fmtDate(history.lastAtendDate) : '—'}</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Todos os Atendimentos</p>
        <div className="space-y-1.5">
          {(history?.items || []).map(item => (
            <div key={item.id} className="bg-white border border-slate-100 rounded-lg p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-cyan-600 text-xs font-mono">{item.number}</span>
                  <StatusBadge status={item.status} />
                  <PriorityBadge priority={item.priority} />
                </div>
                <p className="text-sm text-slate-700 line-clamp-1">{item.problemDescription}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {fmtDate(item.openDate)} · {item.equipment || '—'} · {item.technician?.name || '—'}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'info',        label: 'Informações', icon: List },
  { id: 'diagnosis',   label: 'Diagnóstico', icon: Activity },
  { id: 'attachments', label: 'Anexos',      icon: ImageIcon },
  { id: 'time',        label: 'Tempo',       icon: Clock },
  { id: 'checklist',   label: 'Checklist',   icon: ClipboardCheck },
  { id: 'signatures',  label: 'Assinaturas', icon: PenTool },
  { id: 'tags',        label: 'Tags',        icon: Tag },
  { id: 'history',     label: 'Histórico',   icon: History },
  { id: 'client',      label: 'Cliente',     icon: Building2 },
  { id: 'timeline',    label: 'Linha do Tempo', icon: BarChart3 },
]

export default function AutomationAtendimentoDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAdmin } = useAuth()
  const [a, setA] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('info')

  const load = useCallback(async (opts = {}) => {
    if (!opts.silent) setLoading(true)
    try {
      const r = await atendimentoApi.getById(id)
      setA(r.data)
    } catch {
      navigate('/automation/atendimentos')
    } finally {
      if (!opts.silent) setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  // Listen for timeline refresh events
  useEffect(() => {
    const handler = () => load({ silent: true })
    window.addEventListener('atend-refresh', handler)
    return () => window.removeEventListener('atend-refresh', handler)
  }, [load])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <RefreshCw size={24} className="animate-spin text-slate-300" />
      </div>
    )
  }

  if (!a) return null

  const canManage = isAdmin
  const isAssignee = user?.id && a.technician?.id === user.id

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-100 px-6 py-3 flex items-center gap-3 shrink-0">
        <button
          onClick={() => navigate('/automation/atendimentos')}
          className="text-slate-400 hover:text-slate-700 transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-cyan-600 font-mono text-sm font-semibold">{a.number}</span>
            <StatusBadge status={a.status} size="md" />
            <PriorityBadge priority={a.priority} />
            {a.isKnowledgeBase && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <BookOpen size={9} className="inline mr-0.5" /> Base de Conhecimento
              </span>
            )}
          </div>
          <p className="text-slate-500 text-xs mt-0.5 truncate">{a.problemDescription}</p>
        </div>
        <button onClick={() => load()} className="text-slate-400 hover:text-cyan-600 transition-colors p-1.5">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-slate-100 px-6 flex gap-1 overflow-x-auto shrink-0">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === t.id
                ? 'border-cyan-500 text-cyan-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 max-w-5xl mx-auto w-full">
        {tab === 'info'        && <InfoTab        a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'diagnosis'   && <DiagnosisTab   a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'attachments' && <AttachmentsTab a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'time'        && <TimeTab        a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'checklist'   && <ChecklistTab   a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'signatures'  && <SignaturesTab  a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'tags'        && <TagsTab        a={a} onRefresh={load} canManage={canManage} isAssignee={isAssignee} />}
        {tab === 'history'     && <ClientHistoryTab a={a} />}
        {tab === 'client'      && <ClientHistoryTab a={a} />}
        {tab === 'timeline'    && <TimelineTab    a={a} />}
      </div>
    </div>
  )
}
