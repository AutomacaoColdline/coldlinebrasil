import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import { ArrowLeft, Printer, Loader2 } from 'lucide-react'
import { api } from '../../services/api'

export function machineScanUrl(machineId) {
  return `${window.location.origin}/industria/scan/${machineId}`
}

export default function IndustriaMachineQrPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const canvasRef = useRef(null)
  const [machine, setMachine] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getMachineById(id)
      .then(r => setMachine(r.data))
      .catch(() => navigate('/industria/machines'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  useEffect(() => {
    if (!machine || !canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, machineScanUrl(machine.id), {
      width: 480,
      margin: 1,
      errorCorrectionLevel: 'H',
    }).catch(() => {})
  }, [machine])

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <Loader2 size={22} className="animate-spin text-slate-300" />
    </div>
  )
  if (!machine) return null

  const code = machine.identificationNumber || machine.customerName || machine.id?.slice(-6)

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Barra de ações — some na impressão */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Printer size={15} /> Imprimir (A4)
        </button>
      </div>

      {/* Folha A4 */}
      <div className="qr-a4-sheet mx-auto bg-white shadow-lg print:shadow-none flex flex-col items-center justify-center gap-10 py-16">
        <p className="text-lg font-semibold text-slate-500 tracking-wide uppercase">Coldline · Indústria</p>
        <canvas ref={canvasRef} className="border-4 border-slate-800 rounded-2xl" />
        <div className="text-center">
          <p className="text-sm text-slate-400 uppercase tracking-wide mb-2">Número de série / identificação</p>
          <p className="text-7xl font-black text-slate-900 tracking-tight font-mono">{code}</p>
          {machine.customerName && machine.customerName !== code && (
            <p className="text-xl text-slate-500 mt-3">{machine.customerName}</p>
          )}
        </div>
      </div>

      <style>{`
        .qr-a4-sheet { width: 210mm; min-height: 297mm; }
        @media print {
          @page { size: A4; margin: 0; }
          body { margin: 0; }
        }
      `}</style>
    </div>
  )
}
