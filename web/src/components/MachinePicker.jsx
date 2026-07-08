import { useState, useRef, useEffect } from 'react'
import { Search, X, Cog } from 'lucide-react'

/**
 * Picker de máquina com busca textual.
 * Filtra por: identificationNumber, serialNumber, customerName.
 *
 * Props:
 *   machines  — array de objetos Machine
 *   value     — id da máquina selecionada
 *   onChange  — (id, machine) => void
 *   placeholder — opcional
 */
export default function MachinePicker({ machines = [], value, onChange, placeholder = 'Buscar por código, nº de série ou cliente…' }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  // Inicializa o input com o nome da máquina selecionada
  useEffect(() => {
    if (!value) { setQuery(''); return }
    const m = machines.find(x => x.id === value)
    if (m) setQuery(formatLabel(m))
  }, [value, machines])

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const q = query.trim().toLowerCase()
  const filtered = q
    ? machines.filter(m => {
        const idn = (m.identificationNumber || '').toLowerCase()
        const sn  = (m.serialNumber         || '').toLowerCase()
        const cn  = (m.customerName         || '').toLowerCase()
        return idn.includes(q) || sn.includes(q) || cn.includes(q)
      })
    : machines.slice(0, 50)

  function formatLabel(m) {
    const parts = []
    if (m.identificationNumber) parts.push(m.identificationNumber)
    if (m.serialNumber) parts.push(`SN: ${m.serialNumber}`)
    if (m.customerName) parts.push(m.customerName)
    return parts.join(' · ') || m.id?.slice(-6) || '—'
  }

  function select(m) {
    setQuery(formatLabel(m))
    setOpen(false)
    onChange?.(m.id, m)
  }

  function clear() {
    setQuery('')
    onChange?.('', null)
  }

  const selected = value ? machines.find(x => x.id === value) : null

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
          placeholder={placeholder}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {(query || value) && (
          <button
            type="button"
            onClick={clear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
            aria-label="Limpar"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-slate-400">
              {q
                ? <>Nenhuma máquina encontrada para "<span className="font-semibold text-slate-600">{q}</span>". Cadastre o número de série na máquina.</>
                : 'Nenhuma máquina cadastrada'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {filtered.map(m => {
                const isSel = m.id === value
                return (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => select(m)}
                      className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${isSel ? 'bg-blue-50/40' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <Cog size={12} className="text-slate-400 shrink-0" />
                        <p className={`text-sm ${isSel ? 'text-blue-700 font-semibold' : 'text-slate-800'} truncate`}>
                          {m.identificationNumber || m.id?.slice(-6) || '—'}
                        </p>
                      </div>
                      {(m.serialNumber || m.customerName) && (
                        <p className="text-[10px] text-slate-500 ml-5 mt-0.5 truncate">
                          {m.serialNumber && <span className="font-mono text-slate-600">SN: {m.serialNumber}</span>}
                          {m.serialNumber && m.customerName && <span className="mx-1 text-slate-300">·</span>}
                          {m.customerName}
                        </p>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {selected && !open && (
        <p className="text-[10px] text-slate-400 mt-1">
          {selected.serialNumber && <>SN: <span className="font-mono">{selected.serialNumber}</span> · </>}
          {selected.customerName}
        </p>
      )}
    </div>
  )
}
