import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Loader2, Plus, Trash2, Upload, X } from 'lucide-react'
import { UNIT_OPTIONS } from './productionShared'

function filenameFromContentDisposition(headerValue, fallback) {
  const match = /filename="?([^"]+)"?/i.exec(headerValue || '')
  return match ? match[1] : fallback
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function FilterInput({ value, onChange, placeholder }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
    />
  )
}

function AddMaterialRow({ onAdd, onCancel, searchParts, saving }) {
  const [query, setQuery] = useState('')
  const [selectedPart, setSelectedPart] = useState(null)
  const [unitOfMeasure, setUnitOfMeasure] = useState('pç')
  const [internalCode, setInternalCode] = useState('')
  const [supplier, setSupplier] = useState('')
  const [quantity, setQuantity] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (selectedPart) return
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    setSearching(true)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const response = await searchParts(q)
        setSuggestions(response.data || [])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [query, selectedPart, searchParts])

  const pickPart = (part) => {
    setSelectedPart(part)
    setQuery(part.name)
    setUnitOfMeasure(part.unitOfMeasure || 'pç')
    setInternalCode(part.internalCode || '')
    setSupplier(part.supplier || '')
    setSuggestions([])
  }

  const clearSelection = () => {
    setSelectedPart(null)
    setQuery('')
    setUnitOfMeasure('pç')
    setInternalCode('')
    setSupplier('')
  }

  const canSubmit = query.trim() && String(quantity).trim() !== ''

  const submit = () => {
    if (!canSubmit) return
    onAdd({
      selectedPart,
      name: query.trim(),
      unitOfMeasure,
      internalCode: internalCode.trim(),
      supplier: supplier.trim(),
      quantity: Number(quantity),
    })
  }

  return (
    <div className="p-4 bg-pink-50/40 border-t border-pink-100 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-6 gap-2">
        <div className="md:col-span-2 relative">
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Material</label>
          <input
            value={query}
            onChange={(event) => { setQuery(event.target.value); setSelectedPart(null) }}
            placeholder="Buscar ou digitar novo material"
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          />
          {selectedPart && (
            <button
              type="button"
              onClick={clearSelection}
              className="absolute right-2 top-7 text-slate-400 hover:text-rose-500"
              title="Limpar selecao"
            >
              <X size={14} />
            </button>
          )}
          {!selectedPart && (searching || suggestions.length > 0) && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
              {searching && (
                <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 size={12} className="animate-spin" /> Buscando...
                </div>
              )}
              {!searching && suggestions.map((part) => (
                <button
                  key={part.id}
                  type="button"
                  onClick={() => pickPart(part)}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-pink-50 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{part.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{part.internalCode || part.unitOfMeasure}</span>
                </button>
              ))}
              {!searching && suggestions.length === 0 && (
                <div className="px-3 py-2 text-xs text-slate-400">Nenhum material encontrado — sera criado um novo.</div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Quantidade</label>
          <input
            type="number"
            step="0.01"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">UN</label>
          <select
            value={unitOfMeasure}
            onChange={(event) => setUnitOfMeasure(event.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          >
            {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Cod. Interno</label>
          <input
            value={internalCode}
            onChange={(event) => setInternalCode(event.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-1">Fornecedor/Fabricante</label>
          <input
            value={supplier}
            onChange={(event) => setSupplier(event.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
        <button
          onClick={submit}
          disabled={!canSubmit || saving}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 disabled:opacity-60"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          Adicionar material
        </button>
      </div>
    </div>
  )
}

export default function BomMaterialsTable({
  items,
  loading,
  onAddLine,
  onUpdateQuantity,
  onUpdatePartField,
  onRemoveLine,
  searchParts,
  emptyLabel = 'Nenhum material cadastrado.',
  onExport,
  onImport,
  onImported,
  exportFilename = 'bom.xlsx',
}) {
  const [filters, setFilters] = useState({ quantity: '', unitOfMeasure: '', partName: '', internalCode: '', supplier: '' })
  const [adding, setAdding] = useState(false)
  const [savingAdd, setSavingAdd] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importFeedback, setImportFeedback] = useState(null)
  const importInputRef = useRef(null)

  const filtered = useMemo(() => {
    return (items || []).filter((item) => {
      if (filters.quantity && !String(item.quantity).includes(filters.quantity.trim())) return false
      if (filters.unitOfMeasure && item.unitOfMeasure !== filters.unitOfMeasure) return false
      if (filters.partName && !(item.partName || '').toLowerCase().includes(filters.partName.toLowerCase())) return false
      if (filters.internalCode && !(item.internalCode || '').toLowerCase().includes(filters.internalCode.toLowerCase())) return false
      if (filters.supplier && !(item.supplier || '').toLowerCase().includes(filters.supplier.toLowerCase())) return false
      return true
    })
  }, [items, filters])

  const handleAdd = async (line) => {
    setSavingAdd(true)
    try {
      await onAddLine(line)
      setAdding(false)
    } finally {
      setSavingAdd(false)
    }
  }

  const handleRemove = async (item) => {
    setRemoving(item.id)
    try {
      await onRemoveLine(item)
    } finally {
      setRemoving(null)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const response = await onExport()
      const filename = filenameFromContentDisposition(response.headers?.['content-disposition'], exportFilename)
      downloadBlob(response.data, filename)
    } finally {
      setExporting(false)
    }
  }

  const handleImportFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setImporting(true)
    setImportFeedback(null)
    try {
      const response = await onImport(file)
      const { created = 0, updated = 0, partsCreated = 0 } = response.data || {}
      setImportFeedback({
        type: 'success',
        message: `Importação concluída: ${created} adicionado(s), ${updated} atualizado(s)${partsCreated ? `, ${partsCreated} material(is) novo(s) no catálogo` : ''}.`,
      })
      await onImported?.()
    } catch (err) {
      setImportFeedback({ type: 'error', message: err?.response?.data?.message || err?.message || 'Erro ao importar planilha.' })
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1">
          <FilterInput value={filters.quantity} onChange={(v) => setFilters((c) => ({ ...c, quantity: v }))} placeholder="Filtrar quantidade" />
          <select
            value={filters.unitOfMeasure}
            onChange={(event) => setFilters((c) => ({ ...c, unitOfMeasure: event.target.value }))}
            className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white"
          >
            <option value="">Todas as UN</option>
            {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
          </select>
          <FilterInput value={filters.partName} onChange={(v) => setFilters((c) => ({ ...c, partName: v }))} placeholder="Filtrar material" />
          <FilterInput value={filters.internalCode} onChange={(v) => setFilters((c) => ({ ...c, internalCode: v }))} placeholder="Filtrar cod. interno" />
          <FilterInput value={filters.supplier} onChange={(v) => setFilters((c) => ({ ...c, supplier: v }))} placeholder="Filtrar fornecedor" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {onExport && (
            <button
              onClick={handleExport}
              disabled={exporting}
              title="Exportar planilha Excel"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-slate-300 disabled:opacity-60"
            >
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exportar Excel
            </button>
          )}
          {onImport && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={handleImportFile}
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                title="Importar planilha Excel"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:border-slate-300 disabled:opacity-60"
              >
                {importing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                Importar Excel
              </button>
            </>
          )}
          {!adding && (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300"
            >
              <Plus size={14} />
              Adicionar material
            </button>
          )}
        </div>
      </div>

      {importFeedback && (
        <div className={`px-4 py-2.5 text-xs border-b ${
          importFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
        }`}>
          {importFeedback.message}
        </div>
      )}

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader2 size={22} className="animate-spin text-slate-300" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-slate-400">{emptyLabel}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['Quantidade', 'UN', 'Materiais Utilizados', 'Cod. Interno', 'Fornecedor/Fabricante', 'Acoes'].map((label) => (
                  <th key={label} className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50">
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={item.quantity}
                      onBlur={(event) => {
                        const next = Number(event.target.value)
                        if (!Number.isNaN(next) && next !== item.quantity) onUpdateQuantity(item, next)
                      }}
                      className="w-24 border border-transparent hover:border-slate-200 focus:border-pink-300 rounded-lg px-2 py-1 text-sm bg-transparent focus:bg-white"
                    />
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-600">
                    <select
                      defaultValue={item.unitOfMeasure || 'pç'}
                      onChange={(event) => onUpdatePartField(item, 'unitOfMeasure', event.target.value)}
                      className="border border-transparent hover:border-slate-200 rounded-lg px-2 py-1 text-sm bg-transparent"
                    >
                      {UNIT_OPTIONS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-2 text-sm text-slate-800 font-medium">{item.partName || '-'}</td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={item.internalCode || ''}
                      onBlur={(event) => {
                        if (event.target.value !== (item.internalCode || '')) onUpdatePartField(item, 'internalCode', event.target.value)
                      }}
                      className="w-32 border border-transparent hover:border-slate-200 focus:border-pink-300 rounded-lg px-2 py-1 text-sm bg-transparent focus:bg-white"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      defaultValue={item.supplier || ''}
                      onBlur={(event) => {
                        if (event.target.value !== (item.supplier || '')) onUpdatePartField(item, 'supplier', event.target.value)
                      }}
                      className="w-40 border border-transparent hover:border-slate-200 focus:border-pink-300 rounded-lg px-2 py-1 text-sm bg-transparent focus:bg-white"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleRemove(item)}
                      disabled={removing === item.id}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                    >
                      {removing === item.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {adding && (
        <AddMaterialRow
          onAdd={handleAdd}
          onCancel={() => setAdding(false)}
          searchParts={searchParts}
          saving={savingAdd}
        />
      )}
    </div>
  )
}
