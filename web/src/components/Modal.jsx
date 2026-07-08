import { useEffect } from 'react'
import { X } from 'lucide-react'

/**
 * Modal responsivo.
 * - No mobile (< md): ocupa a tela inteira, com header fixo e scroll no body.
 * - No desktop: modal centralizado com tamanho máximo configurável.
 *
 * Props:
 *   open          — booleano
 *   onClose       — função
 *   title         — string
 *   children      — conteúdo (vai dentro do body com scroll)
 *   footer        — opcional, ações (vai fixo no rodapé)
 *   maxWidthClass  — classe Tailwind para largura máxima no desktop (ex: "max-w-lg", "max-w-2xl")
 *   fullHeight    — se true, no desktop também usa altura cheia (default false)
 */
export default function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  maxWidthClass = 'max-w-lg',
  fullHeight = false,
}) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className={
          'absolute inset-0 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 ' +
          'bg-white md:rounded-2xl shadow-2xl border border-slate-100 ' +
          'flex flex-col overflow-hidden ' +
          (fullHeight ? 'md:h-[90vh] ' : 'md:max-h-[90vh] ') +
          'w-full ' + maxWidthClass
        }
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-3 md:py-4 border-b border-slate-100 shrink-0">
            <h2 className="text-sm md:text-base font-semibold text-slate-800 truncate">{title}</h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1 shrink-0"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body (scroll) */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 px-4 md:px-6 py-3 border-t border-slate-100 shrink-0 bg-slate-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
