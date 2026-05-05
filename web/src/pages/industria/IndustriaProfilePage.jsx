import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { api } from '../../services/api'
import { Save, Loader2, UserCircle, CheckCircle } from 'lucide-react'

export default function IndustriaProfilePage() {
  const { user, login } = useAuth()
  const [form, setForm] = useState({
    name:  user?.name  || '',
    email: user?.email || '',
    password: '',
  })
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')

  const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setSuccess(false); setError('') }

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Nome é obrigatório'); return }
    setSaving(true)
    setError('')
    try {
      const payload = { name: form.name, email: form.email }
      if (form.password.trim()) payload.password = form.password
      await api.updateUser(user.id, payload)
      // Atualiza o user no localStorage para refletir o nome novo
      const stored = JSON.parse(localStorage.getItem('coldline_user') || '{}')
      const updated = { ...stored, name: form.name, email: form.email }
      localStorage.setItem('coldline_user', JSON.stringify(updated))
      setSuccess(true)
      setForm(f => ({ ...f, password: '' }))
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center gap-3 mb-8">
        <UserCircle size={28} className="text-blue-500" />
        <div>
          <h1 className="text-xl font-bold text-slate-800">Meu Perfil</h1>
          <p className="text-sm text-slate-400">{user?.department?.name || ''}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
        )}
        {success && (
          <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
            <CheckCircle size={15} />
            Perfil atualizado com sucesso
          </div>
        )}

        {[
          { label: 'Nome *',  key: 'name'  },
          { label: 'Email',   key: 'email', type: 'email' },
        ].map(({ label, key, type }) => (
          <div key={key}>
            <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
            <input
              type={type || 'text'}
              value={form[key]}
              onChange={e => set(key, e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        ))}

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Nova Senha <span className="text-slate-300">(deixe em branco para manter)</span></label>
          <input
            type="password"
            value={form.password}
            onChange={e => set('password', e.target.value)}
            placeholder="••••••••"
            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
          />
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-400 space-y-0.5">
          <p>Identificação: <span className="text-slate-600 font-medium">{user?.identificationNumber || '—'}</span></p>
          <p>Tipo: <span className="text-slate-600 font-medium">{user?.userType?.name || '—'}</span></p>
          <p>Departamento: <span className="text-slate-600 font-medium">{user?.department?.name || '—'}</span></p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-all"
        >
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  )
}
