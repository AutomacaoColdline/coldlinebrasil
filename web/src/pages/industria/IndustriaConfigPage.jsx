import { useEffect, useState } from 'react'
import { api } from '../../services/api'
import { Settings, Loader2, Pencil, Trash2, Plus, X, Save, RefreshCw } from 'lucide-react'

// ── Generic section table ─────────────────────────────────────────────────────

function Section({ title, items, loading, onEdit, onDelete, onNew, renderName = item => item.name }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-700">{title}</h2>
        <button
          onClick={onNew}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={12} /> Novo
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
      ) : items.length === 0 ? (
        <p className="text-center text-xs text-slate-400 py-8">Nenhum item cadastrado</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Nome</th>
              <th className="py-2.5 px-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">Descrição</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/30">
                <td className="py-2.5 px-4 text-sm text-slate-800">{renderName(item)}</td>
                <td className="py-2.5 px-4 text-xs text-slate-500">{item.description || '—'}</td>
                <td className="py-2.5 px-4">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => onEdit(item)} className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => onDelete(item)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Form modal ────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = ['pç', 'cm', 'm', 'lt']

function Modal({ item, title, sectionKey, onClose, onSave }) {
  const isPart = sectionKey === 'part'
  const isEmail = sectionKey === 'email'
  const [form, setForm] = useState({
    name: item?.name || '',
    description: item?.description || '',
    unitOfMeasure: item?.unitOfMeasure || 'pç',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    setError('')
    if (!form.name.trim()) { setError(isEmail ? 'Email é obrigatório' : 'Nome é obrigatório'); return }
    if (isEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.name.trim())) {
      setError('Informe um email válido')
      return
    }
    setSaving(true)
    try {
      await onSave(form)
    } catch (err) {
      setError(err?.response?.data?.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800 text-sm">{item?.id ? `Editar ${title}` : `Novo ${title}`}</h3>
          <button onClick={onClose}><X size={16} className="text-slate-400" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{isEmail ? 'Email *' : 'Nome *'}</label>
            <input
              type={isEmail ? 'email' : 'text'}
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          {isPart && (
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Unidade de Medida</label>
              <select
                value={form.unitOfMeasure}
                onChange={e => set('unitOfMeasure', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              {isEmail ? 'Nome/Setor (opcional)' : 'Descrição'}
            </label>
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={2}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Delete confirm ────────────────────────────────────────────────────────────

function DeleteConfirm({ item, onConfirm, onClose }) {
  const [err, setErr] = useState('')

  const handle = async () => {
    setErr('')
    try {
      await onConfirm()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Erro ao excluir')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-none md:rounded-2xl p-4 md:p-6 w-full md:w-80 shadow-xl">
        <p className="text-sm font-medium text-slate-800 mb-1">Excluir item?</p>
        <p className="text-xs text-slate-500 mb-4">"{item.name}"</p>
        {err && <p className="text-xs text-red-600 mb-3 bg-red-50 px-2 py-1.5 rounded-lg">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button onClick={handle} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600">Excluir</button>
        </div>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function IndustriaConfigPage() {
  const [procTypes,   setProcTypes]  = useState([])
  const [occTypes,    setOccTypes]   = useState([])
  const [machTypes,   setMachTypes]  = useState([])
  const [userTypes,   setUserTypes]  = useState([])
  const [departments, setDepts]      = useState([])
  const [parts,       setParts]      = useState([])
  const [reqEmails,   setReqEmails]  = useState([])
  const [loading,     setLoading]    = useState(true)

  // modal = { type: string, item: null|object }
  const [modal,  setModal]  = useState(null)
  // delModal = { type: string, item: object }
  const [delModal, setDelModal] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const [pt, ot, mt, ut, d, pa, re] = await Promise.all([
        api.getProcessTypes(),
        api.getOccurrenceTypes(),
        api.getMachineTypes(),
        api.getUserTypes(),
        api.getDepartments(),
        api.getParts(),
        api.getRequisitionEmails(),
      ])
      setProcTypes(pt.data || [])
      setOccTypes(ot.data  || [])
      setMachTypes(mt.data || [])
      setUserTypes(ut.data || [])
      setDepts(d.data      || [])
      setParts(pa.data     || [])
      setReqEmails(re.data || [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const apiMap = {
    proc:  { create: api.createProcessType,       update: api.updateProcessType,       del: api.deleteProcessType       },
    occ:   { create: api.createOccurrenceType,    update: api.updateOccurrenceType,    del: api.deleteOccurrenceType    },
    mach:  { create: api.createMachineType,       update: api.updateMachineType,       del: api.deleteMachineType       },
    user:  { create: api.createUserType,          update: api.updateUserType,          del: api.deleteUserType          },
    dept:  { create: api.createDepartment,        update: api.updateDepartment,        del: api.deleteDepartment        },
    part:  { create: api.createPart,              update: api.updatePart,              del: api.deletePart              },
    email: { create: api.createRequisitionEmail,  update: api.updateRequisitionEmail,  del: api.deleteRequisitionEmail  },
  }

  const handleSave = async (form) => {
    const { type, item } = modal
    const fn = apiMap[type]
    if (item?.id) await fn.update(item.id, form)
    else          await fn.create(form)
    setModal(null)
    load()
  }

  const handleDelete = async () => {
    const { type, item } = delModal
    await apiMap[type].del(item.id)
    setDelModal(null)
    load()
  }

  const sections = [
    { key: 'proc',  title: 'Tipos de Processo',      items: procTypes  },
    { key: 'occ',   title: 'Tipos de Ocorrência',    items: occTypes   },
    { key: 'mach',  title: 'Tipos de Máquina',       items: machTypes  },
    { key: 'user',  title: 'Tipos de Usuário',       items: userTypes  },
    { key: 'dept',  title: 'Departamentos',          items: departments},
    { key: 'part',  title: 'Peças',                  items: parts      },
    { key: 'email', title: 'Emails de Requisição',   items: reqEmails  },
  ]

  const modalTitle = {
    proc: 'Tipo de Processo', occ: 'Tipo de Ocorrência',
    mach: 'Tipo de Máquina',  user: 'Tipo de Usuário', dept: 'Departamento',
    part: 'Peça', email: 'Email de Requisição',
  }

  const renderName = {
    part: item => item.unitOfMeasure ? `${item.name} (${item.unitOfMeasure})` : item.name,
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Configurações</h1>
          <p className="text-sm text-slate-400">Tipos e cadastros base do sistema</p>
        </div>
        <button onClick={load} className="p-2 bg-white border border-slate-200 rounded-xl text-slate-500 hover:border-blue-400 transition-colors">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sections.map(({ key, title, items }) => (
          <Section
            key={key}
            title={title}
            items={items}
            loading={loading}
            onNew={() => setModal({ type: key, item: null })}
            onEdit={item => setModal({ type: key, item })}
            onDelete={item => setDelModal({ type: key, item })}
            renderName={renderName[key]}
          />
        ))}
      </div>

      {modal && (
        <Modal
          item={modal.item}
          title={modalTitle[modal.type]}
          sectionKey={modal.type}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}

      {delModal && (
        <DeleteConfirm
          item={delModal.item}
          onConfirm={handleDelete}
          onClose={() => setDelModal(null)}
        />
      )}
    </div>
  )
}
