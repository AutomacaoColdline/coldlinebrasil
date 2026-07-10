import { useEffect, useState, useCallback } from 'react'
import { api } from '../../services/api'
import { GRANULAR_SERVICES, hasServiceAccess } from '../../context/AuthContext'
import {
  Search, Loader2, Users, UserPlus, Save, X, Pencil, Trash2, KeyRound,
  Building2, UserCog, ShieldCheck, AlertCircle, ChevronRight,
} from 'lucide-react'

const SERVICE_LABELS = {
  industria: 'Indústria',
  automation: 'Automação',
  departamento: 'Departamento',
  pesquisa: 'Pesquisa',
}

const ALL_SERVICES = [...GRANULAR_SERVICES, 'pesquisa']

const TABS = [
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'departments', label: 'Departamentos', icon: Building2 },
  { key: 'userTypes', label: 'Tipos de Usuário', icon: UserCog },
]

function Toggle({ checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${
        checked ? 'bg-emerald-500' : 'bg-slate-200'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-4' : ''
        }`}
      />
    </button>
  )
}

function Avatar({ name }) {
  const initials = name
    ? name.split(' ').map((s) => s[0]).join('').slice(0, 2).toUpperCase()
    : '??'
  return (
    <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-700 shrink-0">
      {initials}
    </div>
  )
}

function isAdminUser(u) {
  const typeName = (u.userType?.name || '').toLowerCase()
  return typeName === 'admin' || typeName === 'setup' || typeName === 'administrador'
}

/* ────────────── Editor Modal ────────────── */

function EditUserModal({ user, departments, userTypes, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    identificationNumber: user.identificationNumber || '',
    departmentId: user.department?.id || '',
    userTypeId: user.userType?.id || '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      const dept = departments.find((d) => d.id === form.departmentId)
      const type = userTypes.find((t) => t.id === form.userTypeId)
      await api.updateUser(user.id, {
        name: form.name,
        email: form.email,
        identificationNumber: form.identificationNumber,
        ...(dept ? { department: { id: dept.id, name: dept.name } } : {}),
        ...(type ? { userType: { id: type.id, name: type.name } } : {}),
      })
      onSaved()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Editar Usuário</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          {[
            { label: 'Nome *', key: 'name' },
            { label: 'Email', key: 'email', type: 'email' },
            { label: 'Identificação', key: 'identificationNumber' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[key] || ''}
                onChange={(e) => set(key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
            <select value={form.departmentId || ''} onChange={(e) => set('departmentId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="">Selecione...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Usuário</label>
            <select value={form.userTypeId || ''} onChange={(e) => set('userTypeId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="">Selecione...</option>
              {userTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ────────────── Reset Password Modal ────────────── */

function ResetPasswordModal({ user, onClose, onSaved }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setError('')
    if (!password || password.length < 6) { setError('A senha deve ter no mínimo 6 caracteres'); return }
    if (password !== confirm) { setError('As senhas não conferem'); return }
    setSaving(true)
    try {
      await api.adminSetPassword(user.id, password)
      onSaved()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao redefinir senha')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Redefinir Senha</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-slate-500">
            Redefinindo senha de <strong>{user.name}</strong>. O usuário precisará trocar a senha no próximo acesso.
          </p>
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nova Senha</label>
            <input type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Confirmar Senha</label>
            <input type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            Redefinir
          </button>
        </div>
      </div>
    </div>
  )
}

/* ────────────── Create User Modal ────────────── */

function CreateUserModal({ departments, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', departmentId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    try {
      const dept = departments.find((d) => d.id === form.departmentId)
      await api.createUser({
        name: form.name,
        email: form.email,
        ...(dept ? { department: { id: dept.id, name: dept.name } } : {}),
      })
      onCreated()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao criar usuário')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Novo Usuário</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          {[
            { label: 'Nome *', key: 'name' },
            { label: 'Email', key: 'email', type: 'email' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
              <input
                type={type || 'text'}
                value={form[key] || ''}
                onChange={(e) => set(key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
            <select value={form.departmentId || ''} onChange={(e) => set('departmentId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="">Selecione...</option>
              {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5">
            <p className="text-xs text-slate-500">
              A senha inicial será <strong>12345678</strong>. O usuário precisará trocá-la no primeiro acesso.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Criar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ────────────── Inline Editor for Dept/UserType ────────────── */

function InlineEditor({ value, onSave, onCancel, onDelete }) {
  const [edit, setEdit] = useState(value)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!edit.trim()) return
    setSaving(true)
    try {
      await onSave(edit.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={edit}
        onChange={(e) => setEdit(e.target.value)}
        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button onClick={handleSave} disabled={saving || !edit.trim()}
        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg disabled:opacity-40">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
      </button>
      {onDelete && (
        <button onClick={onDelete}
          className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
          <Trash2 size={14} />
        </button>
      )}
      <button onClick={onCancel} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
        <X size={14} />
      </button>
    </div>
  )
}

/* ────────────── Main Page ────────────── */

export default function AccessControlPage() {
  const [tab, setTab] = useState('users')

  // Users
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [userTypes, setUserTypes] = useState([])
  const [q, setQ] = useState('')
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [savingKey, setSavingKey] = useState(null)
  const [error, setError] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [resettingPassword, setResettingPassword] = useState(null)

  // Dept/UserType
  const [deptItems, setDeptItems] = useState([])
  const [typeItems, setTypeItems] = useState([])
  const [deptLoading, setDeptLoading] = useState(false)
  const [typeLoading, setTypeLoading] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [editingType, setEditingType] = useState(null)
  const [creatingDept, setCreatingDept] = useState(false)
  const [creatingType, setCreatingType] = useState(false)

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setError('')
    try {
      const calls = [api.searchUsersPaginated({ q, page: 1, pageSize: 200 })]
      if (!departments.length) calls.push(api.getDepartments(), api.getUserTypes())
      const [r, dRes, tRes] = await Promise.all(calls)
      setUsers(r.data?.items || [])
      if (dRes) setDepartments(dRes.data || [])
      if (tRes) setUserTypes(tRes.data || [])
    } catch {
      setError('Erro ao carregar usuários')
    } finally {
      setLoadingUsers(false)
    }
  }, [q])

  const loadDepts = useCallback(async () => {
    setDeptLoading(true)
    try {
      const { data } = await api.getDepartments()
      setDeptItems(data || [])
    } catch {
      setError('Erro ao carregar departamentos')
    } finally {
      setDeptLoading(false)
    }
  }, [])

  const loadTypes = useCallback(async () => {
    setTypeLoading(true)
    try {
      const { data } = await api.getUserTypes()
      setTypeItems(data || [])
    } catch {
      setError('Erro ao carregar tipos de usuário')
    } finally {
      setTypeLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])
  useEffect(() => { if (tab === 'departments') loadDepts() }, [tab, loadDepts])
  useEffect(() => { if (tab === 'userTypes') loadTypes() }, [tab, loadTypes])

  const servicesFor = (u) => {
    const explicit = Array.isArray(u.allowedServices) ? u.allowedServices : null
    if (explicit) return explicit
    return []
  }

  const toggleService = async (u, service) => {
    if (isAdminUser(u)) return
    const current = servicesFor(u)
    const next = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service]

    const key = `${u.id}:${service}`
    setSavingKey(key)
    setError('')
    try {
      await api.updateUserServices(u.id, next)
      setUsers((prev) => prev.map((it) => (it.id === u.id ? { ...it, allowedServices: next } : it)))
    } catch {
      setError('Erro ao atualizar acesso')
    } finally {
      setSavingKey(null)
    }
  }

  const handleDeleteUser = async (u) => {
    if (!window.confirm(`Tem certeza que deseja excluir "${u.name}"?`)) return
    try {
      await api.deleteUser(u.id)
      loadUsers()
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao excluir usuário')
    }
  }

  // Group users by department
  const groupedUsers = users.reduce((acc, u) => {
    const deptName = u.department?.name || 'Sem departamento'
    if (!acc[deptName]) acc[deptName] = []
    acc[deptName].push(u)
    return acc
  }, {})

  const sortedDeptNames = Object.keys(groupedUsers).sort()

  /* ────────── Render ────────── */

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Controle de Acessos</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-xl p-1 w-fit">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl mb-6">
          <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
          <p className="text-red-600 text-sm leading-snug">{error}</p>
        </div>
      )}

      {/* ══════ Users Tab ══════ */}
      {tab === 'users' && (
        <>
          <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 max-w-sm">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar por nome ou identificação..."
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <UserPlus size={15} /> Novo Usuário
            </button>
          </div>

          {loadingUsers ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
          ) : users.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedDeptNames.map((deptName) => (
                <div key={deptName} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="px-5 py-3 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={15} className="text-slate-400" />
                      <h3 className="text-sm font-semibold text-slate-700">{deptName}</h3>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">{groupedUsers[deptName].length} usuário{groupedUsers[deptName].length !== 1 ? 's' : ''}</span>
                  </div>

                  <div className="divide-y divide-slate-50">
                    {groupedUsers[deptName].map((u) => {
                      const isAdmin = isAdminUser(u)
                      const isMaster = u.identificationNumber === '7777'
                      const granted = servicesFor(u)
                      return (
                        <div key={u.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar name={u.name} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-800 truncate flex items-center gap-2">
                                {u.name}
                                {isMaster && (
                                  <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">Admin Master</span>
                                )}
                              </p>
                              <p className="text-xs text-slate-400 truncate">
                                {u.identificationNumber ? `#${u.identificationNumber}` : ''}
                                {u.email ? ` · ${u.email}` : ''}
                                {u.userType?.name ? ` · ${u.userType.name}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pl-12">
                            <div className="flex items-center gap-4">
                              {ALL_SERVICES.map((service) => (
                                <div key={service} className="flex items-center gap-1.5">
                                  <span className="text-xs text-slate-500">{SERVICE_LABELS[service]}</span>
                                  {isAdmin ? (
                                    <ShieldCheck size={14} className="text-emerald-500" />
                                  ) : (
                                    <Toggle
                                      checked={granted.includes(service)}
                                      disabled={savingKey === `${u.id}:${service}`}
                                      onChange={() => toggleService(u, service)}
                                    />
                                  )}
                                </div>
                              ))}
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setResettingPassword(u)}
                                className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                                title="Redefinir senha"
                              >
                                <KeyRound size={14} />
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u)}
                                disabled={isMaster}
                                className={`p-1.5 rounded-lg transition-all ${
                                  isMaster
                                    ? 'text-slate-200 cursor-not-allowed'
                                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                                }`}
                                title={isMaster ? 'Admin master não pode ser excluído' : 'Excluir'}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════ Departments Tab ══════ */}
      {tab === 'departments' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{deptItems.length} departamento{deptItems.length !== 1 ? 's' : ''}</p>
            <button
              onClick={() => setCreatingDept(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Building2 size={15} /> Novo Departamento
            </button>
          </div>

          {deptLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
          ) : deptItems.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum departamento cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {deptItems.map((d) => (
                <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  {editingDept?.id === d.id ? (
                    <InlineEditor
                      value={editingDept.name}
                      onSave={async (name) => {
                        await api.updateDepartment(d.id, { name })
                        setEditingDept(null)
                        loadDepts()
                      }}
                      onCancel={() => setEditingDept(null)}
                      onDelete={async () => {
                        if (!window.confirm(`Excluir departamento "${d.name}"?`)) return
                        await api.deleteDepartment(d.id)
                        loadDepts()
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{d.name}</span>
                      <button onClick={() => setEditingDept({ id: d.id, name: d.name })}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ══════ User Types Tab ══════ */}
      {tab === 'userTypes' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-500">{typeItems.length} tipo{typeItems.length !== 1 ? 's' : ''} de usuário</p>
            <button
              onClick={() => setCreatingType(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <UserCog size={15} /> Novo Tipo
            </button>
          </div>

          {typeLoading ? (
            <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
          ) : typeItems.length === 0 ? (
            <div className="py-16 text-center">
              <UserCog size={28} className="text-slate-200 mx-auto mb-2" />
              <p className="text-sm text-slate-400">Nenhum tipo de usuário cadastrado</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {typeItems.map((t) => (
                <div key={t.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  {editingType?.id === t.id ? (
                    <InlineEditor
                      value={editingType.name}
                      onSave={async (name) => {
                        await api.updateUserType(t.id, { name })
                        setEditingType(null)
                        loadTypes()
                      }}
                      onCancel={() => setEditingType(null)}
                      onDelete={async () => {
                        if (!window.confirm(`Excluir tipo "${t.name}"?`)) return
                        await api.deleteUserType(t.id)
                        loadTypes()
                      }}
                    />
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-800">{t.name}</span>
                      <button onClick={() => setEditingType({ id: t.id, name: t.name })}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg">
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Create user modal */}
      {showCreate && (
        <CreateUserModal
          departments={departments}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); loadUsers() }}
        />
      )}

      {/* Edit user modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          departments={departments}
          userTypes={userTypes}
          onClose={() => setEditingUser(null)}
          onSaved={() => { setEditingUser(null); loadUsers() }}
        />
      )}

      {/* Reset password modal */}
      {resettingPassword && (
        <ResetPasswordModal
          user={resettingPassword}
          onClose={() => setResettingPassword(null)}
          onSaved={() => { setResettingPassword(null); loadUsers() }}
        />
      )}

      {/* Create department inline */}
      {creatingDept && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Novo Departamento</h3>
              <button onClick={() => setCreatingDept(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="px-6 py-4">
              <CreateInlineForm
                placeholder="Nome do departamento"
                onSave={async (name) => {
                  await api.createDepartment({ name })
                  setCreatingDept(false)
                  loadDepts()
                }}
                onCancel={() => setCreatingDept(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create user type inline */}
      {creatingType && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-800">Novo Tipo de Usuário</h3>
              <button onClick={() => setCreatingType(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="px-6 py-4">
              <CreateInlineForm
                placeholder="Nome do tipo"
                onSave={async (name) => {
                  await api.createUserType({ name })
                  setCreatingType(false)
                  loadTypes()
                }}
                onCancel={() => setCreatingType(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CreateInlineForm({ placeholder, onSave, onCancel }) {
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!value.trim()) return
    setSaving(true)
    try {
      await onSave(value.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
        autoFocus
        onKeyDown={(e) => {
          if (e.key === 'Enter') handleSave()
          if (e.key === 'Escape') onCancel()
        }}
      />
      <button onClick={handleSave} disabled={saving || !value.trim()}
        className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1">
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
        Criar
      </button>
    </div>
  )
}
