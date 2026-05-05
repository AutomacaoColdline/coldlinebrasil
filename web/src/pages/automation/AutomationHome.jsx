import { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { automationApi } from '../../services/automationApi'
import { StickyNote, Plus, Trash2, Copy, Check, X, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

const NOTE_TYPES = {
  1: { label: 'Senha',            bg: 'bg-slate-800 text-white'           },
  2: { label: 'Docker Comandos',  bg: 'bg-cyan-600 text-white'            },
  3: { label: 'Linux Comandos',   bg: 'bg-green-600 text-white'           },
  4: { label: 'Windows Comandos', bg: 'bg-blue-600 text-white'            },
  5: { label: 'Avisos',           bg: 'bg-yellow-400 text-yellow-900'     },
  6: { label: 'Lembretes',        bg: 'bg-slate-400 text-white'           },
}

function Chip({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <span className="inline-flex items-center gap-1.5 bg-slate-100 rounded-full px-2.5 py-0.5 text-xs text-slate-700 max-w-[200px]">
      <span className="truncate">{text}</span>
      <button onClick={copy} className="shrink-0 text-slate-400 hover:text-slate-600">
        {copied ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
      </button>
    </span>
  )
}

function NoteViewer({ note, onClose, onSaved }) {
  const isNew   = !note?.id
  const [mode, setMode]   = useState(isNew ? 'create' : 'view')
  const [form, setForm]   = useState(note || { name: '', noteType: 1, element: [] })
  const [saving, setSaving] = useState(false)
  const [elemText, setElemText] = useState((note?.element || []).join('\n'))

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    setSaving(true)
    const payload = { ...form, element: elemText.split('\n').map(s => s.trim()).filter(Boolean) }
    try {
      if (form.id) await automationApi.updateNote(form.id, payload)
      else          await automationApi.createNote(payload)
      onSaved()
    } catch {}
    setSaving(false)
  }

  const t = NOTE_TYPES[form.noteType] || NOTE_TYPES[1]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-slate-800">{mode === 'create' ? 'Nova Nota' : form.name}</h3>
            {mode === 'view' && <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.bg}`}>{t.label}</span>}
          </div>
          <div className="flex items-center gap-2">
            {mode === 'view' && <button onClick={() => setMode('edit')} className="text-xs text-blue-500 hover:underline">Editar</button>}
            <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {mode === 'view' ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {(form.element || []).map((el, i) => <Chip key={i} text={el} />)}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
                <input value={form.name} onChange={e => set('name', e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Tipo</label>
                <select value={form.noteType} onChange={e => set('noteType', Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
                  {Object.entries(NOTE_TYPES).map(([k, { label }]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Elementos (um por linha)</label>
                <textarea value={elemText} onChange={e => setElemText(e.target.value)} rows={6}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none" />
              </div>
            </div>
          )}
        </div>

        {mode !== 'view' && (
          <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
            <button onClick={save} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50">
              {saving ? <Loader2 size={13} className="animate-spin" /> : null}
              Salvar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function AutomationHome() {
  useOutletContext()
  const [data, setData]     = useState({ items: [], totalPages: 1, total: 0 })
  const [filter, setFilter] = useState({ name: '', element: '', noteType: '', page: 1, pageSize: 12 })
  const [loading, setLoad]  = useState(true)
  const [viewer, setViewer] = useState(null)   // null | note | 'new'
  const [deleting, setDel]  = useState(null)

  const load = useCallback(async () => {
    setLoad(true)
    try {
      const r = await automationApi.getNotes(filter)
      setData(r.data)
    } catch {}
    setLoad(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await automationApi.deleteNote(id)
    setDel(null)
    if (data.items.length === 1 && filter.page > 1) {
      setFilter(f => ({ ...f, page: f.page - 1 }))
    } else {
      load()
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notas</h1>
          <p className="text-sm text-slate-400">{data.total} notas</p>
        </div>
        <button onClick={() => setViewer('new')}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm rounded-xl hover:bg-cyan-400 transition-colors">
          <Plus size={15} /> Nova Nota
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={filter.name} onChange={e => setFilter(f => ({ ...f, name: e.target.value, page: 1 }))}
            placeholder="Buscar por nome..."
            className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
        </div>
        <input value={filter.element} onChange={e => setFilter(f => ({ ...f, element: e.target.value, page: 1 }))}
          placeholder="Elemento..."
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 w-40" />
        <select value={filter.noteType} onChange={e => setFilter(f => ({ ...f, noteType: e.target.value, page: 1 }))}
          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
          <option value="">Todos os tipos</option>
          {Object.entries(NOTE_TYPES).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
      ) : (data.items || []).length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
          <StickyNote size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhuma nota encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(data.items || []).map(note => {
            const t = NOTE_TYPES[note.noteType] || NOTE_TYPES[1]
            return (
              <div key={note.id} onClick={() => setViewer(note)}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md cursor-pointer transition-all">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-50">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${t.bg}`}>{t.label}</span>
                  <button onClick={e => { e.stopPropagation(); setDel(note) }}
                    className="text-slate-300 hover:text-red-400 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
                <div className="px-4 py-3">
                  <p className="text-sm font-semibold text-slate-800 mb-2 truncate">{note.name}</p>
                  <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                    {(note.element || []).slice(0, 4).map((el, i) => (
                      <span key={i} onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(el) }}
                        className="inline-flex items-center gap-1 bg-slate-50 hover:bg-slate-100 rounded-full px-2 py-0.5 text-xs text-slate-600 cursor-pointer transition-colors">
                        <Copy size={9} />
                        <span className="truncate max-w-[120px]">{el}</span>
                      </span>
                    ))}
                    {note.element?.length > 4 && (
                      <span className="text-xs text-slate-400">+{note.element.length - 4}</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setFilter(f => ({ ...f, page: Math.max(1, f.page - 1) }))} disabled={filter.page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{filter.page} / {data.totalPages}</span>
          <button onClick={() => setFilter(f => ({ ...f, page: Math.min(data.totalPages, f.page + 1) }))} disabled={filter.page === data.totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Note Viewer */}
      {viewer && (
        <NoteViewer
          note={viewer === 'new' ? null : viewer}
          onClose={() => setViewer(null)}
          onSaved={() => { setViewer(null); load() }}
        />
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <p className="text-sm font-semibold text-slate-800 mb-1">{deleting.name}</p>
            <p className="text-xs text-slate-500 mb-4">
              {NOTE_TYPES[deleting.noteType]?.label} · {deleting.element?.length || 0} elementos
            </p>
            <p className="text-sm text-slate-600 mb-4">Deseja excluir esta nota?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDel(null)} className="px-3 py-2 text-sm text-slate-500">Cancelar</button>
              <button onClick={() => handleDelete(deleting.id)} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
