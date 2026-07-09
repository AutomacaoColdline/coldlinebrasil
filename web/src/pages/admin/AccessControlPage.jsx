import { useEffect, useState, useCallback } from 'react'
import { api } from '../../services/api'
import { GRANULAR_SERVICES, resolveModule } from '../../context/AuthContext'
import { Search, Loader2, Users, UserPlus, Save, X } from 'lucide-react'

const SERVICE_LABELS = {
  industria: 'Indústria',
  automation: 'Automação',
  departamento: 'Departamento',
}

function defaultGrantedServices(user) {
  const module = resolveModule(user)
  return GRANULAR_SERVICES.filter((service) => service === module)
}

function isAdminUser(u) {
  return resolveModule(u) === 'admin'
}

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

function CreateUserModal({ departments, userTypes, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', email: '', identificationNumber: '', password: '', departmentId: '', userTypeId: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState('')

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    if (!form.identificationNumber.trim()) { setError('Identificação é obrigatória'); return }
    if (!form.password.trim()) { setError('Senha é obrigatória'); return }
    setSaving(true)
    try {
      const dept = departments.find((d) => d.id === form.departmentId)
      const type = userTypes.find((t) => t.id === form.userTypeId)
      await api.createUser({
        name: form.name,
        email: form.email,
        identificationNumber: form.identificationNumber,
        password: form.password,
        ...(dept ? { department: { id: dept.id, name: dept.name } } : {}),
        ...(type ? { userType: { id: type.id, name: type.name } } : {}),
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
            { label: 'Nome *',          key: 'name' },
            { label: 'Email',           key: 'email', type: 'email' },
            { label: 'Identificação *', key: 'identificationNumber' },
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

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Senha *</label>
            <input
              type="password"
              value={form.password || ''}
              onChange={(e) => set('password', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
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

export default function AccessControlPage() {
  const [items, setItems]     = useState([])
  const [departments, setDepartments] = useState([])
  const [userTypes, setUserTypes]     = useState([])
  const [q, setQ]             = useState('')
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState(null)
  const [error, setError]     = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const calls = [api.searchUsersPaginated({ q, page: 1, pageSize: 200 })]
      if (!departments.length) calls.push(api.getDepartments(), api.getUserTypes())
      const [r, dRes, tRes] = await Promise.all(calls)
      setItems(r.data?.items || [])
      if (dRes) setDepartments(dRes.data || [])
      if (tRes) setUserTypes(tRes.data || [])
    } catch {
      setError('Erro ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => { load() }, [load])

  const servicesFor = (u) => {
    const explicit = Array.isArray(u.allowedServices) ? u.allowedServices : null
    if (explicit) return explicit
    return defaultGrantedServices(u)
  }

  const toggleService = async (u, service) => {
    if (isAdminUser(u)) return
    const current = servicesFor(u)
    const next = current.includes(service)
      ? current.filter((s) => s !== service)
      : [...current, service]

    setSavingId(u.id)
    setError('')
    try {
      await api.updateUserServices(u.id, next)
      setItems((prev) => prev.map((it) => (it.id === u.id ? { ...it, allowedServices: next } : it)))
    } catch {
      setError('Erro ao atualizar acesso')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Controle de Acessos</h1>
          <p className="text-sm text-slate-400">Libere ou revogue o acesso de cada usuário às abas do sistema</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-xl hover:bg-emerald-700 transition-colors">
          <UserPlus size={15} /> Novo Usuário
        </button>
      </div>

      <p className="text-sm text-slate-500 mb-6">
        Usuários sem nenhuma permissão marcada mantêm apenas o acesso padrão do próprio departamento.
      </p>

      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome ou identificação..."
          className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 mb-4">{error}</p>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={22} className="animate-spin text-slate-300" /></div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center">
            <Users size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-3 px-5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Usuário</th>
                  {GRANULAR_SERVICES.map((service) => (
                    <th key={service} className="py-3 px-5 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide">
                      {SERVICE_LABELS[service]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((u) => {
                  const isAdmin = isAdminUser(u)
                  const granted = servicesFor(u)
                  return (
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-3 px-5">
                        <p className="text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">
                          {u.identificationNumber ? `#${u.identificationNumber} · ` : ''}
                          {u.department?.name || u.userType?.name || '—'}
                        </p>
                      </td>
                      {GRANULAR_SERVICES.map((service) => (
                        <td key={service} className="py-3 px-5 text-center">
                          {isAdmin ? (
                            <span className="text-xs text-slate-300">Acesso total</span>
                          ) : (
                            <div className="flex justify-center">
                              <Toggle
                                checked={granted.includes(service)}
                                disabled={savingId === u.id}
                                onChange={() => toggleService(u, service)}
                              />
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateUserModal
          departments={departments}
          userTypes={userTypes}
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load() }}
        />
      )}
    </div>
  )
}
