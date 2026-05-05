import { useState } from 'react'
import { useAuth, MODULE_PATHS } from '../context/AuthContext'
import { useNavigate, Navigate } from 'react-router-dom'
import { Snowflake, Hash, AlertCircle, Loader2 } from 'lucide-react'

function getRedirectPath(user) {
  const typeId   = user?.userType?.id   || ''
  const typeName = (user?.userType?.name || '').toLowerCase()
  const deptName = (user?.department?.name || '').toLowerCase()

  const adminIds = [
    import.meta.env.VITE_USER_TYPE_ADMIN,
    import.meta.env.VITE_USER_TYPE_SETUP,
  ].filter(Boolean)

  if (adminIds.includes(typeId) ||
      typeName === 'admin' || typeName === 'setup' || typeName === 'administrador')
    return MODULE_PATHS.admin

  const industriaId = import.meta.env.VITE_USER_TYPE_INDUSTRIA
  if (typeId === industriaId ||
      typeName.includes('industria') || typeName.includes('indústria') ||
      typeName === 'operador' ||
      deptName.includes('industria') || deptName.includes('indústria') ||
      deptName === 'operação')
    return MODULE_PATHS.industria

  if (typeName.includes('tecnico') || typeName.includes('técnico') ||
      deptName.includes('assistencia') || deptName.includes('assistência') ||
      deptName === 'manutenção')
    return MODULE_PATHS.assistencia

  return MODULE_PATHS.automation
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { loginByIdentification, isAuthenticated, loading, modulePath } = useAuth()

  const [identificationNumber, setIdentificationNumber] = useState('')
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAuthenticated) {
    return <Navigate to={modulePath} replace />
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!identificationNumber.trim()) return
    setError('')
    setSubmitting(true)
    try {
      const user = await loginByIdentification(identificationNumber.trim())
      navigate(getRedirectPath(user), { replace: true })
    } catch {
      setError('Identificação não encontrada. Verifique o número e tente novamente.')
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
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-sm">
          <div className="flex lg:hidden items-center gap-2 mb-10 justify-center">
            <div className="w-9 h-9 bg-brand-mid rounded-xl flex items-center justify-center">
              <Snowflake size={18} className="text-white" />
            </div>
            <span className="font-bold text-lg text-slate-800">Coldline Brasil</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-1">Bem-vindo</h2>
          <p className="text-slate-500 text-sm mb-8">Entre com seu número de identificação</p>

          {error && (
            <div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-100 rounded-xl mb-6">
              <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
              <p className="text-red-600 text-sm leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Número de Identificação
              </label>
              <div className="relative">
                <Hash size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={identificationNumber}
                  onChange={(e) => setIdentificationNumber(e.target.value)}
                  placeholder="Ex: 001234"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-brand-mid/30 focus:border-brand-mid transition-all"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || !identificationNumber.trim()}
              className="w-full py-3 bg-brand-mid hover:bg-brand-700 text-white font-semibold rounded-xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
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
