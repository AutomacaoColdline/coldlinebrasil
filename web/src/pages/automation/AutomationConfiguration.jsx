import { useEffect, useState, useCallback } from 'react'
import { automationApi } from '../../services/automationApi'
import { Settings, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function apiFetch(path, opts = {}) {
  const token = sessionStorage.getItem('automation_token')
  const r = await fetch(`${BASE_URL}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...opts.headers },
  })
  return r.json()
}

function TypeList({ title, items, onAdd, onEdit, onDelete, loading, canManage = true }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        {canManage && (
          <button onClick={onAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-white text-xs rounded-lg hover:bg-cyan-400">
            <Plus size={12} /> Novo
          </button>
        )}
      </div>
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-8">Nenhum registro encontrado</p>
      ) : (
        <ul className="divide-y divide-slate-50">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between py-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{item.name}</p>
                {item.description && <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>}
              </div>
              {canManage && (
                <div className="flex items-center gap-2">
                  <button onClick={() => onEdit(item)} className="text-slate-400 hover:text-cyan-500"><Pencil size={13} /></button>
                  <button onClick={() => onDelete(item)} className="text-slate-400 hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TypeModal({ item, entity, onClose, onSaved }) {
  const isNew = !item?.id
  const [name, setName] = useState(item?.name || '')
  const [desc, setDesc] = useState(item?.description || '')
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const body = JSON.stringify({ name: name.trim(), description: desc.trim() })
      if (isNew) await apiFetch(`/api/${entity}`, { method: 'POST', body })
      else        await apiFetch(`/api/${entity}/${item.id}`, { method: 'PUT', body })
      onSaved()
    } catch {}
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isNew ? 'Novo' : 'Editar'}</h3>
          <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nome</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
            <input value={desc} onChange={e => setDesc(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={save} disabled={saving || !name.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50">
            {saving && <Loader2 size={13} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function DeleteConfirm({ item, entity, onClose, onSaved }) {
  const [loading, setLoading] = useState(false)
  const confirm = async () => {
    setLoading(true)
    try {
      await apiFetch(`/api/${entity}/${item.id}`, { method: 'DELETE' })
      onSaved()
    } catch {}
    setLoading(false)
  }
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
        <p className="text-sm font-semibold text-slate-800 mb-1">{item.name}</p>
        <p className="text-sm text-slate-600 mb-4">Deseja excluir este item?</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={confirm} disabled={loading}
            className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg disabled:opacity-50">
            {loading ? <Loader2 size={13} className="animate-spin inline" /> : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationConfiguration() {
  const [processTypes, setProcessTypes]     = useState([])
  const [occurrenceTypes, setOccTypes]      = useState([])
  const [monitoringTypes, setMonTypes]      = useState([])
  const [loading, setLoading]               = useState(true)
  const [modal, setModal]                   = useState(null) // { item, entity }
  const [delModal, setDelModal]             = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pt, ot, mt] = await Promise.all([
        apiFetch('/api/ProcessType'),
        apiFetch('/api/OccurrenceType'),
        apiFetch('/api/Monitoring/types'),
      ])
      setProcessTypes(pt || [])
      setOccTypes(ot || [])
      setMonTypes(mt || [])
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const saved = () => { setModal(null); setDelModal(null); load() }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={20} className="text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-400">Tipos e categorias do sistema</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TypeList title="Tipos de Processo" items={processTypes} loading={loading}
          onAdd={() => setModal({ item: null, entity: 'ProcessType' })}
          onEdit={i => setModal({ item: i, entity: 'ProcessType' })}
          onDelete={i => setDelModal({ item: i, entity: 'ProcessType' })} />

        <TypeList title="Tipos de Ocorrência" items={occurrenceTypes} loading={loading}
          onAdd={() => setModal({ item: null, entity: 'OccurrenceType' })}
          onEdit={i => setModal({ item: i, entity: 'OccurrenceType' })}
          onDelete={i => setDelModal({ item: i, entity: 'OccurrenceType' })} />

        <TypeList title="Tipos de Monitoramento" items={monitoringTypes} loading={loading}
          onAdd={() => setModal({ item: null, entity: 'MonitoringType' })}
          onEdit={i => setModal({ item: i, entity: 'MonitoringType' })}
          onDelete={i => setDelModal({ item: i, entity: 'MonitoringType' })}
          canManage={false} />
      </div>

      {modal && (
        <TypeModal item={modal.item} entity={modal.entity}
          onClose={() => setModal(null)} onSaved={saved} />
      )}
      {delModal && (
        <DeleteConfirm item={delModal.item} entity={delModal.entity}
          onClose={() => setDelModal(null)} onSaved={saved} />
      )}
    </div>
  )
}
