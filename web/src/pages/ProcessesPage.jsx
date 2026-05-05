import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import { Plus, Activity, Loader2, CheckCircle, Clock, X, AlertCircle } from 'lucide-react'

function Modal({ open, onClose, title, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}

function ProcessCard({ process, onEnd }) {
  const elapsed = process.startDate
    ? Math.floor((Date.now() - new Date(process.startDate)) / 1000 / 60)
    : 0

  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-5 ${process.inOccurrence ? 'border-orange-200' : 'border-slate-100'}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-xs text-slate-400 font-mono">#{process.identificationNumber}</p>
          <p className="font-semibold text-slate-800 mt-0.5">{process.user?.name || '—'}</p>
          <p className="text-xs text-slate-500">{process.processType?.name || '—'}</p>
        </div>
        <div className="text-right">
          {process.inOccurrence ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
              <AlertCircle size={10} />Em Ocorrência
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
              <Activity size={10} />Ativo
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-50">
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {elapsed}min em andamento
        </span>
        <button onClick={() => onEnd(process)}
          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors text-xs font-medium">
          <CheckCircle size={12} />Finalizar
        </button>
      </div>
    </div>
  )
}

export default function ProcessesPage() {
  const [processes, setProcesses] = useState([])
  const [processTypes, setProcessTypes] = useState([])
  const [machines, setMachines] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('active')
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ identificationNumber: '', processTypeId: '', machineId: '', preIndustrialization: false, reWork: false, prototype: false })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pr, tr, mr] = await Promise.all([
        api.getProcesses(),
        api.getProcessTypes(),
        api.getMachines(),
      ])
      setProcesses(pr.data || [])
      setProcessTypes(tr.data || [])
      setMachines(mr.data || [])
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const active = processes.filter(p => !p.finished)
  const finished = processes.filter(p => p.finished)
  const displayed = tab === 'active' ? active : finished

  const handleStart = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.startProcess(form)
      showToast('Processo iniciado!')
      setModal(false)
      setForm({ identificationNumber: '', processTypeId: '', machineId: '', preIndustrialization: false, reWork: false, prototype: false })
      load()
    } catch {
      showToast('Erro ao iniciar processo', 'error')
    }
    setSaving(false)
  }

  const handleEnd = async (process) => {
    if (!confirm(`Finalizar processo #${process.identificationNumber}?`)) return
    try {
      await api.endProcess(process.id)
      showToast('Processo finalizado!')
      load()
    } catch {
      showToast('Erro ao finalizar', 'error')
    }
  }

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
            <h1 className="text-xl font-bold text-slate-900">Processos</h1>
            <p className="text-sm text-slate-500">{active.length} ativos · {finished.length} finalizados</p>
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 bg-brand-mid hover:bg-brand-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors shadow-sm">
            <Plus size={16} />Iniciar processo
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 bg-slate-100 p-1 rounded-xl w-fit">
          {[
            { key: 'active', label: `Ativos (${active.length})` },
            { key: 'finished', label: `Finalizados (${finished.length})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === key ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : tab === 'active' ? (
          displayed.length === 0 ? (
            <div className="py-16 text-center bg-white rounded-2xl border border-slate-100">
              <Activity size={32} className="text-slate-200 mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Nenhum processo ativo</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayed.map(p => <ProcessCard key={p.id} process={p} onEnd={handleEnd} />)}
            </div>
          )
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Usuário</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Tipo</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden lg:table-cell">Tempo</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-4 font-mono text-slate-700">#{p.identificationNumber}</td>
                    <td className="px-5 py-4 font-medium text-slate-800">{p.user?.name || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 hidden md:table-cell">{p.processType?.name || '—'}</td>
                    <td className="px-5 py-4 text-slate-500 hidden lg:table-cell">{p.processTime || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Finalizado</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={modal} onClose={() => setModal(false)} title="Iniciar Processo">
          <form onSubmit={handleStart} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Número de Identificação do Colaborador *</label>
              <input required value={form.identificationNumber}
                onChange={e => setForm(f => ({ ...f, identificationNumber: e.target.value }))}
                placeholder="Ex: 001234"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Tipo de Processo *</label>
              <select required value={form.processTypeId}
                onChange={e => setForm(f => ({ ...f, processTypeId: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                <option value="">Selecione...</option>
                {processTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Máquina (opcional)</label>
              <select value={form.machineId} onChange={e => setForm(f => ({ ...f, machineId: e.target.value }))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid">
                <option value="">Sem máquina</option>
                {machines.filter(m => m.status === 1).map(m => (
                  <option key={m.id} value={m.id}>{m.identificationNumber} — {m.customerName}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              {[
                { key: 'preIndustrialization', label: 'Pré-industrialização' },
                { key: 'reWork', label: 'Retrabalho' },
                { key: 'prototype', label: 'Protótipo' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.checked }))}
                    className="w-4 h-4 text-brand-mid border-slate-300 rounded focus:ring-brand-mid/30" />
                  <span className="text-sm text-slate-600">{label}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModal(false)}
                className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="flex-1 py-2.5 bg-brand-mid hover:bg-brand-700 text-white rounded-xl text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                {saving && <Loader2 size={14} className="animate-spin" />}
                Iniciar
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </Layout>
  )
}
