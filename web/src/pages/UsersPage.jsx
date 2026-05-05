import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import { Plus, Search, Users, Loader2, Trash2, Pencil, X, CheckCircle, User } from 'lucide-react'

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

const EMPTY = { name: '', email: '', password: '', identificationNumber: '', workHourCost: '' }

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [userTypes, setUserTypes] = useState([])
  const [departments, setDepartments] = useState([])
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
      const [ur, tr, dr] = await Promise.all([api.getUsers(), api.getUserTypes(), api.getDepartments()])
      setUsers(ur.data || [])
      setUserTypes(tr.data || [])
      setDepartments(dr.data || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = users.filter(u =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.identificationNumber?.includes(search)
  )

  const openCreate = () => { setEditing(null); setForm(EMPTY); setModal(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({
      name: u.name || '',
      email: u.email || '',
      password: '',
      identificationNumber: u.identificationNumber || '',
      workHourCost: u.workHourCost || '',
      userTypeId: u.userType?.id || '',
      departmentId: u.department?.id || '',
    })
    setModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = { ...form }
      if (userTypes.find(t => t.id === payload.userTypeId)) {
        const t = userTypes.find(t => t.id === payload.userTypeId)
        payload.userType = { id: t.id, name: t.name }
      }
      if (departments.find(d => d.id === payload.departmentId)) {
        const d = departments.find(d => d.id === payload.departmentId)
        payload.department = { id: d.id, name: d.name }
      }
      delete payload.userTypeId
      delete payload.departmentId
      if (!payload.password) delete payload.password

      if (editing) {
        await api.updateUser(editing.id, payload)
        showToast('Usuário atualizado!')
      } else {
        await api.createUser(payload)
        showToast('Usuário criado!')
      }
      setModal(false)
      load()
    } catch {
      showToast('Erro ao salvar usuário', 'error')
    }
    setSaving(false)
  }

  const handleDelete = async (u) => {
    if (!confirm(`Excluir usuário "${u.name}"?`)) return
    try {
      await api.deleteUser(u.id)
      showToast('Usuário removido!')
      load()
    } catch {
      showToast('Erro ao excluir', 'error')
    }
  }

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <CheckCircle size={15} />
            {toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
            <p className="text-sm text-slate-500">{users.length} usuários cadastrados</p>
          </div>
          <button onClick={openCreate}
            className="flex items-center gap-2 bg-brand-mid hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />Novo usuário
          </button>
        </div>

        <div className="relative mb-5">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Buscar por nome, email ou identificação..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Identificação</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Depto.</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tipo</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-mid/10 flex items-center justify-center shrink-0">
                          <User size={14} className="text-brand-mid" />
                        </div>
                        <span className="font-medium text-slate-800">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{u.email || '—'}</td>
                    <td className="px-5 py-4 font-mono text-slate-700">{u.identificationNumber}</td>
                    <td className="px-5 py-4 text-slate-500 hidden lg:table-cell">{u.department?.name || '—'}</td>
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {u.userType?.name && (
                        <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-mid/10 text-brand-mid">{u.userType.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        <button onClick={() => openEdit(u)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-brand-mid transition-colors">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(u)}
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

        <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Editar Usuário' : 'Novo Usuário'}>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome completo *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Identificação *</label>
                <input required value={form.identificationNumber} onChange={e => setForm(f => ({ ...f, identificationNumber: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Senha {editing ? '(deixe vazio para manter)' : '*'}</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required={!editing}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de usuário</label>
                <select value={form.userTypeId || ''} onChange={e => setForm(f => ({ ...f, userTypeId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                  <option value="">Selecione...</option>
                  {userTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Departamento</label>
                <select value={form.departmentId || ''} onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                  <option value="">Selecione...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Custo/hora (R$)</label>
                <input value={form.workHourCost} onChange={e => setForm(f => ({ ...f, workHourCost: e.target.value }))}
                  placeholder="Ex: 25.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
              </div>
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
