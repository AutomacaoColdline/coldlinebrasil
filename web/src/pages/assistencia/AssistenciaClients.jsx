import { useState, useEffect, useCallback } from 'react'
import { clientApi } from '../../services/assistenciaApi'
import {
  Plus, Search, RefreshCw, Users, Pencil, Trash2, X, MapPin, Phone, Mail, FileText,
} from 'lucide-react'

const EMPTY = { name: '', document: '', address: '', phone: '', email: '' }
const onlyDigits = (v) => String(v || '').replace(/\D/g, '')
const formatCNPJ = (v) => {
  const d = onlyDigits(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function ClientModal({ client, onClose, onSaved }) {
  const [form, setForm] = useState(client ? {
    name:     client.name     || '',
    document: client.document || '',
    address:  client.address  || '',
    phone:    client.phone    || '',
    email:    client.email    || '',
  } : { ...EMPTY })
  const [saving, setSaving] = useState(false)
  const [loadingCNPJ, setLoadingCNPJ] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const lookupByCNPJ = async () => {
    const digits = onlyDigits(form.document)
    if (digits.length !== 14) {
      alert('Informe o CNPJ com 14 números para buscar.')
      return
    }
    setLoadingCNPJ(true)
    try {
      const { data } = await clientApi.lookupCNPJ(digits)
      setForm(f => ({
        ...f,
        document: formatCNPJ(data.document || digits),
        name: data.name || f.name,
        address: data.address || f.address,
        phone: data.phone || f.phone,
        email: data.email || f.email,
      }))
    } catch (err) {
      alert(err?.response?.data?.message || 'Não foi possível consultar CNPJ')
    } finally {
      setLoadingCNPJ(false)
    }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    setSaving(true)
    try {
      if (client) {
        await clientApi.update(client.id, form)
      } else {
        await clientApi.create(form)
      }
      onSaved()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1e293b] rounded-2xl w-full max-w-md border border-white/[0.08] shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
          <h2 className="text-white font-semibold text-sm">
            {client ? 'Editar cliente' : 'Novo cliente'}
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">CNPJ</label>
            <div className="flex gap-2">
              <input
                className="flex-1 bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50"
                placeholder="00.000.000/0001-00"
                value={form.document}
                onChange={e => set('document', formatCNPJ(e.target.value))}
                maxLength={18}
              />
              <button
                type="button"
                onClick={lookupByCNPJ}
                disabled={loadingCNPJ}
                className="px-4 py-2.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 transition-all"
              >
                {loadingCNPJ ? 'Buscando...' : 'Buscar'}
              </button>
            </div>
            <p className="text-[10px] text-white/30 mt-1">
              Digite apenas números do CNPJ e clique em Buscar para preencher automaticamente.
            </p>
          </div>

          {[
            { key: 'name',    label: 'Nome *',   placeholder: 'Nome do cliente ou empresa' },
            { key: 'address', label: 'Endereço', placeholder: 'Rua, número, bairro, cidade' },
            { key: 'phone',   label: 'Telefone', placeholder: '(67) 99999-9999' },
            { key: 'email',   label: 'E-mail',   placeholder: 'contato@empresa.com' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs text-white/50 mb-1.5">{label}</label>
              <input
                className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder-white/20 focus:outline-none focus:border-orange-500/50"
                placeholder={placeholder}
                value={form[key]}
                onChange={e => set(key, e.target.value)}
                required={key === 'name'}
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
              {saving ? 'Salvando...' : client ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function AssistenciaClients() {
  const [items, setItems]   = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modal, setModal]   = useState(null) // null | 'new' | client object

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await clientApi.search({ q: search || undefined, pageSize: 50 })
      setItems(r.data.items || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    if (!confirm('Deletar cliente? Esta ação não pode ser desfeita.')) return
    try {
      await clientApi.delete(id)
      load()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao deletar')
    }
  }

  const handleSaved = () => {
    setModal(null)
    load()
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-white font-bold text-lg">Clientes</h1>
          <p className="text-white/40 text-xs mt-0.5">{items.length} cadastrados</p>
        </div>
        <button
          onClick={() => setModal('new')}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all"
        >
          <Plus size={14} /> Novo cliente
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg pl-8 pr-3 py-2 text-white text-xs placeholder-white/20 focus:outline-none focus:border-orange-500/40"
            placeholder="Buscar por nome, documento, telefone ou e-mail..."
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

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <RefreshCw size={18} className="animate-spin text-white/20" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
          <Users size={32} className="mb-3" />
          <p className="text-sm">Nenhum cliente encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(c => (
            <div
              key={c.id}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-4 flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm mb-1">{c.name}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/35">
                  {c.document && (
                    <span className="flex items-center gap-1"><FileText size={10} /> {c.document}</span>
                  )}
                  {c.address && (
                    <span className="flex items-center gap-1"><MapPin size={10} /> {c.address}</span>
                  )}
                  {c.phone && (
                    <span className="flex items-center gap-1"><Phone size={10} /> {c.phone}</span>
                  )}
                  {c.email && (
                    <span className="flex items-center gap-1"><Mail size={10} /> {c.email}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => setModal(c)}
                  className="p-2 text-white/25 hover:text-white/70 hover:bg-white/[0.05] rounded-lg transition-all"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="p-2 text-white/25 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal === 'new' && (
        <ClientModal onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
      {modal && modal !== 'new' && (
        <ClientModal client={modal} onClose={() => setModal(null)} onSaved={handleSaved} />
      )}
    </div>
  )
}
