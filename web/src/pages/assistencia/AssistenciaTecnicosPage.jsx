import { useState, useEffect, useCallback } from 'react'
import { api } from '../../services/api'
import {
  Plus, Search, RefreshCw, Users, Pencil, Trash2, X, Copy, Check,
} from 'lucide-react'

const EMPTY = { name: '', email: '', identificationNumber: '', password: '' }

const isAdminUser = (u) => {
  const t = (u?.userType?.name || '').toLowerCase()
  return t === 'admin' || t === 'setup' || t === 'administrador'
}

const isTecnicoUser = (u) => {
  const t = (u?.userType?.name || '').toLowerCase()
  return t.includes('tecnico') || t.includes('técnico')
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const handle = () => {
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={handle}
      title="Copiar ID"
      className="ml-1.5 p-1 rounded text-white/20 hover:text-orange-400 hover:bg-orange-500/10 transition-all"
    >
      {copied ? <Check size={11} className="text-green-400" /> : <Copy size={11} />}
    </button>
  )
}

function Modal({ tecnico, onClose, onSaved }) {
  const editing = !!tecnico
  const [form, setForm] = useState(editing ? {
    name:                 tecnico.name                 || '',
    email:                tecnico.email                || '',
    identificationNumber: tecnico.identificationNumber || '',
    password:             '',
  } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [meta, setMeta] = useState({ tecnicoType: null, assistDept: null })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  useEffect(() => {
    Promise.all([
      api.getUserTypes().catch(() => ({ data: [] })),
      api.getDepartments().catch(() => ({ data: [] })),
    ]).then(([ut, dep]) => {
      const types = ut.data || []
      const deps = dep.data || []
      const tecnicoType = types.find(t => {
        const n = (t.name || '').toLowerCase()
        return n.includes('tecnico') || n.includes('técnico')
      }) || null
      const assistDept = deps.find(d => {
        const n = (d.name || '').toLowerCase()
        return n.includes('assistencia') || n.includes('assistência')
      }) || null
      setMeta({ tecnicoType, assistDept })
    }).catch(() => {})
  }, [])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        userType: meta.tecnicoType ? { id: meta.tecnicoType.id || meta.tecnicoType._id, name: meta.tecnicoType.name } : undefined,
        department: meta.assistDept ? { id: meta.assistDept.id || meta.assistDept._id, name: meta.assistDept.name } : undefined,
      }
      if (editing) {
        if (!payload.password) delete payload.password
        await api.updateUser(tecnico.id, payload)
      } else {
        await api.createUser(payload)
      }
      onSaved()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const fields = [
    { key: 'name',                 label: 'Nome *',              placeholder: 'Nome completo' },
    { key: 'email',                label: 'E-mail',              placeholder: 'tecnico@coldline.com' },
    { key: 'identificationNumber', label: 'Nº de identificação', placeholder: '001234' },
    { key: 'password',             label: editing ? 'Nova senha (deixe em branco para manter)' : 'Senha *', placeholder: '••••••••', type: 'password' },
  ]

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold text-sm">
            {editing ? 'Editar técnico' : 'Novo técnico'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {fields.map(({ key, label, placeholder, type = 'text' }) => (
            <div key={key}>
              <label className="block text-xs text-white/50 mb-1.5">{label}</label>
              <input
                type={type}
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50"
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                required={key === 'name' || (!editing && key === 'password')}
              />
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-white/10 text-white/50 text-sm hover:text-white hover:border-white/20 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
            >
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AssistenciaTecnicosPage() {
  const [items, setItems]     = useState([])
  const [search, setSearch]   = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null) // null | 'new' | user object
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.searchUsersPaginated({ q: search || undefined, pageSize: 100 })
      setItems((r.data?.items || []).filter(u => !isAdminUser(u) && isTecnicoUser(u)))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    try {
      await api.deleteUser(deleting)
      setDeleting(null)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-lg">Técnicos</h1>
          <p className="text-white/40 text-xs mt-0.5">{items.length} cadastrados</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
        >
          <Plus size={14} /> Novo técnico
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none focus:border-orange-500/40"
            placeholder="Buscar por nome, e-mail ou identificação..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={load}
          className="p-2 text-white/30 hover:text-white/70 hover:bg-white/[0.05] rounded-lg transition-all"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Info banner */}
      <div className="mb-4 px-4 py-3 bg-orange-500/10 border border-orange-500/20 rounded-xl">
        <p className="text-orange-300 text-xs">
          O <span className="font-semibold">ID do técnico</span> é usado para atribuir Ordens de Serviço. Clique no ícone ao lado do ID para copiar.
        </p>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={18} className="animate-spin text-white/20" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <Users size={32} className="mb-3" />
          <p className="text-sm">Nenhum técnico encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(u => (
            <div
              key={u.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-center gap-4"
            >
              {/* Avatar placeholder */}
              <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                <span className="text-orange-400 text-sm font-bold">
                  {(u.name || '?')[0].toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-white font-medium text-sm">{u.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-white/35">
                  {u.email && <span>{u.email}</span>}
                  {u.identificationNumber && (
                    <span>Identificação: <span className="text-white/50">{u.identificationNumber}</span></span>
                  )}
                  {u.userType?.name && (
                    <span className="text-white/25">{u.userType.name}</span>
                  )}
                </div>

                {/* ID destacado */}
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-[10px] text-white/25">ID:</span>
                  <span className="font-mono text-[11px] text-orange-400/80 select-all">{u.id}</span>
                  <CopyBtn text={u.id} />
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setModal(u)}
                  className="p-2 text-white/25 hover:text-white/70 hover:bg-white/[0.05] rounded-lg transition-all"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => setDeleting(u.id)}
                  className="p-2 text-white/25 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {modal === 'new' && (
        <Modal onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}
      {modal && modal !== 'new' && (
        <Modal tecnico={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      {deleting && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e293b] rounded-2xl p-6 w-80 border border-white/[0.08] shadow-2xl">
            <p className="text-white text-sm mb-1 font-semibold">Excluir técnico?</p>
            <p className="text-white/40 text-xs mb-5">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleting(null)}
                className="flex-1 py-2 rounded-lg border border-white/10 text-white/50 text-sm hover:text-white transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-all"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
