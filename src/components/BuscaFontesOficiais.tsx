import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FunctionRegion } from '@supabase/supabase-js'
import { Landmark, Square, Copy, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import type { Detectado } from '@/lib/pesquisa/pesquisa'
import { POLO, agruparPorProcesso, blocos, numerosParaImportar, type ProcessoEncontrado, type Publicacao } from '@/lib/pesquisa/fontesOficiais'

// Busca direto nas fontes oficiais, sem Escavador: DataJud (andamentos), DJEN (publicações com texto integral),
// Receita (empresa) e Querido Diário (diários municipais). Nome, OAB e empresa percorrem o histórico em blocos de 90 dias.
type Capa = { ok: boolean; erro?: string; encontrado?: boolean; tribunal?: string; classe?: string; orgao?: string; graus?: string[]; sistema?: string; ajuizamento?: string; assuntos?: string[]; sigilo?: number; movimentos?: { data: string; nome: string; grau: string; complemento?: string }[] }
type Receita = { ok: boolean; erro?: string; encontrado?: boolean; nome?: string; fantasia?: string | null; situacao?: string; municipio?: string; uf?: string; atividade?: string; socios?: { nome: string; qualificacao: string }[] }
type Diario = { data: string; municipio: string; trecho: string; link: string }
const dt = (s?: string) => (s ? new Date(s.length === 10 ? `${s}T12:00` : s).toLocaleDateString('pt-BR') : '')

async function chamar(body: object): Promise<any> {
  const { data, error } = await supabase.functions.invoke('fontes-oficiais', { body, region: FunctionRegion.SaEast1 })
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(corpo?.erro ?? mensagemAmigavel(error))
  }
  if (data?.erro) throw new Error(data.erro)
  return data
}

