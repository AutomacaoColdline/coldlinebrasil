import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, GitCompare, Loader2, Plus, Trash2, Users, X } from 'lucide-react'
import { productionApi } from './productionApi'
import BomMaterialsTable from './BomMaterialsTable'
import EvaporatorAddressingSection from './EvaporatorAddressingSection'
import { formatNumber } from '../informationShared'

const TABS = [
  { id: 'standard', label: 'Modelo Padrao', icon: ClipboardList },
  { id: 'client', label: 'Modelo Criado ao Cliente', icon: Users },
  { id: 'divergences', label: 'Divergencias Comparativas', icon: GitCompare },
]

function NewBuildModal({ onClose, onSave, saving, saveError }) {
  const [clientName, setClientName] = useState('')
  const [orderReference, setOrderReference] = useState('')

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Novo Modelo Criado ao Cliente</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300">
            <X size={16} />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Cliente</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Pedido/Referencia</label>
            <input value={orderReference} onChange={(e) => setOrderReference(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          {saveError && <p className="text-xs text-rose-500 mr-auto max-w-xs leading-relaxed">⚠️ {saveError}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button
              onClick={() => onSave({ clientName, orderReference })}
              disabled={saving || !clientName.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Criar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ProductionModelPage() {
  const { modelId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('tab') || 'standard'

  const [model, setModel] = useState(null)

  const [standardBom, setStandardBom] = useState([])
  const [standardLoading, setStandardLoading] = useState(true)

  const [builds, setBuilds] = useState([])
  const [buildsLoading, setBuildsLoading] = useState(true)
  const [selectedBuildId, setSelectedBuildId] = useState(null)
  const [clientBom, setClientBom] = useState([])
  const [clientBomLoading, setClientBomLoading] = useState(false)

  const [newBuildOpen, setNewBuildOpen] = useState(false)
  const [savingBuild, setSavingBuild] = useState(false)
  const [buildSaveError, setBuildSaveError] = useState(null)

  const [divergenceBuildId, setDivergenceBuildId] = useState(null)
  const [divergenceBom, setDivergenceBom] = useState([])
  const [divergenceLoading, setDivergenceLoading] = useState(false)

  const loadModel = useCallback(async () => {
    const response = await productionApi.getModelById(modelId)
    setModel(response.data)
  }, [modelId])

  const loadStandardBom = useCallback(async () => {
    setStandardLoading(true)
    try {
      const response = await productionApi.getModelBom(modelId)
      setStandardBom(response.data?.items || [])
    } finally {
      setStandardLoading(false)
    }
  }, [modelId])

  const loadBuilds = useCallback(async () => {
    setBuildsLoading(true)
    try {
      const response = await productionApi.getBuilds(modelId)
      setBuilds(response.data?.items || [])
    } finally {
      setBuildsLoading(false)
    }
  }, [modelId])

  useEffect(() => {
    loadModel()
    loadStandardBom()
    loadBuilds()
  }, [loadModel, loadStandardBom, loadBuilds])

  const loadClientBom = useCallback(async (buildId) => {
    if (!buildId) {
      setClientBom([])
      return
    }
    setClientBomLoading(true)
    try {
      const response = await productionApi.getBuildBom(buildId)
      setClientBom(response.data?.items || [])
    } finally {
      setClientBomLoading(false)
    }
  }, [])

  useEffect(() => {
    loadClientBom(selectedBuildId)
  }, [selectedBuildId, loadClientBom])

  useEffect(() => {
    if (!divergenceBuildId) {
      setDivergenceBom([])
      return
    }
    setDivergenceLoading(true)
    productionApi.getBuildBom(divergenceBuildId)
      .then((response) => setDivergenceBom(response.data?.items || []))
      .finally(() => setDivergenceLoading(false))
  }, [divergenceBuildId])

  const applyPartEdits = async (line) => {
    let partId = line.selectedPart?.id
    if (partId) {
      const part = line.selectedPart
      const patch = {}
      if (line.unitOfMeasure !== (part.unitOfMeasure || '')) patch.unitOfMeasure = line.unitOfMeasure
      if (line.internalCode !== (part.internalCode || '')) patch.internalCode = line.internalCode
      if (line.supplier !== (part.supplier || '')) patch.supplier = line.supplier
      if (Object.keys(patch).length > 0) await productionApi.updatePart(partId, patch)
    } else {
      const response = await productionApi.createPart({
        name: line.name,
        unitOfMeasure: line.unitOfMeasure,
        internalCode: line.internalCode,
        supplier: line.supplier,
      })
      partId = response.data.id
    }
    return partId
  }

  const handleAddStandardLine = async (line) => {
    const partId = await applyPartEdits(line)
    await productionApi.createModelBomItem(modelId, { partId, quantity: line.quantity })
    await loadStandardBom()
  }

  const handleAddClientLine = async (line) => {
    const partId = await applyPartEdits(line)
    await productionApi.createBuildBomItem(selectedBuildId, { partId, quantity: line.quantity })
    await loadClientBom(selectedBuildId)
  }

  const handleUpdateQuantity = (reload) => async (item, quantity) => {
    await productionApi.updateBomItem(item.id, { quantity })
    await reload()
  }

  const handleUpdatePartField = (reload) => async (item, field, value) => {
    await productionApi.updatePart(item.partId, { [field]: value })
    await reload()
  }

  const handleRemoveLine = (reload) => async (item) => {
    await productionApi.deleteBomItem(item.id)
    await reload()
  }

  const handleCreateBuild = async (form) => {
    setSavingBuild(true)
    setBuildSaveError(null)
    try {
      const response = await productionApi.createBuild(modelId, form)
      setNewBuildOpen(false)
      await loadBuilds()
      setSelectedBuildId(response.data.id)
    } catch (err) {
      setBuildSaveError(err?.response?.data?.message || err?.message || 'Erro ao criar.')
    } finally {
      setSavingBuild(false)
    }
  }

  const handleDeleteBuild = async (build) => {
    if (!window.confirm(`Excluir o pedido de "${build.clientName}"? Materiais e numeros de serie desse pedido tambem serao removidos.`)) return
    await productionApi.deleteBuild(build.id)
    if (selectedBuildId === build.id) setSelectedBuildId(null)
    if (divergenceBuildId === build.id) setDivergenceBuildId(null)
    await loadBuilds()
  }

  const divergences = useMemo(() => {
    if (!divergenceBuildId) return []
    const standardByPart = new Map(standardBom.map((item) => [item.partId, item]))
    const clientByPart = new Map(divergenceBom.map((item) => [item.partId, item]))
    const partIds = new Set([...standardByPart.keys(), ...clientByPart.keys()])

    const rows = []
    partIds.forEach((partId) => {
      const std = standardByPart.get(partId)
      const cli = clientByPart.get(partId)
      const stdQty = std?.quantity || 0
      const cliQty = cli?.quantity || 0
      if (stdQty === cliQty) return

      let status = 'Alterado'
      if (!std) status = 'Adicionado'
      else if (!cli) status = 'Removido'

      const ref = cli || std
      rows.push({
        partId,
        internalCode: ref.internalCode,
        partName: ref.partName,
        unitOfMeasure: ref.unitOfMeasure,
        standardQuantity: stdQty,
        clientQuantity: cliQty,
        diff: cliQty - stdQty,
        status,
      })
    })
    return rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
  }, [divergenceBuildId, standardBom, divergenceBom])

  const selectedBuild = builds.find((b) => b.id === selectedBuildId) || null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6">
        <button
          onClick={() => navigate('/departamento-informacao/producao')}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-3"
        >
          <ArrowLeft size={14} />
          Voltar para Producao
        </button>
        <p className="text-xs uppercase tracking-[0.2em] text-pink-400 font-semibold">Modelo de Equipamento</p>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mt-2">{model?.name || '...'}</h1>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {TABS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setSearchParams({ tab: id })}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  active ? 'bg-pink-400 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === 'standard' && (
        <BomMaterialsTable
          items={standardBom}
          loading={standardLoading}
          onAddLine={handleAddStandardLine}
          onUpdateQuantity={handleUpdateQuantity(loadStandardBom)}
          onUpdatePartField={handleUpdatePartField(loadStandardBom)}
          onRemoveLine={handleRemoveLine(loadStandardBom)}
          searchParts={productionApi.searchParts}
          emptyLabel="Nenhum material cadastrado no modelo padrao."
          onExport={() => productionApi.exportModelBom(modelId)}
          onImport={(file) => productionApi.importModelBom(modelId, file)}
          onImported={loadStandardBom}
          exportFilename={`bom_padrao_${model?.name || modelId}.xlsx`}
        />
      )}

      {activeTab === 'client' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
              <h3 className="text-sm font-bold text-slate-900">Pedidos de Cliente</h3>
              <button
                onClick={() => { setBuildSaveError(null); setNewBuildOpen(true) }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
              >
                <Plus size={14} />
                Novo Modelo Criado ao Cliente
              </button>
            </div>
            {buildsLoading ? (
              <div className="py-8 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-slate-300" />
              </div>
            ) : builds.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">Nenhum pedido cadastrado para este modelo.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {builds.map((build) => (
                  <div
                    key={build.id}
                    className={`flex items-center gap-2 pl-4 pr-2 py-2 rounded-xl border text-sm ${
                      selectedBuildId === build.id ? 'bg-pink-50 border-pink-200 text-pink-600' : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <button onClick={() => setSelectedBuildId(build.id)} className="font-medium">
                      {build.clientName}{build.orderReference ? ` · ${build.orderReference}` : ''}
                    </button>
                    <button onClick={() => handleDeleteBuild(build)} className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-500">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedBuild && (
            <>
              <BomMaterialsTable
                items={clientBom}
                loading={clientBomLoading}
                onAddLine={handleAddClientLine}
                onUpdateQuantity={handleUpdateQuantity(() => loadClientBom(selectedBuildId))}
                onUpdatePartField={handleUpdatePartField(() => loadClientBom(selectedBuildId))}
                onRemoveLine={handleRemoveLine(() => loadClientBom(selectedBuildId))}
                searchParts={productionApi.searchParts}
                emptyLabel={`Nenhum material cadastrado para ${selectedBuild.clientName}.`}
                onExport={() => productionApi.exportBuildBom(selectedBuildId)}
                onImport={(file) => productionApi.importBuildBom(selectedBuildId, file)}
                onImported={() => loadClientBom(selectedBuildId)}
                exportFilename={`bom_cliente_${selectedBuild.clientName}.xlsx`}
              />
              <EvaporatorAddressingSection buildId={selectedBuild.id} />
            </>
          )}
        </div>
      )}

      {activeTab === 'divergences' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Comparar com o pedido</label>
            <select
              value={divergenceBuildId || ''}
              onChange={(event) => setDivergenceBuildId(event.target.value || null)}
              className="w-full sm:w-80 border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">Selecione um Modelo Criado ao Cliente</option>
              {builds.map((build) => (
                <option key={build.id} value={build.id}>
                  {build.clientName}{build.orderReference ? ` · ${build.orderReference}` : ''}
                </option>
              ))}
            </select>
          </div>

          {divergenceBuildId && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              {divergenceLoading || standardLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <Loader2 size={20} className="animate-spin text-slate-300" />
                </div>
              ) : divergences.length === 0 ? (
                <div className="py-10 text-center text-sm text-slate-400">Nenhuma divergencia — o BOM deste pedido e igual ao padrao.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Cod. Interno', 'Material', 'UN', 'Qtd. Padrao', 'Qtd. Cliente', 'Diferenca', 'Status'].map((label) => (
                          <th key={label} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {divergences.map((row) => (
                        <tr key={row.partId} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-sm text-slate-700">{row.internalCode || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{row.partName || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{row.unitOfMeasure || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{formatNumber(row.standardQuantity)}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{formatNumber(row.clientQuantity)}</td>
                          <td className={`px-4 py-2.5 text-sm font-semibold ${row.diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.diff > 0 ? '+' : ''}{formatNumber(row.diff)}
                          </td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {newBuildOpen && (
        <NewBuildModal
          onClose={() => setNewBuildOpen(false)}
          onSave={handleCreateBuild}
          saving={savingBuild}
          saveError={buildSaveError}
        />
      )}
    </div>
  )
}
