import { useState } from 'react'
import { Loader2, Paperclip, Save, Upload, X } from 'lucide-react'
import { formatDateTime, formatNumber, resolveAssetUrl } from './informationShared'

export function FormField({ field, value, onChange, form }) {
  if (field.type === 'attachments') {
    const items = Array.isArray(value) ? value : []
    const [isDragActive, setIsDragActive] = useState(false)

    const handleDrag = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.type === "dragenter" || e.type === "dragover") {
        setIsDragActive(true)
      } else if (e.type === "dragleave") {
        setIsDragActive(false)
      }
    }

    const handleDrop = (e) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const files = Array.from(e.dataTransfer.files)
        if (field.onFilesSelected) {
          field.onFilesSelected(files)
        }
      }
    }

    return (
      <div className="space-y-3">
        {!field.disabled && (
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`relative rounded-2xl border-2 border-dashed p-6 transition-all duration-200 flex flex-col items-center justify-center text-center ${
              isDragActive
                ? 'border-pink-400 bg-pink-50/50'
                : 'border-slate-200 bg-slate-50/50 hover:border-slate-300'
            }`}
          >
            <Upload size={24} className="text-slate-400 mb-2" />
            <div className="flex flex-col items-center gap-1">
              <label className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-medium text-slate-700 cursor-pointer shadow-sm hover:bg-slate-50 transition-colors">
                <Upload size={14} className="text-slate-500" />
                Adicionar arquivos
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = Array.from(event.target.files || [])
                    if (files.length > 0 && field.onFilesSelected) {
                      field.onFilesSelected(files)
                    }
                    event.target.value = ''
                  }}
                />
              </label>
              <p className="text-xs text-slate-500 mt-2">ou arraste e solte seus arquivos aqui</p>
              <span className="text-[10px] text-slate-400">
                (Selecione varios de uma vez segurando CTRL)
              </span>
            </div>
            {field.helper && (
              <span className={`text-xs mt-3 block ${field.helperIsError ? 'text-rose-500 font-medium' : 'text-slate-400'}`}>
                {field.helperIsError ? '⚠️ ' : ''}{field.helper}
              </span>
            )}
          </div>
        )}

        {items.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-400 text-center">
            Nenhum anexo adicionado.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item, index) => (
              <div key={item.id || item.url || `${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2 bg-white shadow-sm">
                <div className="min-w-0">
                  <p className="text-sm text-slate-700 truncate font-medium">{item.name || 'Arquivo'}</p>
                  <p className="text-xs text-slate-400">
                    {item.size ? `${formatNumber(item.size)} bytes` : 'Anexo'}{item.uploadedAt ? ` · ${formatDateTime(item.uploadedAt)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {item.url && (
                    <a
                      href={resolveAssetUrl(item.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-pink-500 hover:underline px-2 py-1 rounded-lg hover:bg-pink-50 transition-colors"
                    >
                      <Paperclip size={12} />
                      Abrir
                    </a>
                  )}
                  {!field.disabled && (
                    <button
                      type="button"
                      onClick={() => field.onRemove?.(item, form, index)}
                      className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        rows={field.rows || 4}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        placeholder={field.placeholder}
        readOnly={field.readOnly}
        disabled={field.disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm resize-none"
      />
    )
  }

  if (field.type === 'select') {
    return (
      <select
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        disabled={field.disabled}
        className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
      >
        <option value="">{field.placeholder || 'Selecione'}</option>
        {(field.options || []).map((option) => (
          <option key={option.value ?? option} value={option.value ?? option}>
            {option.label ?? option}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      type={field.type || 'text'}
      value={value}
      min={field.min}
      max={field.max}
      step={field.step}
      onChange={(event) => onChange(field.key, field.type === 'number' ? event.target.value : event.target.value)}
      placeholder={field.placeholder}
      readOnly={field.readOnly}
      disabled={field.disabled}
      className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
    />
  )
}

export function EntityModal({ title, fields, form, onChange, onClose, onSave, saving, saveError, readOnly, maxWidth = 'max-w-3xl', gridCols = 'md:grid-cols-2' }) {
  const renderedFields = readOnly
    ? fields.map((f) => ({ ...f, disabled: true, onFilesSelected: undefined, onRemove: undefined }))
    : fields
  const fullSpan = gridCols === 'md:grid-cols-3' ? 'md:col-span-3' : 'md:col-span-2'

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden`}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-500">{readOnly ? 'Visualizacao do registro.' : 'Preencha os campos e salve.'}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300">
            <X size={16} />
          </button>
        </div>
        <div className={`p-5 grid grid-cols-1 ${gridCols} gap-3 max-h-[78vh] overflow-y-auto`}>
          {renderedFields.map((field) => (
            <div key={field.key} className={field.fullWidth ? fullSpan : ''}>
              <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                {field.label}
              </label>
              <FormField field={field} value={form[field.key] ?? ''} onChange={readOnly ? () => {} : onChange} form={form} />
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
          {saveError && !readOnly && (
            <p className="text-xs text-rose-500 mr-auto max-w-xs leading-relaxed">
              ⚠️ {saveError}
            </p>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">{readOnly ? 'Fechar' : 'Cancelar'}</button>
            {!readOnly && (
              <button
                onClick={onSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Salvar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
