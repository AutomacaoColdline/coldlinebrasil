import { useEffect, useState, useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { automationApi } from '../../services/automationApi'
import {
  ClipboardList, Search, Loader2, MapPin, Hash,
  MessageSquare, Check, X, ChevronDown, User, Phone, Mail,
} from 'lucide-react'

const STATUS = {
  NAO_CONTATADO:       { label: 'Não contatado',       dot: 'bg-slate-400', chip: 'bg-slate-100 text-slate-600' },
  CONTATO_REALIZADO:   { label: 'Contato realizado',   dot: 'bg-blue-500',  chip: 'bg-blue-50 text-blue-600'   },
  AGUARDANDO_RESPOSTA: { label: 'Aguardando resposta', dot: 'bg-amber-500', chip: 'bg-amber-50 text-amber-700' },
  SEM_RETORNO:         { label: 'Sem retorno',         dot: 'bg-red-500',   chip: 'bg-red-50 text-red-600'     },
  RESPONDIDA:          { label: 'Pesquisa respondida', dot: 'bg-green-500', chip: 'bg-green-50 text-green-700' },
}
const STATUS_ORDER = Object.keys(STATUS)
const DEFAULT_STATUS = 'NAO_CONTATADO'

function fmtDate(v) {
  if (!v) return null
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('pt-BR')
}

function StatusMenu({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false)
  const s = STATUS[value] || STATUS[DEFAULT_STATUS]
  return (
    <div className="relative">
      <button type="button" disabled={disabled} onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${s.chip} hover:opacity-80 transition-opacity disabled:opacity-50`}>
        {disabled ? <Loader2 size={11} className="animate-spin" /> : <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />}
        {s.label}
        <ChevronDown size={11} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 right-0 bg-white border border-slate-200 rounded-xl shadow-lg py-1 w-52">
            {STATUS_ORDER.map(k => (
              <button key={k} onClick={() => { onChange(k); setOpen(false) }}
                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 text-left">
                <span className={`w-1.5 h-1.5 rounded-full ${STATUS[k].dot}`} />
                {STATUS[k].label}
                {k === value && <Check size={12} className="ml-auto text-cyan-500" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function NotesModal({ unit, survey, onClose, onSaved }) {
  const [contactName, setContactName]   = useState(survey?.contactName  || '')
  const [contactPhone, setContactPhone] = useState(survey?.contactPhone || '')
  const [contactEmail, setContactEmail] = useState(survey?.contactEmail || '')
  const [notes, setNotes]     = useState(survey?.notes || '')
  const [saving, setSaving]   = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await automationApi.setClientSurvey(unit.id, {
        contactName,
        contactPhone,
        contactEmail,
        notes,
      })
      onSaved(data)
    } catch { /* ignore */ }
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 truncate">{unit.unidade || unit.identificador || 'Cliente'}</h3>
          <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
              <input value={contactName} onChange={e => setContactName(e.target.value)}
                placeholder="Nome de quem foi contatado"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Número</label>
              <input value={contactPhone} onChange={e => setContactPhone(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">E-mail</label>
              <input value={contactEmail} onChange={e => setContactEmail(e.target.value)}
                placeholder="contato@empresa.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Observações</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
              placeholder="Ex: falei com o financeiro, retornar na sexta..."
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : null}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationPesquisas() {
  useOutletContext()
  const [units, setUnits]     = useState([])   // registros de Monitoramento = clientes
  const [types, setTypes]     = useState([])   // XWEB / SITRAD / COLDVISIO
  const [surveys, setSurveys] = useState({})   // unitId -> survey record
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter]     = useState('')
  const [notesModal, setNotesModal]     = useState(null) // unit
  const [updating, setUpdating]         = useState(null) // unitId em atualização

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [monitoringRes, typesRes, surveysRes] = await Promise.all([
        automationApi.getAllMonitorings(),
        automationApi.getMonitoringTypes(),
        automationApi.getSurveys(),
      ])
      setUnits(monitoringRes.data || [])
      setTypes(typesRes.data || [])
      const map = {}
      for (const s of surveysRes.data || []) map[s.clientId] = s
      setSurveys(map)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (unit, status) => {
    setUpdating(unit.id)
    try {
      const { data } = await automationApi.setClientSurvey(unit.id, { status })
      setSurveys(prev => ({ ...prev, [unit.id]: data }))
    } catch { /* ignore */ }
    setUpdating(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return units.filter(u => {
      if (statusFilter) {
        const st = surveys[u.id]?.status || DEFAULT_STATUS
        if (st !== statusFilter) return false
      }
      if (typeFilter && u.monitoringType?.id !== typeFilter) return false
      if (!q) return true
      return [u.unidade, u.identificador, u.cidade, u.estado].some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [units, surveys, search, statusFilter, typeFilter])

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map(k => [k, 0]))
    for (const u of units) {
      const st = surveys[u.id]?.status || DEFAULT_STATUS
      c[st] = (c[st] || 0) + 1
    }
    return c
  }, [units, surveys])

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Pesquisas</h1>
        <p className="text-sm text-slate-400">{units.length} clientes</p>
      </div>

      {/* Resumo por status */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            statusFilter === '' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}>
          Todos ({units.length})
        </button>
        {STATUS_ORDER.map(k => (
          <button key={k} onClick={() => setStatusFilter(k)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              statusFilter === k ? `${STATUS[k].chip} border-transparent` : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS[k].dot}`} />
            {STATUS[k].label} ({counts[k] || 0})
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por unidade, identificador, cidade ou estado..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 min-w-[160px]">
          <option value="">Todos os sistemas</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
          <ClipboardList size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50 overflow-hidden">
          {filtered.map(u => {
            const survey = surveys[u.id]
            const status = survey?.status || DEFAULT_STATUS
            return (
              <div key={u.id} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{u.unidade || u.identificador || 'Sem nome'}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                    {u.identificador && <span className="flex items-center gap-1"><Hash size={10} /> {u.identificador}</span>}
                    {(u.cidade || u.estado) && (
                      <span className="flex items-center gap-1"><MapPin size={10} /> {[u.cidade, u.estado].filter(Boolean).join(', ')}</span>
                    )}
                    {u.monitoringType?.name && (
                      <span className="px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100">
                        {u.monitoringType.name}
                      </span>
                    )}
                  </div>
                  {(survey?.contactName || survey?.contactPhone || survey?.contactEmail) && (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500">
                      {survey.contactName && <span className="flex items-center gap-1"><User size={10} /> {survey.contactName}</span>}
                      {survey.contactPhone && <span className="flex items-center gap-1"><Phone size={10} /> {survey.contactPhone}</span>}
                      {survey.contactEmail && <span className="flex items-center gap-1"><Mail size={10} /> {survey.contactEmail}</span>}
                    </div>
                  )}
                  {survey?.notes && (
                    <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 line-clamp-2">{survey.notes}</p>
                  )}
                  {survey?.updatedAt && (
                    <p className="mt-1 text-[11px] text-slate-300">
                      Atualizado em {fmtDate(survey.updatedAt)}{survey.updatedByName ? ` por ${survey.updatedByName}` : ''}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setNotesModal(u)}
                    className="p-2 text-slate-300 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors" title="Observações">
                    <MessageSquare size={15} />
                  </button>
                  <StatusMenu value={status} disabled={updating === u.id} onChange={(st) => updateStatus(u, st)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {notesModal && (
        <NotesModal
          unit={notesModal}
          survey={surveys[notesModal.id]}
          onClose={() => setNotesModal(null)}
          onSaved={(data) => {
            setSurveys(prev => ({ ...prev, [notesModal.id]: data }))
            setNotesModal(null)
          }}
        />
      )}
    </div>
  )
}
