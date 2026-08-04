import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Boxes, Edit, Factory, Loader2, RefreshCw } from 'lucide-react'
import { productionApi } from './productionApi'
import { formatNumber } from '../informationShared'

function DashboardCard({ title, value, helper, icon: Icon, tone }) {
  const tones = {
    pink: 'bg-pink-50 text-pink-500 border-pink-100',
    amber: 'bg-amber-50 text-amber-600 border-amber-100',
    rose: 'bg-rose-50 text-rose-600 border-rose-100',
  }
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
          {helper && <p className="text-xs text-slate-500 mt-2">{helper}</p>}
        </div>
        <div className={`w-11 h-11 rounded-xl border flex items-center justify-center ${tones[tone] || tones.pink}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export default function ProductionPage() {
  const navigate = useNavigate()
  const [models, setModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(true)
  const [dashboard, setDashboard] = useState({ items: [] })
  const [dashboardLoading, setDashboardLoading] = useState(true)

  const loadModels = useCallback(async () => {
    setModelsLoading(true)
    try {
      const response = await productionApi.getModels()
      setModels(response.data?.items || [])
    } finally {
      setModelsLoading(false)
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    setDashboardLoading(true)
    try {
      const response = await productionApi.getDashboard()
      setDashboard(response.data || { items: [] })
    } finally {
      setDashboardLoading(false)
    }
  }, [])

  useEffect(() => {
    loadModels()
    loadDashboard()
  }, [loadModels, loadDashboard])

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">Departamento de Informação</p>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">Produção</h1>
            <p className="text-sm text-slate-500 mt-2 max-w-3xl">
              Listas de materiais dos modelos Coldline, comparativo entre o padrão e o que foi montado
              para cada cliente, e endereçamento de evaporadores por número de série.
            </p>
          </div>
          <button
            onClick={() => { loadModels(); loadDashboard() }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm text-slate-600 hover:border-pink-200"
          >
            <RefreshCw size={14} />
            Atualizar
          </button>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Dashboard de Divergências</h2>
        {dashboardLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <DashboardCard
                title="Materiais Fora do Padrão"
                value={formatNumber(dashboard.totalDivergentMaterials)}
                helper="Materiais distintos com divergência em alguma unidade."
                icon={Boxes}
                tone="pink"
              />
              <DashboardCard
                title="Unidades com Divergência"
                value={formatNumber(dashboard.totalBuildsWithDivergence)}
                helper="Modelos criados ao cliente com BOM diferente do padrão."
                icon={AlertTriangle}
                tone="amber"
              />
              <DashboardCard
                title="Quantidade Fora do Padrão"
                value={formatNumber(dashboard.totalQuantityOutOfStandard)}
                helper="Soma das diferenças de quantidade (padrão x cliente)."
                icon={AlertTriangle}
                tone="rose"
              />
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {(dashboard.items || []).length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Nenhuma divergência encontrada.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Cód. Interno', 'Material', 'Fornecedor/Fabricante', 'UN', 'Ocorrências', 'Qtd. Fora do Padrão'].map((label) => (
                          <th key={label} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dashboard.items.map((item) => (
                        <tr key={item.partId} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-sm text-slate-700">{item.internalCode || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{item.partName || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{item.supplier || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{item.unitOfMeasure || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{formatNumber(item.occurrences)}</td>
                          <td className="px-4 py-2.5 text-sm font-semibold text-rose-600">{formatNumber(item.totalQuantityOutOfStandard)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-3">Modelos</h2>
        {modelsLoading ? (
          <div className="py-16 flex items-center justify-center">
            <Loader2 size={22} className="animate-spin text-slate-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {models.map((model) => (
              <div key={model.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4">
                <div className="w-11 h-11 rounded-xl border bg-pink-50 text-pink-500 border-pink-100 flex items-center justify-center">
                  <Factory size={18} />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">{model.name}</p>
                  <p className="text-xs text-slate-400 mt-1">Modelo padrão, unidades de cliente e números de série.</p>
                </div>
                <button
                  onClick={() => navigate(`/departamento-informacao/producao/${model.id}`)}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 mt-auto"
                >
                  <Edit size={14} />
                  Editar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
