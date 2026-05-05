import { useEffect, useState, useCallback } from 'react'
import Layout from '../components/Layout'
import { api } from '../services/api'
import { Plus, Settings, Loader2, Trash2, CheckCircle, X } from 'lucide-react'

function EntitySection({ title, items, onAdd, onDelete, loading }) {
  const [name, setName] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    await onAdd(name.trim())
    setName('')
    setAdding(false)
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <h3 className="font-semibold text-slate-800 text-sm mb-4">{title}</h3>
      <form onSubmit={handleAdd} className="flex gap-2 mb-4">
        <input value={name} onChange={e => setName(e.target.value)}
          placeholder={`Novo ${title.toLowerCase()}...`}
          className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid" />
        <button type="submit" disabled={adding || !name.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-brand-mid hover:bg-brand-700 text-white rounded-lg text-sm font-medium disabled:opacity-40 transition-colors">
          <Plus size={14} />Adicionar
        </button>
      </form>
      {loading ? (
        <div className="py-4 flex justify-center"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Nenhum item cadastrado</p>
      ) : (
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-slate-50 group">
              <span className="text-sm text-slate-700">{item.name}</span>
              <button onClick={() => onDelete(item.id)}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-all">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function ConfigPage() {
  const [data, setData] = useState({
    userTypes: [], departments: [], processTypes: [],
    occurrenceTypes: [], machineTypes: []
  })
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ut, dp, pt, ot, mt] = await Promise.all([
        api.getUserTypes(), api.getDepartments(), api.getProcessTypes(),
        api.getOccurrenceTypes(), api.getMachineTypes()
      ])
      setData({
        userTypes: ut.data || [],
        departments: dp.data || [],
        processTypes: pt.data || [],
        occurrenceTypes: ot.data || [],
        machineTypes: mt.data || [],
      })
    } catch { }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const makeHandlers = (key, createFn, deleteFn) => ({
    onAdd: async (name) => {
      try {
        await createFn({ name })
        showToast('Criado com sucesso!')
        load()
      } catch {
        showToast('Erro ao criar', 'error')
      }
    },
    onDelete: async (id) => {
      if (!confirm('Excluir este item?')) return
      try {
        await deleteFn(id)
        showToast('Removido!')
        load()
      } catch {
        showToast('Erro ao remover', 'error')
      }
    }
  })

  const sections = [
    { key: 'userTypes', title: 'Tipos de Usuário', ...makeHandlers('userTypes', api.createUserType, api.deleteUserType) },
    { key: 'departments', title: 'Departamentos', ...makeHandlers('departments', api.createDepartment, api.deleteDepartment) },
    { key: 'processTypes', title: 'Tipos de Processo', ...makeHandlers('processTypes', api.createProcessType, api.deleteProcessType) },
    { key: 'occurrenceTypes', title: 'Tipos de Ocorrência', ...makeHandlers('occurrenceTypes', api.createOccurrenceType, api.deleteOccurrenceType) },
    { key: 'machineTypes', title: 'Tipos de Máquina', ...makeHandlers('machineTypes', api.createMachineType, api.deleteMachineType) },
  ]

  return (
    <Layout>
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        {toast && (
          <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
            <CheckCircle size={15} />{toast.msg}
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-500">Gerencie os tipos e entidades do sistema</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sections.map(({ key, title, onAdd, onDelete }) => (
            <EntitySection key={key} title={title} items={data[key]} onAdd={onAdd} onDelete={onDelete} loading={loading} />
          ))}
        </div>
      </div>
    </Layout>
  )
}
