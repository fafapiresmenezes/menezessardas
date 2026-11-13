import { useEffect, useState } from 'react'
import { FunctionRegion } from '@supabase/supabase-js'
import { Bot, Mail, FileDown, RefreshCw, PenLine } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { baixarPecaWord } from '@/lib/formatarPeca'

// Robô do CNJ: o que a plataforma faz sozinha, todo dia, sem ninguém clicar.
// Confere as publicações a cada 4 horas (pelo número, pelo nome dos advogados e pela OAB), cria o prazo pelo código
// do ramo e, 7 dias antes de cada prazo, escreve a peça e manda por e-mail para quem estiver cadastrado aqui.
type Automacao = { advogados: string | null; oabs: string | null; destinatarios: string | null; ultima: string | null; email_ok: boolean; ia_ok: boolean }
type Ultima = { em: string; processos: number; publicacoes: number; novas: number; tarefas: number; casosNovos: number; totalErros: number; erros: string[] }
type Peca = { id: string; titulo: string; texto: string; numero: string | null; enviada_para: string[]; enviada_em: string | null; erro: string | null; criado_em: string }

async function invocar(nome: string, body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke(nome, { body, region: FunctionRegion.SaEast1 })
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null)
    if (!corpo && /not found|failed to send/i.test(String((error as Error).message))) throw new Error('O robô ainda não foi instalado no servidor. Use o botão de publicar (guia "Pôr no ar").')
    throw new Error(corpo?.erro ?? mensagemAmigavel(error))
  }
  if (data?.erro) throw new Error(data.erro)
  return data
}

