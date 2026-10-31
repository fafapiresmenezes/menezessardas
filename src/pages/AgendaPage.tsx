import { useEffect, useMemo, useState } from 'react'
import EscolhaAvisos from '@/components/EscolhaAvisos'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useAlertas, salvarCompromisso, importarCompromissosIcs } from '@/hooks/useAlertas'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { baixarICS, lerIcs } from '@/lib/ics'
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'
import { formatarData, situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { CalendarDays, ChevronLeft, ChevronRight, Download, Mail, ExternalLink, Plus, X } from 'lucide-react'

const MESES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const corPonto: Record<string, string> = {
  vencido: 'bg-critico',
  critico: 'bg-critico',
  atencao: 'bg-atencao',
  regular: 'bg-regular',
  sem_prazo: 'bg-grafite-claro',
}

export default function AgendaPage() {
  const { alertas, loading, recarregar } = useAlertas()
  const navigate = useNavigate()
  const hoje = new Date()
  const [ano, setAno] = useState(hoje.getFullYear())
  const [mes, setMes] = useState(hoje.getMonth())
  const [sincronizando, setSincronizando] = useState(false)
  // Passo 42: Semana em PDF (prazos e compromissos dos próximos 7 dias por dia e responsável) e envio de teste por e-mail.
  const [msgSemana, setMsgSemana] = useState('')
  const semanaEmPdf = async () => {
    setMsgSemana('')
    const inicio = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
    const { data, error } = await supabase.rpc('semana_agenda', { p_inicio: inicio, p_dias: 7 })
    if (error) { setMsgSemana(error.message); return }
    const sem = data as { inicio: string; fim: string; total: number; dias: { dia: string; itens: { tipo: string; titulo: string; detalhe: string; responsavel: string }[] }[] }
    const br = (d: string) => d.split('-').reverse().join('/')
    const L: { texto: string; tamanho?: number; negrito?: boolean }[] = [{ texto: `Semana de ${br(sem.inicio)} a ${br(sem.fim)}`, tamanho: 16, negrito: true }, { texto: `${sem.total} item(ns): prazos de casos e compromissos, por dia e responsável.`, tamanho: 9 }, { texto: ' ' }]
    if (!sem.dias.length) L.push({ texto: 'Nenhum prazo ou compromisso nos próximos 7 dias.', tamanho: 11 })
    for (const d of sem.dias) {
      L.push({ texto: br(d.dia), tamanho: 12, negrito: true })
      for (const i of d.itens) for (const q of quebrar(`- [${i.tipo === 'prazo' ? 'Prazo' : 'Compromisso'}] ${i.titulo}${i.detalhe ? ' · ' + i.detalhe : ''}${i.responsavel ? ' · resp.: ' + i.responsavel : ''}`, 9.5)) L.push({ texto: q, tamanho: 9.5 })
      L.push({ texto: ' ' })
    }
    const pdf = gerarPdfTexto(`Semana ${sem.inicio}`, L)
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = `semana-${sem.inicio}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000)
    setMsgSemana(`PDF da semana gerado (${sem.total} item(ns)). A secretaria recebe este PDF por e-mail toda sexta às 17h.`)
  }
  // Passo 43: importar um .ics exportado do Outlook (sem duplicar pelo UID).
  const importarIcs = async (arquivo: File | undefined) => {
    if (!arquivo) return
    setMsgSemana('Lendo o arquivo…')
    try {
      const eventos = lerIcs(await arquivo.text())
      if (!eventos.length) { setMsgSemana('Nenhum compromisso com data encontrado no arquivo .ics.'); return }
      const r = await importarCompromissosIcs(eventos)
      await recarregar()
      setMsgSemana(`Importação concluída: ${r.criados} compromisso(s) criado(s), ${r.repetidos} já existia(m) e foram pulados.`)
    } catch (e) { setMsgSemana('Não foi possível importar: ' + (e instanceof Error ? e.message : String(e))) }
  }
  const enviarSemanaTeste = async () => {
    setMsgSemana('Enviando…')
    const { data, error } = await supabase.functions.invoke('semana-pdf', { body: { teste: true } })
    const r = (data ?? {}) as { enviado?: boolean; total?: number; motivo?: string; detalhe?: string }
    setMsgSemana(error ? error.message : r.enviado ? `E-mail de teste enviado para você com ${r.total} item(ns).` : `Não enviado: ${r.motivo ?? r.detalhe ?? 'erro'}`)
  }
  // Passo 19: roteiro do Outlook por e-mail e resultado do teste (configuracoes.teste_outlook, só admin lê e grava).
  const [testeOutlook, setTesteOutlook] = useState<{ enviado_em?: string; para?: string[]; resultado?: string; em?: string } | null>(null)
  const [msgRoteiro, setMsgRoteiro] = useState('')
  const [enviandoRoteiro, setEnviandoRoteiro] = useState(false)
  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.from('configuracoes').select('valor').eq('chave', 'teste_outlook').maybeSingle().then(r => { try { setTesteOutlook(r.data ? JSON.parse(r.data.valor) : null) } catch { setTesteOutlook(null) } })
  }, [])
  const enviarRoteiro = async (para: 'fatima' | 'eu') => {
    setEnviandoRoteiro(true); setMsgRoteiro('')
    try {
      const { data, error } = await supabase.functions.invoke('roteiro-outlook', { body: para === 'eu' ? { teste: true } : { para: 'fatima' } })
      if (error || data?.erro) throw new Error(data?.erro ?? error?.message)
      setMsgRoteiro(`Roteiro enviado para ${(data.para as string[]).join(', ')}.`)
      if (para === 'fatima') setTesteOutlook({ enviado_em: new Date().toISOString(), para: data.para, resultado: 'pendente' })
    } catch (e) { setMsgRoteiro(`Não foi possível enviar: ${e instanceof Error ? e.message : e}`) } finally { setEnviandoRoteiro(false) }
  }
  const marcarTesteOutlook = async (resultado: 'funcionou' | 'nao_funcionou') => {
    const novo = { ...(testeOutlook ?? {}), resultado, em: new Date().toISOString() }
    const { error } = await supabase.from('configuracoes').upsert({ chave: 'teste_outlook', valor: JSON.stringify(novo) }, { onConflict: 'chave' })
    if (!error) setTesteOutlook(novo)
  }
  const [showModal, setShowModal] = useState(false)
  const [novoAlerta, setNovoAlerta] = useState({
    titulo: '',
    imovel: '',
    diasAntes: 7,
    avisosDias: [7] as number[],
    dataEvento: '',
    email: '',
  })

  // Assinatura do calendário: o Google Agenda passa a buscar os prazos sozinho, sem exportar de novo.
  // O Outlook para Windows abre o link webcal: e assina o mesmo calendário.
  const sincronizarGoogleCalendar = async (destino: 'google' | 'outlook' = 'google') => {
    setSincronizando(true)
    try {
      const { data: token, error } = await supabase.rpc('link_agenda')
      if (error || !token) throw error ?? new Error('sem link')
      const feed = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agenda-feed?t=${token}`.replace(/^https?:/, 'webcal:')
      if (destino === 'outlook') window.location.href = feed
      else window.open(`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feed)}`, '_blank', 'noopener')
    } catch (e) {
      console.error('Erro ao conectar a agenda:', e)
      alert('Não foi possível gerar o link da agenda. Entre de novo na plataforma e tente outra vez.')
    } finally {
      setSincronizando(false)
    }
  }

  const abrirModalNovoAlerta = (dia: number) => {
    const dataEvento = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
    setNovoAlerta({ ...novoAlerta, dataEvento })
    setShowModal(true)
  }

  const criarAlerta = async () => {
    if (!novoAlerta.titulo || !novoAlerta.imovel || !novoAlerta.dataEvento) {
      alert('Preencha título, imóvel e data')
      return
    }
    const emails = novoAlerta.email.split(/[,;\s]+/).filter(Boolean)
    if (emails.some(e => !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e))) {
      alert('Confira o e-mail para aviso. Para mais de um, separe por vírgula.')
      return
    }
    try {
      await salvarCompromisso({
        titulo: novoAlerta.titulo,
        imovel: novoAlerta.imovel,
        dataEvento: novoAlerta.dataEvento,
        diasAntes: novoAlerta.diasAntes,
        avisosDias: novoAlerta.avisosDias,
        email: novoAlerta.email,
      })
      await recarregar()
      setShowModal(false)
      setNovoAlerta({ titulo: '', imovel: '', diasAntes: 7, avisosDias: [7], dataEvento: '', email: '' })
    } catch (e) {
      console.error('Erro ao salvar compromisso:', e)
      alert('Não foi possível salvar o compromisso. Tente novamente.')
    }
  }

  // Agrupa os compromissos por dia (chave aaaa-mm-dd).
  const porDia = useMemo(() => {
    const mapa = new Map<string, typeof alertas>()
    alertas.forEach(a => {
      const lista = mapa.get(a.dataEvento) ?? []
      lista.push(a)
      mapa.set(a.dataEvento, lista)
    })
    return mapa
  }, [alertas])

  if (loading) {
    return (
      <Layout title="Agenda">
        <p className="text-grafite-claro">Carregando agenda…</p>
      </Layout>
    )
  }

  const primeiro = new Date(ano, mes, 1)
  const diasNoMes = new Date(ano, mes + 1, 0).getDate()
  const deslocamento = primeiro.getDay()
  const celulas: (number | null)[] = [
    ...Array(deslocamento).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1),
  ]
  const iso = (dia: number) => `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const mudarMes = (delta: number) => {
    const d = new Date(ano, mes + delta, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth())
  }

  const doMes = alertas
    .filter(a => {
      const d = new Date(a.dataEvento + 'T00:00:00')
      return d.getFullYear() === ano && d.getMonth() === mes
    })
    .sort((a, b) => a.diasRestantes - b.diasRestantes)

  // Lembrete por e-mail: abre o cliente de e-mail com os próximos compromissos.
  const proximos = [...alertas].filter(a => a.diasRestantes >= 0).sort((a, b) => a.diasRestantes - b.diasRestantes).slice(0, 15)
  const corpoEmail = proximos
    .map(a => `• ${formatarData(a.dataEvento)} — ${a.titulo} (${a.imovel})`)
    .join('\n')
  const mailto = `mailto:?subject=${encodeURIComponent('Próximos compromissos contratuais')}&body=${encodeURIComponent('Próximos compromissos:\n\n' + corpoEmail)}`

  return (
    <Layout title="Agenda">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => mudarMes(-1)} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-sm hover:bg-white" aria-label="Mês anterior">
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <h2 className="font-serif text-2xl text-navy capitalize min-w-[11rem] text-center">
              {MESES[mes]} de {ano}
            </h2>
            <button onClick={() => mudarMes(1)} className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] rounded-sm hover:bg-white" aria-label="Próximo mês">
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={mailto}
              className="inline-flex items-center gap-2 border border-navy/20 text-navy px-4 py-2 rounded-sm text-sm hover:bg-white"
            >
              <Mail size={16} aria-hidden="true" /> Enviar por e-mail
            </a>
            <button onClick={semanaEmPdf} data-testid="semana-pdf" className="inline-flex items-center gap-2 border border-navy text-navy px-4 py-2 rounded-sm text-sm hover:bg-pergaminho">
              <Download size={16} aria-hidden="true" /> Semana em PDF
            </button>
            <button onClick={enviarSemanaTeste} data-testid="semana-email-teste" className="inline-flex items-center gap-2 border border-navy/20 text-navy px-4 py-2 rounded-sm text-sm hover:bg-white">
              <Mail size={16} aria-hidden="true" /> Testar e-mail de sexta
            </button>
            <label className="inline-flex items-center gap-2 border border-navy/20 text-navy px-4 py-2 rounded-sm text-sm hover:bg-white cursor-pointer" data-testid="importar-ics">
              <Plus size={16} aria-hidden="true" /> Importar .ics
              <input type="file" accept=".ics,text/calendar" className="sr-only" data-testid="importar-ics-input" onChange={e => { importarIcs(e.target.files?.[0]); e.target.value = '' }} />
            </label>
            <button
              onClick={() => baixarICS(alertas)}
              className="inline-flex items-center gap-2 border border-navy text-navy px-4 py-2 rounded-sm text-sm hover:bg-pergaminho"
            >
              <Download size={16} aria-hidden="true" /> Exportar iCal
            </button>
            <button
              onClick={() => sincronizarGoogleCalendar('outlook')}
              disabled={sincronizando}
              className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-sm text-sm hover:bg-navy-700 disabled:opacity-50"
            >
              <ExternalLink size={16} aria-hidden="true" /> Conectar ao Outlook
            </button>
            <button
              onClick={() => sincronizarGoogleCalendar('google')}
              disabled={sincronizando}
              className="inline-flex items-center gap-2 bg-navy text-white px-4 py-2 rounded-sm text-sm hover:bg-navy-700 disabled:opacity-50"
            >
              <ExternalLink size={16} aria-hidden="true" /> {sincronizando ? 'Abrindo…' : 'Conectar ao Google Agenda'}
            </button>
          </div>
          {msgSemana && <p role="status" className="text-sm mt-2" data-testid="semana-msg">{msgSemana}</p>}
          {supabaseConfigurado && (
            <div className="mt-3 text-sm flex flex-wrap items-center gap-3" data-testid="roteiro-outlook">
              <span className="text-grafite-claro">Roteiro do Outlook (5 passos com imagens):</span>
              <button type="button" onClick={() => enviarRoteiro('fatima')} disabled={enviandoRoteiro} className="underline text-navy disabled:opacity-50 min-h-[44px]" data-testid="enviar-roteiro-fatima">Enviar para a Fátima</button>
              <button type="button" onClick={() => enviarRoteiro('eu')} disabled={enviandoRoteiro} className="underline text-navy disabled:opacity-50 min-h-[44px]" data-testid="enviar-roteiro-eu">Enviar para mim (teste)</button>
              {msgRoteiro && <span aria-live="polite" data-testid="msg-roteiro">{msgRoteiro}</span>}
              {testeOutlook && (
                <span className="flex items-center gap-2" data-testid="teste-outlook">
                  Teste da Fátima: <strong data-testid="resultado-outlook">{testeOutlook.resultado === 'funcionou' ? 'funcionou' : testeOutlook.resultado === 'nao_funcionou' ? 'não funcionou' : 'pendente'}</strong>
                  {testeOutlook.enviado_em && <span className="text-grafite-claro">(roteiro enviado em {new Date(testeOutlook.enviado_em).toLocaleDateString('pt-BR')})</span>}
                  <button type="button" onClick={() => marcarTesteOutlook('funcionou')} className="border border-regular text-regular px-2 py-1 rounded-sm" data-testid="outlook-funcionou">Funcionou</button>
                  <button type="button" onClick={() => marcarTesteOutlook('nao_funcionou')} className="border border-critico text-critico px-2 py-1 rounded-sm" data-testid="outlook-nao-funcionou">Não funcionou</button>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bg-white shadow-sm p-4">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs uppercase tracking-wider text-grafite-claro py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {celulas.map((dia, i) => {
              if (dia === null) return <div key={`v-${i}`} className="min-h-[72px]" />
              const eventos = porDia.get(iso(dia)) ?? []
              const ehHoje = ano === hoje.getFullYear() && mes === hoje.getMonth() && dia === hoje.getDate()
              return (
                <div
                  key={dia}
                  className={`min-h-[72px] border p-1.5 ${ehHoje ? 'border-dourado bg-pergaminho' : 'border-navy/5'}`}
                >
                  <span className={`text-xs ${ehHoje ? 'font-bold text-dourado-escuro' : 'text-grafite-claro'}`}>
                    {dia}
                  </span>
                  <div className="mt-1 space-y-1">
                    {eventos.slice(0, 3).map(e => {
                      const sit = situacaoPorPrazo(e.diasRestantes)
                      return (
                        <button
                          key={e.id}
                          onClick={() => e.imovelId && navigate(`/contrato/${e.imovelId}`)}
                          className="w-full flex items-center gap-1 text-left min-h-[28px] py-1 rounded-sm hover:bg-pergaminho"
                          title={`${e.titulo} — ${e.imovel}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${corPonto[sit]}`} aria-hidden="true" />
                          <span className="text-[11px] text-grafite truncate">{e.titulo}</span>
                        </button>
                      )
                    })}
                    {eventos.length > 3 && (
                      <span className="text-[11px] text-grafite-claro">+{eventos.length - 3}</span>
                    )}
                  </div>
                  <button
                    onClick={() => abrirModalNovoAlerta(dia)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1 min-h-[24px] text-navy hover:bg-pergaminho rounded-sm text-xs"
                    title="Novo compromisso"
                  >
                    <Plus size={14} aria-hidden="true" /> Novo
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <section className="bg-white shadow-sm" aria-labelledby="titulo-mes">
          <h3 id="titulo-mes" className="text-lg px-5 pt-5 flex items-center gap-2">
            <CalendarDays size={18} className="text-dourado" aria-hidden="true" />
            Compromissos de {MESES[mes]}
          </h3>
          {doMes.length === 0 ? (
            <p className="text-sm text-grafite-claro p-5">Nenhum compromisso neste mês.</p>
          ) : (
            <ul className="divide-y divide-navy/10 mt-3">
              {doMes.map(a => (
                <li key={a.id}>
                  <button
                    onClick={() => a.imovelId && navigate(`/contrato/${a.imovelId}`)}
                    className="w-full text-left px-5 py-3 hover:bg-pergaminho flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-navy">{a.titulo}</p>
                      <p className="text-sm text-grafite-claro truncate">{a.imovel}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <SeloSituacao situacao={situacaoPorPrazo(a.diasRestantes)} texto={textoPrazo(a.diasRestantes)} />
                      <p className="text-xs text-grafite-claro mt-1">{formatarData(a.dataEvento)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Modal: Novo Alerta */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-96 max-w-[90vw]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-xl text-navy">Novo Compromisso</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] text-grafite hover:text-navy"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label htmlFor="titulo" className="block text-sm font-medium text-navy mb-1">
                    Título do Compromisso
                  </label>
                  <input
                    id="titulo"
                    type="text"
                    value={novoAlerta.titulo}
                    onChange={e => setNovoAlerta({ ...novoAlerta, titulo: e.target.value })}
                    placeholder="Ex: Revisão de Contrato"
                    className="w-full min-h-[44px] px-3 border border-navy/20 rounded-sm text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="imovel" className="block text-sm font-medium text-navy mb-1">
                    Imóvel
                  </label>
                  <input
                    id="imovel"
                    type="text"
                    value={novoAlerta.imovel}
                    onChange={e => setNovoAlerta({ ...novoAlerta, imovel: e.target.value })}
                    placeholder="Ex: Av. Atlântica, 1000"
                    className="w-full min-h-[44px] px-3 border border-navy/20 rounded-sm text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="data" className="block text-sm font-medium text-navy mb-1">
                    Data do Vencimento
                  </label>
                  <input
                    id="data"
                    type="date"
                    value={novoAlerta.dataEvento}
                    onChange={e => setNovoAlerta({ ...novoAlerta, dataEvento: e.target.value })}
                    className="w-full min-h-[44px] px-3 border border-navy/20 rounded-sm text-sm"
                  />
                </div>

                <div>
                  <p id="diasAntes-rotulo" className="block text-sm font-medium text-navy mb-1">Avisos com (dias antes, marque quantos quiser)</p>
                  <EscolhaAvisos id="diasAntes" valor={novoAlerta.avisosDias} onChange={v => setNovoAlerta({ ...novoAlerta, avisosDias: v, diasAntes: Math.max(...v) })} />
                </div>
                <div>
                  <label htmlFor="emailAviso" className="block text-sm font-medium text-navy mb-1">
                    E-mail para aviso <span className="font-normal text-grafite-claro">(opcional)</span>
                  </label>
                  <input
                    id="emailAviso"
                    type="text"
                    inputMode="email"
                    value={novoAlerta.email}
                    onChange={e => setNovoAlerta({ ...novoAlerta, email: e.target.value })}
                    placeholder="fatima.menezes@lsm.law"
                    className="w-full min-h-[44px] px-3 border border-navy/20 rounded-sm text-sm"
                  />
                  <p className="text-xs text-grafite-claro mt-1">Para mais de um, separe por vírgula.</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={criarAlerta}
                  className="flex-1 min-h-[44px] bg-navy text-white font-medium rounded-sm hover:bg-navy-700"
                >
                  Salvar Compromisso
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 min-h-[44px] border border-navy/20 text-navy font-medium rounded-sm hover:bg-pergaminho"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
