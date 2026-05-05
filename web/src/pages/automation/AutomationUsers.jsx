import { useEffect, useState, useCallback, useRef } from 'react'
import { useOutletContext } from 'react-router-dom'
import { automationApi } from '../../services/automationApi'
import { Users, Plus, Trash2, Pencil, Search, Loader2, ChevronLeft, ChevronRight, X, Camera } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

function Avatar({ user, size = 36 }) {
  const src = user?.urlPhoto
    ? `${BASE_URL}/uploads/${user.urlPhoto}?t=${Math.floor(Date.now() / 60000)}`
    : null
  return src ? (
    <img src={src} alt={user.name} style={{ width: size, height: size }}
      className="rounded-full object-cover border border-slate-200"
      onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }} />
  ) : null
}

function Initials({ name, size = 36 }) {
  return (
    <div style={{ width: size, height: size }}
      className="rounded-full bg-cyan-100 text-cyan-700 flex items-center justify-center text-sm font-bold shrink-0">
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  )
}

function UserModal({ user, departments, userTypes, onClose, onSaved }) {
  const isNew = !user?.id
  const [form, setForm] = useState(
    user
      ? { ...user, departmentId: user.department?.id || '', userTypeId: user.userType?.id || '' }
      : { name: '', email: '', identificationNumber: '', workHourCost: '', departmentId: '', userTypeId: '' }
  )
  const [saving, setSaving] = useState(false)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const fileRef = useRef()

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setPhotoFile(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  const save = async () => {
    setSaving(true)
    try {
      let urlPhoto = form.urlPhoto || ''
      if (photoFile) {
        const ext  = photoFile.name.split('.').pop()
        const newName = `${form.identificationNumber || Date.now()}.${ext}`
        const fd = new FormData()
        fd.append('file', photoFile)
        const res = await automationApi.uploadUserImage(urlPhoto, newName, fd)
        urlPhoto = res.data?.fileName || newName
      }
      const dept = departments.find(d => d.id === form.departmentId)
      const type = userTypes.find(t => t.id === form.userTypeId)
      const payload = {
        name: form.name,
        email: form.email,
        identificationNumber: form.identificationNumber,
        workHourCost: parseFloat(form.workHourCost) || 0,
        urlPhoto,
        ...(dept ? { department: { id: dept.id, name: dept.name } } : {}),
        ...(type ? { userType:   { id: type.id, name: type.name } } : {}),
      }
      if (isNew) await automationApi.createUser(payload)
      else       await automationApi.updateUser(form.id, payload)
      onSaved()
    } catch {}
    setSaving(false)
  }

  const currentPhoto = photoPreview || (form.urlPhoto ? `${BASE_URL}/uploads/${form.urlPhoto}` : null)

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{isNew ? 'Novo Usuário' : 'Editar Usuário'}</h3>
          <button onClick={onClose}><X size={17} className="text-slate-400" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Photo */}
          <div className="flex justify-center">
            <div className="relative">
              {currentPhoto ? (
                <img src={currentPhoto} alt="foto" className="w-20 h-20 rounded-full object-cover border-2 border-slate-200" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-cyan-100 flex items-center justify-center text-2xl font-bold text-cyan-700">
                  {form.name?.[0]?.toUpperCase() || '?'}
                </div>
              )}
              <button onClick={() => fileRef.current?.click()}
                className="absolute bottom-0 right-0 w-7 h-7 bg-cyan-500 rounded-full flex items-center justify-center shadow">
                <Camera size={13} className="text-white" />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>

          {[
            { label: 'Nome',                  key: 'name',                 type: 'text'   },
            { label: 'Email',                 key: 'email',                type: 'email'  },
            { label: 'Número de Identificação', key: 'identificationNumber', type: 'text' },
            { label: 'Custo/hora (R$)',        key: 'workHourCost',         type: 'number' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
              <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20" />
            </div>
          ))}

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Departamento</label>
            <select value={form.departmentId || ''} onChange={e => set('departmentId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
              <option value="">Selecione...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Tipo de Usuário</label>
            <select value={form.userTypeId || ''} onChange={e => set('userTypeId', e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20">
              <option value="">Selecione...</option>
              {userTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50">
            {saving && <Loader2 size={13} className="animate-spin" />} Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AutomationUsers() {
  useOutletContext()
  const [data, setData]           = useState({ items: [], totalPages: 1, total: 0 })
  const [departments, setDepts]   = useState([])
  const [userTypes, setUserTypes] = useState([])
  const [filter, setFilter]       = useState({ name: '', identificationNumber: '', page: 1, pageSize: 15 })
  const [loading, setLoad]        = useState(true)
  const [modal, setModal]         = useState(null)
  const [deleting, setDel]        = useState(null)

  const load = useCallback(async () => {
    setLoad(true)
    try {
      const [r, d, t] = await Promise.all([
        automationApi.getUsers(filter),
        departments.length ? Promise.resolve({ data: departments }) : automationApi.getDepartments(),
        userTypes.length   ? Promise.resolve({ data: userTypes })   : automationApi.getUserTypes(),
      ])
      setData(r.data)
      if (!departments.length) setDepts(d.data || [])
      if (!userTypes.length)   setUserTypes(t.data || [])
    } catch {}
    setLoad(false)
  }, [filter])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await automationApi.deleteUser(id)
    setDel(null)
    load()
  }

  const set = (k, v) => setFilter(f => ({ ...f, [k]: v, page: 1 }))

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Usuários</h1>
          <p className="text-sm text-slate-400">{data.total} usuários</p>
        </div>
        <button onClick={() => setModal({})}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white text-sm rounded-xl hover:bg-cyan-400">
          <Plus size={15} /> Novo
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { key: 'name',                 placeholder: 'Nome'            },
          { key: 'identificationNumber', placeholder: 'Identificação'   },
        ].map(({ key, placeholder }) => (
          <div key={key} className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={filter[key] || ''} onChange={e => set(key, e.target.value)} placeholder={placeholder}
              className="pl-7 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500/20 w-40" />
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : (data.items || []).length === 0 ? (
          <div className="py-20 text-center">
            <Users size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                {['Usuário', 'Identificação', 'Departamento', 'Tipo', 'Custo/h', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-500 px-4 py-3 first:pl-5">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.items || []).map(u => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 pl-5">
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <Avatar user={u} />
                        <Initials name={u.name} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600 font-mono">{u.identificationNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.department?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.userType?.name || '—'}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {u.workHourCost ? `R$ ${Number(u.workHourCost).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button onClick={() => setModal(u)} className="text-slate-400 hover:text-cyan-500"><Pencil size={14} /></button>
                      <button onClick={() => setDel(u)}   className="text-slate-400 hover:text-red-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-6">
          <button onClick={() => setFilter(f => ({ ...f, page: f.page - 1 }))} disabled={filter.page === 1}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-slate-500">{filter.page} / {data.totalPages}</span>
          <button onClick={() => setFilter(f => ({ ...f, page: f.page + 1 }))} disabled={filter.page === data.totalPages}
            className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:border-cyan-400 disabled:opacity-30">
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {modal !== null && (
        <UserModal user={modal?.id ? modal : null} departments={departments} userTypes={userTypes}
          onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />
      )}

      {deleting && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-80 shadow-xl">
            <p className="text-sm font-semibold text-slate-800 mb-1">{deleting.name}</p>
            <p className="text-xs text-slate-500 mb-4">{deleting.identificationNumber} · {deleting.department?.name}</p>
            <p className="text-sm text-slate-600 mb-4">Deseja excluir este usuário?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDel(null)} className="px-3 py-2 text-sm text-slate-500">Cancelar</button>
              <button onClick={() => handleDelete(deleting.id)} className="px-3 py-2 text-sm bg-red-500 text-white rounded-lg">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
