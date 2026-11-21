// Aba "Agentes" do quadradinho Engenharia (Plano Atlas-Engenharia v1, 19/11/2026).
// Mostra as 46 fichas (prompt completo) por matriz, o estado do corpus Atlas e as provas.
// Os 12 especialistas já fizeram a 1.ª volta de provas de cálculo fechado; os restantes continuam por provar.
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ONDE_BIBLIOTECA, contarBiblioteca, filtrarBiblioteca, lerBiblioteca, type PecaAtlas } from '@/lib/atlasBiblioteca'
import { AGENTES_ENGENHARIA, ATLAS_RESUMO, CLASSIFICACAO_ATLAS, EMITIDO_AGENTES, RESULTADO_PROVAS, FONTES_ATLAS, MATRIZES, REGRAS_AGENTES, type FichaAgente, type MatrizAgente, RESULTADO_PROVAS_DURAS, RESULTADO_PROVAS_JULGAMENTO, RESULTADO_PROVAS_DESCONFIANCA, RESULTADO_PROVAS_INVARIANTES, RESULTADO_PROVAS_INTERFACES } from '@/data/agentesEngenharia'

// Quanto é que cada agente já tem para estudar, pela classificação do corpus.
const ESTANTE = new Map(CLASSIFICACAO_ATLAS.estantes.map(e => [e.agente, e]))
const NOTA = new Map(RESULTADO_PROVAS.notas.map(n => [n.agente, n]))
const NOTA_DURA = new Map(RESULTADO_PROVAS_DURAS.notas.map(n => [n.agente, n]))
const NOTA_JULG = new Map(RESULTADO_PROVAS_JULGAMENTO.notas.map(n => [n.agente, n]))
const POSTURA = new Map(RESULTADO_PROVAS_DESCONFIANCA.estados.map(e => [e.agente, e]))
const INVARIANTE = new Map(RESULTADO_PROVAS_INVARIANTES.estados.map(e => [e.agente, e]))
const INTERFACE = new Map(RESULTADO_PROVAS_INTERFACES.estados.map(e => [e.agente, e]))

type SubAba = MatrizAgente | 'atlas' | 'biblioteca' | 'provas'

const SUBABAS: { id: SubAba; nome: string; dica: string }[] = [
  ...MATRIZES,
  { id: 'atlas', nome: 'Atlas', dica: 'O corpus: o que já está inventariado e as fontes abertas por ingerir' },
  { id: 'biblioteca', nome: 'Biblioteca', dica: 'As peças escolhidas do corpus, com busca, licença e endereço de origem' },
  { id: 'provas', nome: 'Provas', dica: 'Nota de cada agente na bateria do Instituto; nenhum entra sem passar' },
]

function baixarFicha(a: FichaAgente) {
  const url = URL.createObjectURL(new Blob([`${a.id}\n${a.nome}\n\n${a.prompt}\n`], { type: 'text/plain;charset=utf-8' }))
  const el = document.createElement('a')
  el.href = url; el.download = `${a.id}.txt`; el.click()
  URL.revokeObjectURL(url)
}

function Ficha({ a }: { a: FichaAgente }) {
  const [aberta, setAberta] = useState(false)
  const estante = ESTANTE.get(a.id)
  const nota = NOTA.get(a.id)
  return (
    <article className="bg-white p-4 shadow-sm text-sm space-y-2" data-testid="ficha-agente">
      <div className="text-xs uppercase text-grafite-claro">{a.grupo}{a.nivel ? ` · nível ${a.nivel}` : ''} · <span className="border border-navy/30 px-1" data-testid="estado-agente">{nota ? `nota ${nota.nota.toFixed(1)} no cálculo · ${nota.veredito}` : 'por provar'}</span></div>
      <h3 className="text-navy font-medium">{a.nome}</h3>
      <p>{a.resumo}</p>
      {a.pontos.length > 0 && <ul className="list-disc ml-4 text-grafite">{a.pontos.map(p => <li key={p}>{p}</li>)}</ul>}
      {a.normas.length > 0 && <p className="text-xs text-grafite-claro"><strong>Normas (citadas por número, nunca copiadas):</strong> {a.normas.join('; ')}</p>}
      {a.escolas.length > 0 && <p className="text-xs text-grafite-claro"><strong>Formação de referência:</strong> {a.escolas.join(', ')}</p>}
      <p className="text-xs text-grafite-claro" data-testid="estante-agente">
        <strong>Estante no Atlas:</strong>{' '}
        {estante
          ? `${estante.itens.toLocaleString('pt-PT')} peças separadas para este agente, ${estante.guardaveis.toLocaleString('pt-PT')} com licença que deixa guardar`
          : 'ainda sem peças separadas; estuda pela estante da sua especialidade'}
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" className="text-xs px-3 py-1.5 border border-navy/30 text-navy" aria-expanded={aberta} onClick={() => setAberta(!aberta)} title="Mostra o prompt completo desta ficha, tal como está no plano">
          {aberta ? 'Fechar o prompt' : 'Ver o prompt completo'}
        </button>
        <button type="button" className="text-xs px-3 py-1.5 bg-navy text-white" onClick={() => baixarFicha(a)} title="Baixa a ficha em texto para usar em qualquer motor">Baixar ficha</button>
      </div>
      {aberta && <pre className="whitespace-pre-wrap text-xs bg-areia/40 p-3 border border-navy/10 max-h-96 overflow-auto" data-testid="prompt-agente">{a.prompt}</pre>}
    </article>
  )
}

