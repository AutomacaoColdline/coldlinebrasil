import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../services/api'
import { Snowflake, Lock, AlertCircle, Loader2, CheckCircle2 } from 'lucide-react'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Link inválido. Solicite uma nova recuperação de senha.')
      return
    }
    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('A nova senha e a confirmação não conferem')
      return
    }

    setSubmitting(true)
    try {
      await api.resetPassword(token, newPassword)
      setDone(true)
      setTimeout(() => navigate('/login', { replace: true }), 2500)
    } catch (err) {
      setError(err?.response?.data?.message || 'Link inválido ou expirado')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-mid rounded-xl flex items-center justify-center">
            <Snowflake size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">Coldline Brasil</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Criar Nova<br />Senha
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Escolha uma nova senha para voltar a acessar o sistema.
          </p>
        </div>
        <div />
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8 sm:mb-10 justify-center">
            <div className="w-9 h-9 bg-brand-mid rounded-xl flex items-center justify-center">
              <Snowflake size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">Coldline Brasil</span>
          </div>

          {done ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Senha redefinida</h2>
              <p className="text-slate-500 text-sm leading-relaxed">
                Redirecionando para o login...
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Criar Nova Senha</h2>
              <p className="text-slate-500 text-sm mb-6 sm:mb-8">
                Escolha uma nova senha para sua conta
              </p>

              {error && (
                <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl mb-6">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-600 text-sm leading-snug">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <CheckCircle2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      autoComplete="new-password"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newPassword || !confirmPassword}
                  className="w-full py-3 bg-brand-mid hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </>
                  ) : 'Salvar nova senha'}
                </button>
              </form>

              <Link
                to="/login"
                className="block text-center text-sm text-slate-500 hover:text-slate-700 mt-6 transition-colors"
              >
                Voltar para o login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
