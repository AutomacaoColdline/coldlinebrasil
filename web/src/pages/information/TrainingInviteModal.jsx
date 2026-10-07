import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, CheckCircle2, Loader2, Search, Send, X } from 'lucide-react'
import { informationApi } from '../../services/informationApi'
import { formatDate } from './informationShared'

// Mesmo formato do assunto montado na API (trainingInviteSubject).
function previewSubject(training) {
  if (!training.startTime || !training.endTime) return null
  const theme = (training.theme || '').trim()
  return `TREINAMENTO - ${formatDate(training.date)} ${training.startTime} às ${training.endTime}${theme ? ` - ${theme}` : ''}`
}

function splitEmails(value) {
  return String(value || '')
    .split(/[,;\n]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}

export default function TrainingInviteModal({ training, onClose }) {
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(() => new Set(splitEmails(training.inviteEmails)))
  const [extraEmails, setExtraEmails] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    informationApi.getUsers()
      .then((response) => {
        const list = (Array.isArray(response.data) ? response.data : response.data?.items || [])
          .filter((user) => user.email)
          .map((user) => ({ name: user.name || user.email, email: String(user.email).toLowerCase() }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
        setUsers(list)
      })
      .catch(() => setUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [])

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return users
    return users.filter((user) => user.name.toLowerCase().includes(term) || user.email.includes(term))
  }, [search, users])

  const allEmails = useMemo(
    () => Array.from(new Set([...selected, ...splitEmails(extraEmails)])),
    [selected, extraEmails],
  )

  const toggle = (email) => {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(email)) next.delete(email)
      else next.add(email)
      return next
    })
  }

  const subject = previewSubject(training)

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      const response = await informationApi.sendTrainingInvite(training.id, allEmails)
      setResult(response.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Nao foi possivel enviar o convite.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Enviar agenda do treinamento</h3>
            <p className="text-sm text-slate-500">Convite de reuniao enviado por coldline@coldline.com.br.</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:border-slate-300">
            <X size={16} />
          </button>
        </div>

        {result ? (
          <div className="p-8 text-center">
            <CheckCircle2 size={40} className="mx-auto text-emerald-500" />
            <p className="mt-3 text-base font-semibold text-slate-900">Convite enviado!</p>
            <p className="mt-1 text-sm text-slate-500">{result.subject}</p>
            <p className="mt-3 text-sm text-slate-600">{(result.recipients || []).join(', ')}</p>
            <button onClick={onClose} className="mt-6 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300">
              Fechar
            </button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 flex items-start gap-3">
                <CalendarDays size={18} className="text-pink-500 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-slate-800">{subject || 'Sem horario definido'}</p>
                  {!subject && (
                    <p className="text-rose-500 mt-1">Edite o treinamento e preencha o horario de inicio e fim antes de enviar a agenda.</p>
                  )}
                  {training.inviteSentAt && (
                    <p className="text-slate-500 mt-1">
                      Ja enviado em {new Date(training.inviteSentAt).toLocaleString('pt-BR')}. Reenviar atualiza o mesmo evento na agenda.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Selecione os participantes ({selected.size} selecionado(s))
                </label>
                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar por nome ou e-mail"
                    className="w-full border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-sm"
                  />
                </div>
                <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
                  {loadingUsers ? (
                    <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-slate-300" /></div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="px-3 py-4 text-sm text-slate-400">Nenhum usuario encontrado. Digite os e-mails no campo abaixo.</p>
                  ) : (
                    filteredUsers.map((user) => (
                      <label key={user.email} className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">
                        <input type="checkbox" checked={selected.has(user.email)} onChange={() => toggle(user.email)} />
                        <span className="text-slate-800">{user.name}</span>
                        <span className="text-slate-400 ml-auto">{user.email}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500 mb-1.5">
                  Outros e-mails
                </label>
                <textarea
                  rows={2}
                  value={extraEmails}
                  onChange={(event) => setExtraEmails(event.target.value)}
                  placeholder="Separe por virgula, ponto e virgula ou linha"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex items-center gap-2">
              {error && <p className="text-xs text-rose-500 mr-auto max-w-sm leading-relaxed">⚠️ {error}</p>}
              <div className="flex items-center gap-2 ml-auto">
                <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
                <button
                  onClick={send}
                  disabled={sending || !subject || allEmails.length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pink-400 text-white text-sm font-medium hover:bg-pink-300 disabled:opacity-60"
                >
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Enviar para {allEmails.length} e-mail(s)
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
