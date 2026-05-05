import { useEffect, useState, useCallback } from 'react'
import { api } from '../../services/api'
import { Users, Search, Loader2, UserPlus, Pencil, Trash2, X, Save, RefreshCw } from 'lucide-react'
import { isIndustriaOperatorUser, isOperatorUserType } from '../../utils/industriaUsers'

function Modal({ user, departments, userTypes, onClose, onSave }) {
  const editing = !!user?.id
  const [form, setForm] = useState(
    editing
      ? {
          name: user.name || '',
          email: user.email || '',
          identificationNumber: user.identificationNumber || '',
          workHourCost: user.workHourCost || '',
          password: '',
          departmentId: user.department?.id || '',
          userTypeId:   user.userType?.id   || '',
        }
      : { name: '', email: '', identificationNumber: '', workHourCost: '', password: '', departmentId: '', userTypeId: '' }
  )
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')
  const operatorTypes = userTypes.filter(isOperatorUserType)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    if (!editing && !form.password.trim()) { setError('Senha é obrigatória para novos usuários'); return }
    setSaving(true)
    try {
      const dept = departments.find(d => d.id === form.departmentId)
      const type = operatorTypes.find(t => t.id === form.userTypeId)
      const payload = {
        name: form.name,
        email: form.email,
        identificationNumber: form.identificationNumber,
        workHourCost: form.workHourCost,
        ...(dept ? { department: { id: dept.id, name: dept.name } } : {}),
        ...(type ? { userType:   { id: type.id, name: type.name } } : {}),
      }
      if (form.password) payload.password = form.password
      if (editing) await api.updateUser(user.id, payload)
      else         await api.createUser(payload)
      onSave()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{editing ? 'Editar Usuário' : 'Novo Usuário'}</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          {[
            { label: 'Nome *',         key: 'name'                 },
            { label: 'Email',          key: 'email',    type: 'email' },
            { label: 'Identificação',  key: 'identificationNumber' },
            { label: 'Custo/hora',     key: 'workHourCost'         },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[key] || ''}
                onChange={e => set(key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
            <select value={form.departmentId || ''} onChange={e => set('departmentId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
              <option value="">Selecione...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Usuário</label>
            <select value={form.userTypeId || ''} onChange={e => set('userTypeId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400">
              <option value="">Selecione...</option>
              {operatorTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {editing ? 'Nova senha (deixe em branco para manter)' : 'Senha *'}
            </label>
            <input
              type="password"
              value={form.password || ''}
              onChange={e => set('password', e.target.value)}
              placeholder={editing ? '••••••••' : ''}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function IndustriaUsersPage() {
  const [data,       setData]       = useState({ items: [], total: 0 })
  const [departments, setDepts]     = useState([])
  const [userTypes,   setUserTypes] = useState([])
  const [page,       setPage]       = useState(1)
  const [q,          setQ]          = useState('')
  const [loading,    setLoading]    = useState(true)
  const [modal,      setModal]      = useState(null)
  const [deleting,   setDeleting]   = useState(null)
  const [delErr,     setDelErr]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const calls = [api.searchUsersPaginated({ q, page, pageSize: 50 })]
      if (!departments.length) calls.push(api.getDepartments(), api.getUserTypes())
      const [r, dRes, tRes] = await Promise.all(calls)
      const all = r.data?.items || []
      const filtered = all.filter(isIndustriaOperatorUser)
      setData({ items: filtered, total: filtered.length })
      if (dRes) setDepts(dRes.data || [])
      if (tRes) setUserTypes(tRes.data || [])
    } catch {}
    finally { setLoading(false) }
  }, [page, q])

  useEffect(() => { load() }, [load])

  const handleDelete = async () => {
    setDelErr('')
    try {
      await api.deleteUser(deleting.id)
      setDeleting(null)
      load()
    } catch (err) {
      setDelErr(err?.response?.data?.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-400">{data.total} operadores da indústria</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-blue-400 transition-colors">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button onClick={() => setModal('create')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-xl hover:bg-blue-700 transition-colors">
            <UserPlus size={15} /> Novo Usuário
          </button>
        </div>
      </div>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={e => { setQ(e.target.value); setPage(1) }}
          placeholder="Buscar por nome ou identificação..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        ) : data.items.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                {['Identificação', 'Nome', 'Departamento', 'Tipo', 'Custo/h', ''].map(h => (
                  <th key={h} className="py-3 px-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.items.map(u => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="py-3 px-5 text-xs font-mono text-slate-500">{u.identificationNumber || '—'}</td>
                  <td className="py-3 px-5 text-sm font-medium text-slate-800">{u.name}</td>
                  <td className="py-3 px-5 text-xs text-slate-500">{u.department?.name || '—'}</td>
                  <td className="py-3 px-5 text-xs text-slate-500">{u.userType?.name || '—'}</td>
                  <td className="py-3 px-5 text-xs text-slate-500">{u.workHourCost || '—'}</td>
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal(u)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => { setDeleting(u); setDelErr('') }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      {modal && (
        <Modal
          user={modal === 'create' ? null : modal}
          departments={departments}
          userTypes={userTypes}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load() }}
        />
      )}

      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <p className="text-sm font-medium text-slate-800 mb-1">Excluir usuário?</p>
            <p className="text-xs text-slate-500 mb-4">{deleting.name}</p>
            {delErr && <p className="text-xs text-red-600 mb-3 bg-red-50 px-2 py-1.5 rounded-lg">{delErr}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setDeleting(null); setDelErr('') }} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
              <button onClick={handleDelete} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
