import { useEffect, useState, useCallback, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { automationApi } from '../../services/automationApi'
import {
  ClipboardList, Search, Loader2, Phone, Mail, FileText as FileIcon,
  MessageSquare, Check, X, ChevronDown,
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

function NotesModal({ client, survey, onClose, onSaved }) {
  const [notes, setNotes] = useState(survey?.notes || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      const { data } = await automationApi.setClientSurvey(client.id, {
        status: survey?.status || DEFAULT_STATUS,
        notes,
      })
      onSaved(data)
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 truncate">{client.name}</h3>
          <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-4">
          <label className="block text-xs font-medium text-slate-500 mb-1">Observações</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={5}
            placeholder="Ex: falei com o financeiro, retornar na sexta..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none" />
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
  const [clients, setClients] = useState([])
  const [surveys, setSurveys] = useState({})   // clientId -> survey record
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [notesModal, setNotesModal] = useState(null) // client
  const [updating, setUpdating] = useState(null)     // clientId em atualização

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [clientsRes, surveysRes] = await Promise.all([
        automationApi.getClients(),
        automationApi.getSurveys(),
      ])
      setClients(clientsRes.data || [])
      const map = {}
      for (const s of surveysRes.data || []) map[s.clientId] = s
      setSurveys(map)
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const updateStatus = async (client, status) => {
    setUpdating(client.id)
    try {
      const { data } = await automationApi.setClientSurvey(client.id, {
        status,
        notes: surveys[client.id]?.notes || '',
      })
      setSurveys(prev => ({ ...prev, [client.id]: data }))
    } catch { /* ignore */ }
    setUpdating(null)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return clients.filter(c => {
      if (statusFilter) {
        const st = surveys[c.id]?.status || DEFAULT_STATUS
        if (st !== statusFilter) return false
      }
      if (!q) return true
      return [c.name, c.document, c.phone, c.email].some(v => String(v || '').toLowerCase().includes(q))
    })
  }, [clients, surveys, search, statusFilter])

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUS_ORDER.map(k => [k, 0]))
    for (const cl of clients) {
      const st = surveys[cl.id]?.status || DEFAULT_STATUS
      c[st] = (c[st] || 0) + 1
    }
    return c
  }, [clients, surveys])

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Pesquisas</h1>
        <p className="text-sm text-slate-400">{clients.length} clientes</p>
      </div>

      {/* Resumo por status */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setStatusFilter('')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            statusFilter === '' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
          }`}>
          Todos ({clients.length})
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

      <div className="relative mb-6 max-w-md">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, documento, telefone ou e-mail..."
          className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
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
          {filtered.map(c => {
            const survey = surveys[c.id]
            const status = survey?.status || DEFAULT_STATUS
            return (
              <div key={c.id} className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{c.name}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-400">
                    {c.document && <span className="flex items-center gap-1"><FileIcon size={10} /> {c.document}</span>}
                    {c.phone && <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1"><Mail size={10} /> {c.email}</span>}
                  </div>
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
                  <button onClick={() => setNotesModal(c)}
                    className="p-2 text-slate-300 hover:text-cyan-500 hover:bg-cyan-50 rounded-lg transition-colors" title="Observações">
                    <MessageSquare size={15} />
                  </button>
                  <StatusMenu value={status} disabled={updating === c.id} onChange={(st) => updateStatus(c, st)} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {notesModal && (
        <NotesModal
          client={notesModal}
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
