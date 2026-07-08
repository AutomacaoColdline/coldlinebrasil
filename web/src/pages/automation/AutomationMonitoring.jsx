import { useEffect, useState, useCallback } from 'react'
import { automationApi } from '../../services/automationApi'
import { copyTextToClipboard } from '../../utils/clipboard'
import {
  Monitor, Plus, Trash2, Copy, Check, X, Search,
  Loader2, ChevronLeft, ChevronRight, Pencil, MapPin,
  Wifi, Server, Network
} from 'lucide-react'

/* ── small copy button ─────────────────────────────────────────────── */
function CopyBtn({ text, className = '' }) {
  const [ok, setOk] = useState(false)
  if (!text) return null
  const copy = (e) => {
    e.stopPropagation()
    copyTextToClipboard(text).then((copied) => {
      if (!copied) return
      setOk(true)
      setTimeout(() => setOk(false), 1500)
    })
  }
  return (
    <button onClick={copy}
      className={`shrink-0 text-slate-400 hover:text-slate-700 transition-colors ${className}`}>
      {ok ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
    </button>
  )
}

/* ── row shown inside card ─────────────────────────────────────────── */
function CardRow({ label, value, mono = false }) {
  if (!value) return null
  const truncated = value.length > 38 ? value.slice(0, 36) + '…' : value
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <span className="text-slate-400 shrink-0">{label}</span>
      <span className={`flex items-center gap-1 text-slate-700 min-w-0 ${mono ? 'font-mono' : 'font-medium'}`}>
        <span className="truncate">{truncated}</span>
        <CopyBtn text={value} />
      </span>
    </div>
  )
}

