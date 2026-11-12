import { FunctionRegion } from '@supabase/supabase-js'
import { useBaixado } from '@/hooks/useBaixado'
import Vazio from '@/components/Vazio'
import ConexaoCnj from '@/components/ConexaoCnj'
import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { perfilAtual } from '@/lib/equipe'
import { formatarData, diasAte } from '@/lib/datas'
import SeloSituacao from '@/components/SeloSituacao'
import { RefreshCw, ExternalLink } from 'lucide-react'
import { mensagemAmigavel } from '@/lib/erros'

// Caixa de intimações: publicações do Diário de Justiça Eletrônico Nacional (Comunica PJe, CNJ)
// para as OABs do escritório. Busca diária automática e botão "Buscar agora". Gratuito.
interface Intimacao {
  id: number; oab: string; data_disponibilizacao: string; tribunal: string | null; orgao: string | null
  tipo: string | null; classe: string | null; numero_processo: string | null; texto: string | null; link: string | null; lida: boolean; prazo_dias?: number | null; prazo_final?: string | null; tarefa_id?: string | null
}

export default function IntimacoesPage() {
  const [lista, setLista] = useState<Intimacao[]>([])
  const [admin, setAdmin] = useState(false)
  const [oabs, setOabs] = useState('')
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 260
  // Passo 135: opção "só urgentes" (vencidas e críticas) no filtro.
  // Passo 167: o filtro escolhido é lembrado neste navegador.
  const [filtro, setFiltro] = useState<'novas' | 'todas' | 'urgentes'>(() => { try { const v = localStorage.getItem('lsm-intimacoes-filtro'); return v === 'todas' || v === 'urgentes' ? v : 'novas' } catch { return 'novas' } })
  useEffect(() => { try { localStorage.setItem('lsm-intimacoes-filtro', filtro) } catch { /* sem armazenamento */ } }, [filtro])
  const [aberta, setAberta] = useState<number | null>(null)
  const [busca, setBusca] = useState('')
  const [baixado, marcarBaixado] = useBaixado() // Passo 389
  // Paginação da lista: sem isso, uma caixa com centenas de intimações renderizava todas de uma vez
  // (visto numa auditoria: ~300 intimações × ~3 controles cada = quase mil elementos na tela).
  // Resumo, impressão, cópia e CSV continuam considerando todas as visíveis — só a lista na tela é paginada.
  const TAMANHO_PAGINA = 30
  const [mostrar, setMostrar] = useState(TAMANHO_PAGINA)
  useEffect(() => { setMostrar(TAMANHO_PAGINA) }, [filtro, busca])

  const carregar = async () => {
    const { data } = await supabase.from('intimacoes').select('id,oab,data_disponibilizacao,tribunal,orgao,tipo,classe,numero_processo,texto,link,lida,prazo_dias,prazo_final,tarefa_id').order('data_disponibilizacao', { ascending: false }).limit(300)
    setLista((data ?? []) as Intimacao[])
  }
  useEffect(() => { carregar(); perfilAtual().then(f => setAdmin(f === 'admin')) }, [])

  const buscar = async () => {
    setOcupado(true); setMsg(null)
    const { data, error } = await supabase.functions.invoke('intimacoes', { body: { dias: 30 }, region: FunctionRegion.SaEast1 })
    setOcupado(false)
    const d = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (!d || d.erro) return setMsg({ ok: false, texto: d?.erro ?? 'O CNJ não respondeu agora. Tente de novo em instantes.' })
    if (d.aviso) return setMsg({ ok: false, texto: d.aviso })
    setMsg({ ok: !d.falhas?.length, texto: `${d.novas} intimação(ões) nova(s) nos últimos 30 dias para ${(d.oabs ?? []).join(', ')}.${d.falhas?.length ? ' Falhou: ' + d.falhas.join('; ') : ''}` })
    carregar()
  }
  const salvarOabs = async () => {
    const { error } = await supabase.rpc('definir_configuracao', { p_chave: 'oabs_monitoradas', p_valor: oabs })
    if (error) return setMsg({ ok: false, texto: mensagemAmigavel(error) })
    setOabs(''); buscar()
  }
  const marcarLida = async (i: Intimacao) => {
    setLista(l => l.map(x => (x.id === i.id ? { ...x, lida: true } : x)))
    const { error } = await supabase.from('intimacoes').update({ lida: true }).eq('id', i.id)
    // Sem permissão (leitor) ou sem rede: desfaz na tela e avisa, para a intimação não sumir sem ter sido gravada como lida.
    if (error) { setLista(l => l.map(x => (x.id === i.id ? { ...x, lida: false } : x))); setMsg({ ok: false, texto: mensagemAmigavel(error) }) }
  }
  // Passo 13: urgência pelo prazo estimado (dias úteis, CPC art. 219/224) e tarefa no caso correspondente.
  const urgencia = (i: Intimacao) => {
    if (!i.prazo_final) return null
    const d = diasAte(i.prazo_final) ?? 0
    return { d, situacao: d < 0 ? 'vencido' : d <= 2 ? 'critico' : d <= 5 ? 'atencao' : 'regular', texto: d < 0 ? 'Prazo vencido' : d === 0 ? 'Vence hoje' : `${d} dia(s) corridos` } as const
  }
  const criarTarefa = async (i: Intimacao) => {
    const { data, error } = await supabase.rpc('criar_tarefa_intimacao', { p_id: i.id })
    if (error) setMsg({ ok: false, texto: 'Não deu para criar a tarefa: ' + mensagemAmigavel(error) })
    else { setMsg({ ok: true, texto: 'Tarefa criada em Casos e projetos com o prazo estimado.' }); setLista(l => l.map(x => (x.id === i.id ? { ...x, tarefa_id: String(data) } : x))) }
  }
  const ordem = { vencido: 0, critico: 1, atencao: 2, regular: 3 } as const
  const visiveis = (filtro === 'novas' ? lista.filter(i => !i.lida) : filtro === 'urgentes' ? lista.filter(i => { const s = urgencia(i)?.situacao; return s === 'vencido' || s === 'critico' }) : lista).filter(i => !busca.trim() || [i.numero_processo, i.tribunal, i.classe, i.orgao, i.texto, i.tipo].join(' ').toLowerCase().includes(busca.trim().toLowerCase())).sort((a, b) => (ordem[urgencia(a)?.situacao ?? 'regular'] - ordem[urgencia(b)?.situacao ?? 'regular']) || b.data_disponibilizacao.localeCompare(a.data_disponibilizacao))

  const copiarResumo = () => {
    const linhas = visiveis.map(i => { const u = urgencia(i); return `${u?.situacao === 'vencido' ? 'VENCIDA' : u?.situacao === 'critico' ? 'CRÍTICA' : u?.situacao === 'atencao' ? 'ATENÇÃO' : 'no prazo'} · ${i.numero_processo} · ${i.tribunal ?? ''} · publicada ${formatarData(i.data_disponibilizacao)}${i.lida ? '' : ' · não lida'}` })
    navigator.clipboard?.writeText(`Intimações (${visiveis.length}) · ${new Date().toLocaleDateString('pt-BR')}\n${linhas.join('\n')}`).catch(() => undefined)
  }
  // Resumo por urgência das não lidas: o advogado vê de cara quantas vencem primeiro.
  const resumo = lista.filter(i => !i.lida).reduce((r, i) => { const s = urgencia(i)?.situacao; if (s) r[s]++; return r }, { vencido: 0, critico: 0, atencao: 0, regular: 0 })

  return (
    <Layout title="Intimações">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-5 space-y-3">
          {admin && <ConexaoCnj />}
          <p className="text-sm">Publicações do <strong>Diário de Justiça Eletrônico Nacional</strong> (CNJ) para as OABs do escritório. A busca roda sozinha várias vezes ao dia; o botão busca na hora.</p>
          <div className="flex flex-wrap gap-3 items-center">
            <button onClick={buscar} disabled={ocupado} title="Busca na hora as publicações dos últimos 30 dias no Diário de Justiça Eletrônico Nacional para as OABs do escritório" className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider inline-flex items-center gap-2 disabled:opacity-50">
              <RefreshCw size={16} aria-hidden="true" className={ocupado ? 'animate-spin' : ''} /> {ocupado ? 'Buscando…' : 'Buscar agora'}
            </button>
            <label className="text-sm flex items-center gap-2">
              <select aria-label="Quais intimações mostrar" value={filtro} onChange={e => setFiltro(e.target.value as 'novas' | 'todas' | 'urgentes')} className="border px-2 py-2 min-h-[44px]" title="Escolhe quais intimações aparecem na lista: só urgentes, só as não lidas ou todas" data-testid="filtro-intimacoes">
                <option value="urgentes">Só urgentes ({lista.filter(i => { const s = urgencia(i)?.situacao; return s === 'vencido' || s === 'critico' }).length})</option>
                <option value="novas">Só as não lidas ({lista.filter(i => !i.lida).length})</option>
                <option value="todas">Todas ({lista.length})</option>
              </select>
            </label>
            <input type="search" value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar processo, tribunal ou texto" aria-label="Buscar nas intimações" className="border px-3 py-2 min-h-[44px] text-sm w-64" data-testid="busca-intimacoes" />
            {/* Passo 105: resumo das intimações visíveis em texto (processo, tribunal, prazo), para colar na agenda ou no e-mail do cliente. */}
            {visiveis.length > 0 && <button type="button" onClick={copiarResumo} title="Copia um resumo em texto das intimações visíveis (processo, tribunal e prazo) para colar na agenda ou no e-mail do cliente" data-testid="copiar-intimacoes" className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm">Copiar resumo</button>}
            {visiveis.length > 0 && <button type="button" onClick={() => window.print()} title="Abre a janela de impressão do navegador para imprimir as intimações visíveis" data-testid="imprimir-intimacoes" className="ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">Imprimir</button>}{/* Passo 200 */}
            {visiveis.length > 0 && <button type="button" data-testid="copiar-link-intimacoes" title="Copia o endereço desta página de intimações para compartilhar com a equipe" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{linkCopiado ? 'Link copiado' : 'Copiar link'}</button>}{/* Passo 226 */}
            {visiveis.length > 0 && <button type="button" data-testid="baixar-intimacoes" title="Baixa a planilha CSV com as intimações visíveis (processo, tribunal, órgão, tipo e data)" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['processo;tribunal;órgão;tipo;disponibilizada em', ...visiveis.map(i => `${i.numero_processo ?? ''};${i.tribunal ?? ''};${i.orgao ?? ''};${i.tipo ?? ''};${i.data_disponibilizacao}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'intimacoes.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{baixado ? 'Baixado' : 'Baixar CSV'}</button>}{/* Passo 294 */}
          </div>
          <p className="flex flex-wrap gap-3 text-xs" data-testid="resumo-urgencia">
            <span><strong>{resumo.vencido}</strong> vencida(s)</span>
            <span><strong>{resumo.critico}</strong> crítica(s)</span>
            <span><strong>{resumo.atencao}</strong> em atenção</span>
            <span><strong>{resumo.regular}</strong> no prazo</span>
          </p>
          {msg && <p role={msg.ok ? 'status' : 'alert'} className={`p-3 text-sm border-l-2 ${msg.ok ? 'bg-regularFundo border-regular text-regular' : 'bg-atencaoFundo border-atencao text-atencao'}`}>{msg.texto}</p>}
          {admin && (
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs uppercase tracking-wider text-grafite block">OABs do escritório (número/UF, separadas por vírgula)
                <input value={oabs} onChange={e => setOabs(e.target.value)} placeholder="123456/RJ, 98765/RJ" className="block border px-3 py-2 min-h-[44px] mt-1 w-72 normal-case" />
              </label>
              <button onClick={salvarOabs} title="Grava as OABs informadas como monitoradas e já dispara uma busca de intimações" disabled={!oabs.trim()} className="min-h-[44px] px-4 border border-navy text-navy text-sm disabled:opacity-50">Salvar OABs</button>
            </div>
          )}
        </section>
        {visiveis.length ? (
          <ul className="bg-white shadow-sm divide-y divide-navy/10">
            {visiveis.slice(0, mostrar).map(i => (
              <li key={i.id} className={`p-4 ${i.lida ? 'opacity-70' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm text-navy font-medium">{i.tipo ?? 'Comunicação'} · {i.tribunal} · {formatarData(i.data_disponibilizacao)}</p>
                    <p className="text-xs text-grafite-claro">Processo {i.numero_processo} · {i.classe} · {i.orgao} · OAB {i.oab}</p>
                    {(() => { const u = urgencia(i); return u ? (
                      <p className="flex flex-wrap items-center gap-2 mt-1 text-xs" data-testid={`urgencia-${i.id}`}>
                        <SeloSituacao situacao={u.situacao} texto={u.texto} />
                        <span className="text-grafite-claro">prazo estimado até {formatarData(i.prazo_final!)} ({i.prazo_dias} dias úteis; confira nos autos)</span>
                        {i.tarefa_id ? <a href="#/projetos" title="Abre Casos e projetos, onde está a tarefa criada para esta intimação" className="underline text-navy">tarefa criada no caso</a> : <button type="button" onClick={() => criarTarefa(i)} title="Cria uma tarefa no caso correspondente com o prazo estimado desta intimação" className="underline text-navy" data-testid={`criar-tarefa-${i.id}`}>criar tarefa no caso</button>}
                      </p>) : null })()}
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button onClick={() => setAberta(aberta === i.id ? null : i.id)} title={aberta === i.id ? 'Esconde o texto completo desta intimação' : 'Mostra o texto completo desta intimação aqui na página'} className="underline text-navy">{aberta === i.id ? 'Fechar' : 'Ler'}</button>
                    {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer" title="Abre em nova aba a publicação original no site do tribunal" className="underline text-navy inline-flex items-center gap-1">Abrir no tribunal <ExternalLink size={12} aria-hidden="true" /></a>}
                    {!i.lida && <button onClick={() => marcarLida(i)} title="Marca esta intimação como lida; ela sai do filtro de não lidas" className="underline text-grafite">Marcar como lida</button>}
                  </div>
                </div>
                {aberta === i.id && <p className="text-sm mt-2 whitespace-pre-wrap">{i.texto}</p>}
              </li>
            ))}
          </ul>
        ) : null}
        {visiveis.length > mostrar && (
          <p className="text-center">
            <button type="button" onClick={() => setMostrar(m => m + TAMANHO_PAGINA)} title="Mostra mais 30 intimações na lista" className="min-h-[44px] px-6 border border-navy/20 text-navy text-sm" data-testid="mostrar-mais-intimacoes">
              Mostrar mais ({visiveis.length - mostrar} restantes)
            </button>
          </p>
        )}
        {!visiveis.length && (
          <Vazio titulo={`Nenhuma intimação ${filtro === 'novas' ? 'não lida' : 'guardada'}`} texto="A busca roda sozinha várias vezes ao dia para as OABs cadastradas. Se faltar alguma OAB, cadastre em Configurações." acao={{ rotulo: 'Cadastrar OABs', para: '/settings' }} />
        )}
      </div>
    </Layout>
  )
}
