import { useEffect, useRef, useState } from 'react'
import { Search, X, Plus, Loader2 } from 'lucide-react'
import { api } from '../services/api'

const UNIT_OPTIONS = ['pç', 'cm', 'm']

/**
 * Multi-select de peças com busca por nome + criação inline (quando a peça
 * digitada ainda não existe no catálogo), com quantidade por peça pra virar
 * uma requisição. Usado no motivo de pausa "Falta de Peça". Itens sem `id`
 * (recém-digitados) são criados no backend na hora de salvar a pausa.
 *
 * Props:
 *   value    — array de { id, name, unitOfMeasure, quantity }
 *   onChange — (novoArray) => void
 */
export default function PartsPicker({ value = [], onChange }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (!q) { setResults([]); return }
    setLoading(true)
    const t = setTimeout(() => {
      api.searchParts(q)
        .then(r => setResults(r.data || []))
        .catch(() => setResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(t)
  }, [query])

  const selectedIds = new Set(value.map(v => v.id).filter(Boolean))
  const selectedNames = new Set(value.map(v => v.name.trim().toLowerCase()))

  const add = (part) => {
    onChange([...value, { quantity: '', unitOfMeasure: 'pç', ...part }])
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const remove = (idx) => {
    onChange(value.filter((_, i) => i !== idx))
  }

  const setQuantity = (idx, quantity) => {
    onChange(value.map((p, i) => (i === idx ? { ...p, quantity } : p)))
  }

  const setUnit = (idx, unitOfMeasure) => {
    onChange(value.map((p, i) => (i === idx ? { ...p, unitOfMeasure } : p)))
  }

  const exactMatch = results.some(r => r.name.trim().toLowerCase() === query.trim().toLowerCase())
  const canCreateNew = query.trim().length > 0 && !exactMatch && !selectedNames.has(query.trim().toLowerCase())

  return (
    <div ref={wrapRef} className="relative">
      {value.length > 0 && (
        <div className="space-y-1.5 mb-2">
          {value.map((p, i) => (
            <div
              key={p.id || `new-${p.name}-${i}`}
              className="flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 rounded-xl text-xs font-medium bg-orange-50 text-orange-700 border border-orange-100"
            >
              <span className="flex-1 truncate">
                {p.name}{!p.id && <span className="text-orange-400"> (nova)</span>}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={p.quantity}
                onChange={e => setQuantity(i, e.target.value)}
                placeholder="Qtd."
                className="w-16 px-1.5 py-1 rounded-lg border border-orange-200 bg-white text-slate-800 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              />
              {p.id ? (
                p.unitOfMeasure && <span className="text-orange-400 w-8 text-center">{p.unitOfMeasure}</span>
              ) : (
                <select
                  value={p.unitOfMeasure || 'pç'}
                  onChange={e => setUnit(i, e.target.value)}
                  className="w-14 px-1 py-1 rounded-lg border border-orange-200 bg-white text-slate-800 text-xs text-center focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                >
                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              )}
              <button type="button" onClick={() => remove(i)} className="p-1 hover:bg-orange-200 rounded-full transition-colors">
                <X size={11} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar peça por nome ou digitar uma nova…"
          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-56 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-3"><Loader2 size={16} className="animate-spin text-slate-300" /></div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {results.filter(r => !selectedIds.has(r.id)).map(r => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => add({ id: r.id, name: r.name, unitOfMeasure: r.unitOfMeasure || 'pç' })}
                    className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    {r.name}
                  </button>
                </li>
              ))}
              {canCreateNew && (
                <li>
                  <button
                    type="button"
                    onClick={() => add({ id: '', name: query.trim() })}
                    className="w-full text-left px-3 py-2 text-sm text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1.5"
                  >
                    <Plus size={13} /> Adicionar peça "{query.trim()}"
                  </button>
                </li>
              )}
              {!loading && results.length === 0 && !canCreateNew && (
                <li className="px-3 py-3 text-center text-xs text-slate-400">Nenhuma peça encontrada</li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
