import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import PerfilJulgador from '@/components/PerfilJulgador'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { intervaloWilson, registrarPrevisoes } from '@/lib/predicao'
import { TIPOS_ACAO, tipoAcao, lerContexto, pontosDoCaso } from '@/lib/leituraCaso/contexto'
import { decidir, faixaDecisao, encolher, ajustarTaxaBase, zonaDeAcordo, FATORES_AJUSTE, ESCALA_AJUSTE } from '@/lib/leituraCaso/decisao'
import { REFERENCIAS, ROTULO_TEMA, type TemaRef } from '@/lib/leituraCaso/referencias'
import { confrontar, soUmMenciona } from '@/lib/leituraCaso/contradicoes'
import { ROTEIRO, novaLeitura, lerLeituras, gravarLeituras, type LeituraCaso } from '@/lib/leituraCaso/roteiro'
import { Compass, Scale, MessagesSquare, ClipboardCheck, Plus, Trash2, Copy, ShieldCheck, Info, BookMarked } from 'lucide-react'

// Leitura do caso: contexto, predição com dados públicos, confronto de depoimentos e roteiro de audiência.
// Tudo fica neste aparelho (localStorage); só a consulta de jurimetria vai ao CNJ, e sem dado pessoal.

interface Jurimetria {
  tribunal: string; acao: string; orgao: string | null; processos: number
  resultados: { procedencia: number; parcial: number; improcedencia: number; semMerito: number; acordo: number }
  chanceExito: number | null; taxaAcordo: number | null; taxaSemMerito: number | null
  amostra: number; confianca: 'alta' | 'media' | 'baixa'; fonte: string; aviso?: string
}

type Aba = 'contexto' | 'predicao' | 'depoimentos' | 'audiencia' | 'ciencia'
const ABAS: { id: Aba; rotulo: string; icone: typeof Compass }[] = [
  { id: 'contexto', rotulo: '1. Contexto do caso', icone: Compass },
  { id: 'predicao', rotulo: '2. Predição e decisão', icone: Scale },
  { id: 'depoimentos', rotulo: '3. Confronto de depoimentos', icone: MessagesSquare },
  { id: 'audiencia', rotulo: '4. Roteiro de audiência', icone: ClipboardCheck },
  { id: 'ciencia', rotulo: 'Base científica', icone: BookMarked },
]
const TRIBUNAIS = ['tjrj', 'tjsp', 'tjmg', 'tjes', 'stj', 'trf2']
const ROTULO_DIV = { data: 'Data diferente', hora: 'Horário diferente', valor: 'Valor diferente', quantidade: 'Quantidade diferente', negacao: 'Um afirma, outro nega' }
const moeda = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const campo = 'w-full min-h-[44px] border border-navy/15 px-3 text-sm bg-white focus:outline-none focus:border-dourado'
const rotulo = 'block text-xs uppercase tracking-wider text-grafite-claro mb-1'

function Numero({ id, label, valor, aoMudar, passo = 1 }: { id: string; label: string; valor: number; aoMudar: (n: number) => void; passo?: number }) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{label}</label>
      <input id={id} type="number" step={passo} min={0} value={Number.isFinite(valor) ? valor : 0} onChange={e => aoMudar(parseFloat(e.target.value) || 0)} className={campo} />
    </div>
  )
}

