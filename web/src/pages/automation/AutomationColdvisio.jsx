import { useEffect, useState } from 'react'
import { Eye, FileText, ChevronRight, ChevronLeft, Loader2, FolderOpen, ArrowLeft } from 'lucide-react'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

async function apiFetch(path) {
  const token = sessionStorage.getItem('automation_token')
  const r = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) throw new Error(r.status)
  return r.json()
}

export default function AutomationColdvisio() {
  const [files, setFiles]       = useState([])
  const [selected, setSelected] = useState(null)
  const [steps, setSteps]       = useState([])
  const [stepIdx, setStepIdx]   = useState(0)
  const [loading, setLoading]   = useState(true)
  const [loadingFile, setLF]    = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    apiFetch('/api/Coldvisio/files')
      .then(data => setFiles(Array.isArray(data) ? data : []))
      .catch(() => setError('Não foi possível carregar os arquivos Coldvisio.'))
      .finally(() => setLoading(false))
  }, [])

  const openFile = async (file) => {
    setLF(true)
    setError('')
    try {
      const data = await apiFetch(`/api/Coldvisio/files/${encodeURIComponent(file.name || file)}`)
      const list = Array.isArray(data) ? data : (data.steps || [])
      setSteps(list)
      setStepIdx(0)
      setSelected(file.name || file)
    } catch {
      setError('Erro ao carregar arquivo.')
    }
    setLF(false)
  }

  const step = steps[stepIdx]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Eye size={20} className="text-slate-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-900">Coldvisio</h1>
          <p className="text-sm text-slate-400">Visualizador de etapas</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>
      )}

      {!selected ? (
        /* File list */
        loading ? (
          <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
        ) : files.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
            <FolderOpen size={28} className="text-slate-200 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Nenhum arquivo encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((f, i) => {
              const name = f.name || f
              return (
                <button key={i} onClick={() => openFile(f)}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-cyan-200 cursor-pointer transition-all p-5 text-left group">
                  <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center mb-3 group-hover:bg-cyan-100 transition-colors">
                    <FileText size={18} className="text-cyan-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-800 truncate">{name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{f.size ? `${(f.size/1024).toFixed(1)} KB` : 'Coldvisio'}</p>
                </button>
              )
            })}
          </div>
        )
      ) : (
        /* Step viewer */
        <div>
          <button onClick={() => { setSelected(null); setSteps([]) }}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors">
            <ArrowLeft size={14} /> Voltar
          </button>

          {loadingFile ? (
            <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-slate-300" /></div>
          ) : steps.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center">
              <p className="text-sm text-slate-400">Nenhuma etapa encontrada</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">{selected}</p>
                  <h2 className="font-semibold text-slate-800">
                    {step?.title || step?.name || `Etapa ${stepIdx + 1}`}
                  </h2>
                </div>
                <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {stepIdx + 1} / {steps.length}
                </span>
              </div>

              {/* Content */}
              <div className="px-6 py-6 min-h-[300px]">
                {step?.image && (
                  <img src={`${BASE_URL}/coldvisio/${step.image}`} alt={step.title}
                    className="w-full max-h-80 object-contain rounded-xl border border-slate-100 mb-4" />
                )}
                {step?.description && (
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{step.description}</p>
                )}
                {step?.content && (
                  <div className="text-sm text-slate-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: step.content }} />
                )}
                {!step?.description && !step?.content && !step?.image && (
                  <pre className="text-sm text-slate-600 bg-slate-50 rounded-xl p-4 overflow-x-auto">
                    {JSON.stringify(step, null, 2)}
                  </pre>
                )}
              </div>

              {/* Nav */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <button onClick={() => setStepIdx(i => i - 1)} disabled={stepIdx === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-cyan-400 disabled:opacity-30 transition-colors">
                  <ChevronLeft size={15} /> Anterior
                </button>

                <div className="flex gap-1.5">
                  {steps.map((_, i) => (
                    <button key={i} onClick={() => setStepIdx(i)}
                      className={`w-2 h-2 rounded-full transition-all ${i === stepIdx ? 'bg-cyan-500 w-4' : 'bg-slate-200 hover:bg-slate-300'}`} />
                  ))}
                </div>

                <button onClick={() => setStepIdx(i => i + 1)} disabled={stepIdx === steps.length - 1}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 hover:border-cyan-400 disabled:opacity-30 transition-colors">
                  Próximo <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
