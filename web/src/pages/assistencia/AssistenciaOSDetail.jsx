import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { workOrderApi } from '../../services/assistenciaApi'
import { api } from '../../services/api'
import {
  ArrowLeft, MapPin, User, Clock, CheckCircle, XCircle,
  RefreshCw, Upload, Trash2, AlertTriangle, Camera,
  ChevronDown, Navigation, FileText,
  List, CircleDot, UserPlus, X,
} from 'lucide-react'

// ── helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABELS = {
  ABERTA:       { label: 'Aberta',       color: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  EM_ANDAMENTO: { label: 'Em andamento', color: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' },
  CONCLUIDA:    { label: 'Concluída',    color: 'bg-green-500/15 text-green-400 border-green-500/20' },
  CANCELADA:    { label: 'Cancelada',    color: 'bg-red-500/15 text-red-400 border-red-500/20' },
}

const TL_ICONS = {
  CRIADA:     CircleDot,
  ATRIBUIDA:  UserPlus,
  CHECKIN:    Navigation,
  ATUALIZACAO: FileText,
  IMAGEM:     Camera,
  CHECKOUT:   CheckCircle,
  CONCLUIDA:  CheckCircle,
  CANCELADA:  XCircle,
}

function StatusBadge({ status }) {
  const s = STATUS_LABELS[status] || { label: status, color: 'bg-white/10 text-white/40' }
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('pt-BR')
}

function fmtMeter(m) {
  if (m == null) return '—'
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`
}

function useGPS() {
  const [pos, setPos]       = useState(null)
  const [gpsErr, setGpsErr] = useState(null)
  const [loading, setLoading] = useState(false)

  const request = () => new Promise((res, rej) => {
    setLoading(true)
    setGpsErr(null)
    navigator.geolocation.getCurrentPosition(
      (p) => { setPos(p); setLoading(false); res(p) },
      (e) => { setGpsErr(e.message); setLoading(false); rej(e) },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  })

  return { pos, gpsErr, loading, request }
}

// ── tabs ─────────────────────────────────────────────────────────────────────

function InfoTab({ os, onRefresh }) {
  const [statusMenu, setStatusMenu] = useState(false)
  const [saving, setSaving]         = useState(false)

  const changeStatus = async (s) => {
    setStatusMenu(false)
    setSaving(true)
    try {
      await workOrderApi.updateStatus(os.id, s)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao alterar status')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Dados principais */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider">Informações</h3>
        <Field label="Número"    value={os.osNumber} mono />
        <Field label="Descrição" value={os.description} />
        <Field label="Cliente"   value={os.client?.name} />
        <Field label="Endereço"  value={os.address} />
        <Field label="Criada em" value={fmtDate(os.createdAt)} />
        <Field label="Atualizada" value={fmtDate(os.updatedAt)} />
        <Field label="Raio permitido" value={os.allowedRadius ? `${os.allowedRadius} m` : '—'} />
      </div>

      {/* Status */}
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider mb-3">Status</h3>
        <div className="flex items-center gap-3">
          <StatusBadge status={os.status} />
          <div className="relative">
            <button
              onClick={() => setStatusMenu(!statusMenu)}
              disabled={saving}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white px-3 py-1.5 rounded-lg border border-white/10 hover:border-white/20 transition-all disabled:opacity-40"
            >
              Alterar <ChevronDown size={12} />
            </button>
            {statusMenu && (
              <div className="absolute top-full left-0 mt-1 bg-[#1e293b] border border-white/[0.1] rounded-xl shadow-2xl z-10 overflow-hidden min-w-[160px]">
                {Object.entries(STATUS_LABELS).map(([k, v]) => (
                  <button
                    key={k}
                    onClick={() => changeStatus(k)}
                    className="w-full text-left px-4 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/[0.06] transition-all"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Técnicos */}
      <TechniciansSection os={os} onRefresh={onRefresh} />

      {/* Check-in / Check-out */}
      <CheckSection os={os} onRefresh={onRefresh} />
    </div>
  )
}

function Field({ label, value, mono }) {
  return (
    <div className="flex gap-3">
      <span className="text-white/30 text-xs w-28 flex-shrink-0">{label}</span>
      <span className={`text-white/80 text-xs ${mono ? 'font-mono text-orange-400' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}

function TechniciansSection({ os, onRefresh }) {
  const [adding, setAdding]   = useState(false)
  const [users, setUsers]     = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [saving, setSaving]   = useState(false)
  const [loadingUsers, setLoadingUsers] = useState(false)

  const isAdminUser = (u) => {
    const t = (u?.userType?.name || '').toLowerCase()
    return t === 'admin' || t === 'setup' || t === 'administrador'
  }
  const isTecnicoUser = (u) => {
    const t = (u?.userType?.name || '').toLowerCase()
    return t.includes('tecnico') || t.includes('técnico')
  }

  useEffect(() => {
    if (!adding) return
    setLoadingUsers(true)
    api.searchUsersPaginated({ pageSize: 100 })
      .then(r => {
        const all = r.data?.items || []
        setUsers(all.filter(u => !isAdminUser(u) && isTecnicoUser(u)))
      })
      .catch(() => {})
      .finally(() => setLoadingUsers(false))
  }, [adding])

  const selected = users.find(u => u.id === selectedId) || null

  const openAdding = () => { setAdding(true); setSelectedId('') }
  const closeAdding = () => { setAdding(false); setSelectedId('') }

  const add = async () => {
    if (!selected) return
    setSaving(true)
    try {
      await workOrderApi.assignTechnician(os.id, {
        technicianId:   selected.id,
        technicianName: selected.name,
      })
      closeAdding()
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setSaving(false)
    }
  }

  const remove = async (techId) => {
    if (!confirm('Remover técnico?')) return
    try {
      await workOrderApi.removeTechnician(os.id, techId)
      onRefresh()
    } catch { /* ignore */ }
  }

  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider">Técnicos</h3>
        <button
          onClick={openAdding}
          className="text-xs text-orange-400 hover:text-orange-300 transition-colors flex items-center gap-1"
        >
          <UserPlus size={12} /> Atribuir
        </button>
      </div>

      {adding && (
        <div className="mb-3 p-3 bg-white/[0.03] rounded-lg border border-white/[0.06] space-y-2">
          {loadingUsers ? (
            <div className="flex justify-center py-3">
              <RefreshCw size={13} className="animate-spin text-white/20" />
            </div>
          ) : (
            <select
              className="w-full bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-white text-xs focus:outline-none focus:border-orange-500/50"
              value={selectedId}
              onChange={e => setSelectedId(e.target.value)}
              autoFocus
            >
              <option value="">Selecione um técnico...</option>
              {users.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.identificationNumber ? ` #${u.identificationNumber}` : ''}
                </option>
              ))}
            </select>
          )}

          {selected && (
            <div className="px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <p className="text-orange-300 text-xs font-medium">{selected.name}</p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={closeAdding} className="flex-1 py-1.5 text-xs text-white/40 border border-white/10 rounded-lg hover:border-white/20 transition-all">Cancelar</button>
            <button onClick={add} disabled={!selected || saving} className="flex-1 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-all">
              {saving ? 'Salvando...' : 'Atribuir'}
            </button>
          </div>
        </div>
      )}

      {os.technicians?.length > 0 ? (
        <ul className="space-y-2">
          {os.technicians.map((t, i) => (
            <li key={i} className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-xs">{t.technician?.name || '—'}</p>
                <p className="text-white/25 text-[10px]">{fmtDate(t.assignedAt)}</p>
              </div>
              <button onClick={() => remove(t.technician?.id)} className="text-white/20 hover:text-red-400 transition-colors p-1">
                <X size={12} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-white/25 text-xs">Nenhum técnico atribuído</p>
      )}
    </div>
  )
}

function CheckSection({ os, onRefresh }) {
  const { pos, gpsErr, loading: gpsLoading, request } = useGPS()
  const [doing, setDoing] = useState(false)

  const doCheckIn = async () => {
    setDoing(true)
    try {
      const p = await request()
      const r = await workOrderApi.checkIn(os.id, {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
      })
      if (r.data.outsideRadius) {
        alert(`Check-in registrado, mas você está a ${fmtMeter(r.data.distanceMeters)} do local (fora do raio permitido).`)
      }
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao fazer check-in')
    } finally {
      setDoing(false)
    }
  }

  const doCheckOut = async () => {
    setDoing(true)
    try {
      const p = await request()
      await workOrderApi.checkOut(os.id, {
        latitude: p.coords.latitude,
        longitude: p.coords.longitude,
        accuracy: p.coords.accuracy,
      })
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao fazer check-out')
    } finally {
      setDoing(false)
    }
  }

  return (
    <div className="bg-white/[0.03] rounded-xl border border-white/[0.06] p-5 space-y-4">
      <h3 className="text-white/50 text-xs font-semibold uppercase tracking-wider">Check-in / Check-out</h3>

      {gpsErr && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20">
          <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
          <p className="text-red-300 text-xs">{gpsErr}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <CheckEventCard label="Check-in" event={os.checkIn} />
        <CheckEventCard label="Check-out" event={os.checkOut} />
      </div>

      <div className="flex gap-3">
        {!os.checkIn && (
          <button
            onClick={doCheckIn}
            disabled={doing || gpsLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-500/15 hover:bg-green-500/25 border border-green-500/20 text-green-400 text-xs font-semibold rounded-lg transition-all disabled:opacity-40"
          >
            {doing || gpsLoading ? <RefreshCw size={13} className="animate-spin" /> : <Navigation size={13} />}
            Check-in
          </button>
        )}
        {os.checkIn && !os.checkOut && (
          <button
            onClick={doCheckOut}
            disabled={doing || gpsLoading}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/20 text-orange-400 text-xs font-semibold rounded-lg transition-all disabled:opacity-40"
          >
            {doing || gpsLoading ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle size={13} />}
            Check-out
          </button>
        )}
        {os.checkIn && os.checkOut && (
          <p className="text-white/30 text-xs">Ciclo de visita concluído</p>
        )}
      </div>
    </div>
  )
}

function CheckEventCard({ label, event }) {
  if (!event) return (
    <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-3">
      <p className="text-white/25 text-xs font-medium mb-1">{label}</p>
      <p className="text-white/15 text-[11px]">Não realizado</p>
    </div>
  )
  return (
    <div className="bg-white/[0.02] rounded-lg border border-white/[0.06] p-3 space-y-1">
      <p className="text-white/50 text-xs font-medium">{label}</p>
      <p className="text-white/70 text-[11px]">{fmtDate(event.timestamp)}</p>
      <p className="text-white/30 text-[11px]">Distância: {fmtMeter(event.distanceFromTarget)}</p>
      <p className="text-white/30 text-[11px]">Precisão: {event.accuracy ? `${Math.round(event.accuracy)} m` : '—'}</p>
      {event.outsideRadius && (
        <span className="text-[10px] text-yellow-400 flex items-center gap-1">
          <AlertTriangle size={10} /> Fora do raio
        </span>
      )}
    </div>
  )
}

// ── Report Tab ────────────────────────────────────────────────────────────────

function ReportTab({ os, onRefresh }) {
  const [report, setReport] = useState({
    problemDescription: '',
    diagnosis:          '',
    workPerformed:      '',
    partsUsed:          '',
    notes:              '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [uploadingField, setUploadingField] = useState('')
  const timerRef = useRef(null)
  const fileInputsRef = useRef({})
  const BASE_URL = import.meta.env.VITE_API_URL || ''

  useEffect(() => {
    if (os.report) {
      setReport({
        problemDescription: os.report.problemDescription || '',
        diagnosis:          os.report.diagnosis          || '',
        workPerformed:      os.report.workPerformed      || '',
        partsUsed:          os.report.partsUsed          || '',
        notes:              os.report.notes              || '',
      })
    }
  }, [os.report])

  const saveNow = useCallback(async (data) => {
    setSaving(true)
    setSaved(false)
    try {
      await workOrderApi.updateReport(os.id, data)
      setSaved(true)
    } catch { /* ignore */ }
    finally { setSaving(false) }
  }, [os.id])

  const handleChange = (field, value) => {
    const next = { ...report, [field]: value }
    setReport(next)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => saveNow(next), 1500)
  }

  const fields = [
    { key: 'problemDescription', label: 'Descrição do problema',   rows: 3 },
    { key: 'diagnosis',          label: 'Diagnóstico',             rows: 3 },
    { key: 'workPerformed',      label: 'Serviço realizado',       rows: 4 },
    { key: 'partsUsed',          label: 'Peças / materiais usados', rows: 2 },
    { key: 'notes',              label: 'Observações',             rows: 2 },
  ]

  const sectionTag = (k) => `section:${k}`
  const imagesOfSection = (k) => (os.images || []).filter(img => (img.annotation || '') === sectionTag(k))

  const uploadToSection = async (field, files) => {
    if (!files?.length) return
    setUploadingField(field)
    try {
      for (const file of files) {
        await workOrderApi.uploadImage(os.id, file, sectionTag(field))
      }
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao enviar imagem')
    } finally {
      setUploadingField('')
      if (fileInputsRef.current[field]) fileInputsRef.current[field].value = ''
    }
  }

  const deleteSectionImage = async (imgId) => {
    if (!confirm('Remover imagem deste campo?')) return
    try {
      await workOrderApi.deleteImage(os.id, imgId)
      onRefresh()
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro ao remover imagem')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-xs">
          {os.report?.lastUpdatedAt ? `Salvo em ${fmtDate(os.report.lastUpdatedAt)}` : 'Ainda não salvo'}
        </p>
        <div className="flex items-center gap-2">
          {saving && <RefreshCw size={12} className="animate-spin text-white/30" />}
          {!saving && saved && <span className="text-green-400 text-xs">Salvo</span>}
          <button
            onClick={() => saveNow(report)}
            className="text-xs px-3 py-1.5 bg-orange-500/15 hover:bg-orange-500/25 border border-orange-500/20 text-orange-400 rounded-lg transition-all"
          >
            Salvar agora
          </button>
        </div>
      </div>

      {fields.map(({ key, label, rows }) => (
        <div key={key}>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs text-white/40">{label}</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputsRef.current[key]?.click()}
                disabled={uploadingField === key}
                className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg border border-orange-500/20 text-orange-300 hover:bg-orange-500/10 transition-all disabled:opacity-50"
              >
                {uploadingField === key ? <RefreshCw size={11} className="animate-spin" /> : <Upload size={11} />}
                {uploadingField === key ? 'Enviando...' : 'Imagem'}
              </button>
              <input
                ref={el => { fileInputsRef.current[key] = el }}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={e => uploadToSection(key, e.target.files)}
              />
            </div>
          </div>
          <textarea
            rows={rows}
            className="w-full bg-white/[0.04] border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder-white/15 focus:outline-none focus:border-orange-500/40 resize-none"
            value={report[key]}
            onChange={e => handleChange(key, e.target.value)}
          />
          {imagesOfSection(key).length > 0 && (
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {imagesOfSection(key).map(img => (
                <div key={img.id} className="relative group rounded-lg overflow-hidden border border-white/[0.08] bg-white/[0.02]">
                  <img
                    src={`${BASE_URL}/${img.url}`}
                    alt={label}
                    className="w-full aspect-video object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => deleteSectionImage(img.id)}
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-md bg-black/60 text-red-300 opacity-0 group-hover:opacity-100 transition-all"
                    title="Remover imagem"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Timeline Tab ──────────────────────────────────────────────────────────────

function TimelineTab({ os }) {
  const events = [...(os.timeline || [])].reverse()
  return (
    <div className="space-y-3">
      {events.length === 0 && (
        <p className="text-white/25 text-sm text-center py-10">Sem eventos registrados</p>
      )}
      {events.map((ev, i) => {
        const Icon = TL_ICONS[ev.type] || CircleDot
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center flex-shrink-0">
                <Icon size={12} className="text-orange-400" />
              </div>
              {i < events.length - 1 && <div className="w-px flex-1 bg-white/[0.05] mt-1" />}
            </div>
            <div className="pb-4 flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-white/70 text-xs font-medium">{ev.type.replace(/_/g, ' ')}</span>
                <span className="text-white/25 text-[10px]">por {ev.userName || ev.userId || 'sistema'}</span>
              </div>
              <p className="text-white/30 text-[11px] mt-0.5">{fmtDate(ev.timestamp)}</p>
              {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {Object.entries(ev.metadata).map(([k, v]) => (
                    <span key={k} className="text-[10px] text-white/25">
                      {k}: <span className="text-white/40">{String(v)}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'info',      label: 'Informações', icon: List },
  { id: 'relatorio', label: 'Relatório',   icon: FileText },
  { id: 'timeline',  label: 'Histórico',   icon: Clock },
]

export default function AssistenciaOSDetail() {
  const { id }    = useParams()
  const navigate  = useNavigate()
  const [os, setOs]         = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab]       = useState('info')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await workOrderApi.getById(id)
      setOs(r.data)
    } catch {
      navigate('/assistencia')
    } finally {
      setLoading(false)
    }
  }, [id, navigate])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div className="flex justify-center items-center h-screen">
      <RefreshCw size={20} className="animate-spin text-white/20" />
    </div>
  )

  if (!os) return null

  return (
    <div className="flex flex-col h-screen">
      {/* Top bar */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-white/[0.06] flex-shrink-0">
        <button
          onClick={() => navigate('/assistencia')}
          className="text-white/40 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-orange-400 font-mono text-sm font-semibold">{os.osNumber}</span>
            <StatusBadge status={os.status} />
          </div>
          <p className="text-white/50 text-xs mt-0.5 truncate">{os.description}</p>
        </div>
        <button onClick={load} className="text-white/30 hover:text-white/60 transition-colors p-1">
          <RefreshCw size={14} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/[0.06] px-6 flex-shrink-0 gap-1">
        {TABS.map(({ id: tid, label, icon: Icon }) => (
          <button
            key={tid}
            onClick={() => setTab(tid)}
            className={`flex items-center gap-2 px-3 py-3 text-xs font-medium border-b-2 transition-all ${
              tab === tid
                ? 'border-orange-500 text-orange-400'
                : 'border-transparent text-white/30 hover:text-white/60'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {tab === 'info'      && <InfoTab     os={os} onRefresh={load} />}
        {tab === 'relatorio' && <ReportTab   os={os} onRefresh={load} />}
        {tab === 'timeline'  && <TimelineTab os={os} />}
      </div>
    </div>
  )
}
