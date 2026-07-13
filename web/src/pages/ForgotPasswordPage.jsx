import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../services/api'
import { Snowflake, Mail, AlertCircle, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await api.forgotPassword(email.trim())
      setSent(true)
    } catch {
      // Backend sempre responde 200 com mensagem genérica - erro aqui é rede/servidor.
      setError('Não foi possível enviar o email agora. Tente novamente em instantes.')
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
            Recuperação<br />de Senha
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Enviaremos um link para você criar uma nova senha e voltar a acessar o sistema.
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

          {sent ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
                <CheckCircle2 size={22} className="text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Verifique seu email</h2>
              <p className="text-slate-500 text-sm mb-8 leading-relaxed">
                Se <strong>{email.trim()}</strong> estiver cadastrado, você receberá um link para
                redefinir sua senha em alguns instantes. O link expira em 1 hora.
              </p>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 w-full py-3 bg-brand-mid hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-150 text-sm"
              >
                Voltar para o login
              </Link>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-slate-900 mb-1">Esqueceu sua senha?</h2>
              <p className="text-slate-500 text-sm mb-6 sm:mb-8">
                Digite seu email e enviaremos um link de recuperação
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
                    Email
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all"
                      autoFocus
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !email.trim()}
                  className="w-full py-3 bg-brand-mid hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Enviando...
                    </>
                  ) : 'Enviar link de recuperação'}
                </button>
              </form>

              <Link
                to="/login"
                className="flex items-center justify-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mt-6 transition-colors"
              >
                <ArrowLeft size={14} />
                Voltar para o login
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
