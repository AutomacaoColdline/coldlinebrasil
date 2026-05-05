import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import { Plus, Search, Cog, Loader2, Trash2, Pencil, X, CheckCircle } from 'lucide-react'

const STATUS_MAP = {
  1: { label: 'Aguardando', color: 'bg-slate-100 text-slate-600' },
  2: { label: 'Em Progresso', color: 'bg-blue-100 text-blue-700' },
  3: { label: 'Em Ocorrência', color: 'bg-orange-100 text-orange-700' },
  4: { label: 'Retrabalho', color: 'bg-purple-100 text-purple-700' },
  5: { label: 'Finalizada', color: 'bg-green-100 text-green-700' },
  6: { label: 'Parada', color: 'bg-red-100 text-red-700' },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] || { label: 'Desconhecido', color: 'bg-slate-100 text-slate-500' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      {s.label}
    </span>
  )
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={16} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const EMPTY = { customerName: '', identificationNumber: '', phase: '', voltage: '', status: 1 }

export default function MachinesPage() {
  const [machines, setMachines] = useState([])
  const [machineTypes, setMachineTypes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [mr, tr] = await Promise.all([api.getMachines(), api.getMachineTypes()])
      setMachines(mr.data || [])
      setMachineTypes(tr.data || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = machines.filter(m =>
    !search || m.identificationNumber?.toLowerCase().includes(search.toLowerCase()) ||
    m.customerName?.toLowerCase().includes(search.toLowerCase())
  )

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (m) => {
    setEditing(m)
    setForm({
      customerName: m.customerName || '',
      identificationNumber: m.identificationNumber || '',
      phase: m.phase || '',
      voltage: m.voltage || '',
      status: m.status || 1,
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editing) {
        await api.updateMachine(editing.id, form)
        showToast('Máquina atualizada!')
      } else {
        await api.createMachine(form)
        showToast('Máquina criada!')
      }
      setModal(false)
      load()
    } catch {
      showToast('Erro ao salvar máquina', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (m) => {
    if (!confirm(`Excluir máquina "${m.identificationNumber}"?`)) return
    try {
      await api.deleteMachine(m.id)
      showToast('Máquina removida!')
      load()
    } catch {
      showToast('Erro ao excluir', 'error')
    }
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {/* Toast */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <CheckCircle size={15} />
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Máquinas</h1>
            <p className="text-sm text-slate-500">{machines.length} máquinas cadastradas</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-brand-mid hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />
            Nova máquina
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por código ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid"
          />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 size={24} className="animate-spin text-slate-300" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Cog size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhuma máquina encontrada</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Identificação</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Fase</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tensão</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(m => (
                  <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-mono font-medium text-slate-800">{m.identificationNumber}</td>
                    <td className="px-5 py-4 text-slate-600">{m.customerName || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{m.phase || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{m.voltage || '—'}</td>
                    <td className="px-5 py-4"><StatusBadge status={m.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-mid transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(m)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Modal */}
        <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Máquina' : 'Nova Máquina'}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Identificação *</label>
                <input required value={form.identificationNumber} onChange={e => setForm(f => ({ ...f, identificationNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Cliente</label>
                <input value={form.customerName} onChange={e => setForm(f => ({ ...f, customerName: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Fase</label>
                <input value={form.phase} onChange={e => setForm(f => ({ ...f, phase: e.target.value }))}
                  placeholder="Ex: Trifásico"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tensão</label>
                <input value={form.voltage} onChange={e => setForm(f => ({ ...f, voltage: e.target.value }))}
                  placeholder="Ex: 220V"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                {Object.entries(STATUS_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-brand-mid hover:bg-brand-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Salvar' : 'Criar'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
