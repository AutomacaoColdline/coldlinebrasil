import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { atendimentoApi } from '../../services/atendimentoApi'
import { automationApi } from '../../services/automationApi'
import { useAuth } from '../../context/AuthContext'
import {
  Plus, Search, RefreshCw, Headphones, ChevronLeft, ChevronRight,
  X, Filter, User, Building2, Tag, AlertTriangle, Clock, CheckCircle, FileText,
} from 'lucide-react'

const STATUS = {
  ABERTO:             { label: 'Aberto',             color: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  EM_ANDAMENTO:       { label: 'Em andamento',       color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' },
  AGUARDANDO_CLIENTE: { label: 'Aguardando cliente', color: 'bg-purple-500/15 text-purple-400 border-purple-500/30' },
  AGUARDANDO_PECA:    { label: 'Aguardando peça',    color: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  RESOLVIDO:          { label: 'Resolvido',          color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  ENCERRADO:          { label: 'Encerrado',          color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
}

const PRIORITY = {
  BAIXA:   { label: 'Baixa',   color: 'bg-slate-500/15 text-slate-400 border-slate-500/30' },
  MEDIA:   { label: 'Média',   color: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' },
  ALTA:    { label: 'Alta',    color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  CRITICA: { label: 'Crítica', color: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, color: 'bg-white/10 text-white/40 border-white/10' }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border whitespace-nowrap ${s.color}`}>
      {s.label}
    </span>
  )
}

function PriorityBadge({ priority }) {
  const p = PRIORITY[priority] || { label: priority, color: 'bg-white/10 text-white/40 border-white/10' }
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
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function NewAtendimentoModal({ onClose, onCreated }) {
  const [clients, setClients] = useState([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientList, setShowClientList] = useState(false)
  const [form, setForm] = useState({
    clientId: '',
    clientName: '',
    clientDocument: '',
    clientPhone: '',
    clientEmail: '',
    clientAddress: '',
    priority: 'MEDIA',
    status: 'ABERTO',
    problemDescription: '',
    equipment: '',
    equipmentType: 'OUTRO',
    installationLocation: '',
    serialNumber: '',
    tags: [],
  })
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState([])
  const [saving, setSaving] = useState(false)
  const clientInputRef = useRef(null)

  useEffect(() => {
    automationApi.getAllMonitorings()
      .then(r => {
        const items = r.data || []
        console.log('[Atendimentos] Monitorings carregados:', items.length, items.slice(0, 2))
        setClients(items)
      })
      .catch(err => console.error('[Atendimentos] Erro ao carregar monitorings:', err))
    atendimentoApi.listAvailableTags().then(r => setAvailableTags(r.data || [])).catch(() => {})
  }, [])

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filteredClients = clients.filter(c => {
    if (!clientSearch.trim()) return true
    const q = clientSearch.toLowerCase()
    return (c.unidade || '').toLowerCase().includes(q) ||
           (c.identificador || '').toLowerCase().includes(q) ||
           (c.cidade || '').toLowerCase().includes(q) ||
           (c.estado || '').toLowerCase().includes(q)
  })

  const pickClient = (c) => {
    const address = [c.cidade, c.estado].filter(Boolean).join(' - ')
    setForm(f => ({
      ...f,
      clientId: c.id,
      clientName: c.unidade,
      clientDocument: c.identificador || '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: address,
    }))
    setShowClientList(false)
    setClientSearch(c.unidade)
  }

  const clearClient = () => {
    setForm(f => ({
      ...f,
      clientId: '',
      clientName: '',
      clientDocument: '',
      clientPhone: '',
      clientEmail: '',
      clientAddress: '',
    }))
    setClientSearch('')
  }

  const addTag = (t) => {
    if (!t) return
    if (form.tags.includes(t)) return
    set('tags', [...form.tags, t])
  }

  const removeTag = (t) => {
    set('tags', form.tags.filter(x => x !== t))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.problemDescription.trim()) {
      alert('Descreva o problema informado pelo cliente')
      return
    }
    setSaving(true)
    try {
      const r = await atendimentoApi.create(form)
      onCreated(r.data)
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao criar atendimento')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-stretch md:items-center justify-center md:p-4 bg-slate-900/70 md:bg-black/60">
      <div className="bg-white rounded-none md:rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-slate-800 font-semibold text-base flex items-center gap-2">
            <Headphones size={16} className="text-cyan-600" />
            Novo Atendimento
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Cliente */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Cliente</h3>
            <div className="relative">
              <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={clientInputRef}
                className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Buscar por unidade, identificador ou cidade..."
                value={clientSearch}
                onChange={e => { setClientSearch(e.target.value); setShowClientList(true) }}
                onFocus={() => setShowClientList(true)}
              />
              {(clientSearch || form.clientId) && (
                <button type="button" onClick={clearClient} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
                  <X size={14} />
                </button>
              )}
              {showClientList && filteredClients.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                  {filteredClients.slice(0, 50).map(c => (
                    <button
                      type="button"
                      key={c.id}
                      onClick={() => pickClient(c)}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm border-b border-slate-50 last:border-0"
                    >
                      <p className="text-slate-800 font-medium">{c.unidade}</p>
                      <p className="text-[10px] text-slate-400">
                        {c.identificador && `${c.identificador} · `}
                        {[c.cidade, c.estado].filter(Boolean).join(' - ')}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.clientName && (
              <div className="mt-2 p-2.5 bg-cyan-50 border border-cyan-200 rounded-lg text-xs text-slate-700 space-y-0.5">
                <p><span className="text-slate-400">Unidade:</span> <span className="font-medium">{form.clientName}</span></p>
                {form.clientDocument && <p><span className="text-slate-400">Identificador:</span> {form.clientDocument}</p>}
                {form.clientAddress && <p><span className="text-slate-400">Localização:</span> {form.clientAddress}</p>}
              </div>
            )}
          </div>

          {/* Prioridade e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Prioridade *</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
              >
                {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                value={form.status}
                onChange={e => set('status', e.target.value)}
              >
                {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>

          {/* Descrição do problema */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Problema informado pelo cliente *</label>
            <textarea
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
              placeholder="Descreva o que o cliente relatou..."
              value={form.problemDescription}
              onChange={e => set('problemDescription', e.target.value)}
              required
            />
          </div>

          {/* Equipamento */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Equipamento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  value={form.equipmentType}
                  onChange={e => set('equipmentType', e.target.value)}
                >
                  <option value="CLP">CLP</option>
                  <option value="CONTROLADOR">Controlador</option>
                  <option value="IHM">IHM</option>
                  <option value="GATEWAY">Gateway</option>
                  <option value="SISTEMA_SUPERVISORIO">Sistema Supervisório</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Equipamento</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Ex: CLP Atos, IHM F600..."
                  value={form.equipment}
                  onChange={e => set('equipment', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Local da instalação</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Ex: Câmara fria 02"
                  value={form.installationLocation}
                  onChange={e => set('installationLocation', e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Número de série (opcional)</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="SN do equipamento"
                  value={form.serialNumber}
                  onChange={e => set('serialNumber', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {form.tags.map(t => (
                <span key={t} className="inline-flex items-center gap-1 bg-cyan-100 text-cyan-700 text-xs font-medium px-2 py-1 rounded-full">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-cyan-900">
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {availableTags.filter(t => !form.tags.includes(t)).slice(0, 8).map(t => (
                <button
                  type="button"
                  key={t}
                  onClick={() => addTag(t)}
                  className="text-[10px] px-2 py-1 rounded-full border border-slate-200 text-slate-500 hover:border-cyan-400 hover:text-cyan-600 transition-all"
                >
                  + {t}
                </button>
              ))}
            </div>
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              placeholder="Digite uma tag e pressione Enter..."
              value={tagInput}
              onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addTag(tagInput.trim())
                  setTagInput('')
                }
              }}
            />
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-500 text-sm hover:text-slate-800 hover:border-slate-300 transition-all"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50 transition-all"
          >
            {saving ? 'Criando...' : 'Criar Atendimento'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationAtendimentos() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [data, setData] = useState({ items: [], total: 0, totalPages: 1 })
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await atendimentoApi.search({
        page, pageSize: 15,
        q: search || undefined,
        status: statusFilter || undefined,
        priority: priorityFilter || undefined,
      })
      setData({ ...r.data, items: r.data.items || [] })
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [page, search, statusFilter, priorityFilter])

  useEffect(() => { load() }, [load])

  const handleCreated = (a) => {
    setShowNew(false)
    navigate(`/automation/atendimentos/${a.id}`)
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Headphones size={20} className="text-cyan-600" />
            Atendimentos
          </h1>
          <p className="text-sm text-slate-400">{data.total} atendimento(s) registrado(s)</p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm font-medium rounded-xl hover:bg-cyan-400 transition-colors"
        >
          <Plus size={15} /> Novo Atendimento
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[260px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por número, cliente, problema, equipamento, diagnóstico..."
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        >
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select
          value={priorityFilter}
          onChange={e => { setPriorityFilter(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
        >
          <option value="">Todas as prioridades</option>
          {Object.entries(PRIORITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button
          onClick={load}
          className="p-2.5 text-slate-400 hover:text-cyan-600 hover:bg-cyan-50 rounded-xl transition-all"
          title="Atualizar"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={24} className="animate-spin text-slate-300" />
        </div>
      ) : data.items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-24 text-center">
          <Headphones size={32} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum atendimento encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.items.map(a => (
            <button
              key={a.id}
              onClick={() => navigate(`/automation/atendimentos/${a.id}`)}
              className="w-full bg-white hover:bg-cyan-50/30 border border-slate-100 hover:border-cyan-200 rounded-xl p-4 text-left transition-all group"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-cyan-600 text-xs font-mono font-semibold">{a.number}</span>
                  <StatusBadge status={a.status} />
                  <PriorityBadge priority={a.priority} />
                </div>
                <span className="text-[10px] text-slate-400 whitespace-nowrap">{fmtDate(a.openDate)}</span>
              </div>
              <p className="text-slate-800 text-sm font-medium line-clamp-2 mb-2">{a.problemDescription || '—'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                {a.clientName && (
                  <span className="flex items-center gap-1">
                    <Building2 size={10} /> {a.clientName}
                  </span>
                )}
                {a.technician?.name && (
                  <span className="flex items-center gap-1">
                    <User size={10} /> {a.technician.name}
                  </span>
                )}
                {a.equipment && (
                  <span className="flex items-center gap-1">
                    <FileText size={10} /> {a.equipment}
                  </span>
                )}
                {a.tags?.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Tag size={10} /> {a.tags.length} tag(s)
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => p - 1)}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{page} / {data.totalPages}</span>
          <button
            disabled={page === data.totalPages}
            onClick={() => setPage(p => p + 1)}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30 transition-all"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {showNew && <NewAtendimentoModal onClose={() => setShowNew(false)} onCreated={handleCreated} />}
    </div>
  )
}
