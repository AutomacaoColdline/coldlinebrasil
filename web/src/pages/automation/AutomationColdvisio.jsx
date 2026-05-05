import { useEffect, useState } from 'react'
import { Eye, ChevronRight, ChevronLeft, FolderOpen, Plus, Trash2, Save } from 'lucide-react'
const GUIDE_KEY = 'coldvisio_install_guide_v1'

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
  return parts.map((part, i) => {
    if (isUrl(part)) {
      return (
        <a
          key={`link-${i}`}
          href={normalizeUrl(part)}
          target="_blank"
          rel="noreferrer"
          className="text-cyan-600 underline break-all"
        >
          {part}
        </a>
      )
    }
    return <span key={`txt-${i}`}>{part}</span>
  })
}

export default function AutomationColdvisio() {
  const [mode, setMode]         = useState('view') // view | manage
  const [stepIdx, setStepIdx]   = useState(0)
  const [guide, setGuide]       = useState([])
  const [savingGuide, setSavingGuide] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(GUIDE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      setGuide(Array.isArray(parsed) ? parsed : [])
    } catch {
      setGuide([])
    }
  }, [])
  const guideStep = guide[stepIdx]

  const emptyGuideStep = () => ({ title: '', description: '', imageData: '' })

  const saveGuide = () => {
    setSavingGuide(true)
    try {
      localStorage.setItem(GUIDE_KEY, JSON.stringify(guide))
      setTimeout(() => setSavingGuide(false), 500)
    } catch {
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

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Eye size={20} className="text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Coldvisio</h1>
          <p className="text-sm text-slate-400">Guia de instalação</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode('view')}
          className={`px-4 py-2 rounded-lg text-sm border transition-all ${
            mode === 'view'
              ? 'bg-cyan-500 text-white border-cyan-500'
              : 'bg-white text-slate-600 border-slate-200 hover:border-cyan-300'
          }`}
        >
          Visualização do Guia
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
          <h2 className="font-semibold text-slate-800">Guia de Instalação</h2>
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 text-white hover:bg-cyan-600 text-sm"
              >
                <Save size={14} /> {savingGuide ? 'Salvo' : 'Salvar'}
              </button>
            </div>
          )}
        </div>

        {guide.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen size={26} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Guia ainda não preenchido</p>
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
                  <label className="block text-xs font-medium text-slate-500 mb-1">Título</label>
                  <input
                    value={guideStep?.title || ''}
                    onChange={e => setGuideField(stepIdx, 'title', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                    placeholder="Ex.: Instalação do Runtime"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
                  <textarea
                    rows={7}
                    value={guideStep?.description || ''}
                    onChange={e => setGuideField(stepIdx, 'description', e.target.value)}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-none"
                    placeholder="Instruções do passo..."
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
                <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Passo {stepIdx + 1} de {guide.length}</p>
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
                Próximo <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
