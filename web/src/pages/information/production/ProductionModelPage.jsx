import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Edit, FolderOpen, GitCompare, Loader2, Plus, Trash2, Users, X } from 'lucide-react'
import { productionApi } from './productionApi'
import BomMaterialsTable from './BomMaterialsTable'
import { BUILD_STATUSES, BUILD_STATUS_TONES, buildToForm, buildToPayload, emptyBuildForm } from './productionShared'
import { formatNumber } from '../informationShared'

const TABS = [
  { id: 'standard', label: 'Modelo Padrão', icon: ClipboardList },
  { id: 'client', label: 'Modelo Criado ao Cliente', icon: Users },
  { id: 'divergences', label: 'Divergências Comparativas', icon: GitCompare },
]

function BuildModal({ initialForm, isEdit, onClose, onSave, saving, saveError }) {
  const [form, setForm] = useState(initialForm)

  const updateAddress = (index, key, value) => {
    setForm((current) => {
      const next = [...current.evaporatorAddresses]
      next[index] = { ...next[index], [key]: value }
      return { ...current, evaporatorAddresses: next }
    })
  }

  const addAddress = () => {
    setForm((current) => ({
      ...current,
      evaporatorAddresses: [...current.evaporatorAddresses, { evaporator: '', address: '' }],
    }))
  }

  const removeAddress = (index) => {
    setForm((current) => ({
      ...current,
      evaporatorAddresses: current.evaporatorAddresses.filter((_, i) => i !== index),
    }))
  }

  const canSubmit = form.clientName.trim() && form.serialNumber.trim()

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">{isEdit ? 'Editar Modelo Criado ao Cliente' : 'Novo Modelo Criado ao Cliente'}</h3>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300">
            <X size={16} />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Cliente ou Estoque</label>
            <input
              value={form.clientName}
              onChange={(event) => setForm((c) => ({ ...c, clientName: event.target.value }))}
              placeholder="Nome do cliente ou &quot;Estoque&quot;"
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Pedido ou Referência</label>
            <input
              value={form.orderReference}
              onChange={(event) => setForm((c) => ({ ...c, orderReference: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Nº de Série</label>
            <input
              value={form.serialNumber}
              onChange={(event) => setForm((c) => ({ ...c, serialNumber: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Status</label>
            <select
              value={form.status}
              onChange={(event) => setForm((c) => ({ ...c, status: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              {BUILD_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Tem Ventiladores?</label>
            <select
              value={form.hasEvaporatorAddressing ? 'sim' : 'nao'}
              onChange={(event) => setForm((c) => ({ ...c, hasEvaporatorAddressing: event.target.value === 'sim' }))}
              className="w-full md:w-72 border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="nao">Não tem ventiladores (sem endereçamento)</option>
              <option value="sim">Tem ventiladores (com endereçamento)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Observações</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(event) => setForm((c) => ({ ...c, notes: event.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"
            />
          </div>

          {form.hasEvaporatorAddressing && (
            <div className="md:col-span-2 space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">Endereçamento de Evaporadores</label>
                <button onClick={addAddress} className="inline-flex items-center gap-1 text-xs text-pink-500 hover:text-pink-600 font-medium">
                  <Plus size={12} /> Adicionar evaporador
                </button>
              </div>
              {form.evaporatorAddresses.length === 0 ? (
                <p className="text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl px-3 py-3 text-center">
                  Nenhum evaporador adicionado.
                </p>
              ) : (
                <div className="space-y-2">
                  {form.evaporatorAddresses.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        value={entry.evaporator}
                        onChange={(event) => updateAddress(index, 'evaporator', event.target.value)}
                        placeholder="Evaporador"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      />
                      <input
                        value={entry.address}
                        onChange={(event) => updateAddress(index, 'address', event.target.value)}
                        placeholder="Endereço"
                        className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm"
                      />
                      <button onClick={() => removeAddress(index)} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:border-rose-300 hover:text-rose-600 shrink-0">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          {saveError && <p className="text-xs text-rose-500 mr-auto max-w-xs leading-relaxed">⚠️ {saveError}</p>}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button
              onClick={() => onSave(form)}
              disabled={saving || !canSubmit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : 'Salvar'}
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

  const [buildModalOpen, setBuildModalOpen] = useState(false)
  const [editingBuild, setEditingBuild] = useState(null)
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

  const openNewBuild = () => {
    setEditingBuild(null)
    setBuildSaveError(null)
    setBuildModalOpen(true)
  }

  const openEditBuild = (build) => {
    setEditingBuild(build)
    setBuildSaveError(null)
    setBuildModalOpen(true)
  }

  const handleSaveBuild = async (form) => {
    setSavingBuild(true)
    setBuildSaveError(null)
    try {
      const payload = buildToPayload(form)
      if (editingBuild?.id) {
        await productionApi.updateBuild(editingBuild.id, payload)
      } else {
        const response = await productionApi.createBuild(modelId, payload)
        setSelectedBuildId(response.data.id)
      }
      setBuildModalOpen(false)
      setEditingBuild(null)
      await loadBuilds()
    } catch (err) {
      setBuildSaveError(err?.response?.data?.message || err?.message || 'Erro ao salvar.')
    } finally {
      setSavingBuild(false)
    }
  }

  const handleDeleteBuild = async (build) => {
    if (!window.confirm(`Excluir "${build.clientName}" (Nº de série ${build.serialNumber})? Os materiais utilizados dessa unidade também serão removidos.`)) return
    await productionApi.deleteBuild(build.id)
    if (selectedBuildId === build.id) setSelectedBuildId(null)
    if (divergenceBuildId === build.id) setDivergenceBuildId(null)
    await loadBuilds()
  }

  // Materiais são pareados pelo nome (normalizado), não pelo partId: dois
  // materiais com o mesmo nome mas cadastrados como peças diferentes (código,
  // UN ou fornecedor divergentes) são a mesma linha de BOM na prática, e é
  // esse desalinhamento de cadastro que essa aba também precisa apontar —
  // não só a diferença de quantidade.
  const divergences = useMemo(() => {
    if (!divergenceBuildId) return []
    const normalizeName = (name) => (name || '').trim().toLowerCase()
    const standardByName = new Map(standardBom.map((item) => [normalizeName(item.partName), item]))
    const clientByName = new Map(divergenceBom.map((item) => [normalizeName(item.partName), item]))
    const names = new Set([...standardByName.keys(), ...clientByName.keys()])

    const rows = []
    names.forEach((name) => {
      const std = standardByName.get(name)
      const cli = clientByName.get(name)
      const stdQty = std?.quantity || 0
      const cliQty = cli?.quantity || 0
      const quantityChanged = Boolean(std) && Boolean(cli) && stdQty !== cliQty

      const changes = []
      if (std && cli) {
        if ((std.internalCode || '') !== (cli.internalCode || '')) {
          changes.push({ label: 'Cód. Interno', from: std.internalCode || '-', to: cli.internalCode || '-' })
        }
        if ((std.unitOfMeasure || '') !== (cli.unitOfMeasure || '')) {
          changes.push({ label: 'UN', from: std.unitOfMeasure || '-', to: cli.unitOfMeasure || '-' })
        }
        if ((std.supplier || '') !== (cli.supplier || '')) {
          changes.push({ label: 'Fornecedor/Fabricante', from: std.supplier || '-', to: cli.supplier || '-' })
        }
      }

      if (std && cli && !quantityChanged && changes.length === 0) return

      const statusParts = []
      if (!std) statusParts.push('Adicionado')
      else if (!cli) statusParts.push('Removido')
      else {
        if (quantityChanged) statusParts.push('Quantidade')
        if (changes.length > 0) statusParts.push('Cadastro')
      }

      const ref = cli || std
      rows.push({
        key: name || ref.partId,
        internalCode: ref.internalCode,
        partName: ref.partName,
        unitOfMeasure: ref.unitOfMeasure,
        standardQuantity: stdQty,
        clientQuantity: cliQty,
        diff: cliQty - stdQty,
        status: statusParts.join(' + '),
        changes,
      })
    })
    return rows.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.changes.length - a.changes.length)
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
          Voltar para Produção
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
          emptyLabel="Nenhum material cadastrado no modelo padrão."
          onExport={() => productionApi.exportModelBom(modelId)}
          onImport={(file) => productionApi.importModelBom(modelId, file)}
          onImported={loadStandardBom}
          exportFilename={`bom_padrao_${model?.name || modelId}.xlsx`}
        />
      )}

      {activeTab === 'client' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">Nº de Série/Lote</h3>
              <button
                onClick={openNewBuild}
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
              <p className="text-sm text-slate-400 text-center py-6">Nenhuma unidade cadastrada para este modelo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {['Cliente ou Estoque', 'Pedido/Referência', 'Nº de Série', 'Ventiladores', 'Status', 'Ações'].map((label) => (
                        <th key={label} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {builds.map((build) => (
                      <tr
                        key={build.id}
                        onClick={() => setSelectedBuildId(build.id)}
                        className={`border-b border-slate-100 last:border-b-0 cursor-pointer ${
                          selectedBuildId === build.id ? 'bg-pink-50/60' : 'hover:bg-slate-50/50'
                        }`}
                      >
                        <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{build.clientName}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-600">{build.orderReference || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-600">{build.serialNumber || '-'}</td>
                        <td className="px-4 py-2.5 text-sm text-slate-600">
                          {build.hasEvaporatorAddressing ? `Sim (${(build.evaporatorAddresses || []).length})` : 'Não'}
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium border ${BUILD_STATUS_TONES[build.status] || 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                            {build.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5" onClick={(event) => event.stopPropagation()}>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setSelectedBuildId(build.id)}
                              title="Abrir materiais utilizados"
                              className={`w-8 h-8 rounded-lg border flex items-center justify-center ${
                                selectedBuildId === build.id ? 'border-pink-300 text-pink-500 bg-pink-50' : 'border-slate-200 text-slate-500 hover:border-pink-200 hover:text-pink-500'
                              }`}
                            >
                              <FolderOpen size={13} />
                            </button>
                            <button
                              onClick={() => openEditBuild(build)}
                              title="Editar"
                              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-pink-200 hover:text-pink-500"
                            >
                              <Edit size={13} />
                            </button>
                            <button
                              onClick={() => handleDeleteBuild(build)}
                              title="Excluir"
                              className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedBuild && (
            <>
              <p className="text-xs text-slate-400 px-1">
                Materiais utilizados — <span className="font-semibold text-slate-600">{selectedBuild.clientName} · Nº {selectedBuild.serialNumber}</span>
              </p>
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
            </>
          )}
        </div>
      )}

      {activeTab === 'divergences' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">Comparar com a unidade</label>
            <select
              value={divergenceBuildId || ''}
              onChange={(event) => setDivergenceBuildId(event.target.value || null)}
              className="w-full sm:w-80 border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
            >
              <option value="">Selecione uma unidade (Modelo Criado ao Cliente)</option>
              {builds.map((build) => (
                <option key={build.id} value={build.id}>
                  {build.clientName} · Nº {build.serialNumber}{build.orderReference ? ` · ${build.orderReference}` : ''}
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
                <div className="py-10 text-center text-sm text-slate-400">Nenhuma divergência — o BOM desta unidade é igual ao padrão.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        {['Cód. Interno', 'Material', 'UN', 'Qtd. Padrão', 'Qtd. Cliente', 'Diferença', 'Alterações de Cadastro', 'Status'].map((label) => (
                          <th key={label} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {divergences.map((row) => (
                        <tr key={row.key} className="border-b border-slate-100 last:border-b-0">
                          <td className="px-4 py-2.5 text-sm text-slate-700">{row.internalCode || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-800 font-medium">{row.partName || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{row.unitOfMeasure || '-'}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{formatNumber(row.standardQuantity)}</td>
                          <td className="px-4 py-2.5 text-sm text-slate-600">{formatNumber(row.clientQuantity)}</td>
                          <td className={`px-4 py-2.5 text-sm font-semibold ${row.diff === 0 ? 'text-slate-400' : row.diff > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {row.diff === 0 ? '-' : `${row.diff > 0 ? '+' : ''}${formatNumber(row.diff)}`}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-slate-600">
                            {row.changes.length === 0 ? (
                              <span className="text-slate-300">-</span>
                            ) : (
                              <div className="flex flex-col gap-0.5">
                                {row.changes.map((change) => (
                                  <span key={change.label}>
                                    <span className="font-semibold text-slate-500">{change.label}:</span> {change.from} → {change.to}
                                  </span>
                                ))}
                              </div>
                            )}
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

      {buildModalOpen && (
        <BuildModal
          initialForm={editingBuild ? buildToForm(editingBuild) : emptyBuildForm()}
          isEdit={Boolean(editingBuild)}
          onClose={() => { setBuildModalOpen(false); setEditingBuild(null) }}
          onSave={handleSaveBuild}
          saving={savingBuild}
          saveError={buildSaveError}
        />
      )}
    </div>
  )
}