export default function RoboCnj({ nomes, oabs, aoCarregar }: { nomes: string; oabs: string; aoCarregar?: (a: { advogados: string; oabs: string }) => void }) {
  const [auto, setAuto] = useState<Automacao | null>(null)
  const [emails, setEmails] = useState('')
  const [pecas, setPecas] = useState<Peca[]>([])
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState<'' | 'guardar' | 'conferir' | 'pecas'>('')

  const carregar = async () => {
    const { data } = await supabase.rpc('ler_automacao')
    if (data) { const a = data as Automacao; setAuto(a); setEmails(a.destinatarios?.replace(/,/g, ', ') ?? ''); aoCarregar?.({ advogados: a.advogados ?? '', oabs: a.oabs ?? '' }) }
    const { data: ps } = await supabase.from('pecas_automaticas').select('id,titulo,texto,numero,enviada_para,enviada_em,erro,criado_em').order('criado_em', { ascending: false }).limit(20)
    setPecas((ps ?? []) as Peca[])
  }
  useEffect(() => { carregar() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const ultima: Ultima | null = (() => { try { return auto?.ultima ? JSON.parse(auto.ultima) : null } catch { return null } })()

  const guardar = async () => {
    setOcupado('guardar'); setMsg('')
    // Nome e OAB em branco não apagam o que já estava guardado (as OABs também são usadas na tela Intimações).
    const passos: [string, string][] = [['pecas_destinatarios', emails]]
    if (nomes.trim()) passos.unshift(['advogados_monitorados', nomes])
    if (oabs.trim()) passos.unshift(['oabs_monitoradas', oabs.replace(/\s+/g, '')])
    for (const [chave, valor] of passos) {
      const { error } = await supabase.rpc('definir_configuracao', { p_chave: chave, p_valor: valor })
      if (error) { setOcupado(''); return setMsg(/administrador/i.test(error.message) ? 'Só um administrador do escritório pode guardar estas informações.' : /desconhecida/i.test(error.message) ? 'O banco de dados ainda não foi atualizado. Use o botão de publicar (guia "Pôr no ar").' : error.message) }
    }
    setOcupado(''); setMsg('Guardado. O robô usa estes nomes, OABs e e-mails a partir da próxima rodada.'); carregar()
  }
  const conferir = async () => {
    setOcupado('conferir'); setMsg('Conferindo no CNJ os últimos 30 dias… pode levar alguns minutos.')
    try {
      const r = await invocar('prazos-automaticos', { dias: 30 })
      setMsg(`Pronto: ${r.publicacoes} publicação(ões) achada(s), ${r.novas} nova(s), ${r.tarefas} prazo(s) criado(s) na agenda${r.casosNovos ? `, ${r.casosNovos} processo(s) novo(s) aberto(s)` : ''}.${r.totalErros ? ` ${r.totalErros} consulta(s) falharam; o robô tenta de novo na próxima rodada.` : ''}`)
      carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)) }
    setOcupado('')
  }
  const escrever = async () => {
    setOcupado('pecas'); setMsg('Escrevendo as peças dos prazos dos próximos 7 dias…')
    try {
      const r = await invocar('pecas-automaticas', {})
      const ok = (r.feitas ?? []).filter((f: { enviada: boolean }) => f.enviada).length
      setMsg(r.candidatas ? `${r.feitas.length} peça(s) escrita(s), ${ok} enviada(s) por e-mail.${r.feitas.find((f: { detalhe?: string }) => f.detalhe) ? ` Aviso: ${r.feitas.find((f: { detalhe?: string }) => f.detalhe).detalhe}` : ''}` : 'Nenhum prazo nos próximos 7 dias sem peça. Nada a escrever agora.')
      carregar()
    } catch (e) { setMsg(e instanceof Error ? e.message : String(e)) }
    setOcupado('')
  }

  return (
    <section className="bg-white shadow-sm p-5 md:p-6 border-t-2 border-dourado" aria-label="Robô do CNJ">
      <h2 className="font-serif text-2xl flex items-center gap-2"><Bot className="w-6 h-6 text-dourado" aria-hidden />Robô do CNJ: trabalha sozinho, todo dia</h2>
      <ul className="mt-2 text-base space-y-1 list-disc pl-5">
        <li>A cada <strong>4 horas</strong>, dia e noite, confere no CNJ tudo o que saiu para os processos do escritório.</li>
        <li>Cada decisão ou intimação nova vira <strong>prazo na agenda</strong>, contado pelo código certo (cível, trabalho, juizado, penal…).</li>
        <li><strong>7 dias antes</strong> de cada prazo, escreve a peça no estilo do escritório e manda por e-mail, já formatada.</li>
      </ul>
      <p className="text-sm mt-3" data-testid="ultima-rodada">
        {ultima ? `Última conferência: ${new Date(ultima.em).toLocaleString('pt-BR')} · ${ultima.processos} processo(s) acompanhados · ${ultima.novas} publicação(ões) nova(s) · ${ultima.tarefas} prazo(s) criado(s).` : 'O robô ainda não rodou. Depois de guardar os nomes abaixo, clique em "Conferir agora".'}
      </p>
      <label htmlFor="emails-pecas" className="block text-sm mt-4 mb-1 font-medium"><Mail className="w-4 h-4 inline mr-1" aria-hidden />Quem recebe as peças por e-mail</label>
      <input id="emails-pecas" value={emails} onChange={e => setEmails(e.target.value)} placeholder="fatima@gmail.com, outro@escritorio.com.br" className="w-full border px-3 py-2 min-h-[44px] text-base" autoComplete="off" inputMode="email" />
      <p className="text-xs text-grafite-claro mt-1">Separe por vírgula. O robô usa também os nomes e a OAB do passo "De quem eram os processos?".</p>
      {auto && !auto.email_ok && <p className="text-sm mt-2 text-navy">Falta configurar o envio de e-mail (Configurações → E-mail). Sem isso as peças ficam guardadas aqui embaixo para baixar.</p>}
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={guardar} disabled={!!ocupado} title="Guarda os dados do robô (nomes, OAB e e-mails) para que ele passe a conferir o CNJ a cada 4h" className="min-h-[48px] px-5 bg-navy text-white text-base disabled:opacity-50" data-testid="guardar-robo">{ocupado === 'guardar' ? 'Guardando…' : 'Guardar'}</button>
        <button type="button" onClick={conferir} disabled={!!ocupado} title="Consulta o CNJ agora e baixa as novas intimações; roda fora do intervalo automático de 4h" className="min-h-[48px] px-5 border border-navy text-navy text-base inline-flex items-center gap-2 disabled:opacity-50" data-testid="conferir-agora"><RefreshCw className={`w-4 h-4 ${ocupado === 'conferir' ? 'animate-spin' : ''}`} aria-hidden />Conferir agora</button>
        <button type="button" onClick={escrever} disabled={!!ocupado} title="Pede ao robô para escrever as peças pendentes e enviar por e-mail aos destinatários cadastrados" className="min-h-[48px] px-5 border border-navy text-navy text-base inline-flex items-center gap-2 disabled:opacity-50" data-testid="escrever-agora"><PenLine className="w-4 h-4" aria-hidden />Escrever as peças agora</button>
      </div>
      {msg && <p className="mt-3 p-3 bg-navy/5 border-l-4 border-dourado text-sm" role="status" data-testid="msg-robo">{msg}</p>}

      <h3 className="font-serif text-xl mt-6">Peças já escritas</h3>
      {pecas.length === 0
        ? <p className="text-sm text-grafite-claro mt-1">Nenhuma ainda. Elas aparecem aqui assim que o robô escrever.</p>
        : <ul className="mt-2 divide-y divide-navy/10" data-testid="pecas-escritas">
          {pecas.map(p => (
            <li key={p.id} className="py-2 flex flex-wrap items-center justify-between gap-2 text-sm">
              <span><strong>{p.titulo}</strong><span className="block text-grafite-claro">{new Date(p.criado_em).toLocaleString('pt-BR')} · {p.enviada_em ? `enviada para ${p.enviada_para.join(', ')}` : p.erro ?? 'não enviada'}</span></span>
              <button type="button" onClick={() => baixarPecaWord(p.texto, p.titulo)} title="Baixa esta peça em arquivo .docx para abrir no Word e ajustar antes de protocolar" className="min-h-[44px] px-4 border border-navy text-navy inline-flex items-center gap-2"><FileDown className="w-4 h-4" aria-hidden />Baixar no Word</button>
            </li>
          ))}
        </ul>}
    </section>
  )
}
