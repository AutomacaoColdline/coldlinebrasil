import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import { Plus, AlertTriangle, Loader2, CheckCircle, Clock, X, Trash2 } from 'lucide-react'

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

export default function OccurrencesPage() {
  const [occurrences, setOccurrences] = useState([])
  const [occurrenceTypes, setOccurrenceTypes] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ description: '', occurrenceTypeId: '', userId: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [or, tr, ur] = await Promise.all([
        api.getOccurrences(),
        api.getOccurrenceTypes(),
        api.getUsers(),
      ])
      setOccurrences(or.data || [])
      setOccurrenceTypes(tr.data || [])
      setUsers(ur.data || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active = occurrences.filter(o => !o.finished)
  const finished = occurrences.filter(o => o.finished)
  const displayed = tab === 'active' ? active : finished

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const u = users.find(u => u.id === form.userId)
      const t = occurrenceTypes.find(t => t.id === form.occurrenceTypeId)
      await api.createOccurrence({
        description: form.description,
        occurrenceType: t ? { id: t.id, name: t.name } : undefined,
        user: u ? { id: u.id, name: u.name } : undefined,
      })
      showToast('Ocorrência criada!')
      setModal(false)
      setForm({ description: '', occurrenceTypeId: '', userId: '' })
      load()
    } catch {
      showToast('Erro ao criar ocorrência', 'error')
    }
    setSaving(false)
  }

  const handleFinalize = async (occ) => {
    if (!confirm(`Finalizar ocorrência ${occ.codeOccurrence}?`)) return
    try {
      await api.finalizeOccurrence(occ.id)
      showToast('Ocorrência finalizada!')
      load()
    } catch {
      showToast('Erro ao finalizar', 'error')
    }
  }

  const handleDelete = async (occ) => {
    if (!confirm(`Excluir ocorrência ${occ.codeOccurrence}?`)) return
    try {
      await api.deleteOccurrence(occ.id)
      showToast('Ocorrência removida!')
      load()
    } catch {
      showToast('Erro ao excluir', 'error')
    }
  }

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <CheckCircle size={15} />{toast.msg}
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Ocorrências</h1>
            <p className="text-sm text-slate-500">{active.length} abertas · {finished.length} finalizadas</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />Nova ocorrência
          </button>
        </div>

        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: 'active', label: `Abertas (${active.length})` },
            { key: 'finished', label: `Finalizadas (${finished.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
          ) : displayed.length === 0 ? (
            <div className="py-16 text-center">
              <AlertTriangle size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">{tab === 'active' ? 'Nenhuma ocorrência aberta' : 'Nenhuma ocorrência finalizada'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Início</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tempo</th>
                  <th className="px-5 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map(o => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-mono font-medium text-slate-700">{o.codeOccurrence}</td>
                    <td className="px-5 py-4 text-slate-800">{o.user?.name || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{o.occurrenceType?.name || '—'}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs hidden lg:table-cell">{formatDate(o.startDate)}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs hidden lg:table-cell">{o.processTime || '—'}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 justify-end">
                        {!o.finished && (
                          <button onClick={() => handleFinalize(o)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors">
                            <CheckCircle size={14} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(o)}
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

        <Modal open={modal} onClose={() => setModal(false)} title="Nova Ocorrência">
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Colaborador</label>
              <select value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                <option value="">Selecione...</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Ocorrência</label>
              <select value={form.occurrenceTypeId} onChange={e => setForm(f => ({ ...f, occurrenceTypeId: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                <option value="">Selecione...</option>
                {occurrenceTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Descrição</label>
              <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={3} placeholder="Descreva a ocorrência..."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid resize-none" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Registrar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
