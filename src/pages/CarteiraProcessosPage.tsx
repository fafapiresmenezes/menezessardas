import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import Vazio from '@/components/Vazio'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { listarPessoas, type Pessoa } from '@/lib/equipe'
import { formatarData, hojeLocal } from '@/lib/datas'
import { montarCarteira, filtrarCarteira, resumoCarteira, type CasoCarteira, type MonCarteira, type IntimacaoCarteira, type FiltroCarteira } from '@/lib/escritorio/carteira'
import { meuAlcance, filtrarPorHierarquia, rotuloCargo } from '@/lib/hierarquia'
import { Briefcase, Upload, Radar, Download } from 'lucide-react'

// Carteira de processos (como o painel do Escavador e do Jusbrasil): todos os processos do escritório numa tabela,
// com tribunal, última movimentação no DataJud, tempo parado, intimações não lidas e próximo prazo.
const hojeIso = () => hojeLocal()
const ALERTAS: [NonNullable<FiltroCarteira['alerta']>, string][] = [['', 'Todos'], ['intimacao', 'Com intimação não lida'], ['parado90', 'Parados há mais de 90 dias'], ['parado180', 'Parados há mais de 180 dias'], ['sem_monitor', 'Sem monitoramento'], ['nao_encontrado', 'Não achados no DataJud']]

