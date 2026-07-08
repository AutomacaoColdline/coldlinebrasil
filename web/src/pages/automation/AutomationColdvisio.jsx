import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen, ChevronLeft, ChevronRight, Download, Eye, FileArchive,
  FolderOpen, History, Maximize2, Minimize2, Plus, Save, Search, Trash2, Upload
} from 'lucide-react'
import { automationApi } from '../../services/automationApi'

const PRODUCTS = {
  coldvisio: { name: 'Coldvisio', subtitle: 'Guia de instalacao e diario de atualizacoes' },
  xweb: { name: 'XWEB', subtitle: 'Guia de instalacao' },
  sitrad: { name: 'SITRAD', subtitle: 'Guia de instalacao' },
}

function normalizeUrl(url) {
  if (!url) return '#'
  if (/^https?:\/\//i.test(url)) return url
  return `https://${url}`
}

function renderTextWithLinks(text) {
  if (!text) return null
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi
  const parts = String(text).split(urlRegex)
  const isUrl = (value) => /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i.test(value)
  return parts.map((part, i) => (
    isUrl(part) ? (
      <a
        key={`link-${i}`}
        href={normalizeUrl(part)}
        target="_blank"
        rel="noreferrer"
        className="text-cyan-600 underline break-all"
      >
        {part}
      </a>
    ) : <span key={`txt-${i}`}>{part}</span>
  ))
}

function formatFileSize(size) {
  if (!size) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  let value = Number(size)
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatDate(value) {
  if (!value) return '-'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export default function AutomationColdvisio({ productKey = 'coldvisio' }) {
  const product = PRODUCTS[productKey] || PRODUCTS.coldvisio
  const hasUpdates = productKey === 'coldvisio'

  const [section, setSection] = useState('guide')
  const [mode, setMode] = useState('view')
  const [stepIdx, setStepIdx] = useState(0)
  const [guide, setGuide] = useState([])
  const [savingGuide, setSavingGuide] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saveError, setSaveError] = useState(null)

  const [updates, setUpdates] = useState([])
  const [updatesLoading, setUpdatesLoading] = useState(false)
  const [updateSearch, setUpdateSearch] = useState('')
  const [updateForm, setUpdateForm] = useState({ version: '', title: '', notes: '', files: [] })
  const [savingUpdate, setSavingUpdate] = useState(false)
  const [expandedUpdates, setExpandedUpdates] = useState({})

  useEffect(() => {
    setLoading(true)
    setStepIdx(0)
    automationApi.getColdvisioGuide(productKey)
      .then(res => setGuide(Array.isArray(res.data) ? res.data : []))
      .catch(() => setGuide([]))
      .finally(() => setLoading(false))
  }, [productKey])

  useEffect(() => {
    if (!hasUpdates) return
    loadUpdates()
  }, [hasUpdates])

  const guideStep = guide[stepIdx]

  const filteredUpdates = useMemo(() => {
    const term = updateSearch.trim().toLowerCase()
    if (!term) return updates
    return updates.filter(item => [
      item.version, item.title, item.notes, item.fileName,
      ...(item.files || []).map(file => file.fileName),
    ].some(value => String(value || '').toLowerCase().includes(term)))
  }, [updates, updateSearch])

  const emptyGuideStep = () => ({ title: '', description: '', imageData: '' })

  const loadUpdates = async () => {
    setUpdatesLoading(true)
    try {
      const res = await automationApi.getColdvisioUpdates()
      setUpdates(Array.isArray(res.data) ? res.data : [])
    } catch {
      setUpdates([])
    } finally {
      setUpdatesLoading(false)
    }
  }

  const saveGuide = async () => {
    setSavingGuide(true)
    setSaveError(null)
    try {
      await automationApi.saveColdvisioGuide(guide, productKey)
      setTimeout(() => setSavingGuide(false), 500)
    } catch {
      setSaveError('Erro ao salvar. Tente novamente.')
      setSavingGuide(false)
    }
  }

  const setGuideField = (idx, key, value) => {
    setGuide(prev => prev.map((s, i) => (i === idx ? { ...s, [key]: value } : s)))
  }

  const addGuideStep = () => {
    setGuide(prev => [...prev, emptyGuideStep()])
    setStepIdx(guide.length)
  }

  const removeGuideStep = (idx) => {
    setGuide(prev => prev.filter((_, i) => i !== idx))
    setStepIdx(i => Math.max(0, Math.min(i, guide.length - 2)))
  }

  const onGuideImage = (idx, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setGuideField(idx, 'imageData', String(reader.result || ''))
    reader.readAsDataURL(file)
  }

  const saveUpdate = async (e) => {
    e.preventDefault()
    if (!updateForm.files.length) return
    setSavingUpdate(true)
    const fd = new FormData()
    fd.append('version', updateForm.version)
    fd.append('title', updateForm.title)
    fd.append('notes', updateForm.notes)
    updateForm.files.forEach(file => fd.append('files', file))
    try {
      await automationApi.createColdvisioUpdate(fd)
      setUpdateForm({ version: '', title: '', notes: '', files: [] })
      e.target.reset()
      await loadUpdates()
    } finally {
      setSavingUpdate(false)
    }
  }

  const downloadUpdate = async (entry, file = null) => {
    const res = file
      ? await automationApi.downloadColdvisioUpdateFile(entry.id, file.id)
      : await automationApi.downloadColdvisioUpdate(entry.id)
    const url = URL.createObjectURL(res.data)
    const link = document.createElement('a')
    link.href = url
    link.download = file?.fileName || entry.fileName || 'arquivo'
    link.click()
    URL.revokeObjectURL(url)
  }

  const deleteUpdate = async (id) => {
    if (!window.confirm('Remover este registro do diario?')) return
    await automationApi.deleteColdvisioUpdate(id)
    await loadUpdates()
  }

  const toggleUpdateExpanded = (id) => {
    setExpandedUpdates(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Eye size={20} className="text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-400">{product.subtitle}</p>
        </div>
      </div>

      {hasUpdates && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setSection('guide')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${
              section === 'guide'
                ? 'bg-cyan-500 text-white border-cyan-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'
            }`}
          >
            <BookOpen size={15} /> Guia
          </button>
          <button
            onClick={() => setSection('updates')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm border transition-all ${
              section === 'updates'
                ? 'bg-cyan-500 text-white border-cyan-500'
                : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'
            }`}
          >
            <History size={15} /> Diario de atualizacoes
          </button>
        </div>
      )}

      {section === 'guide' ? (
        <div>
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setMode('view')}
              className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                mode === 'view'
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'
              }`}
            >
              Visualizacao do Guia
            </button>
            <button
              onClick={() => setMode('manage')}
              className={`px-4 py-2 rounded-lg text-sm border transition-all ${
                mode === 'manage'
                  ? 'bg-cyan-500 text-white border-cyan-500'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'
              }`}
            >
              Gerenciar Guia
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">Guia de Instalacao</h2>
              {mode === 'manage' && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={addGuideStep}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-200 text-cyan-700 hover:bg-cyan-50 text-sm"
                  >
                    <Plus size={14} /> Novo passo
                  </button>
                  <button
                    onClick={saveGuide}
                    disabled={savingGuide}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 text-sm disabled:opacity-60"
                  >
                    <Save size={14} /> {savingGuide ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              )}
            </div>

            {saveError && <p className="px-6 py-2 text-xs text-red-500">{saveError}</p>}

            {loading ? (
              <div className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-400">Carregando guia...</p>
              </div>
            ) : guide.length === 0 ? (
              <div className="py-16 text-center">
                <FolderOpen size={26} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Guia ainda nao preenchido</p>
              </div>
            ) : (
              <div className="px-6 py-6 space-y-4">
                {mode === 'manage' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Editando passo {stepIdx + 1} de {guide.length}
                      </p>
                      <button
                        onClick={() => removeGuideStep(stepIdx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs"
                      >
                        <Trash2 size={12} /> Excluir passo
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Titulo</label>
                      <input
                        value={guideStep?.title || ''}
                        onChange={e => setGuideField(stepIdx, 'title', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                        placeholder="Ex.: Instalacao do Runtime"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Descricao</label>
                      <textarea
                        rows={7}
                        value={guideStep?.description || ''}
                        onChange={e => setGuideField(stepIdx, 'description', e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                        placeholder="Instrucoes do passo..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Imagem</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={e => onGuideImage(stepIdx, e.target.files?.[0])}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      />
                    </div>

                    {guideStep?.imageData && (
                      <img
                        src={guideStep.imageData}
                        alt={guideStep.title || `Passo ${stepIdx + 1}`}
                        className="w-full max-h-72 object-contain rounded-xl border border-slate-100 bg-white"
                      />
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                    <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Passo {stepIdx + 1} de {guide.length}
                    </p>
                    <h3 className="text-base font-semibold text-slate-800 mb-2">{guideStep?.title || `Passo ${stepIdx + 1}`}</h3>
                    {guideStep?.imageData && (
                      <img
                        src={guideStep.imageData}
                        alt={guideStep.title || `Passo ${stepIdx + 1}`}
                        className="w-full max-h-72 object-contain rounded-xl border border-slate-100 mb-3 bg-white"
                      />
                    )}
                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {renderTextWithLinks(guideStep?.description || '')}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setStepIdx(i => Math.max(0, i - 1))}
                    disabled={stepIdx === 0}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-cyan-400 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={15} /> Anterior
                  </button>
                  <button
                    onClick={() => setStepIdx(i => Math.min(guide.length - 1, i + 1))}
                    disabled={stepIdx === guide.length - 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-cyan-400 disabled:opacity-30 transition-colors"
                  >
                    Proximo <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-4">
          <form onSubmit={saveUpdate} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 self-start">
            <div>
              <h2 className="font-semibold text-slate-800">Novo registro</h2>
              <p className="text-xs text-slate-400 mt-1">Anotacoes e arquivo ficam salvos no banco.</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Versao</label>
              <input
                value={updateForm.version}
                onChange={e => setUpdateForm(f => ({ ...f, version: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Ex.: 2.4.1"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Titulo</label>
              <input
                value={updateForm.title}
                onChange={e => setUpdateForm(f => ({ ...f, title: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                placeholder="Ex.: Instalador com correcao X"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Anotacoes</label>
              <textarea
                rows={6}
                value={updateForm.notes}
                onChange={e => setUpdateForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                placeholder="Alteracoes, observacoes, links, requisitos..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Arquivo</label>
              <label className="flex items-center gap-3 border border-dashed border-slate-300 rounded-xl px-3 py-3 text-sm text-slate-500 cursor-pointer hover:border-cyan-300 hover:bg-cyan-50/40">
                <Upload size={16} />
                <span className="truncate">
                  {updateForm.files.length
                    ? `${updateForm.files.length} arquivo(s) selecionado(s)`
                    : 'Selecionar um ou mais arquivos'}
                </span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={e => setUpdateForm(f => ({ ...f, files: Array.from(e.target.files || []) }))}
                />
              </label>
              {updateForm.files.length > 0 && (
                <div className="mt-2 space-y-1">
                  {updateForm.files.map(file => (
                    <p key={`${file.name}-${file.size}-${file.lastModified}`} className="text-xs text-slate-400 truncate">
                      {file.name} - {formatFileSize(file.size)}
                    </p>
                  ))}
                </div>
              )}
            </div>
            <button
              disabled={!updateForm.files.length || savingUpdate}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 text-sm disabled:opacity-60"
            >
              <Save size={15} /> {savingUpdate ? 'Salvando...' : 'Salvar no diario'}
            </button>
          </form>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <h2 className="font-semibold text-slate-800">Historico do Coldvisio</h2>
              <div className="relative w-full md:w-80">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={updateSearch}
                  onChange={e => setUpdateSearch(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                  placeholder="Buscar versao, anotacao ou arquivo"
                />
              </div>
            </div>

            {updatesLoading ? (
              <div className="py-16 text-center">
                <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-400">Carregando diario...</p>
              </div>
            ) : filteredUpdates.length === 0 ? (
              <div className="py-16 text-center">
                <FileArchive size={26} className="text-slate-200 mx-auto mb-2" />
                <p className="text-sm text-slate-400">Nenhum registro encontrado</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredUpdates.map(entry => (
                  <div key={entry.id} className="p-5">
                    {(() => {
                      const files = entry.files?.length ? entry.files : [entry]
                      const expanded = Boolean(expandedUpdates[entry.id])
                      return (
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {entry.version && (
                            <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-700 text-xs font-semibold">
                              v{entry.version}
                            </span>
                          )}
                          <span className="text-xs text-slate-400">{formatDate(entry.createdAt)}</span>
                        </div>
                        <h3 className="font-semibold text-slate-800">{entry.title || entry.fileName}</h3>
                        {entry.notes && (
                          <p className={`text-sm text-slate-600 mt-2 leading-relaxed ${expanded ? 'whitespace-pre-wrap' : 'truncate'}`}>
                            {renderTextWithLinks(entry.notes)}
                          </p>
                        )}
                        {!expanded && (
                          <p className="text-xs text-slate-400 mt-3">
                            {files.length} arquivo(s) anexado(s)
                          </p>
                        )}
                        {expanded && (
                          <div className="mt-3 space-y-2">
                          {files.map(file => (
                            <div
                              key={file.id || entry.id}
                              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                            >
                              <p className="text-xs text-slate-500 truncate">
                                {file.fileName} - {formatFileSize(file.fileSize)}
                              </p>
                              <button
                                onClick={() => downloadUpdate(entry, file.id ? file : null)}
                                className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-lg border border-cyan-200 text-cyan-700 hover:bg-cyan-50 text-xs"
                              >
                                <Download size={13} /> Baixar
                              </button>
                            </div>
                          ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => toggleUpdateExpanded(entry.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:border-cyan-300 hover:text-cyan-700 hover:bg-cyan-50 text-sm"
                        >
                          {expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                          {expanded ? 'Minimizar' : 'Exibir'}
                        </button>
                        <button
                          onClick={() => deleteUpdate(entry.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm"
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    </div>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
