import { useState, useCallback, useEffect } from 'react'
import { atendimentoApi } from '../../services/atendimentoApi'
import { clientApi } from '../../services/assistenciaApi'
import {
  FileText, Download, RefreshCw, Search, Building2, Calendar, User, Filter,
  BarChart3, Clock, TrendingUp, CheckCircle, AlertTriangle, ArrowRight, BookOpen, Headphones,
} from 'lucide-react'

const STATUS = {
  ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_CLIENTE: 'Aguardando cliente',
  AGUARDANDO_PECA: 'Aguardando peça', RESOLVIDO: 'Resolvido', ENCERRADO: 'Encerrado',
}

const PRIORITY = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica' }

function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('pt-BR')
}

function fmtMinutes(m) {
  if (!m) return '—'
  const h = Math.floor(m / 60)
  const min = Math.round(m % 60)
  if (h > 0) return `${h}h ${min}min`
  return `${min}min`
}

function exportCSV(rows, filename) {
  if (!rows?.length) return
  const headers = Object.keys(rows[0])
  const escape = (v) => {
    if (v == null) return ''
    const s = String(v).replace(/"/g, '""')
    if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`
    return s
  }
  const lines = [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))]
  const csv = '\ufeff' + lines.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportPDFPrint() {
  window.print()
}

function GeneralReport() {
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [clientId, setClientId] = useState('')
  const [technicianId, setTechnicianId] = useState('')
  const [status, setStatus] = useState('')
  const [clients, setClients] = useState([])
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clientApi.getAll().then(r => setClients(r.data || [])).catch(() => {})
  }, [])

  const run = async () => {
    setLoading(true)
    try {
      const r = await atendimentoApi.reportGeneral({ from, to, clientId, technicianId, status })
      setReport(r.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  const exportExcel = () => {
    if (!report?.items) return
    const rows = report.items.map(a => ({
      Numero: a.number,
      Data: fmtDate(a.openDate),
      Encerramento: fmtDate(a.closeDate),
      Status: STATUS[a.status] || a.status,
      Prioridade: PRIORITY[a.priority] || a.priority,
      Cliente: a.clientName,
      Tecnico: a.technician?.name || '',
      Problema: a.problemDescription,
      Equipamento: a.equipment,
      Causa: a.identifiedCause,
      Solucao: a.appliedSolution,
    }))
    exportCSV(rows, `relatorio_geral_atendimentos_${Date.now()}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Filter size={14} className="text-cyan-600" /> Filtros
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">De</label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={from}
              onChange={e => setFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Até</label>
            <input
              type="date"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={to}
              onChange={e => setTo(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Cliente</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
            >
              <option value="">Todos</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Status</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
              value={status}
              onChange={e => setStatus(e.target.value)}
            >
              <option value="">Todos</option>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={run}
              disabled={loading}
              className="w-full py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw size={13} className="animate-spin" /> : <Search size={13} />}
              Gerar Relatório
            </button>
          </div>
        </div>
      </div>

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-cyan-700 font-semibold uppercase">Total</p>
              <p className="text-2xl font-bold text-cyan-700 mt-1">{report.total}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-indigo-700 font-semibold uppercase">Tempo Médio</p>
              <p className="text-2xl font-bold text-indigo-700 mt-1">{fmtMinutes(report.avgResolutionMins)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-emerald-700 font-semibold uppercase">Causas Listadas</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{report.topCauses?.length || 0}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-amber-700 font-semibold uppercase">Soluções Listadas</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{report.topSolutions?.length || 0}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Principais Problemas Encontrados</h4>
              <div className="space-y-1.5">
                {report.topCauses?.length ? report.topCauses.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700 truncate flex-1">{c.key}</span>
                    <span className="text-cyan-600 font-semibold ml-2">{c.count}x</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">Sem dados</p>}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Principais Soluções Aplicadas</h4>
              <div className="space-y-1.5">
                {report.topSolutions?.length ? report.topSolutions.map((c, i) => (
                  <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-slate-700 truncate flex-1">{c.key}</span>
                    <span className="text-emerald-600 font-semibold ml-2">{c.count}x</span>
                  </div>
                )) : <p className="text-xs text-slate-400 italic">Sem dados</p>}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={exportExcel}
              className="text-xs px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 flex items-center gap-1"
            >
              <Download size={12} /> Exportar Excel
            </button>
            <button
              onClick={exportPDFPrint}
              className="text-xs px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 flex items-center gap-1"
            >
              <Download size={12} /> Exportar PDF
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-800">Atendimentos ({report.total})</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Nº</th>
                    <th className="text-left px-4 py-2 font-medium">Data</th>
                    <th className="text-left px-4 py-2 font-medium">Cliente</th>
                    <th className="text-left px-4 py-2 font-medium">Problema</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {report.items.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-cyan-600 text-xs">{a.number}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{fmtDate(a.openDate)}</td>
                      <td className="px-4 py-2 text-slate-700">{a.clientName}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-xs truncate">{a.problemDescription}</td>
                      <td className="px-4 py-2 text-xs">{STATUS[a.status] || a.status}</td>
                      <td className="px-4 py-2 text-slate-700">{a.technician?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ClientReport() {
  const [clients, setClients] = useState([])
  const [clientId, setClientId] = useState('')
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    clientApi.getAll().then(r => setClients(r.data || [])).catch(() => {})
  }, [])

  const run = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      const r = await atendimentoApi.reportByClient(clientId)
      setReport(r.data)
    } catch (err) {
      alert(err?.response?.data?.message || 'Erro')
    } finally {
      setLoading(false)
    }
  }

  const exportExcel = () => {
    if (!report?.items) return
    const rows = report.items.map(a => ({
      Numero: a.number,
      Data: fmtDate(a.openDate),
      Encerramento: fmtDate(a.closeDate),
      Status: STATUS[a.status] || a.status,
      Prioridade: PRIORITY[a.priority] || a.priority,
      Problema: a.problemDescription,
      Equipamento: a.equipment,
      Causa: a.identifiedCause,
      Solucao: a.appliedSolution,
      Tecnico: a.technician?.name || '',
    }))
    exportCSV(rows, `relatorio_cliente_${report.client?.name || clientId}_${Date.now()}.csv`)
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <Building2 size={14} className="text-cyan-600" /> Selecione um Cliente
        </h3>
        <div className="flex gap-2">
          <select
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            value={clientId}
            onChange={e => setClientId(e.target.value)}
          >
            <option value="">Selecione...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} · {c.document || '—'}</option>)}
          </select>
          <button
            onClick={run}
            disabled={!clientId || loading}
            className="px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-400 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <RefreshCw size={13} className="animate-spin" /> : <FileText size={13} />}
            Gerar
          </button>
        </div>
      </div>

      {report && (
        <>
          {/* Cliente */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
              <Building2 size={14} className="text-cyan-600" /> Dados do Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="text-slate-400 text-xs">Razão Social:</span> <span className="text-slate-800 font-medium">{report.client?.name}</span></div>
              <div><span className="text-slate-400 text-xs">CNPJ:</span> <span className="text-slate-800">{report.client?.document || '—'}</span></div>
              <div><span className="text-slate-400 text-xs">Telefone:</span> <span className="text-slate-800">{report.client?.phone || '—'}</span></div>
              <div><span className="text-slate-400 text-xs">E-mail:</span> <span className="text-slate-800">{report.client?.email || '—'}</span></div>
              <div className="md:col-span-2"><span className="text-slate-400 text-xs">Endereço:</span> <span className="text-slate-800">{report.client?.address || '—'}</span></div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-cyan-700 font-semibold uppercase">Total</p>
              <p className="text-2xl font-bold text-cyan-700 mt-1">{report.total}</p>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-indigo-700 font-semibold uppercase">Tempo Médio</p>
              <p className="text-xl font-bold text-indigo-700 mt-1">{fmtMinutes(report.avgResolutionMins)}</p>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-emerald-700 font-semibold uppercase">Equipamentos</p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{report.topEquipments?.length || 0}</p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <p className="text-[10px] text-amber-700 font-semibold uppercase">Causas</p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{report.topCauses?.length || 0}</p>
            </div>
          </div>

          {/* Top listas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Equipamentos</h4>
              {report.topEquipments?.length ? (
                <div className="space-y-1.5">
                  {report.topEquipments.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-slate-700 truncate flex-1">{c.key}</span>
                      <span className="text-cyan-600 font-semibold">{c.count}x</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Sem dados</p>}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Causas</h4>
              {report.topCauses?.length ? (
                <div className="space-y-1.5">
                  {report.topCauses.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-slate-700 truncate flex-1">{c.key}</span>
                      <span className="text-amber-600 font-semibold">{c.count}x</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Sem dados</p>}
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 p-5">
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Soluções</h4>
              {report.topSolutions?.length ? (
                <div className="space-y-1.5">
                  {report.topSolutions.map((c, i) => (
                    <div key={i} className="flex items-center justify-between text-sm py-1">
                      <span className="text-slate-700 truncate flex-1">{c.key}</span>
                      <span className="text-emerald-600 font-semibold">{c.count}x</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-slate-400 italic">Sem dados</p>}
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={exportExcel} className="text-xs px-3 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-400 flex items-center gap-1">
              <Download size={12} /> Excel
            </button>
            <button onClick={exportPDFPrint} className="text-xs px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-400 flex items-center gap-1">
              <Download size={12} /> PDF
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800">Histórico Completo</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Nº</th>
                    <th className="text-left px-4 py-2 font-medium">Data</th>
                    <th className="text-left px-4 py-2 font-medium">Equipamento</th>
                    <th className="text-left px-4 py-2 font-medium">Problema</th>
                    <th className="text-left px-4 py-2 font-medium">Diagnóstico</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Técnico</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {report.items.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2 font-mono text-cyan-600 text-xs">{a.number}</td>
                      <td className="px-4 py-2 text-xs text-slate-500">{fmtDate(a.openDate)}</td>
                      <td className="px-4 py-2 text-slate-700">{a.equipment || '—'}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-xs truncate">{a.problemDescription}</td>
                      <td className="px-4 py-2 text-slate-700 max-w-xs truncate">{a.identifiedCause || '—'}</td>
                      <td className="px-4 py-2 text-xs">{STATUS[a.status] || a.status}</td>
                      <td className="px-4 py-2 text-slate-700">{a.technician?.name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function KnowledgeBase() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await atendimentoApi.listKnowledgeBase()
      setItems(r.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = items.filter(a => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (a.kbProblem || a.problemDescription || '').toLowerCase().includes(q) ||
           (a.kbCause || '').toLowerCase().includes(q) ||
           (a.kbSolution || '').toLowerCase().includes(q) ||
           (a.kbEquipments || []).some(e => (e || '').toLowerCase().includes(q))
  })

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-5">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen size={14} className="text-amber-600" /> Base de Conhecimento
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Artigos técnicos gerados a partir de atendimentos resolvidos. Use para consulta rápida em novos chamados.
        </p>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
            placeholder="Buscar artigos por problema, causa ou solução..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><RefreshCw size={20} className="animate-spin text-slate-300" /></div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 py-16 text-center">
          <BookOpen size={32} className="text-slate-200 mx-auto mb-2" />
          <p className="text-sm text-slate-400">Nenhum artigo publicado ainda</p>
          <p className="text-xs text-slate-300 mt-1">Use a aba "Diagnóstico" em um atendimento resolvido para publicar</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(a => (
            <div key={a.id} className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-amber-200 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-cyan-600 font-mono">{a.number}</span>
                <span className="text-[10px] text-slate-400">{fmtDate(a.updatedAt)}</span>
              </div>
              <div className="space-y-2">
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Problema</p>
                  <p className="text-sm text-slate-800 mt-0.5">{a.kbProblem || a.problemDescription}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Causa</p>
                  <p className="text-sm text-slate-700 mt-0.5">{a.kbCause || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Solução</p>
                  <p className="text-sm text-slate-700 mt-0.5">{a.kbSolution || '—'}</p>
                </div>
                {a.kbEquipments?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Equipamentos</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {a.kbEquipments.map((e, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const TABS = [
  { id: 'general',    label: 'Relatório Geral',     icon: FileText },
  { id: 'client',     label: 'Por Cliente',         icon: Building2 },
  { id: 'knowledge',  label: 'Base de Conhecimento', icon: BookOpen },
]

export default function AutomationAtendimentoReports() {
  const [tab, setTab] = useState('general')

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <FileText size={20} className="text-cyan-600" />
          Relatórios de Atendimentos
        </h1>
        <p className="text-sm text-slate-400">Análises, métricas e base de conhecimento técnico</p>
      </div>

      <div className="flex gap-1 border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
              tab === t.id
                ? 'border-cyan-500 text-cyan-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'general'   && <GeneralReport />}
      {tab === 'client'    && <ClientReport />}
      {tab === 'knowledge' && <KnowledgeBase />}
    </div>
  )
}