export default function CarteiraProcessosPage() {
  const [casos, setCasos] = useState<CasoCarteira[]>([])
  const [mons, setMons] = useState<MonCarteira[]>([])
  const [ints, setInts] = useState<IntimacaoCarteira[]>([])
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [filtro, setFiltro] = useState<FiltroCarteira>({ situacao: 'ativos', alerta: '' })
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [carregado, setCarregado] = useState(false)
  // Hierarquia (pedido do M): sócio e gestor veem a carteira inteira; pleno e júnior, só os próprios processos.
  const [alcance, setAlcance] = useState<{ id: string; cargo: 'socio' | 'gestor' | 'pleno' | 'junior' | null; admin: boolean; veTudo: boolean } | null>(null)
  useEffect(() => { meuAlcance().then(setAlcance).catch(() => setAlcance({ id: '', cargo: null, admin: false, veTudo: false })) }, [])

  const carregar = async () => {
    const [c, m, i] = await Promise.all([
      supabase.from('tarefas').select('id,titulo,cliente,area,numero_processo,situacao,responsavel_id,descricao,criado_em,honorario_previsto,tipo').eq('nivel', 'projeto').order('criado_em', { ascending: false }),
      supabase.from('monitoramentos').select('valor,tipo,ultimo_estado,novidades,verificado_em'),
      supabase.from('intimacoes').select('numero_processo,lida,data_disponibilizacao,prazo_final'),
    ])
    if (c.error) setErro(mensagemAmigavel(c.error))
    const todos = (c.data ?? []) as (CasoCarteira & { tipo?: string | null })[]
    setCasos(todos.filter(x => x.tipo === 'caso' || x.numero_processo))
    setMons((m.data ?? []) as MonCarteira[]); setInts((i.data ?? []) as IntimacaoCarteira[]); setCarregado(true)
  }
  useEffect(() => { carregar(); listarPessoas().then(setPessoas).catch(() => {}) }, [])

  const hoje = hojeIso()
  const meus = useMemo(() => (alcance && !alcance.veTudo ? filtrarPorHierarquia(casos, alcance) : casos), [casos, alcance])
  const linhas = useMemo(() => montarCarteira(meus, mons, ints, hoje), [meus, mons, ints, hoje])
  const visiveis = useMemo(() => filtrarCarteira(linhas, filtro), [linhas, filtro])
  const resumo = useMemo(() => resumoCarteira(linhas), [linhas])
  const areas = [...new Set(linhas.map(l => l.area).filter(Boolean))] as string[]
  const tribunais = [...new Set(linhas.map(l => l.tribunal))].sort()
  const nome = (id: string | null) => pessoas.find(p => p.id === id)?.nome ?? '—'

  const monitorarSemMonitor = async () => {
    const alvo = linhas.filter(l => l.numero && !l.monitorado && l.situacao !== 'feito')
    if (!alvo.length) return setMsg('Todos os processos ativos já estão no monitoramento.')
    const { error } = await supabase.from('monitoramentos').upsert(alvo.map(l => ({ tipo: 'processo', valor: l.numero, rotulo: l.titulo.slice(0, 120) })), { onConflict: 'tipo,valor', ignoreDuplicates: true })
    if (error) return setMsg(mensagemAmigavel(error))
    setMsg(`${alvo.length} processo(s) entraram no monitoramento. O robô verifica o DataJud sozinho, várias vezes ao dia.`); carregar()
  }
  const encerrar = async (id: string, situacao: string) => {
    const { error } = await supabase.from('tarefas').update({ situacao, atualizado_em: new Date().toISOString() }).eq('id', id)
    if (error) return setErro(mensagemAmigavel(error))
    carregar()
  }
  const baixarCsv = () => {
    const cab = 'processo;título;cliente;parte contrária;área;tribunal;órgão;fase;última movimentação;dias parado;intimações não lidas;próximo prazo;responsável;situação'
    const corpo = visiveis.map(l => [l.numero_processo ?? '', l.titulo, l.cliente ?? '', l.parteContraria ?? '', l.area ?? '', l.tribunal, l.orgao ?? '', l.fase ?? '', l.ultima ?? '', l.parado ?? '', l.intimacoesNaoLidas, l.proximoPrazo ?? '', nome(l.responsavel_id), l.situacao === 'feito' ? 'encerrado' : 'ativo'].map(v => String(v).replace(/;/g, ',')).join(';'))
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + [cab, ...corpo].join('\n')], { type: 'text/csv;charset=utf-8' })); a.download = 'carteira-de-processos.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const Cartao = ({ rotulo, valor, alerta, destaque }: { rotulo: string; valor: number; alerta?: FiltroCarteira['alerta']; destaque?: boolean }) => (
    <button type="button" onClick={() => setFiltro(f => ({ ...f, situacao: alerta === undefined ? f.situacao : 'ativos', alerta: alerta ?? '' }))} title={`Filtra a carteira para mostrar: ${rotulo}`} className={`text-left bg-white shadow-sm p-4 border-t-2 ${destaque && valor ? 'border-critico' : 'border-dourado'}`}>
      <span className="block text-xs uppercase tracking-wider text-grafite-claro">{rotulo}</span><span className={`block text-2xl font-serif ${destaque && valor ? 'text-critico' : 'text-navy'}`}>{valor}</span>
    </button>
  )

  return (
    <Layout title="Carteira de processos">
      <div className="space-y-5">
        {alcance && (
          <p className="bg-white border-l-2 border-dourado p-3 text-sm" data-testid="carteira-alcance" title="A hierarquia é definida pela administração na tela Equipe.">
            {alcance.veTudo
              ? <>Você entrou como <strong>{alcance.cargo ? rotuloCargo[alcance.cargo] : 'administração'}</strong>: vê a carteira inteira do escritório.</>
              : <>Você vê <strong>só os seus processos</strong>{alcance.cargo ? ` (${rotuloCargo[alcance.cargo]})` : ''}. Sócios e o gestor veem o conjunto; processos sem dono aparecem para todos até alguém assumir.</>}
          </p>
        )}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-6" data-testid="carteira-resumo">
          <Cartao rotulo="Ativos" valor={resumo.ativos} alerta="" />
          <Cartao rotulo="Intimação não lida" valor={resumo.comIntimacao} alerta="intimacao" destaque />
          <Cartao rotulo="Parados +90 dias" valor={resumo.parados90} alerta="parado90" destaque />
          <Cartao rotulo="Parados +180 dias" valor={resumo.parados180} alerta="parado180" destaque />
          <Cartao rotulo="Sem monitoramento" valor={resumo.semMonitor} alerta="sem_monitor" destaque />
          <Cartao rotulo="Encerrados" valor={resumo.encerrados} />
        </div>

        <section className="bg-white shadow-sm p-5">
          <div className="grid gap-3 md:grid-cols-6 text-sm">
            <input value={filtro.texto ?? ''} onChange={e => setFiltro({ ...filtro, texto: e.target.value })} placeholder="Buscar por cliente, parte, número, classe ou vara" aria-label="Buscar na carteira" data-testid="carteira-busca" className="border px-3 py-2 min-h-[44px] md:col-span-2" />
            <select value={filtro.area ?? ''} onChange={e => setFiltro({ ...filtro, area: e.target.value })} aria-label="Área" className="border px-2 py-2"><option value="">Todas as áreas</option>{areas.map(a => <option key={a}>{a}</option>)}</select>
            <select value={filtro.tribunal ?? ''} onChange={e => setFiltro({ ...filtro, tribunal: e.target.value })} aria-label="Tribunal" data-testid="carteira-tribunal" className="border px-2 py-2"><option value="">Todos os tribunais</option>{tribunais.map(t => <option key={t}>{t}</option>)}</select>
            <select value={filtro.situacao ?? 'ativos'} onChange={e => setFiltro({ ...filtro, situacao: e.target.value as FiltroCarteira['situacao'] })} aria-label="Situação" data-testid="carteira-situacao" className="border px-2 py-2"><option value="ativos">Ativos</option><option value="encerrados">Encerrados</option><option value="todos">Todos</option></select>
            <select value={filtro.responsavel ?? ''} onChange={e => setFiltro({ ...filtro, responsavel: e.target.value })} aria-label="Responsável" className="border px-2 py-2"><option value="">Todos os responsáveis</option>{pessoas.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}</select>
            <select value={filtro.alerta ?? ''} onChange={e => setFiltro({ ...filtro, alerta: e.target.value as FiltroCarteira['alerta'] })} aria-label="Alerta" data-testid="carteira-alerta" className="border px-2 py-2 min-h-[44px] self-start md:col-span-2">{ALERTAS.map(([v, r]) => <option key={v} value={v}>{r}</option>)}</select>
            <div className="md:col-span-4 flex flex-wrap gap-2">
              <Link to="/processos/importar" data-testid="ir-importar" title="Traz os processos que o escritório já tinha: planilha, lista de números ou nome do advogado." className="min-h-[44px] px-4 bg-dourado text-navy text-sm uppercase tracking-wider inline-flex items-center gap-2"><Upload size={16} aria-hidden /> Importar processos anteriores</Link>
              <button type="button" onClick={monitorarSemMonitor} data-testid="monitorar-todos" title="Liga o robô que acompanha no CNJ (DataJud) os processos que ainda não são acompanhados." className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm inline-flex items-center gap-2"><Radar size={16} aria-hidden /> Monitorar os que faltam</button>
              {visiveis.length > 0 && <button type="button" onClick={baixarCsv} data-testid="carteira-csv" title="Baixa esta lista como planilha (abre no Excel)." className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm inline-flex items-center gap-2"><Download size={16} aria-hidden /> Baixar CSV</button>}
            </div>
          </div>
          {(msg || erro) && <p role={erro ? 'alert' : 'status'} className={`text-sm mt-3 ${erro ? 'text-critico' : ''}`} data-testid="carteira-msg">{erro || msg}</p>}
          {resumo.porTribunal.length > 0 && <p className="text-xs text-grafite-claro mt-3">Por tribunal: {resumo.porTribunal.slice(0, 8).map(([t, n]) => `${t} (${n})`).join(' · ')}</p>}
        </section>

        <section className="bg-white shadow-sm p-5">
          <p className="text-sm mb-2" data-testid="carteira-total"><strong>{visiveis.length}</strong> processo(s) na lista</p>
          {visiveis.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1">Processo</th><th>Cliente / partes</th><th>Área</th><th>Tribunal / órgão</th><th>Última movimentação</th><th>Intimações</th><th>Responsável</th><th><span className="sr-only">Ações</span></th></tr></thead>
                <tbody className="divide-y divide-navy/10">
                  {visiveis.map(l => (
                    <tr key={l.id} data-testid="carteira-linha" className="align-top">
                      <td className="py-2"><Link to={`/projetos?caso=${l.id}`} title="Abre este processo com todas as tarefas, prazos e documentos" className="text-navy font-medium underline">{l.titulo}</Link><span className="block font-mono text-xs text-grafite-claro">{l.numero_processo ?? 'sem número'}</span>{l.fase && <span className="block text-xs">Fase: {l.fase}</span>}</td>
                      <td>{l.cliente ?? '—'}{l.parteContraria && <span className="block text-xs text-grafite-claro">x {l.parteContraria}</span>}</td>
                      <td>{l.area ?? '—'}</td>
                      <td>{l.tribunal}{(l.orgao || l.classe) && <span className="block text-xs text-grafite-claro">{[l.classe, l.orgao].filter(Boolean).join(' · ')}</span>}</td>
                      <td>{l.ultima ? <>{formatarData(l.ultima)}<span className={`block text-xs ${(l.parado ?? 0) > 90 ? 'text-critico' : 'text-grafite-claro'}`}>{l.parado} dia(s) sem andamento</span></> : <span className="text-xs text-grafite-claro">{l.naoEncontrado ? 'Não achado no DataJud' : l.monitorado ? 'Aguardando a 1ª verificação' : l.numero ? 'Não monitorado' : '—'}</span>}</td>
                      <td>{l.intimacoesNaoLidas ? <Link to="/intimacoes" title="Ver as intimações deste processo que ainda não foram lidas" className="text-critico underline">{l.intimacoesNaoLidas} não lida(s)</Link> : '—'}{l.proximoPrazo && <span className="block text-xs">prazo {formatarData(l.proximoPrazo)}</span>}</td>
                      <td>{nome(l.responsavel_id)}</td>
                      <td className="text-xs space-y-1">
                        {l.numero && <Link className="block underline text-navy" to={`/monitoramento?lt=${l.numero}`} title="Mostra todos os andamentos deste processo no DataJud (CNJ)" data-testid="carteira-historico">Histórico (DataJud)</Link>}
                        {l.numero && <a className="block underline text-navy" href={`https://www.jusbrasil.com.br/busca?q=${l.numero_processo}`} target="_blank" rel="noreferrer" title="Abre a busca pelo processo no Jusbrasil (site externo)">Jusbrasil</a>}
                        {l.numero && <a className="block underline text-navy" href={`https://www.escavador.com/busca?q=${l.numero_processo}`} target="_blank" rel="noreferrer" title="Abre a busca pelo processo no Escavador (site externo)">Escavador</a>}
                        <button type="button" onClick={() => encerrar(l.id, l.situacao === 'feito' ? 'fazendo' : 'feito')} title={l.situacao === 'feito' ? 'Reabre este processo na carteira' : 'Marca este processo como encerrado'} className="block underline text-navy" data-testid="carteira-encerrar">{l.situacao === 'feito' ? 'Reabrir' : 'Encerrar'}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : carregado && <Vazio icone={<Briefcase size={28} />} titulo={linhas.length ? 'Nenhum processo com esses filtros' : 'A carteira está vazia'} texto={linhas.length ? 'Limpe a busca ou troque os filtros.' : 'Importe os processos que o escritório já tem: planilha de outro sistema, lista de números, intimações das OABs ou Escavador.'} acao={linhas.length ? undefined : { rotulo: 'Importar processos', para: '/processos/importar' }} />}
        </section>
      </div>
    </Layout>
  )
}