/** Sub-aba Biblioteca: busca nas peças escolhidas do corpus. O ficheiro só é baixado quando se abre a aba. */
function Biblioteca() {
  const [pecas, setPecas] = useState<PecaAtlas[] | null>(null)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [esp, setEsp] = useState('')
  const [soGuardaveis, setSoGuardaveis] = useState(false)
  const [soLocal, setSoLocal] = useState(false)

  useEffect(() => {
    let vivo = true
    ;(async () => {
      for (const onde of ONDE_BIBLIOTECA) {
        try {
          const r = await fetch(onde)
          if (!r.ok) continue
          const lidas = lerBiblioteca(await r.text())
          if (vivo && lidas.length > 0) { setPecas(lidas); return }
        } catch { /* tenta o próximo */ }
      }
      if (vivo) setErro('Não deu para baixar a biblioteca agora. Tente de novo em alguns minutos.')
    })()
    return () => { vivo = false }
  }, [])

  const filtradas = useMemo(() => pecas ? filtrarBiblioteca(pecas, { busca, especialidade: esp, soGuardaveis, soContextoLocal: soLocal }) : [], [pecas, busca, esp, soGuardaveis, soLocal])
  const contas = useMemo(() => pecas ? contarBiblioteca(pecas) : null, [pecas])
  const especialidades = useMemo(() => {
    const m = new Map<string, string>()
    for (const p of pecas ?? []) m.set(p.especialidade, p.especialidadeNome)
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1], 'pt'))
  }, [pecas])

  return (
    <section className="bg-white p-5 shadow-sm text-sm" data-testid="biblioteca-atlas">
      <p className="mb-3">As peças escolhidas do corpus, as melhores de cada especialidade pela nota de utilidade. Só metadados e o endereço de origem: quem quiser o trabalho inteiro abre na fonte. Normas não entram aqui, citam-se por número.</p>
      {erro && <p className="text-xs text-grafite-claro">{erro}</p>}
      {!pecas && !erro && <p className="text-xs text-grafite-claro">A baixar a biblioteca…</p>}
      {pecas && contas && (
        <>
          <p className="text-xs text-grafite-claro mb-3">{contas.total.toLocaleString('pt-PT')} peças, {contas.guardaveis.toLocaleString('pt-PT')} com licença que deixa guardar, {contas.contextoLocal.toLocaleString('pt-PT')} com contexto africano ou tropical, em {contas.especialidades} especialidades.</p>
          <div className="flex flex-wrap gap-2 items-center mb-3">
            <input className="border border-navy/20 px-2 py-1 flex-1 min-w-[200px]" placeholder="Buscar na biblioteca (ex.: tailings, laterite, flood)" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar na biblioteca" />
            <select className="border border-navy/20 px-2 py-1" value={esp} onChange={e => setEsp(e.target.value)} aria-label="Especialidade">
              <option value="">Todas as especialidades</option>
              {especialidades.map(([id, nome]) => <option key={id} value={id}>{nome}</option>)}
            </select>
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={soGuardaveis} onChange={e => setSoGuardaveis(e.target.checked)} /> só as que podemos guardar</label>
            <label className="text-xs flex items-center gap-1"><input type="checkbox" checked={soLocal} onChange={e => setSoLocal(e.target.checked)} /> só contexto local</label>
          </div>
          <p className="text-xs text-grafite-claro mb-2" data-testid="biblioteca-contagem">{filtradas.length.toLocaleString('pt-PT')} peças encontradas{filtradas.length > 60 ? ', a mostrar as 60 primeiras' : ''}.</p>
          <ul className="space-y-2" data-testid="biblioteca-lista">
            {filtradas.slice(0, 60).map(p => (
              <li key={p.id} className="border-t border-navy/10 pt-2">
                <div className="text-navy">{p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="underline" title="Abre na fonte">{p.titulo}</a> : p.titulo}</div>
                <div className="text-xs text-grafite-claro">{p.especialidadeNome} · {p.tipo}{p.ano ? ` · ${p.ano}` : ''} · {p.fonte} · {p.licenca}{p.guardavel ? ' (podemos guardar)' : ' (só referência)'}{p.contextoLocal ? ' · contexto local' : ''}</div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

export default function AgentesEngenharia() {
  const [sub, setSub] = useState<SubAba>('especialidade')
  const [busca, setBusca] = useState('')
  const lista = useMemo(() => AGENTES_ENGENHARIA.filter(a => a.matriz === sub && (!busca || `${a.nome} ${a.resumo} ${a.grupo}`.toLowerCase().includes(busca.toLowerCase()))), [sub, busca])
  const porMatriz = (m: MatrizAgente) => AGENTES_ENGENHARIA.filter(a => a.matriz === m).length
  return (
    <div className="space-y-4" data-testid="agentes-engenharia">
      <section className="bg-white p-5 shadow-sm text-sm space-y-2">
        <p>
          <strong>{AGENTES_ENGENHARIA.length} fichas de agentes</strong> (plano de {EMITIDO_AGENTES}): {porMatriz('especialidade')} especialistas ao nível de doutoramento, {porMatriz('posicao')} por posição hierárquica, {porMatriz('produto')} produtos e {porMatriz('mestre')} mestres.
          Cada ficha é o prompt completo. Entra em trabalho real só depois de passar na bateria de provas (ver <Link to="/qualidade" className="underline">a régua de qualidade</Link>), e sempre com assinatura de engenheiro habilitado.
        </p>
        <details>
          <summary className="cursor-pointer text-navy" title="As regras que todo agente obedece">As {REGRAS_AGENTES.length} regras invioláveis</summary>
          <ol className="list-decimal ml-5 mt-2 text-grafite space-y-1">{REGRAS_AGENTES.map(r => <li key={r}>{r}</li>)}</ol>
        </details>
      </section>
      <div className="flex flex-wrap gap-2 items-center" role="tablist" aria-label="Agentes">
        {SUBABAS.map(s => (
          <button key={s.id} type="button" role="tab" aria-selected={sub === s.id} title={s.dica}
            className={`text-sm px-3 py-1 border ${sub === s.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`}
            onClick={() => setSub(s.id)} data-testid={`subaba-agentes-${s.id}`}>{s.nome}</button>
        ))}
        {sub !== 'atlas' && sub !== 'provas' && sub !== 'biblioteca' && (
          <input className="border border-navy/20 px-2 py-1 text-sm flex-1 min-w-[200px]" placeholder="Buscar agente (ex.: geotecnia, presidente, medição)" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar agente" />
        )}
      </div>
      {sub !== 'atlas' && sub !== 'provas' && sub !== 'biblioteca' && (
        <section className="grid md:grid-cols-2 gap-4">
          {lista.map(a => <Ficha key={a.id} a={a} />)}
          {lista.length === 0 && <p className="text-sm text-grafite-claro">Nenhum agente com esse nome.</p>}
        </section>
      )}
      {sub === 'atlas' && (
        <section className="bg-white p-5 shadow-sm overflow-x-auto" data-testid="atlas-fontes">
          <p className="text-sm mb-3">O Atlas é o corpus de onde os agentes aprendem: programas de doutoramento de universidades fortes dos seis continentes (Ásia, Europa Oriental e Rússia, Europa Ocidental, América do Norte, América Latina e África), teses, artigos e código abertos, com a licença de cada peça registada tal como vem da fonte. Só se guarda ficheiro completo com licença aberta; normas nunca se guardam, só a referência pelo número.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-testid="atlas-numeros">
            {[
              { n: ATLAS_RESUMO.total, rotulo: 'itens no corpus', nota: `${ATLAS_RESUMO.internos.toLocaleString('pt-PT')} já eram do Instituto` },
              { n: ATLAS_RESUMO.guardaveis, rotulo: 'com licença aberta', nota: `${ATLAS_RESUMO.soReferencia.toLocaleString('pt-PT')} ficam só como referência` },
              { n: ATLAS_RESUMO.universidades, rotulo: 'universidades mapeadas', nota: `${ATLAS_RESUMO.repositoriosOai} com repositório aberto` },
              { n: ATLAS_RESUMO.programasVerificados, rotulo: 'programas de doutoramento confirmados um a um', nota: `de ${ATLAS_RESUMO.programasMapeados.toLocaleString('pt-PT')} mapeados; ${ATLAS_RESUMO.programasComEndereco.toLocaleString('pt-PT')} já com endereço` },
            ].map(c => (
              <div key={c.rotulo} className="border border-navy/15 p-3">
                <div className="text-2xl text-navy">{c.n.toLocaleString('pt-PT')}</div>
                <div className="text-sm">{c.rotulo}</div>
                <div className="text-xs text-grafite-claro">{c.nota}</div>
              </div>
            ))}
          </div>
          <h3 className="text-navy mb-2">De que parte do mundo vem</h3>
          <p className="text-xs text-grafite-claro mb-2">A região vem da universidade ou do editor gravado na própria peça. Onde a fonte não diz de onde é, a peça fica em "não determinada": é a maior parte, e é assim que está, sem inventar origem.</p>
          <table className="w-full text-sm mb-6" data-testid="atlas-por-regiao">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Região</th><th className="pr-3">Peças</th><th>Países com mais peças</th></tr></thead>
            <tbody>{ATLAS_RESUMO.porRegiao.map((r, i) => (
              <tr key={r.nome} className="border-t border-navy/10">
                <td className="py-1.5 pr-3 text-navy">{r.nome}</td>
                <td className="pr-3">{r.n.toLocaleString('pt-PT')}</td>
                <td className="text-xs text-grafite-claro">{i === 0 ? ATLAS_RESUMO.porPais.slice(0, 6).map(x => `${x.nome} (${x.n.toLocaleString('pt-PT')})`).join(', ') : ''}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="text-xs text-grafite-claro mb-4">Medido em {ATLAS_RESUMO.medidoEm}. A colheita continua, por isso estes números só crescem. Licenças mais comuns: {ATLAS_RESUMO.licencas.slice(0, 4).map(l => `${l.nome} (${l.n.toLocaleString('pt-PT')})`).join(', ')}.</p>
          <h3 className="text-navy mb-2">Por especialidade</h3>
          <table className="w-full text-sm mb-6" data-testid="atlas-por-especialidade">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Especialidade</th><th className="pr-3">Itens</th><th className="pr-3">Com licença aberta</th><th className="pr-3">Do Instituto</th><th>Universidades com programa</th></tr></thead>
            <tbody>{ATLAS_RESUMO.porEspecialidade.map(e => (
              <tr key={e.id} className="border-t border-navy/10">
                <td className="py-1.5 pr-3 text-navy">{e.nome}</td>
                <td className="pr-3">{e.itens.toLocaleString('pt-PT')}</td>
                <td className="pr-3">{e.guardaveis.toLocaleString('pt-PT')}</td>
                <td className="pr-3">{e.internos.toLocaleString('pt-PT')}</td>
                <td>{e.universidades}</td>
              </tr>
            ))}</tbody>
          </table>
          <h3 className="text-navy mb-2">O que cada agente tem para estudar</h3>
          <p className="text-xs text-grafite-claro mb-2">Cada peça foi arrumada por regra escrita (tema, tipo, licença e menção a Angola, Namíbia ou contexto tropical), não por palpite. {CLASSIFICACAO_ATLAS.classificados.toLocaleString('pt-PT')} peças arrumadas, {CLASSIFICACAO_ATLAS.comContextoAfricano.toLocaleString('pt-PT')} delas com contexto africano ou tropical. Tipos: {CLASSIFICACAO_ATLAS.tipos.map(t => `${t.nome} (${t.n.toLocaleString('pt-PT')})`).join(', ')}. Numa segunda passagem, {CLASSIFICACAO_ATLAS.passaramPortaDeQualidade.toLocaleString('pt-PT')} peças passaram a porta de qualidade (o próprio título fala da especialidade onde foram postas) e dessas saíram as {CLASSIFICACAO_ATLAS.naBiblioteca.toLocaleString('pt-PT')} da biblioteca que se pesquisa aqui ao lado.</p>
          <table className="w-full text-sm mb-6" data-testid="atlas-classificacao">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Agente</th><th className="pr-3">Peças</th><th>Com licença aberta</th></tr></thead>
            <tbody>{CLASSIFICACAO_ATLAS.estantes.map(e => (
              <tr key={e.agente} className="border-t border-navy/10">
                <td className="py-1.5 pr-3 text-navy">{AGENTES_ENGENHARIA.find(a => a.id === e.agente)?.nome ?? e.agente}</td>
                <td className="pr-3">{e.itens.toLocaleString('pt-PT')}</td>
                <td>{e.guardaveis.toLocaleString('pt-PT')}</td>
              </tr>
            ))}</tbody>
          </table>
          <h3 className="text-navy mb-2">De onde vem</h3>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Fonte</th><th className="pr-3">Tipo</th><th className="pr-3">Acesso</th><th className="pr-3">Estado</th><th>Itens</th></tr></thead>
            <tbody>{FONTES_ATLAS.map(f => (
              <tr key={f.nome} className="border-t border-navy/10 align-top">
                <td className="py-2 pr-3 text-navy font-medium">{f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="underline" title={`Abre ${f.nome}`}>{f.nome}</a> : f.nome}</td>
                <td className="pr-3">{f.tipo}</td><td className="pr-3">{f.acesso}</td>
                <td className="pr-3">{f.estado === 'inventariado' ? 'Inventariado' : 'Por ingerir'}</td>
                <td>{f.itens === null ? '—' : f.itens.toLocaleString('pt-PT')}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>
      )}
      {sub === 'biblioteca' && <Biblioteca />}
      {sub === 'provas' && (
        <section className="bg-white p-5 shadow-sm overflow-x-auto" data-testid="provas-agentes">
          <p className="text-sm mb-3">Bateria do Instituto: 20 questões por especialidade (10 de cálculo, 5 de norma, 5 de prática local), 10 cenários por posição, 5 percursos por produto. Verde entra (nota ≥ 8), amarelo só com supervisão (6 a 8), vermelho não entra. Os gabaritos de julgamento são escritos por engenheiros habilitados e ainda não foram aplicados; a parte de cálculo fechado já foi.</p>
          <div className="border border-navy/15 p-3 mb-4 text-sm">
            <p><strong>1.ª volta aplicada em {RESULTADO_PROVAS.aplicadoEm}:</strong> prova de {RESULTADO_PROVAS.tipo}, {RESULTADO_PROVAS.questoesTotais} questões, {RESULTADO_PROVAS.notas.length} agentes. {RESULTADO_PROVAS.regra}</p>
            <p className="text-xs text-grafite-claro mt-1">{RESULTADO_PROVAS.limite}</p>
          </div>
          <div className="border border-navy/15 p-3 mb-4 text-sm" data-testid="provas-volta2">
            <p><strong>2.ª volta aplicada em {RESULTADO_PROVAS_DURAS.aplicadoEm}:</strong> prova de {RESULTADO_PROVAS_DURAS.tipo}, {RESULTADO_PROVAS_DURAS.questoesTotais} questões, {RESULTADO_PROVAS_DURAS.notas.length} agentes, duas por especialidade.</p>
            <p className="text-xs text-grafite-claro mt-1">{RESULTADO_PROVAS_DURAS.limite}</p>
          </div>
          <div className="border border-navy/15 p-3 mb-4 text-sm" data-testid="provas-volta3">
            <p><strong>3.ª volta aplicada em {RESULTADO_PROVAS_JULGAMENTO.aplicadoEm}:</strong> prova de {RESULTADO_PROVAS_JULGAMENTO.tipo}, {RESULTADO_PROVAS_JULGAMENTO.questoesTotais} questões, {RESULTADO_PROVAS_JULGAMENTO.notas.length} agentes. {RESULTADO_PROVAS_JULGAMENTO.regra}</p>
            <p className="text-xs text-grafite-claro mt-1">{RESULTADO_PROVAS_JULGAMENTO.limite}</p>
          </div>
          <div className="border border-navy/15 p-3 mb-4 text-sm" data-testid="provas-volta4">
            <p><strong>4.ª volta aplicada em {RESULTADO_PROVAS_DESCONFIANCA.aplicadoEm}:</strong> {RESULTADO_PROVAS_DESCONFIANCA.tipo}, {RESULTADO_PROVAS_DESCONFIANCA.questoes} pedidos, um por especialidade. {RESULTADO_PROVAS_DESCONFIANCA.regra}</p>
            <p className="text-xs text-grafite-claro mt-1">{RESULTADO_PROVAS_DESCONFIANCA.limite}</p>
          </div>
          <div className="border border-navy/15 p-3 mb-4 text-sm" data-testid="provas-volta5">
            <p><strong>5.ª volta aplicada em {RESULTADO_PROVAS_INVARIANTES.aplicadoEm}:</strong> {RESULTADO_PROVAS_INVARIANTES.tipo}, {RESULTADO_PROVAS_INVARIANTES.questoes} pedidos, três por especialidade. {RESULTADO_PROVAS_INVARIANTES.regra}</p>
            <p className="text-xs text-grafite-claro mt-1">{RESULTADO_PROVAS_INVARIANTES.limite}</p>
          </div>
          <div className="border border-navy/15 p-3 mb-4 text-sm" data-testid="provas-volta6">
            <p><strong>6.ª volta aplicada em {RESULTADO_PROVAS_INTERFACES.aplicadoEm}:</strong> {RESULTADO_PROVAS_INTERFACES.tipo}, {RESULTADO_PROVAS_INTERFACES.questoes} pedidos, um por especialidade. {RESULTADO_PROVAS_INTERFACES.regra}</p>
            <p className="text-xs text-grafite-claro mt-1">{RESULTADO_PROVAS_INTERFACES.limite}</p>
          </div>
          <table className="w-full text-sm" data-testid="tabela-provas">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Agente</th><th className="pr-3">Matriz</th><th className="pr-3">1.ª volta</th><th className="pr-3">2.ª volta (duras)</th><th className="pr-3">3.ª volta (julgamento)</th><th className="pr-3">4.ª volta (postura)</th><th className="pr-3">5.ª volta (regras)</th><th className="pr-3">6.ª volta (interfaces)</th><th>Última prova</th></tr></thead>
            <tbody>{AGENTES_ENGENHARIA.map(a => {
              const n = NOTA.get(a.id)
              const nd = NOTA_DURA.get(a.id)
              const nj = NOTA_JULG.get(a.id)
              const po = POSTURA.get(a.id)
              const iv = INVARIANTE.get(a.id)
              const it = INTERFACE.get(a.id)
              return (
                <tr key={a.id} className="border-t border-navy/10">
                  <td className="py-1.5 pr-3">{a.nome}</td>
                  <td className="pr-3">{MATRIZES.find(m => m.id === a.matriz)?.nome}</td>
                  <td className="pr-3">{n ? `${n.nota.toFixed(1)} · ${n.certos}/${n.questoes}` : 'por provar'}</td>
                  <td className="pr-3">{nd ? `${nd.nota.toFixed(1)} · ${nd.certos}/${nd.questoes}` : 'por provar'}</td>
                  <td className="pr-3">{nj ? `${nj.nota.toFixed(1)} · ${nj.certos}/${nj.questoes}` : 'por provar'}</td>
                  <td className="pr-3" title={po?.nota}>{po ? po.rotulo : 'por provar'}</td>
                  <td className="pr-3" title={iv?.nota}>{iv ? iv.rotulo : 'por provar'}</td>
                  <td className="pr-3" title={it?.nota}>{it ? it.rotulo : 'por provar'}</td>
                  <td>{it ? RESULTADO_PROVAS_INTERFACES.aplicadoEm : iv ? RESULTADO_PROVAS_INVARIANTES.aplicadoEm : po ? RESULTADO_PROVAS_DESCONFIANCA.aplicadoEm : nj ? RESULTADO_PROVAS_JULGAMENTO.aplicadoEm : (nd ? RESULTADO_PROVAS_DURAS.aplicadoEm : (n ? RESULTADO_PROVAS.aplicadoEm : '—'))}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
