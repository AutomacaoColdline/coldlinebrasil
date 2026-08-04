import { useCallback, useEffect, useState } from 'react'
import { Edit, Loader2, Plus, Trash2, X } from 'lucide-react'
import { productionApi } from './productionApi'
import { SERIAL_STATUSES, SERIAL_STATUS_TONES, emptySerialForm, serialToForm, serialToPayload } from './productionShared'

function ConfirmModal({ title, description, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{description}</p>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-400 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}

function SerialModal({ initialForm, onClose, onSave, saving, saveError }) {
  const [form, setForm] = useState(initialForm)

  const updateAddress = (index, key, value) => {
    setForm((current) => {
      const next = [...current.evaporatorAddresses]
      next[index] = { ...next[index], [key]: value }
      return { ...current, evaporatorAddresses: next }
    })
  }

  const addAddress = () => {
    setForm((current) => ({
      ...current,
      evaporatorAddresses: [...current.evaporatorAddresses, { evaporator: '', address: '' }],
    }))
  }

  const removeAddress = (index) => {
    setForm((current) => ({
      ...current,
      evaporatorAddresses: current.evaporatorAddresses.filter((_, i) => i !== index),
    }))
  }

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Numero de Serie</h3>
            <p className="text-sm text-slate-500">Endereçamento de evaporadores, cliente destino e status.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Numero de Serie</label>
            <input
              value={form.serialNumber}
              onChange={(event) => setForm((c) => ({ ...c, serialNumber: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Cliente Destino</label>
            <input
              value={form.clientDestination}
              onChange={(event) => setForm((c) => ({ ...c, clientDestination: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(event) => setForm((c) => ({ ...c, status: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              {SERIAL_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Endereçamento de Evaporadores</label>
            <select
              value={form.hasEvaporatorAddressing ? 'sim' : 'nao'}
              onChange={(event) => setForm((c) => ({ ...c, hasEvaporatorAddressing: event.target.value === 'sim' }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="nao">Sem endereçamento</option>
              <option value="sim">Com endereçamento</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Observacoes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"
            />
          </div>

          {form.hasEvaporatorAddressing && (
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Listagem de Evaporadores</label>
                <button onClick={addAddress} className="inline-flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600 font-medium">
                  <Plus size={12} /> Adicionar evaporador
                </button>
              </div>
              {form.evaporatorAddresses.length === 0 ? (
                <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl px-3 py-3 text-center">
                  Nenhum evaporador adicionado.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.evaporatorAddresses.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={entry.evaporator}
                        onChange={(event) => updateAddress(index, 'evaporator', event.target.value)}
                        placeholder="Evaporador"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      />
                      <input
                        value={entry.address}
                        onChange={(event) => updateAddress(index, 'address', event.target.value)}
                        placeholder="Endereco"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      />
                      <button onClick={() => removeAddress(index)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:border-rose-300 hover:text-rose-600 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          {saveError && <p className="text-xs text-rose-500 mr-auto max-w-xs leading-relaxed">⚠️ {saveError}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button
              onClick={() => onSave(form)}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EvaporatorAddressingSection({ buildId }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await productionApi.getSerials(buildId)
      setItems(response.data?.items || [])
    } finally {
      setLoading(false)
    }
  }, [buildId])

  useEffect(() => {
    load()
  }, [load])

  const openNew = () => {
    setEditing(null)
    setModalOpen(true)
    setSaveError(null)
  }

  const openEdit = (item) => {
    setEditing(item)
    setModalOpen(true)
    setSaveError(null)
  }

  const handleSave = async (form) => {
    setSaving(true)
    setSaveError(null)
    try {
      const payload = serialToPayload(form)
      if (editing?.id) await productionApi.updateSerial(editing.id, payload)
      else await productionApi.createSerial(buildId, payload)
      setModalOpen(false)
      setEditing(null)
      await load()
    } catch (err) {
      setSaveError(err?.response?.data?.message || err?.message || 'Erro ao salvar.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setSaving(true)
    try {
      await productionApi.deleteSerial(deleting.id)
      setDeleting(null)
      await load()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Endereçamento de Evaporadores</h3>
          <p className="text-xs text-slate-500 mt-0.5">Numeros de serie desta unidade, cliente destino e status de producao.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 shrink-0"
        >
          <Plus size={14} />
          Novo numero de serie
        </button>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center">
          <Loader2 size={20} className="animate-spin text-slate-300" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-sm text-slate-400">Nenhum numero de serie cadastrado.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Nº Serie', 'Cliente Destino', 'Endereçamento', 'Status', 'Acoes'].map((label) => (
                  <th key={label} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{item.serialNumber}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">{item.clientDestination || '-'}</td>
                  <td className="px-4 py-2.5 text-sm text-slate-600">
                    {item.hasEvaporatorAddressing ? `Sim (${(item.evaporatorAddresses || []).length})` : 'Nao'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${SERIAL_STATUS_TONES[item.status] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500">
                        <Edit size={13} />
                      </button>
                      <button onClick={() => setDeleting(item)} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <SerialModal
          initialForm={editing ? serialToForm(editing) : emptySerialForm()}
          onClose={() => { setModalOpen(false); setEditing(null) }}
          onSave={handleSave}
          saving={saving}
          saveError={saveError}
        />
      )}

      {deleting && (
        <ConfirmModal
          title="Excluir numero de serie"
          description="Essa acao nao pode ser desfeita."
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
          loading={saving}
        />
      )}
    </div>
  )
}