/* ── detail / edit modal ───────────────────────────────────────────── */
function MonitoringModal({ item, onClose, onSaved, types }) {
  const isNew = !item?.id
  const [mode, setMode]       = useState(isNew ? 'edit' : 'view')
  const [form, setForm]       = useState(item || {
    identificador:'', unidade:'', estado:'', cidade:'',
    ihm:'', gateway:'', clp:[], macs:[], masc:'',
    idAnydesk:'', idRustdesk:'', idTeamViewer:'', monitoringType: null,
  })
  const [saving, setSaving]   = useState(false)
  const [clpText, setClpText] = useState((item?.clp  || []).join('\n'))
  const [macsText, setMacs]   = useState((item?.macs || []).join('\n'))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const payload = {
        ...form,
        clp:  clpText.split('\n').map(s => s.trim()).filter(Boolean),
        macs: macsText.split('\n').map(s => s.trim()).filter(Boolean),
      }
      if (form.id) await automationApi.updateMonitoring(form.id, payload)
      else          await automationApi.createMonitoring(payload)
      onSaved()
    } catch {}
    setSaving(false)
  }

  const clps  = form.id ? (form.clp  || []) : clpText.split('\n').map(s => s.trim()).filter(Boolean)
  const macs  = form.id ? (form.macs || []) : macsText.split('\n').map(s => s.trim()).filter(Boolean)

  /* copy-chip used in view mode */
  function Chip({ label, value, accent = 'slate' }) {
    const [ok, setOk] = useState(false)
    if (!value) return null
    const colors = {
      cyan:   'bg-cyan-50 border-cyan-200 text-cyan-800',
      violet: 'bg-violet-50 border-violet-200 text-violet-800',
      amber:  'bg-amber-50 border-amber-200 text-amber-800',
      slate:  'bg-slate-50 border-slate-200 text-slate-700',
    }
    return (
      <button onClick={(e) => {
        e.stopPropagation()
        copyTextToClipboard(value).then((copied) => {
          if (!copied) return
          setOk(true)
          setTimeout(() => setOk(false), 1500)
        })
      }}
        className={`flex items-center gap-2 border rounded-xl px-3 py-2 text-left w-full hover:opacity-80 transition-all ${colors[accent]}`}>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60 mb-0.5">{label}</p>
          <p className="text-sm font-mono font-semibold truncate">{value}</p>
        </div>
        {ok ? <Check size={13} className="text-green-500 shrink-0" /> : <Copy size={13} className="shrink-0 opacity-40" />}
      </button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center shrink-0">
              <Monitor size={16} className="text-cyan-600" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900 truncate">
                {isNew ? 'Novo Monitoramento' : (form.unidade || 'Monitoramento')}
              </h3>
              <div className="flex items-center gap-2">
                {form.identificador && (
                  <span className="text-xs text-slate-400 font-mono">{form.identificador}</span>
                )}
                {(form.estado || form.cidade) && (
                  <span className="text-xs text-slate-400 flex items-center gap-0.5">
                    <MapPin size={9} /> {[form.cidade, form.estado].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>
            </div>
            {form.monitoringType?.name && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-700 font-semibold border border-cyan-200 shrink-0">
                {form.monitoringType.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {mode === 'view' && (
              <button onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                <Pencil size={12} /> Editar
              </button>
            )}
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 transition-colors">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {mode === 'view' ? (
            <div className="space-y-5">

              {/* remote access */}
              {(form.idRustdesk || form.idAnydesk || form.idTeamViewer) && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wifi size={11} /> Acesso Remoto
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Chip label="RustDesk"   value={form.idRustdesk}   accent="cyan"   />
                    <Chip label="AnyDesk"    value={form.idAnydesk}    accent="violet" />
                    <Chip label="TeamViewer" value={form.idTeamViewer} accent="amber"  />
                  </div>
                </div>
              )}

              {/* identificador */}
              {form.identificador && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Identificador</p>
                  <Chip label="ID" value={form.identificador} accent="slate" />
                </div>
              )}

              {/* network */}
              {(form.ihm || form.gateway || form.masc) && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Server size={11} /> Rede
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Chip label="IHM"     value={form.ihm}     accent="slate" />
                    <Chip label="Gateway" value={form.gateway} accent="slate" />
                    <Chip label="Máscara" value={form.masc}    accent="slate" />
                  </div>
                </div>
              )}

              {/* CLPs */}
              {clps.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">CLPs / Notas de acesso</p>
                  <div className="space-y-1.5">
                    {clps.map((c, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-slate-700 break-all leading-relaxed">{c}</span>
                        <CopyBtn text={c} className="mt-0.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* MACs */}
              {macs.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">MACs / Observações</p>
                  <div className="space-y-1.5">
                    {macs.map((m, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
                        <span className="text-xs font-mono text-slate-700 break-all leading-relaxed">{m}</span>
                        <CopyBtn text={m} className="mt-0.5" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* location */}
              {(form.cidade || form.estado) && (
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin size={11} />
                  {[form.cidade, form.estado].filter(Boolean).join(' — ')}
                </div>
              )}
            </div>

          ) : (
            /* edit / create */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Identificador', key: 'identificador' },
                  { label: 'Unidade',       key: 'unidade'       },
                  { label: 'Estado',        key: 'estado'        },
                  { label: 'Cidade',        key: 'cidade'        },
                  { label: 'IHM',           key: 'ihm'           },
                  { label: 'Gateway',       key: 'gateway'       },
                  { label: 'Máscara',       key: 'masc'          },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                    <input value={form[key] || ''} onChange={e => set(key, e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                  </div>
                ))}
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5 pt-1">
                  <Wifi size={11} /> Acesso Remoto
                </p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'RustDesk',   key: 'idRustdesk'   },
                    { label: 'AnyDesk',    key: 'idAnydesk'    },
                    { label: 'TeamViewer', key: 'idTeamViewer' },
                  ].map(({ label, key }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
                      <input value={form[key] || ''} onChange={e => set(key, e.target.value)}
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">CLPs / Notas de acesso (uma por linha)</label>
                  <textarea value={clpText} onChange={e => setClpText(e.target.value)} rows={5}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">MACs / Observações (uma por linha)</label>
                  <textarea value={macsText} onChange={e => setMacs(e.target.value)} rows={5}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/30 resize-none" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select value={form.monitoringType?.id || ''} onChange={e => {
                  const t = types.find(t => t.id === e.target.value)
                  set('monitoringType', t ? { id: t.id, name: t.name } : null)
                }} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30">
                  <option value="">Sem tipo</option>
                  {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          {mode === 'view' ? (
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800">Fechar</button>
          ) : (
            <>
              <button onClick={() => isNew ? onClose() : setMode('view')}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-800">Cancelar</button>
              <button onClick={save} disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-cyan-500 text-white text-sm font-medium rounded-xl hover:bg-cyan-400 disabled:opacity-50 transition-colors">
                {saving && <Loader2 size={13} className="animate-spin" />}
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── main page ─────────────────────────────────────────────────────── */
export default function AutomationMonitoring() {
  const [data, setData]     = useState({ items: [], totalPages: 1, total: 0 })
  const [types, setTypes]   = useState([])
  const [search, setSearch] = useState('')
  const [typeId, setTypeId] = useState('')
  const [page, setPage]     = useState(1)
  const PAGE_SIZE           = 12
  const [loading, setLoad]  = useState(true)
  const [error, setError]   = useState(null)
  const [modal, setModal]   = useState(null)
  const [deleting, setDel]  = useState(null)

  const load = useCallback(async () => {
    setLoad(true)
    setError(null)
    try {
      const params = { page, pageSize: PAGE_SIZE }
      if (search) params.q               = search
      if (typeId) params.monitoringTypeId = typeId
      const [r, t] = await Promise.all([
        automationApi.getMonitorings(params),
        types.length ? Promise.resolve({ data: types }) : automationApi.getMonitoringTypes(),
      ])
      setData(r.data)
      if (!types.length) setTypes(t.data || [])
    } catch (e) {
      setError(e?.response?.data?.message || 'Erro ao carregar dados')
    }
    setLoad(false)
  }, [search, typeId, page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await automationApi.deleteMonitoring(id)
    setDel(null)
    load()
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">

      {/* header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Monitoramento</h1>
          <p className="text-sm text-slate-400">{data.total} equipamentos</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm font-medium rounded-xl hover:bg-cyan-400 transition-colors">
          <Plus size={15} /> Novo
        </button>
      </div>

      {/* search */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
            placeholder="Buscar por unidade, identificador, IHM, gateway, CLP…"
            className="w-full pl-9 pr-8 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
          {search && (
            <button onClick={() => { setSearch(''); setPage(1) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <X size={13} />
            </button>
          )}
        </div>
        <select value={typeId} onChange={e => { setTypeId(e.target.value); setPage(1) }}
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 min-w-[140px]">
          <option value="">Todos os tipos</option>
          {types.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>

      {/* erro */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
          {error}
        </div>
      )}

      {/* grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-300" />
        </div>
      ) : (data.items || []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-24 text-center">
          <Monitor size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum equipamento encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(data.items || []).map(item => (
            <MonitoringCard
              key={item.id}
              item={item}
              onClick={() => setModal(item)}
              onDelete={e => { e.stopPropagation(); setDel(item) }}
            />
          ))}
        </div>
      )}

      {/* pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{page} / {data.totalPages}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === data.totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* modals */}
      {modal && (
        <MonitoringModal
          item={modal === 'new' ? null : modal}
          types={types}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load() }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-none md:rounded-2xl p-4 md:p-6 w-full md:w-80 shadow-xl">
            <p className="text-sm font-semibold text-slate-800 mb-0.5">{deleting.unidade}</p>
            <p className="text-xs text-slate-500 mb-4">{deleting.identificador}</p>
            <p className="text-sm text-slate-600 mb-5">Deseja excluir este equipamento?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDel(null)} className="px-3 py-2 text-sm text-slate-500">Cancelar</button>
              <button onClick={() => handleDelete(deleting.id)}
                className="px-3 py-2 text-sm bg-red-500 text-white rounded-xl hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── card component ────────────────────────────────────────────────── */
function MonitoringCard({ item, onClick, onDelete }) {
  const hasNetwork  = item.ihm || item.gateway
  const hasRemote   = item.idRustdesk || item.idAnydesk || item.idTeamViewer
  const hasClp      = item.clp?.length > 0
  const hasMacs     = item.macs?.length > 0

  return (
    <div onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all group flex flex-col">

      {/* header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-800 leading-tight line-clamp-2">{item.unidade || '—'}</p>
          {(item.cidade || item.estado) && (
            <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-0.5">
              <MapPin size={9} className="shrink-0" />
              {[item.cidade, item.estado].filter(Boolean).join(', ')}
            </p>
          )}
        </div>
        <button onClick={onDelete}
          className="text-slate-200 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 ml-2 shrink-0 mt-0.5">
          <Trash2 size={13} />
        </button>
      </div>

      {/* body — all available info */}
      <div className="px-4 pb-4 flex-1 space-y-1.5" onClick={e => e.stopPropagation()}>

        {item.identificador && (
          <CardRow label="ID" value={item.identificador} mono />
        )}

        {item.ihm && (
          <CardRow label="IHM" value={item.ihm} mono />
        )}

        {item.gateway && (
          <CardRow label="Gateway" value={item.gateway} mono />
        )}

        {hasRemote && (
          <>
            {item.idRustdesk   && <CardRow label="RustDesk"   value={item.idRustdesk}   mono />}
            {item.idAnydesk    && <CardRow label="AnyDesk"    value={item.idAnydesk}    mono />}
            {item.idTeamViewer && <CardRow label="TeamViewer" value={item.idTeamViewer} mono />}
          </>
        )}

        {hasClp && (
          <div className="pt-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">CLP / Acesso</p>
            {item.clp.slice(0, 2).map((c, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="font-mono truncate">{c.length > 40 ? c.slice(0, 38) + '…' : c}</span>
                <CopyBtn text={c} />
              </div>
            ))}
            {item.clp.length > 2 && (
              <p className="text-[11px] text-slate-400 mt-0.5">+{item.clp.length - 2} mais…</p>
            )}
          </div>
        )}

        {hasMacs && (
          <div className="pt-0.5">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">MACs / Obs</p>
            {item.macs.slice(0, 2).map((m, i) => (
              <div key={i} className="flex items-center gap-1 text-xs text-slate-600">
                <span className="font-mono truncate">{m.length > 40 ? m.slice(0, 38) + '…' : m}</span>
                <CopyBtn text={m} />
              </div>
            ))}
            {item.macs.length > 2 && (
              <p className="text-[11px] text-slate-400 mt-0.5">+{item.macs.length - 2} mais…</p>
            )}
          </div>
        )}

        {/* empty state */}
        {!item.identificador && !hasNetwork && !hasRemote && !hasClp && !hasMacs && (
          <p className="text-xs text-slate-300 italic">Sem detalhes cadastrados</p>
        )}
      </div>

      {/* footer badge */}
      {item.monitoringType?.name && (
        <div className="px-4 py-2 border-t border-slate-50">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-semibold border border-cyan-100">
            {item.monitoringType.name}
          </span>
        </div>
      )}
    </div>
  )
}
