// Aba "Agentes" do quadradinho Engenharia (Plano Atlas-Engenharia v1, 19/11/2026).
// Mostra as 46 fichas (prompt completo) por matriz, o estado do corpus Atlas e as provas.
// Nenhum agente responde ainda: são fichas à espera da bateria de provas (nota "por provar").
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AGENTES_ENGENHARIA, ATLAS_RESUMO, EMITIDO_AGENTES, FONTES_ATLAS, MATRIZES, REGRAS_AGENTES, type FichaAgente, type MatrizAgente } from '@/data/agentesEngenharia'

type SubAba = MatrizAgente | 'atlas' | 'provas'

const SUBABAS: { id: SubAba; nome: string; dica: string }[] = [
  ...MATRIZES,
  { id: 'atlas', nome: 'Atlas', dica: 'O corpus: o que já está inventariado e as fontes abertas por ingerir' },
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
  return (
    <article className="bg-white p-4 shadow-sm text-sm space-y-2" data-testid="ficha-agente">
      <div className="text-xs uppercase text-grafite-claro">{a.grupo}{a.nivel ? ` · nível ${a.nivel}` : ''} · <span className="border border-navy/30 px-1">por provar</span></div>
      <h3 className="text-navy font-medium">{a.nome}</h3>
      <p>{a.resumo}</p>
      {a.pontos.length > 0 && <ul className="list-disc ml-4 text-grafite">{a.pontos.map(p => <li key={p}>{p}</li>)}</ul>}
      {a.normas.length > 0 && <p className="text-xs text-grafite-claro"><strong>Normas (citadas por número, nunca copiadas):</strong> {a.normas.join('; ')}</p>}
      {a.escolas.length > 0 && <p className="text-xs text-grafite-claro"><strong>Formação de referência:</strong> {a.escolas.join(', ')}</p>}
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
          Cada ficha é o prompt completo. Nenhum agente responde ainda: entra só depois de passar na bateria de provas (ver <Link to="/qualidade" className="underline">a régua de qualidade</Link>).
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
        {sub !== 'atlas' && sub !== 'provas' && (
          <input className="border border-navy/20 px-2 py-1 text-sm flex-1 min-w-[200px]" placeholder="Buscar agente (ex.: geotecnia, presidente, medição)" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar agente" />
        )}
      </div>
      {sub !== 'atlas' && sub !== 'provas' && (
        <section className="grid md:grid-cols-2 gap-4">
          {lista.map(a => <Ficha key={a.id} a={a} />)}
          {lista.length === 0 && <p className="text-sm text-grafite-claro">Nenhum agente com esse nome.</p>}
        </section>
      )}
      {sub === 'atlas' && (
        <section className="bg-white p-5 shadow-sm overflow-x-auto" data-testid="atlas-fontes">
          <p className="text-sm mb-3">O Atlas é o corpus de onde os agentes aprendem: programas de doutoramento das melhores universidades, teses e código abertos, com licença registada. Só se guarda ficheiro completo com licença aberta; normas nunca se guardam, só a referência.</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5" data-testid="atlas-numeros">
            {[
              { n: ATLAS_RESUMO.total, rotulo: 'itens no corpus', nota: `${ATLAS_RESUMO.internos.toLocaleString('pt-PT')} já eram do Instituto` },
              { n: ATLAS_RESUMO.guardaveis, rotulo: 'com licença aberta', nota: `${ATLAS_RESUMO.soReferencia.toLocaleString('pt-PT')} ficam só como referência` },
              { n: ATLAS_RESUMO.universidades, rotulo: 'universidades mapeadas', nota: `${ATLAS_RESUMO.repositoriosOai} com repositório aberto` },
              { n: ATLAS_RESUMO.programasVerificados, rotulo: 'programas de doutoramento conferidos', nota: `de ${ATLAS_RESUMO.programasMapeados.toLocaleString('pt-PT')} mapeados` },
            ].map(c => (
              <div key={c.rotulo} className="border border-navy/15 p-3">
                <div className="text-2xl text-navy">{c.n.toLocaleString('pt-PT')}</div>
                <div className="text-sm">{c.rotulo}</div>
                <div className="text-xs text-grafite-claro">{c.nota}</div>
              </div>
            ))}
          </div>
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
      {sub === 'provas' && (
        <section className="bg-white p-5 shadow-sm overflow-x-auto" data-testid="provas-agentes">
          <p className="text-sm mb-3">Bateria do Instituto: 20 questões por especialidade (10 de cálculo, 5 de norma, 5 de prática local), 10 cenários por posição, 5 percursos por produto. Verde entra (nota ≥ 8), amarelo só com supervisão (6 a 8), vermelho não entra. Os gabaritos são escritos por engenheiros habilitados; ainda nenhum foi aplicado.</p>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Agente</th><th className="pr-3">Matriz</th><th className="pr-3">Nota</th><th>Última prova</th></tr></thead>
            <tbody>{AGENTES_ENGENHARIA.map(a => (
              <tr key={a.id} className="border-t border-navy/10"><td className="py-1.5 pr-3">{a.nome}</td><td className="pr-3">{MATRIZES.find(m => m.id === a.matriz)?.nome}</td><td className="pr-3">por provar</td><td>—</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}
    </div>
  )
}
