import { useState } from 'react'
import { useAuth, resolveLandingPath } from '../context/AuthContext'
import { useNavigate, Navigate, Link } from 'react-router-dom'
import { Snowflake, Mail, Lock, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, refreshUser, isAuthenticated, loading, modulePath } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to={modulePath} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) return
    setError('')
    setSubmitting(true)
    try {
      const user = await login(email.trim(), password)
      refreshUser()
      if (user.mustChangePassword) {
        navigate('/trocar-senha', { replace: true })
      } else {
        navigate(resolveLandingPath(user), { replace: true })
      }
    } catch {
      setError('Email ou senha inválidos. Verifique e tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#0f172a] flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-mid rounded-xl flex items-center justify-center">
            <Snowflake size={18} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">Coldline Brasil</span>
        </div>
        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Sistema de<br />Gestão Industrial
          </h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Controle de processos, máquinas e ocorrências em tempo real com dados do MongoDB.
          </p>
        </div>
        <div className="flex gap-6">
          {[
            { label: '+26 anos', sub: 'de experiência' },
            { label: 'Tempo real', sub: 'monitoramento' },
            { label: 'Campo Grande', sub: 'MS, Brasil' },
          ].map(({ label, sub }) => (
            <div key={label}>
              <p className="text-white font-bold text-base">{label}</p>
              <p className="text-slate-500 text-xs mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-8 sm:mb-10 justify-center">
            <div className="w-9 h-9 bg-brand-mid rounded-xl flex items-center justify-center">
              <Snowflake size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">Coldline Brasil</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Bem-vindo</h2>
          <p className="text-slate-500 text-sm mb-6 sm:mb-8">Entre com seu email e senha</p>

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

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-700">
                  Senha
                </label>
                <Link to="/esqueci-senha" className="text-xs font-medium text-brand-mid hover:text-brand-700 transition-colors">
                  Esqueceu a senha?
                </Link>
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Sua senha"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !email.trim() || !password}
              className="w-full py-3 bg-brand-mid hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            © {new Date().getFullYear()} Coldline Brasil · Campo Grande, MS
          </p>
        </div>
      </div>
    </div>
  )
}