export default function LeituraCasoPage() {
  const [casos, setCasos] = useState<LeituraCaso[]>(() => { const l = lerLeituras(); return l.length ? l : [novaLeitura()] })
  const [atualId, setAtualId] = useState(() => casos[0].id)
  const [aba, setAba] = useState<Aba>('contexto')
  const [juri, setJuri] = useState<Jurimetria | null>(null)
  const [juriTribunal, setJuriTribunal] = useState<Jurimetria | null>(null)
  const [temaRef, setTemaRef] = useState<TemaRef | 'todos'>('todos')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)
  const caso = casos.find(c => c.id === atualId) ?? casos[0]

  useEffect(() => { gravarLeituras(casos) }, [casos])
  useEffect(() => { setJuri(null); setJuriTribunal(null); setErro('') }, [atualId, caso.acao, caso.tribunal, caso.orgao])

  const muda = (parcial: Partial<LeituraCaso>) => setCasos(cs => cs.map(c => c.id === caso.id ? { ...c, ...parcial, atualizadoEm: new Date().toISOString() } : c))
  const novo = () => { const n = novaLeitura(); setCasos(cs => [n, ...cs]); setAtualId(n.id); setAba('contexto') }
  const excluir = () => {
    if (!window.confirm(`Apagar a leitura "${caso.titulo}" deste aparelho? Não dá para desfazer.`)) return
    const resto = casos.filter(c => c.id !== caso.id)
    const lista = resto.length ? resto : [novaLeitura()]
    setCasos(lista); setAtualId(lista[0].id)
  }

  const contexto = useMemo(() => lerContexto(caso.fatos), [caso.fatos])
  const pontos = useMemo(() => pontosDoCaso(caso.acao, caso.fatos), [caso.acao, caso.fatos])
  const divergencias = useMemo(() => confrontar(caso.depoimentos), [caso.depoimentos])
  const isolados = useMemo(() => soUmMenciona(caso.depoimentos), [caso.depoimentos])
  const tipo = tipoAcao(caso.acao)

  const faixa = juri && juri.amostra ? intervaloWilson(juri.resultados.procedencia + juri.resultados.parcial / 2, juri.amostra) : null
  // Taxa base: a da vara, puxada para a do tribunal quando a vara tem poucas sentenças (Efron e Morris).
  const enc = juri?.chanceExito != null && juriTribunal?.chanceExito != null && caso.orgao.trim() ? encolher({ chance: juri.chanceExito, amostra: juri.amostra }, juriTribunal.chanceExito) : null
  const base = enc?.chance ?? juri?.chanceExito ?? null
  const temAjuste = Object.values(caso.ajustes ?? {}).some(v => v !== 0)
  const ajustada = base !== null && temAjuste ? ajustarTaxaBase(base, caso.ajustes, caso.lado === 'autor') : null
  const chance = caso.chanceManual ?? ajustada?.chance ?? base
  const premissas = { lado: caso.lado, valorPedido: caso.valorPedido, chanceAutor: chance ?? 0, custos: caso.custos, sucumbenciaPct: caso.sucumbenciaPct, meses: caso.meses, jurosMesPct: caso.jurosMesPct, proposta: caso.proposta }
  const decisao = chance !== null && caso.valorPedido > 0 ? decidir(premissas) : null
  const sensib = decisao && caso.chanceManual === null && !ajustada && !enc ? faixaDecisao(premissas, faixa) : null
  const zona = decisao && caso.chanceOutroLado !== null ? zonaDeAcordo(premissas, { chanceAutor: caso.chanceOutroLado, custos: caso.custosOutro }) : null

  const consultar = async () => {
    setOcupado(true); setErro('')
    try {
      if (!supabaseConfigurado) {
        const demo: Jurimetria = { tribunal: caso.tribunal.toUpperCase(), acao: tipo.rotulo, orgao: null, processos: 4200, resultados: { procedencia: 610, parcial: 140, improcedencia: 90, semMerito: 380, acordo: 260 }, chanceExito: 81, taxaAcordo: 18, taxaSemMerito: 26, amostra: 840, confianca: 'alta', fonte: 'Exemplo da demonstração' }
        if (caso.orgao.trim()) {
          setJuri({ ...demo, orgao: caso.orgao, processos: 120, resultados: { procedencia: 14, parcial: 2, improcedencia: 4, semMerito: 9, acordo: 6 }, chanceExito: 75, amostra: 20, confianca: 'baixa' })
          setJuriTribunal(demo)
        } else setJuri(demo)
        return
      }
      const { data, error } = await supabase.functions.invoke('jurimetria', { body: { acao: caso.acao, tribunal: caso.tribunal, orgao: caso.orgao } })
      if (error) throw new Error(mensagemAmigavel(error))
      if (data?.erro) throw new Error(data.erro)
      setJuri(data)
      if (caso.orgao.trim()) {
        const t = await supabase.functions.invoke('jurimetria', { body: { acao: caso.acao, tribunal: caso.tribunal, orgao: '' } })
        if (!t.error && !t.data?.erro) setJuriTribunal(t.data)
      }
      registrarPrevisoes([{ tipo: 'jurimetria', referencia: `${data.tribunal}|${data.acao}|${data.orgao ?? ''}`, previsto: { chanceExito: data.chanceExito, resultados: data.resultados, taxaAcordo: data.taxaAcordo }, amostra: data.amostra, fonte: data.fonte }])
    } catch (e) { setErro(mensagemAmigavel(e, 'Não foi possível consultar o CNJ agora.')) } finally { setOcupado(false) }
  }

  const resumo = () => {
    const l: string[] = [`LEITURA DO CASO: ${caso.titulo}`, `${tipo.rotulo}${caso.numero ? ` · Processo ${caso.numero}` : ''}${caso.orgao ? ` · ${caso.orgao}` : ''} (${caso.tribunal.toUpperCase()})`, '']
    if (contexto.linhaDoTempo.length) { l.push('Linha do tempo:'); contexto.linhaDoTempo.forEach(f => l.push(`- ${f.iso.split('-').reverse().join('/')}: ${f.trecho}`)); l.push('') }
    const falta = pontos.filter(p => !p.mencionado)
    if (falta.length) { l.push('Ainda não aparece no relato:'); falta.forEach(p => l.push(`- ${p.texto}${p.base ? ` (${p.base})` : ''}`)); l.push('') }
    if (juri) l.push(`Jurimetria (${juri.fonte}): chance de êxito do autor ${juri.chanceExito ?? '—'}%${faixa ? ` (margem ${faixa.min}% a ${faixa.max}%)` : ''}, ${juri.amostra} sentenças; acordo em ${juri.taxaAcordo ?? '—'}% dos encerrados.`)
    if (decisao) l.push(`Valor esperado de seguir (${caso.lado === 'autor' ? 'autor' : 'réu'}): ${moeda(decisao.valorEsperado)}; acordo equivalente: ${moeda(decisao.acordoEquivalente)}.`)
    if (divergencias.length) { l.push('', 'Divergências entre depoimentos:'); divergencias.forEach(d => l.push(`- ${ROTULO_DIV[d.tipo]}: ${d.pergunta}`)) }
    return l.join('\n')
  }
  const copiar = async () => { try { await navigator.clipboard.writeText(resumo()); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sem área de transferência */ } }

  return (
    <Layout title="Leitura do caso e predição">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[220px]">
              <label htmlFor="lc-caso" className={rotulo}>Caso</label>
              <select id="lc-caso" value={caso.id} onChange={e => setAtualId(e.target.value)} className={campo}>
                {casos.map(c => <option key={c.id} value={c.id}>{c.titulo || 'Sem título'}</option>)}
              </select>
            </div>
            <button type="button" onClick={novo} className="min-h-[44px] px-4 border border-navy text-navy text-sm flex items-center gap-2" data-testid="novo-caso"><Plus size={16} aria-hidden /> Novo caso</button>
            <button type="button" onClick={copiar} className="min-h-[44px] px-4 border border-navy/20 text-navy text-sm flex items-center gap-2" data-testid="copiar-leitura"><Copy size={16} aria-hidden /> {copiado ? 'Leitura copiada' : 'Copiar leitura completa'}</button>
            <button type="button" onClick={excluir} className="min-h-[44px] px-4 border border-critico/40 text-critico text-sm flex items-center gap-2"><Trash2 size={16} aria-hidden /> Apagar</button>
          </div>
          <p className="text-xs text-grafite-claro mt-3 flex items-start gap-2"><ShieldCheck size={14} className="mt-0.5 shrink-0 text-dourado" aria-hidden />
            LGPD: o relato e os depoimentos ficam só neste aparelho. A plataforma não usa câmera, voz, rosto nem nenhum dado biométrico; a predição usa estatística pública e anônima do CNJ.</p>
        </section>

        <nav className="flex flex-wrap gap-2" role="tablist" aria-label="Etapas da leitura">
          {ABAS.map(a => {
            const I = a.icone
            return <button key={a.id} role="tab" aria-selected={aba === a.id} data-testid={`aba-${a.id}`} onClick={() => setAba(a.id)} className={`min-h-[44px] px-4 text-sm flex items-center gap-2 border ${aba === a.id ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy/20'}`}><I size={16} aria-hidden /> {a.rotulo}</button>
          })}
        </nav>

        {aba === 'contexto' && (
          <section className="bg-white shadow-sm p-6 space-y-5" aria-label="Contexto do caso">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="lg:col-span-2"><label htmlFor="lc-titulo" className={rotulo}>Nome do caso</label><input id="lc-titulo" value={caso.titulo} onChange={e => muda({ titulo: e.target.value })} className={campo} /></div>
              <div><label htmlFor="lc-acao" className={rotulo}>Tipo de ação</label>
                <select id="lc-acao" value={caso.acao} onChange={e => muda({ acao: e.target.value })} className={campo}>{TIPOS_ACAO.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}</select></div>
              <div><label htmlFor="lc-numero" className={rotulo}>Número do processo (se houver)</label><input id="lc-numero" value={caso.numero} onChange={e => muda({ numero: e.target.value })} className={campo} placeholder="0000000-00.0000.0.00.0000" /></div>
              <div><label htmlFor="lc-tribunal" className={rotulo}>Tribunal</label>
                <select id="lc-tribunal" value={caso.tribunal} onChange={e => muda({ tribunal: e.target.value })} className={campo}>{TRIBUNAIS.map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}</select></div>
              <div className="lg:col-span-3"><label htmlFor="lc-orgao" className={rotulo}>Vara ou câmara (opcional)</label><input id="lc-orgao" value={caso.orgao} onChange={e => muda({ orgao: e.target.value })} className={campo} placeholder="Ex.: 10ª Vara Cível" /></div>
            </div>
            <div>
              <label htmlFor="lc-fatos" className="block font-medium mb-1">Relato dos fatos</label>
              <p className="text-xs text-grafite-claro mb-2">Escreva ou cole o relato do cliente, a inicial ou a contestação. A plataforma monta a linha do tempo, separa valores e leis citadas e mostra o que ainda não apareceu.</p>
              <textarea id="lc-fatos" value={caso.fatos} onChange={e => muda({ fatos: e.target.value })} rows={8} className="w-full border border-navy/15 p-3 text-sm focus:outline-none focus:border-dourado" />
            </div>
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="font-serif text-lg mb-2">Linha do tempo</h3>
                {contexto.linhaDoTempo.length ? (
                  <ol className="border-l-2 border-dourado pl-4 space-y-2" data-testid="linha-tempo">
                    {contexto.linhaDoTempo.map((f, i) => <li key={i} className="text-sm"><b className="text-navy">{f.iso.split('-').reverse().join('/')}</b> · {f.trecho}</li>)}
                  </ol>
                ) : <p className="text-sm text-grafite-claro">Nenhuma data no relato ainda.</p>}
                {(contexto.valores.length > 0 || contexto.dispositivos.length > 0 || contexto.processos.length > 0) && (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                    {contexto.valores.length > 0 && <div><p className={rotulo}>Valores citados</p><ul data-testid="valores">{contexto.valores.map((v, i) => <li key={i}>{moeda(v.valor)}</li>)}</ul><p className="text-xs text-grafite-claro mt-1">Soma: {moeda(contexto.valores.reduce((s, v) => s + v.valor, 0))}</p></div>}
                    {contexto.dispositivos.length > 0 && <div><p className={rotulo}>Leis e súmulas citadas</p><ul data-testid="dispositivos">{contexto.dispositivos.map(d => <li key={d}><Link className="underline decoration-dourado" to={`/legislacao?q=${encodeURIComponent(d)}`}>{d}</Link></li>)}</ul></div>}
                    {contexto.processos.length > 0 && <div><p className={rotulo}>Processos citados</p><ul>{contexto.processos.map(p => <li key={p}><Link className="underline decoration-dourado" to={`/monitoramento?lt=${encodeURIComponent(p)}`}>{p}</Link></li>)}</ul></div>}
                  </div>
                )}
              </div>
              <div>
                <h3 className="font-serif text-lg mb-2">O que costuma decidir {tipo.valor === 'outra' ? 'a ação' : `“${tipo.rotulo}”`}</h3>
                {pontos.length ? (
                  <ul className="space-y-2" data-testid="pontos">
                    {pontos.map(p => (
                      <li key={p.id} className={`text-sm p-2 border-l-4 ${p.mencionado ? 'border-regular bg-navy/5' : 'border-atencao bg-atencaoFundo'}`} data-testid={`ponto-${p.id}`} data-mencionado={p.mencionado}>
                        <b>{p.mencionado ? 'Aparece no relato' : 'Ainda não aparece'}:</b> {p.texto}{p.base && <span className="text-grafite-claro"> · {p.base}</span>}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-grafite-claro">Escolha um tipo de ação para ver os pontos que costumam decidir o caso.</p>}
                <p className="text-xs text-grafite-claro mt-2">A conferência procura palavras no relato. “Ainda não aparece” quer dizer conferir, não que falte.</p>
              </div>
            </div>
          </section>
        )}

        {aba === 'predicao' && (
          <div className="space-y-6">
            <section className="bg-white shadow-sm p-6" aria-label="Predição com dados públicos">
              <h2 className="font-serif text-xl mb-1">Chance com base em casos parecidos</h2>
              <p className="text-sm text-grafite-claro mb-4">Estatística das sentenças registradas no DataJud (CNJ) para {tipo.rotulo.toLowerCase()} no {caso.tribunal.toUpperCase()}{caso.orgao ? `, ${caso.orgao}` : ''}. É a taxa de quem já passou por isso, não uma previsão do seu processo; os pontos do relato e a prova mudam o quadro.</p>
              {tipo.jurimetria ? (
                <button type="button" onClick={consultar} disabled={ocupado} data-testid="consultar-juri" className="min-h-[44px] px-4 bg-navy text-white text-sm disabled:opacity-60">{ocupado ? 'Consultando o CNJ (até 40 s)…' : 'Consultar o CNJ'}</button>
              ) : <p className="text-sm p-3 bg-atencaoFundo border-l-4 border-atencao">Ainda não há base pública ligada para este tipo de ação. Informe abaixo a chance que você estima, e a conta de decisão funciona igual.</p>}
              {erro && <p role="alert" className="text-sm text-critico mt-3">{erro}</p>}
              {juri && (
                <div className="mt-4 grid gap-4 sm:grid-cols-4" data-testid="resultado-juri">
                  <div><p className={rotulo}>Êxito do autor</p><p className="font-serif text-3xl text-navy">{juri.chanceExito ?? '—'}%</p>{faixa && <p className="text-xs text-grafite-claro">margem de 95%: {faixa.min}% a {faixa.max}%</p>}</div>
                  <div><p className={rotulo}>Sentenças na amostra</p><p className="font-serif text-3xl text-navy">{juri.amostra.toLocaleString('pt-BR')}</p><p className="text-xs text-grafite-claro">{juri.confianca === 'alta' ? 'amostra sólida' : juri.confianca === 'media' ? 'amostra parcial' : 'amostra pequena: use com cautela'}</p></div>
                  <div><p className={rotulo}>Terminam em acordo</p><p className="font-serif text-3xl text-navy">{juri.taxaAcordo ?? '—'}%</p></div>
                  <div><p className={rotulo}>Sem julgar o mérito</p><p className="font-serif text-3xl text-navy">{juri.taxaSemMerito ?? '—'}%</p><p className="text-xs text-grafite-claro">extinção, desistência</p></div>
                  {enc && juriTribunal && <p className="sm:col-span-4 text-sm p-3 bg-pergaminho border-l-2 border-dourado" data-testid="encolhida">Chance da vara ajustada pela do tribunal: <b>{enc.chance}%</b>. A vara tem {juri.amostra} sentenças ({juri.chanceExito}%) e o {juriTribunal.tribunal} tem {juriTribunal.amostra.toLocaleString('pt-BR')} ({juriTribunal.chanceExito}%); com pouca amostra, a vara pesa {enc.pesoOrgao}% e o tribunal o resto (encolhimento de Efron e Morris).</p>}
                  <p className="sm:col-span-4 text-xs text-grafite-claro">Fonte: {juri.fonte}.{juri.aviso ? ` ${juri.aviso}` : ''}</p>
                </div>
              )}
            </section>

            <section className="bg-white shadow-sm p-6" aria-label="Ajustar pelo caso">
              <h2 className="font-serif text-xl mb-1">Ajustar a taxa ao seu caso</h2>
              <p className="text-sm text-grafite-claro mb-4">Método dos superprevisores (Tetlock): parte da taxa de casos parecidos e ajusta aos poucos pelo que este caso tem de diferente. Avalie do ponto de vista de quem representamos; cada degrau muda a chance relativa em 1,5 vez.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                {FATORES_AJUSTE.map(f => (
                  <div key={f.id}>
                    <label htmlFor={`aj-${f.id}`} className={rotulo}>{f.texto}</label>
                    <select id={`aj-${f.id}`} value={caso.ajustes?.[f.id] ?? 0} onChange={e => muda({ ajustes: { ...caso.ajustes, [f.id]: +e.target.value } })} className={campo}>
                      {ESCALA_AJUSTE.map(([v, r]) => <option key={v} value={v}>{r}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-sm mt-3" data-testid="ajustada">
                {base === null ? 'Consulte o CNJ para ter a taxa base.' : ajustada ? <>Taxa base {base}% → <b>{ajustada.chance}%</b> de chance de o autor vencer, ajustada pelo caso.</> : <>Sem ajuste: vale a taxa base de {base}%.</>}
              </p>
            </section>

            <section className="bg-white shadow-sm p-6" aria-label="Acordo ou seguir">
              <h2 className="font-serif text-xl mb-1">Vale o acordo ou seguir com o processo?</h2>
              <p className="text-sm text-grafite-claro mb-4">Valor esperado com as premissas abaixo, em reais de hoje. Cada número é seu e pode ser trocado.</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div><label htmlFor="lc-lado" className={rotulo}>Representamos</label>
                  <select id="lc-lado" value={caso.lado} onChange={e => muda({ lado: e.target.value as 'autor' | 'reu' })} className={campo}><option value="autor">O autor</option><option value="reu">O réu</option></select></div>
                <Numero id="lc-valor" label="Valor em discussão (R$)" valor={caso.valorPedido} aoMudar={n => muda({ valorPedido: n })} passo={100} />
                <div>
                  <label htmlFor="lc-chance" className={rotulo}>Chance de o autor vencer (%)</label>
                  <input id="lc-chance" type="number" min={0} max={100} value={caso.chanceManual ?? ''} placeholder={chance != null ? `${chance}` : 'Informe'} onChange={e => muda({ chanceManual: e.target.value === '' ? null : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })} className={campo} />
                  <p className="text-xs text-grafite-claro mt-1">{caso.chanceManual !== null ? 'Usando a sua estimativa.' : ajustada ? `Usando a taxa ajustada (${ajustada.chance}%).` : base !== null ? `Usando a taxa do CNJ (${base}%).` : 'Consulte o CNJ ou informe.'}</p>
                </div>
                <Numero id="lc-proposta" label="Proposta de acordo (R$)" valor={caso.proposta} aoMudar={n => muda({ proposta: n })} passo={100} />
                <Numero id="lc-custos" label="Custos ainda a gastar (R$)" valor={caso.custos} aoMudar={n => muda({ custos: n })} passo={100} />
                <Numero id="lc-sucumb" label="Sucumbência (%)" valor={caso.sucumbenciaPct} aoMudar={n => muda({ sucumbenciaPct: n })} />
                <Numero id="lc-meses" label="Meses até o fim" valor={caso.meses} aoMudar={n => muda({ meses: n })} />
                <Numero id="lc-juros" label="Custo do dinheiro (% ao mês)" valor={caso.jurosMesPct} aoMudar={n => muda({ jurosMesPct: n })} passo={0.1} />
              </div>
              {decisao ? (
                <div className="mt-5 space-y-3" data-testid="decisao">
                  <p className={`p-3 border-l-4 text-sm ${decisao.recomendacao === 'aceitar' ? 'border-regular bg-navy/5' : decisao.recomendacao === 'recusar' ? 'border-atencao bg-atencaoFundo' : 'border-dourado bg-pergaminho'}`} data-testid="recomendacao">
                    {caso.lado === 'autor'
                      ? <>Seguir com o processo vale, hoje, cerca de <b>{moeda(decisao.valorEsperado)}</b>. Um acordo acima de <b>{moeda(decisao.acordoEquivalente)}</b> é melhor que seguir.</>
                      : <>Seguir com o processo custa, hoje, cerca de <b>{moeda(-decisao.valorEsperado)}</b>. Um acordo abaixo de <b>{moeda(decisao.acordoEquivalente)}</b> é melhor que seguir.</>}
                    {caso.proposta > 0 && <> A proposta de {moeda(caso.proposta)} {decisao.recomendacao === 'aceitar' ? 'compensa' : decisao.recomendacao === 'recusar' ? 'não compensa' : 'fica praticamente empatada'} pelas premissas.</>}
                  </p>
                  {sensib && <p className="text-sm text-grafite" data-testid="sensibilidade">Na margem de erro do CNJ, o acordo equivalente vai de {moeda(Math.min(sensib.pior.acordoEquivalente, sensib.melhor.acordoEquivalente))} a {moeda(Math.max(sensib.pior.acordoEquivalente, sensib.melhor.acordoEquivalente))}.</p>}
                  <details className="text-sm"><summary className="cursor-pointer text-navy">Ver a conta passo a passo</summary><ul className="list-disc pl-5 mt-2 space-y-1">{decisao.passos.map(p => <li key={p}>{p}</li>)}</ul></details>
                  <div className="border-t border-navy/10 pt-3">
                    <p className="font-medium text-sm mb-2">Zona de acordo (Cooter e Rubinfeld): como a outra parte deve enxergar o caso</p>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label htmlFor="lc-chance-outro" className={rotulo}>Chance do autor, na visão da outra parte (%)</label>
                        <input id="lc-chance-outro" type="number" min={0} max={100} value={caso.chanceOutroLado ?? ''} placeholder="Informe" onChange={e => muda({ chanceOutroLado: e.target.value === '' ? null : Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })} className={campo} />
                      </div>
                      <Numero id="lc-custos-outro" label="Custos da outra parte (R$)" valor={caso.custosOutro ?? 0} aoMudar={n => muda({ custosOutro: n })} passo={100} />
                    </div>
                    {zona && (
                      <p className={`mt-3 p-3 text-sm border-l-4 ${zona.existe ? 'border-regular bg-navy/5' : 'border-atencao bg-atencaoFundo'}`} data-testid="zona">
                        {zona.existe
                          ? <>Há espaço para acordo entre <b>{moeda(zona.minimoAutor)}</b> (mínimo que o autor aceita) e <b>{moeda(zona.maximoReu)}</b> (máximo que o réu paga). Ponto médio: {moeda(zona.meio ?? 0)}.</>
                          : <>Sem zona de acordo: o autor só aceitaria {moeda(zona.minimoAutor)} e o réu pagaria no máximo {moeda(zona.maximoReu)}. As visões estão longe; vale mostrar à outra parte a estatística do CNJ antes de negociar (Bebchuk).</>}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-grafite-claro flex gap-2"><Info size={14} className="shrink-0 mt-0.5" aria-hidden /> A conta não pesa risco de não receber (devedor sem bens), custo emocional nem precedente para outros casos. Isso fica com você e o cliente.</p>
                </div>
              ) : <p className="text-sm text-grafite-claro mt-4">Preencha o valor em discussão e tenha uma chance (do CNJ ou sua) para ver a conta.</p>}
            </section>

            <PerfilJulgador />
          </div>
        )}

        {aba === 'depoimentos' && (
          <section className="bg-white shadow-sm p-6 space-y-5" aria-label="Confronto de depoimentos">
            <div>
              <h2 className="font-serif text-xl mb-1">Confronto de depoimentos</h2>
              <p className="text-sm text-grafite-claro">Cole a transcrição de cada depoimento (termo de audiência, ata notarial, mensagens). A plataforma acha o mesmo assunto contado com data, horário, valor ou quantidade diferentes, ou afirmado por um e negado por outro, e sugere a pergunta. Divergência não é mentira: memória falha e detalhes variam. É você quem lê os trechos e decide.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              {caso.depoimentos.map((d, i) => (
                <div key={d.id} className="border border-navy/10 p-3">
                  <div className="flex gap-2 items-end">
                    <div className="flex-1"><label htmlFor={`dep-quem-${d.id}`} className={rotulo}>Depoente {i + 1}</label>
                      <input id={`dep-quem-${d.id}`} value={d.quem} placeholder="Ex.: Autor, Testemunha João" onChange={e => muda({ depoimentos: caso.depoimentos.map(x => x.id === d.id ? { ...x, quem: e.target.value } : x) })} className={campo} /></div>
                    {caso.depoimentos.length > 2 && <button type="button" aria-label={`Remover depoente ${i + 1}`} onClick={() => muda({ depoimentos: caso.depoimentos.filter(x => x.id !== d.id) })} className="min-h-[44px] px-3 border border-navy/20 text-critico"><Trash2 size={16} aria-hidden /></button>}
                  </div>
                  <label htmlFor={`dep-texto-${d.id}`} className="sr-only">Transcrição do depoente {i + 1}</label>
                  <textarea id={`dep-texto-${d.id}`} rows={7} value={d.texto} onChange={e => muda({ depoimentos: caso.depoimentos.map(x => x.id === d.id ? { ...x, texto: e.target.value } : x) })} className="mt-2 w-full border border-navy/15 p-3 text-sm focus:outline-none focus:border-dourado" placeholder="Transcrição do depoimento" />
                </div>
              ))}
            </div>
            <button type="button" onClick={() => muda({ depoimentos: [...caso.depoimentos, { id: `d${Date.now().toString(36)}`, quem: '', texto: '' }] })} className="min-h-[44px] px-4 border border-navy text-navy text-sm flex items-center gap-2"><Plus size={16} aria-hidden /> Mais um depoente</button>

            <div>
              <h3 className="font-serif text-lg mb-2">Divergências encontradas ({divergencias.length})</h3>
              {divergencias.length ? (
                <ul className="space-y-3" data-testid="divergencias">
                  {divergencias.map((d, i) => (
                    <li key={i} className="border-l-4 border-atencao bg-atencaoFundo p-3 text-sm" data-testid={`div-${d.tipo}`}>
                      <p className="font-medium">{ROTULO_DIV[d.tipo]}{d.mesmoDepoente ? ' (mesmo depoente, versão mudou)' : ''}</p>
                      <div className="grid gap-2 sm:grid-cols-2 mt-2">
                        <blockquote className="bg-white p-2 border border-navy/10"><b>{d.a.quem}</b> ({d.a.dado}): “{d.a.trecho}”</blockquote>
                        <blockquote className="bg-white p-2 border border-navy/10"><b>{d.b.quem}</b> ({d.b.dado}): “{d.b.trecho}”</blockquote>
                      </div>
                      <p className="mt-2"><b>Pergunta sugerida:</b> {d.pergunta}</p>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-grafite-claro">Nenhuma divergência objetiva encontrada. Com pelo menos dois depoimentos sobre o mesmo fato, as diferenças aparecem aqui.</p>}
              {divergencias.length > 0 && <p className="text-xs text-grafite-claro mt-2">Divergência relevante em fato essencial permite pedir acareação (CPC, art. 461, II). Ver o roteiro de audiência.</p>}
            </div>
            {isolados.length > 0 && (
              <div>
                <h3 className="font-serif text-lg mb-2">Fatos que só um depoente menciona</h3>
                <ul className="space-y-1 text-sm" data-testid="isolados">{isolados.map((x, i) => <li key={i}><b>{x.quem}:</b> {x.trecho}</li>)}</ul>
                <p className="text-xs text-grafite-claro mt-1">Boas perguntas para os outros depoentes confirmarem ou não.</p>
              </div>
            )}
          </section>
        )}

        {aba === 'audiencia' && (
          <section className="bg-white shadow-sm p-6 space-y-5" aria-label="Roteiro de audiência">
            <div>
              <h2 className="font-serif text-xl mb-1">Roteiro de audiência</h2>
              <p className="text-sm text-grafite-claro">Marque o que aconteceu e anote o trecho. São fatos que o processo reconhece, com a base no CPC. Postura, olhar ou nervosismo não provam nada sozinhos e não entram aqui como conclusão.</p>
            </div>
            {ROTEIRO.map(g => {
              const feitos = g.itens.filter(i => caso.roteiro[i.id]).length
              return (
                <div key={g.id}>
                  <h3 className="font-serif text-lg mb-2">{g.titulo} <span className="text-sm text-grafite-claro">({feitos} de {g.itens.length})</span></h3>
                  <ul className="space-y-2">
                    {g.itens.map(i => (
                      <li key={i.id} className="border border-navy/10 p-3">
                        <label className="flex items-start gap-3 text-sm cursor-pointer">
                          <input type="checkbox" className="mt-1 w-5 h-5" checked={!!caso.roteiro[i.id]} data-testid={`rot-${i.id}`} onChange={() => muda({ roteiro: { ...caso.roteiro, [i.id]: !caso.roteiro[i.id] } })} />
                          <span>{i.texto}{i.base && <span className="text-grafite-claro"> · {i.base}</span>}</span>
                        </label>
                        {caso.roteiro[i.id] && <textarea aria-label={`Anotação: ${i.texto}`} rows={2} value={caso.notas[i.id] ?? ''} onChange={e => muda({ notas: { ...caso.notas, [i.id]: e.target.value } })} placeholder="Trecho, minuto da gravação, folha" className="mt-2 w-full border border-navy/15 p-2 text-sm" />}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
            {divergencias.length > 0 && <p className="text-sm p-3 bg-pergaminho border-l-2 border-dourado">Há {divergencias.length} divergência(s) no confronto de depoimentos. <button type="button" className="underline decoration-dourado" onClick={() => setAba('depoimentos')}>Ver as perguntas sugeridas</button>.</p>}
          </section>
        )}
        {aba === 'ciencia' && (
          <section className="bg-white shadow-sm p-6 space-y-4" aria-label="Base científica">
            <div>
              <h2 className="font-serif text-xl mb-1">Base científica ({REFERENCIAS.length} referências)</h2>
              <p className="text-sm text-grafite-claro">Os artigos, livros, relatórios e normas que sustentam cada ferramenta desta tela, e os que mostram o que não fazer (como ler emoção pelo rosto). Em cada item, onde ele entra na plataforma.</p>
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tema">
              {(['todos', ...Object.keys(ROTULO_TEMA)] as (TemaRef | 'todos')[]).map(t => (
                <button key={t} type="button" aria-pressed={temaRef === t} onClick={() => setTemaRef(t)} data-testid={`tema-${t}`} className={`min-h-[40px] px-3 text-xs border ${temaRef === t ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy'}`}>{t === 'todos' ? 'Todos' : ROTULO_TEMA[t]}</button>
              ))}
            </div>
            <ol className="space-y-3" data-testid="referencias">
              {REFERENCIAS.filter(r => temaRef === 'todos' || r.tema === temaRef).map(r => (
                <li key={r.titulo} className="text-sm border-l-2 border-dourado pl-3">
                  <p><b>{r.autores}</b> ({r.ano}). <i>{r.titulo}</i>. {r.veiculo}. <span className="text-grafite-claro">[{r.tipo} · {ROTULO_TEMA[r.tema]}]</span></p>
                  <p className="text-grafite mt-0.5">{r.uso}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </Layout>
  )
}