export default function BuscaFontesOficiais({ d }: { d: Detectado }) {
  const [quem, setQuem] = useState<'parte' | 'advogado'>('parte')
  const [meses, setMeses] = useState(12)
  const [diarios, setDiarios] = useState(true)
  const [ocupado, setOcupado] = useState(false)
  const [progresso, setProgresso] = useState('')
  const [erro, setErro] = useState('')
  const [avisos, setAvisos] = useState<string[]>([])
  const [capa, setCapa] = useState<Capa | null>(null)
  const [receita, setReceita] = useState<Receita | null>(null)
  const [processos, setProcessos] = useState<ProcessoEncontrado[] | null>(null)
  const [diariosAchados, setDiariosAchados] = useState<Diario[]>([])
  const [copiado, setCopiado] = useState(false)
  const parar = useRef(false)

  if (d.tipo === 'vazio') return null
  const limpar = () => { setErro(''); setAvisos([]); setCapa(null); setReceita(null); setProcessos(null); setDiariosAchados([]); setProgresso('') }

  /** Percorre os blocos de período chamando a função; junta as publicações e mostra a lista a cada bloco. */
  const varrer = async (tipo: 'nome' | 'advogado' | 'oab', termo: string) => {
    const lista = blocos(meses)
    const todas: Publicacao[] = []
    const av: string[] = []
    for (let k = 0; k < lista.length; k++) {
      if (parar.current) { av.push(`Busca parada pelo usuário no bloco ${k + 1} de ${lista.length}.`); break }
      setProgresso(`Bloco ${k + 1} de ${lista.length}: ${dt(lista[k].inicio)} a ${dt(lista[k].fim)}`)
      try {
        const r = await chamar({ tipo, termo, ...lista[k], diarios: tipo === 'nome' && diarios && k === 0 })
        todas.push(...(r.comunica?.itens ?? []))
        if (r.comunica && !r.comunica.ok) av.push(`${dt(lista[k].inicio)} a ${dt(lista[k].fim)}: ${r.comunica.erro}`)
        if (r.comunica?.incompleto) av.push(`${dt(lista[k].inicio)} a ${dt(lista[k].fim)}: há mais de ${r.comunica.itens.length} publicações; refine o nome para ver todas.`)
        if (r.queridoDiario?.ok) setDiariosAchados(r.queridoDiario.itens ?? [])
      } catch (e) { av.push(`${dt(lista[k].inicio)} a ${dt(lista[k].fim)}: ${e instanceof Error ? e.message : String(e)}`) }
      setProcessos(agruparPorProcesso(todas))
    }
    setAvisos(av)
  }

  const buscar = async () => {
    limpar(); setOcupado(true); parar.current = false
    try {
      if (d.tipo === 'cnj') {
        setProgresso('Consultando o DataJud e o Diário de Justiça Eletrônico Nacional…')
        const r = await chamar({ tipo: 'processo', termo: d.formatado })
        setCapa(r.datajud)
        setProcessos(agruparPorProcesso(r.comunica?.itens ?? []))
        if (r.comunica && !r.comunica.ok) setAvisos([`Publicações: ${r.comunica.erro}`])
      } else if (d.tipo === 'oab') {
        await varrer('oab', d.formatado)
      } else if (d.tipo === 'cnpj') {
        setProgresso('Consultando a Receita Federal…')
        const r = await chamar({ tipo: 'cnpj', termo: d.formatado })
        setReceita(r.receita)
        if (r.receita?.nome) await varrer('nome', r.receita.nome)
      } else if (d.tipo === 'nome') {
        await varrer(quem === 'advogado' ? 'advogado' : 'nome', d.formatado)
      }
    } catch (e) { setErro(e instanceof Error ? e.message : String(e)) }
    setOcupado(false); setProgresso('')
  }
  const copiar = async () => { if (!processos) return; try { await navigator.clipboard.writeText(numerosParaImportar(processos)); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sem área de transferência */ } }

  return (
    <section className="bg-white shadow-sm p-6" aria-label="Busca nas fontes oficiais" data-testid="fontes-oficiais">
      <h2 className="font-serif text-xl flex items-center gap-2"><Landmark className="w-5 h-5 text-dourado" aria-hidden />Buscar direto nas fontes oficiais (sem Escavador)</h2>
      <p className="text-sm text-grafite-claro mt-1">Consulta gratuita na origem: DataJud do CNJ (andamentos de todos os ramos, inclusive STJ, TST, TSE e STM), Diário de Justiça Eletrônico Nacional (publicações com o texto completo, partes e advogados), Receita Federal e diários municipais.</p>
      {d.tipo === 'cpf' ? (
        <p className="mt-3 p-3 text-sm border-l-4 border-atencao bg-atencaoFundo" role="note" data-testid="aviso-cpf">Nenhuma fonte oficial aberta busca processos por CPF (o CNJ não publica o CPF das partes). Digite o nome completo da pessoa para buscar nas publicações.</p>
      ) : (
        <>
          {(d.tipo === 'nome' || d.tipo === 'oab' || d.tipo === 'cnpj') && (
            <div className="flex flex-wrap gap-4 items-end mt-3">
              {d.tipo === 'nome' && (
                <fieldset>
                  <legend className="text-sm font-medium">O nome é de</legend>
                  <label className="mr-3 text-sm"><input type="radio" name="quem" checked={quem === 'parte'} onChange={() => setQuem('parte')} className="mr-1" />parte</label>
                  <label className="text-sm"><input type="radio" name="quem" checked={quem === 'advogado'} onChange={() => setQuem('advogado')} className="mr-1" />advogado</label>
                </fieldset>
              )}
              <div>
                <label htmlFor="periodo-fontes" className="block text-sm font-medium">Histórico</label>
                <select id="periodo-fontes" value={meses} onChange={e => setMeses(Number(e.target.value))} className="border px-3 py-2 min-h-[44px]">
                  <option value={3}>últimos 3 meses</option><option value={12}>último ano</option><option value={24}>últimos 2 anos</option><option value={60}>últimos 5 anos</option>
                </select>
              </div>
              {d.tipo === 'nome' && quem === 'parte' && <label className="text-sm min-h-[44px] inline-flex items-center gap-2"><input type="checkbox" checked={diarios} onChange={e => setDiarios(e.target.checked)} />incluir diários municipais</label>}
            </div>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            <button title="Procura o processo nos sites oficiais dos tribunais; pode levar alguns minutos" type="button" onClick={buscar} disabled={ocupado || !d.valido} className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50" data-testid="buscar-oficiais">{ocupado ? 'Buscando…' : 'Buscar nas fontes oficiais'}</button>
            {ocupado && d.tipo !== 'cnj' && <button title="Para a busca onde está; o que já foi encontrado continua na tela" type="button" onClick={() => { parar.current = true }} className="min-h-[44px] px-4 border text-sm inline-flex items-center gap-2"><Square className="w-4 h-4" aria-hidden />Parar</button>}
          </div>
        </>
      )}
      {progresso && <p className="text-sm mt-2" role="status" data-testid="progresso-oficiais">{progresso}</p>}
      {erro && <p role="alert" className="mt-3 p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{erro}</p>}
      {avisos.length > 0 && <ul className="mt-3 text-sm list-disc pl-5 text-atencao" data-testid="avisos-oficiais">{avisos.map((a, i) => <li key={i}>{a}</li>)}</ul>}

      {receita && (
        <div className="mt-4 text-sm" data-testid="receita">
          <h3 className="font-medium">Receita Federal</h3>
          {!receita.ok ? <p>Fonte fora do ar ({receita.erro}).</p> : !receita.encontrado ? <p>CNPJ não encontrado.</p> : (
            <>
              <p><strong>{receita.nome}</strong>{receita.fantasia ? ` (${receita.fantasia})` : ''} · {receita.situacao} · {receita.municipio}/{receita.uf}</p>
              {receita.atividade && <p>{receita.atividade}</p>}
              {!!receita.socios?.length && <p>Sócios: {receita.socios.map(s => `${s.nome} (${s.qualificacao})`).join('; ')}</p>}
              <p className="text-grafite-claro">As publicações abaixo foram buscadas pela razão social.</p>
            </>
          )}
        </div>
      )}

      {capa && (
        <div className="mt-4 text-sm" data-testid="capa">
          <h3 className="font-medium">Capa e andamentos (DataJud)</h3>
          {!capa.ok ? <p>{capa.erro}</p> : !capa.encontrado ? <p>Processo não encontrado no DataJud: pode ser sigiloso, muito recente ou de tribunal que ainda não enviou os dados ao CNJ.</p> : (
            <>
              <p><strong>{capa.classe}</strong> · {capa.tribunal} · {capa.orgao}{capa.graus?.length ? ` · graus: ${capa.graus.join(', ')}` : ''}</p>
              <p>Ajuizado em {dt(capa.ajuizamento)}{capa.sistema ? ` · sistema ${capa.sistema}` : ''}{capa.assuntos?.length ? ` · assuntos: ${capa.assuntos.join('; ')}` : ''}</p>
              <details className="mt-2" open>
                <summary className="cursor-pointer">{capa.movimentos?.length ?? 0} andamento(s), do mais recente ao mais antigo</summary>
                <ol className="mt-1 max-h-80 overflow-y-auto divide-y divide-navy/10" data-testid="movimentos">
                  {(capa.movimentos ?? []).map((m, i) => <li key={i} className="py-1"><span className="text-grafite-claro">{dt(m.data)}{m.grau ? ` · ${m.grau}` : ''}</span> — {m.nome}{m.complemento ? ` (${m.complemento})` : ''}</li>)}
                </ol>
              </details>
            </>
          )}
        </div>
      )}

      {processos && (
        <div className="mt-4" data-testid="processos-oficiais">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{d.tipo === 'cnj' ? `${processos[0]?.total ?? 0} publicação(ões) no Diário de Justiça Eletrônico Nacional` : `${processos.length} processo(s) encontrado(s) nas publicações`}</h3>
            {d.tipo !== 'cnj' && processos.length > 0 && (
              <span className="flex flex-wrap gap-2">
                <button title="Copia os números encontrados, para colar em outro lugar" type="button" onClick={copiar} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2" data-testid="copiar-numeros"><Copy className="w-4 h-4" aria-hidden />{copiado ? 'Números copiados' : 'Copiar números'}</button>
                <Link to="/processos/importar" className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center">Importar para a carteira</Link>
              </span>
            )}
          </div>
          {processos.length === 0 && !ocupado && <p className="text-sm text-grafite-claro mt-2">Nenhuma publicação encontrada no período. Aumente o histórico ou confira a grafia do nome.</p>}
          <ul className="mt-2 divide-y divide-navy/10 text-sm">
            {processos.map(p => (
              <li key={p.digitos} className="py-2">
                {d.tipo !== 'cnj' && (
                  <>
                    <p><strong>{p.numero}</strong> · {p.tribunal} · {p.classe}{p.orgao ? ` · ${p.orgao}` : ''}</p>
                    <p className="text-grafite-claro">{p.total} publicação(ões), de {dt(p.primeira)} a {dt(p.ultima)}</p>
                    {p.partes.length > 0 && <p>Partes: {p.partes.map(x => `${x.nome}${x.polo && POLO[x.polo] ? ` (${POLO[x.polo]})` : ''}`).join('; ')}</p>}
                    {p.advogados.length > 0 && <p>Advogados: {p.advogados.map(x => `${x.nome}${x.oab ? ` (OAB ${x.oab})` : ''}`).join('; ')}</p>}
                    {p.digitos.length === 20 && <Link to={`/monitoramento?lt=${encodeURIComponent(p.numero)}`} className="inline-flex items-center min-h-[44px] text-navy underline mr-4">Histórico completo de andamentos</Link>}
                  </>
                )}
                <details open={d.tipo === 'cnj'}>
                  <summary className="cursor-pointer min-h-[44px] inline-flex items-center">Publicações com o texto completo ({p.publicacoes.length})</summary>
                  <ol className="space-y-2 mt-1">
                    {p.publicacoes.map(x => (
                      <li key={x.id} className="border-l-2 border-dourado pl-3">
                        <p className="text-grafite-claro">{dt(x.data)} · {x.tipo}{x.documento ? ` · ${x.documento}` : ''} · {x.orgao}</p>
                        <p className="whitespace-pre-line">{x.texto}</p>
                        {x.link && <a href={x.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] text-navy underline">Documento no tribunal <ExternalLink className="w-4 h-4" aria-hidden /><span className="sr-only"> (abre em nova aba)</span></a>}
                      </li>
                    ))}
                  </ol>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}

      {diariosAchados.length > 0 && (
        <div className="mt-4 text-sm" data-testid="diarios-oficiais">
          <h3 className="font-medium">Diários oficiais municipais (Querido Diário)</h3>
          <ul className="divide-y divide-navy/10">{diariosAchados.map((g, i) => <li key={i} className="py-1">{dt(g.data)} · {g.municipio}: {g.trecho} <a href={g.link} target="_blank" rel="noopener noreferrer" className="text-navy underline">abrir<span className="sr-only"> (nova aba)</span></a></li>)}</ul>
        </div>
      )}
    </section>
  )
}
