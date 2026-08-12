import { Loader2, Trash2 } from 'lucide-react'

// Modal de confirmacao de exclusao compartilhado entre a lista de
// organogramas e a tela de gestao de cada organograma.
export function ConfirmModal({ title, description, onCancel, onConfirm, loading }) {
  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-6">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-2">{description}</p>
        <div className="flex items-center justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 text-white text-sm font-medium hover:bg-rose-400 disabled:opacity-60"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Excluir
          </button>
        </div>
      </div>
    </div>
  )
}
