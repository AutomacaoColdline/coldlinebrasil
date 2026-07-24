import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import QrScannerWorkerPath from 'qr-scanner/qr-scanner-worker.min.js?url'
import { X, Camera, Search, AlertTriangle } from 'lucide-react'

QrScanner.WORKER_PATH = QrScannerWorkerPath

/**
 * Modal de leitura de QR code pela câmera. Decodifica e chama onDecode(text).
 * Se a câmera falhar (sem permissão, sem HTTPS, sem câmera), cai num campo de
 * busca manual (código/identificação) pra não travar o operador.
 *
 * Props:
 *   onClose    — () => void
 *   onDecode   — (text: string) => void
 *   onManual   — (query: string) => void  (fallback de busca manual)
 */
export default function QrScannerModal({ onClose, onDecode, onManual }) {
  const videoRef = useRef(null)
  const scannerRef = useRef(null)
  const [error, setError] = useState('')
  const [manualQuery, setManualQuery] = useState('')

  useEffect(() => {
    let cancelled = false

    QrScanner.hasCamera().then(has => {
      if (cancelled) return
      if (!has) {
        setError('Nenhuma câmera disponível neste dispositivo.')
        return
      }
      const scanner = new QrScanner(
        videoRef.current,
        (result) => {
          const text = typeof result === 'string' ? result : result?.data
          if (text) {
            scanner.stop()
            onDecode(text)
          }
        },
        { highlightScanRegion: true, highlightCodeOutline: true, preferredCamera: 'environment' },
      )
      scannerRef.current = scanner
      scanner.start().catch(() => {
        if (!cancelled) setError('Não foi possível acessar a câmera. Verifique a permissão do navegador.')
      })
    })

    return () => {
      cancelled = true
      scannerRef.current?.stop()
      scannerRef.current?.destroy()
      scannerRef.current = null
    }
  }, [onDecode])

  const submitManual = (e) => {
    e.preventDefault()
    if (manualQuery.trim()) onManual(manualQuery.trim())
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-blue-600" />
            <h2 className="text-slate-800 font-semibold text-sm">Escanear QR da máquina</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {!error ? (
          <div className="relative bg-black aspect-square">
            <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          </div>
        ) : (
          <div className="px-5 py-4 bg-amber-50 border-b border-amber-100 flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{error}</p>
          </div>
        )}

        <div className="p-5">
          <p className="text-xs text-slate-400 mb-2">Ou busque manualmente pelo código / cliente:</p>
          <form onSubmit={submitManual} className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus={!!error}
                value={manualQuery}
                onChange={e => setManualQuery(e.target.value)}
                placeholder="Código, nº de série ou cliente…"
                className="w-full pl-8 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Buscar
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
