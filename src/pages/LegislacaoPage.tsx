import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useImoveis } from '@/hooks/useImoveis'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import {
  CATALOGO,
  ROTULO_STATUS,
  buscarNovidades,
  definirStatus,
  imoveisAfetados,
  lerAcompanhamento,
  radarPortais,
  type NovidadePortal,
  type Norma,
  type ResultadoBusca,
  type StatusAcompanhamento,
} from '@/lib/legislacao'
import { ExternalLink, RefreshCw, Printer, Search } from 'lucide-react'

const ESTILO_STATUS: Record<StatusAcompanhamento, 'atencao' | 'critico' | 'regular' | 'sem_prazo'> = {
  nova: 'critico',
  em_analise: 'atencao',
  concluida: 'regular',
  nao_se_aplica: 'sem_prazo',
}

interface LeiFederal {
  numero: string
  titulo: string
  dataPublicacao: string
  ementas: string[]
  relevancia: 'alta' | 'media' | 'baixa'
  url: string
}

export default function LegislacaoPage() {
  const { imoveis } = useImoveis()
  const [acomp, setAcomp] = useState<Record<string, StatusAcompanhamento>>({})
  const [busca, setBusca] = useState<ResultadoBusca | null>(null)
  const [buscando, setBuscando] = useState(false)
  const [erro, setErro] = useState('')
  const [termoPesquisa, setTermoPesquisa] = useState('')
  const [resultadosPesquisa, setResultadosPesquisa] = useState<LeiFederal[]>([])
  const [buscandoPesquisa, setBuscandoPesquisa] = useState(false)
  const [radar, setRadar] = useState<NovidadePortal[]>([])
  const [filtroRadar, setFiltroRadar] = useState<'todos' | 'Projeto' | 'Notícia'>('todos')

  useEffect(() => {
    lerAcompanhamento().then(setAcomp)
    radarPortais().then(setRadar).catch(() => undefined)
  }, [])

  const atualizar = useCallback(async () => {
    setBuscando(true)
    setErro('')
    try {
      setBusca(await buscarNovidades())
    } catch (e) {
      setErro('Não foi possível consultar o LexML agora: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    } finally {
      setBuscando(false)
    }
  }, [])

  const pesquisarLeis = async () => {
    if (!termoPesquisa.trim()) return
    if (!supabaseConfigurado) {
      setResultadosPesquisa([
        {
          numero: '8.245/1991',
          titulo: 'Lei de Locações Urbanas',
          dataPublicacao: '18/10/1991',
          ementas: ['Disciplina a locação dos imóveis urbanos.'],
          relevancia: 'alta',
          url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm',
        },
      ])
      return
    }
    setBuscandoPesquisa(true)
    try {
      const params = new URLSearchParams({ q: termoPesquisa })
      const { data: d } = await supabase.functions.invoke(`buscar-legislacao?${params}`)
      setResultadosPesquisa((d?.leis ?? []) as LeiFederal[])
    } catch (e) {
      console.error('Erro ao buscar leis:', e)
    } finally {
      setBuscandoPesquisa(false)
    }
  }

  useEffect(() => {
    atualizar()
  }, [atualizar])

  const mudar = async (n: Norma, status: StatusAcompanhamento) => {
    setAcomp(a => ({ ...a, [n.id]: status }))
    try {
      await definirStatus(n, status)
    } catch (e) {
      setErro('Não foi possível salvar o acompanhamento: ' + (e instanceof Error ? e.message : 'erro desconhecido'))
    }
  }

  const linhas: Norma[] = [...(busca?.novidades ?? []), ...CATALOGO]

  return (
    <Layout title="Legislação">
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-sm text-grafite-claro max-w-2xl">
            O que mudou na lei, quais imóveis da carteira são alcançados e o que fazer. As normas do catálogo são
            referências editoriais; as novidades vêm do LexML. Sempre confira o texto oficial antes de agir.
          </p>
          <div className="flex gap-2 print:hidden">
            <button
              onClick={atualizar}
              disabled={buscando}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 border border-navy text-navy hover:bg-pergaminho text-sm disabled:opacity-50"
            >
              <RefreshCw size={16} className={buscando ? 'animate-spin' : ''} aria-hidden="true" />
              {buscando ? 'Consultando…' : 'Buscar novidades'}
            </button>
            <button
              onClick={() => window.print()}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 bg-navy text-white hover:bg-navy-700 text-sm"
            >
              <Printer size={16} aria-hidden="true" /> Exportar PDF
            </button>
          </div>
        </div>

        <section className="bg-white p-6 shadow-sm">
          <h3 className="text-lg mb-1">Buscar legislação</h3>
          <p className="text-sm text-grafite-claro mb-4">Consulte leis federais, estaduais e decretos sobre imóveis, locação e contratos.</p>
          <div className="flex gap-2 mb-4">
            <div className="flex-1">
              <label htmlFor="termo-busca" className="sr-only">Termo de busca</label>
              <input
                id="termo-busca"
                type="text"
                value={termoPesquisa}
                onChange={e => setTermoPesquisa(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && pesquisarLeis()}
                placeholder="Ex: locação, imóvel, reajuste, inquilino…"
                className="w-full min-h-[44px] px-3 border border-navy/20 rounded text-sm"
                aria-label="Termo de busca de legislação"
              />
            </div>
            <button
              onClick={pesquisarLeis}
              disabled={buscandoPesquisa || !termoPesquisa.trim()}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 border border-navy text-navy hover:bg-pergaminho text-sm disabled:opacity-50"
            >
              <Search size={16} aria-hidden="true" />
              {buscandoPesquisa ? 'Buscando…' : 'Buscar'}
            </button>
          </div>
          {resultadosPesquisa.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-grafite-claro">{resultadosPesquisa.length} resultado(s)</p>
              {resultadosPesquisa.map(lei => (
                <div key={lei.numero} className="border-l-4 border-dourado pl-3 py-2">
                  <a href={lei.url} target="_blank" rel="noopener noreferrer" className="text-navy font-medium hover:underline flex items-center gap-2">
                    {lei.titulo}
                    <ExternalLink size={14} aria-hidden="true" />
                  </a>
                  <p className="text-xs text-grafite-claro mt-0.5">Lei {lei.numero}</p>
                  {lei.ementas.length > 0 && (
                    <p className="text-sm text-grafite mt-1">{lei.ementas[0]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-radar">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <h3 id="titulo-radar" className="text-lg">Radar dos portais</h3>
              <p className="text-sm text-grafite-claro">
                Conexão permanente: todo dia o servidor consulta a Câmara dos Deputados (projetos de lei dos últimos 120 dias) e as notícias dos tribunais sobre locação, condomínio, incorporação e registro.
                {radar[0] && <> Última captura: {new Date(radar[0].vistoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.</>}
              </p>
            </div>
            <div role="radiogroup" aria-label="Filtro do radar" className="flex gap-1 print:hidden">
              {(['todos', 'Projeto', 'Notícia'] as const).map(f => (
                <button key={f} role="radio" aria-checked={filtroRadar === f} onClick={() => setFiltroRadar(f)}
                  className={`min-h-[36px] px-3 text-xs uppercase tracking-wider border ${filtroRadar === f ? 'bg-navy text-white border-navy' : 'border-navy/20 text-grafite'}`}>
                  {f === 'todos' ? 'Tudo' : f === 'Projeto' ? 'Projetos de lei' : 'Notícias'}
                </button>
              ))}
            </div>
          </div>
          {radar.length === 0 ? (
            <p className="text-sm text-grafite-claro">Nada captado ainda. A primeira varredura roda hoje às 8h30.</p>
          ) : (
            <ul className="divide-y divide-navy/5">
              {radar.filter(n => filtroRadar === 'todos' || n.tipo === filtroRadar).slice(0, 25).map(n => (
                <li key={n.id} className="py-3 flex flex-wrap items-start gap-x-4 gap-y-1">
                  <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 border ${n.tipo === 'Projeto' ? 'border-dourado text-navy' : 'border-navy/20 text-grafite-claro'}`}>{n.tipo}</span>
                  <div className="flex-1 min-w-[240px]">
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="text-sm text-navy font-medium hover:underline inline-flex items-center gap-1">
                      {n.titulo} <ExternalLink size={12} aria-hidden="true" />
                    </a>
                    {n.resumo && <p className="text-sm text-grafite mt-0.5">{n.resumo}</p>}
                    <p className="text-xs text-grafite-claro mt-0.5">{n.fonte}{n.data ? ` · ${formatarData(n.data)}` : ''}{n.termo ? ` · tema: ${n.termo}` : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {erro && <p role="alert" className="bg-criticoFundo border-l-2 border-critico text-critico px-4 py-3 text-sm">{erro}</p>}
        {busca && (
          <p className="text-xs text-grafite-claro" role="status">
            Última consulta: {new Date(busca.consultadoEm).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.{' '}
            {busca.situacao}
          </p>
        )}

        <section className="relative bg-white shadow-sm overflow-x-auto" aria-label="Matriz de legislação">
          <table className="w-full text-sm min-w-[860px]">
            <caption className="sr-only">O que mudou, imóveis afetados e ação sugerida</caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-grafite-claro border-b border-navy/10">
                <th scope="col" className="p-4 w-[30%]">O que mudou</th>
                <th scope="col" className="p-4 w-[24%]">Imóveis afetados</th>
                <th scope="col" className="p-4 w-[28%]">Ação sugerida</th>
                <th scope="col" className="p-4">Acompanhamento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/5 align-top">
              {linhas.map(n => {
                const afetados = imoveisAfetados(n, imoveis)
                const status = acomp[n.id] ?? 'nova'
                return (
                  <tr key={n.id}>
                    <th scope="row" className="p-4 text-left font-normal">
                      <p className="font-medium text-navy">{n.titulo}</p>
                      <p className="text-grafite-claro mt-1">{n.ementa}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        {n.exemplo && <SeloSituacao situacao="atencao" texto="Exemplo" />}
                        {!n.catalogo && !n.exemplo && <SeloSituacao situacao="critico" texto="Novidade" />}
                        {n.publicadaEm && <span className="text-grafite-claro">{formatarData(n.publicadaEm)}</span>}
                        <a
                          href={n.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-navy underline underline-offset-4 min-h-[44px]"
                        >
                          {n.fonte} <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      </p>
                    </th>
                    <td className="p-4">
                      <p className="text-xs text-grafite-claro">{n.alcanceTexto}</p>
                      <p className="mt-2 font-medium">{afetados.length} de {imoveis.length} imóveis</p>
                      {afetados.length > 0 && afetados.length <= 4 && (
                        <ul className="mt-1 text-xs space-y-0.5">
                          {afetados.map(i => (
                            <li key={i.id}>
                              <Link to={`/contrato/${i.id}`} className="text-navy underline underline-offset-2">
                                {i.endereco}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="p-4">{n.acao}</td>
                    <td className="p-4">
                      <SeloSituacao situacao={ESTILO_STATUS[status]} texto={ROTULO_STATUS[status]} />
                      <label className="sr-only" htmlFor={`st-${n.id}`}>Alterar acompanhamento de {n.titulo}</label>
                      <select
                        id={`st-${n.id}`}
                        value={status}
                        onChange={e => mudar(n, e.target.value as StatusAcompanhamento)}
                        className="mt-2 block w-full min-h-[44px] px-2 border border-grafite-claro/40 bg-white print:hidden"
                      >
                        {(Object.keys(ROTULO_STATUS) as StatusAcompanhamento[]).map(s => (
                          <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>
      </div>
    </Layout>
  )
}
