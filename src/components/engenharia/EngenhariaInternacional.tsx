// Aba "Mundo": a mesma viga em três normas (Brasil, Europa, EUA), quantitativos e CAPEX da peça,
// as normas de cada país onde o grupo tem obra e os 500 agentes de produção. Pedido de M, 20/11/2026.
import { useMemo, useState } from 'react'
import normas from '@/lib/engenharia/normas-paises.json'
import agentes from '@/lib/engenharia/agentes-producao.json'
import { compararNormas, quantitativosViga, capexViga, NORMAS_VIGA, PRECOS_EXEMPLO, CLASSES_AACE, type DadosVigaIntl, type NormaViga, type PrecosUnitarios } from '@/lib/engenharia/normasEstruturais'
import { AVISO_ENGENHARIA } from '@/lib/engenharia/calculo'

type Sub = 'tres-normas' | 'paises' | 'agentes'
const SUBS: { id: Sub; nome: string; dica: string }[] = [
  { id: 'tres-normas', nome: 'Mesma viga em 3 normas', dica: 'Calcula a mesma viga pela norma brasileira, pela europeia e pela americana, e mostra quanto material e quanto custa' },
  { id: 'paises', nome: 'Normas por país', dica: 'Quais normas valem em cada país onde há obra: Brasil, Angola, Namíbia, Egito, Europa, Emirados, EUA' },
  { id: 'agentes', nome: '500 agentes de produção', dica: 'Um agente para cada trabalho de cada disciplina: projeto detalhado, BIM, quantitativos, CAPEX, otimização de obra, indicadores' },
]

const n = (v: number, c = 2) => Number.isFinite(v) ? v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }) : '—'

const CAMPOS: { chave: keyof DadosVigaIntl; rotulo: string; unidade: string; dica: string }[] = [
  { chave: 'vao', rotulo: 'Vão', unidade: 'm', dica: 'Distância entre os apoios' },
  { chave: 'g', rotulo: 'Carga permanente', unidade: 'kN/m', dica: 'O que fica sempre: peso próprio, paredes, revestimento' },
  { chave: 'q', rotulo: 'Carga variável', unidade: 'kN/m', dica: 'O uso: pessoas, móveis, equipamentos' },
  { chave: 'bw', rotulo: 'Largura', unidade: 'cm', dica: 'Largura da viga' },
  { chave: 'h', rotulo: 'Altura', unidade: 'cm', dica: 'Altura total da viga' },
  { chave: 'cobrimentoUtil', rotulo: 'h − d', unidade: 'cm', dica: 'Da face de baixo até o centro das barras' },
  { chave: 'fck', rotulo: 'Concreto (fck)', unidade: 'MPa', dica: 'Resistência do concreto. No padrão americano é o f\'c de cilindro' },
  { chave: 'fyk', rotulo: 'Aço (fyk)', unidade: 'MPa', dica: 'Resistência do aço: CA-50 = 500; padrão americano Grade 60 = 420' },
]

function TresNormas() {
  const [d, setD] = useState<DadosVigaIntl>({ vao: 6, g: 15, q: 5, bw: 20, h: 50, cobrimentoUtil: 5, fck: 25, fyk: 500 })
  const [p, setP] = useState<PrecosUnitarios>(PRECOS_EXEMPLO)
  const [classe, setClasse] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [aberta, setAberta] = useState<NormaViga>('EC2')
  const res = useMemo(() => compararNormas(d), [d])
  const custos = res.map(r => { const q = quantitativosViga(d, r); return { q, c: capexViga(q, p, classe) } })
  const sel = res.find(r => r.norma === aberta)!
  return (
    <div className="space-y-4">
      <form className="bg-white p-5 shadow-sm grid sm:grid-cols-4 gap-3" aria-label="Dados da viga" onSubmit={e => e.preventDefault()}>
        {CAMPOS.map(c => (
          <label key={c.chave} className="text-sm flex flex-col" title={c.dica}>
            <span>{c.rotulo} <span className="text-grafite-claro">({c.unidade})</span></span>
            <input type="number" step="any" className="border border-navy/20 px-2 py-1" value={d[c.chave]} onChange={e => setD({ ...d, [c.chave]: Number(e.target.value) || 0 })} data-testid={`intl-${c.chave}`} />
          </label>
        ))}
      </form>
      <div className="bg-white p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-sm" data-testid="tabela-tres-normas">
          <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Resultado</th>{NORMAS_VIGA.map(x => <th key={x.id} className="pr-3" title={x.dica}>{x.nome}<div className="normal-case font-normal">{x.paises}</div></th>)}</tr></thead>
          <tbody>
            {([
              ['Momento de cálculo (kN·m)', (i: number) => n(res[i].md)],
              ['Cortante de cálculo (kN)', (i: number) => n(res[i].vd)],
              ['Armadura de flexão adotada (cm²)', (i: number) => n(res[i].asAdotar)],
              ['Estribos adotados (cm²/m)', (i: number) => n(res[i].aswSAdotar)],
              ['Concreto (m³)', (i: number) => n(custos[i].q.concretoM3, 3)],
              ['Aço total (kg)', (i: number) => n(custos[i].q.acoTotalKg, 1)],
              ['Taxa de aço (kg/m³)', (i: number) => n(custos[i].q.taxaAcoKgM3, 1)],
              [`CAPEX da peça (${p.moeda})`, (i: number) => `${n(custos[i].c.base)} (${n(custos[i].c.baixo, 0)} a ${n(custos[i].c.alto, 0)})`],
            ] as [string, (i: number) => string][]).map(([rot, fn]) => (
              <tr key={rot} className="border-t border-navy/10"><td className="py-2 pr-3">{rot}</td>{res.map((_, i) => <td key={i} className="pr-3 font-mono">{fn(i)}</td>)}</tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-grafite-claro mt-2">As normas dão números diferentes porque usam fatores de carga e de material diferentes. O projeto segue a norma do país da obra e do contrato.</p>
      </div>
      <div className="grid lg:grid-cols-[320px_1fr] gap-4">
        <div className="bg-white p-5 shadow-sm text-sm space-y-2">
          <h3 className="text-navy font-medium">Preços e classe da estimativa</h3>
          <p className="text-xs text-grafite-claro">Preços de exemplo. Troque pelos da sua base de custos, na moeda do país.</p>
          {([['moeda', 'Moeda'], ['concretoM3', 'Concreto por m³'], ['acoKg', 'Aço por kg'], ['formaM2', 'Fôrma por m²'], ['indiretosPct', 'Indiretos e margem (%)']] as [keyof PrecosUnitarios, string][]).map(([k, rot]) => (
            <label key={k} className="flex justify-between gap-2 items-center">{rot}
              <input className="w-24 border border-navy/20 px-2 py-1 text-right" value={p[k]} onChange={e => setP({ ...p, [k]: k === 'moeda' ? e.target.value : Number(e.target.value) || 0 })} />
            </label>
          ))}
          <label className="flex justify-between gap-2 items-center" title="Quanto o projeto já está definido. Quanto menos definido, mais larga a faixa do custo">Classe da estimativa
            <select className="border border-navy/20 px-2 py-1" value={classe} onChange={e => setClasse(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}>
              {([5, 4, 3, 2, 1] as const).map(c => <option key={c} value={c}>Classe {c}: {CLASSES_AACE[c].definicao}</option>)}
            </select>
          </label>
          <p className="text-xs text-grafite-claro">{AVISO_ENGENHARIA}</p>
        </div>
        <div className="bg-white p-5 shadow-sm">
          <div className="flex gap-2 mb-3" role="tablist">{NORMAS_VIGA.map(x => (
            <button key={x.id} type="button" role="tab" aria-selected={aberta === x.id} onClick={() => setAberta(x.id)} title="Ver a conta inteira desta norma"
              className={`text-xs px-2 py-1 border ${aberta === x.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`}>{x.nome}</button>
          ))}</div>
          {sel.avisos.length > 0 && <ul className="mb-3 border-l-4 border-red-600 bg-red-50 p-3 text-sm" role="alert">{sel.avisos.map(a => <li key={a}>{a}</li>)}</ul>}
          <ol className="space-y-2 text-sm" data-testid="memoria-norma">
            {sel.passos.map((s, i) => (
              <li key={i} className="border-b border-navy/10 pb-2">
                <div className="font-medium text-navy">{i + 1}. {s.titulo}</div>
                <div className="font-mono text-xs">{s.formula}</div>
                <div className="font-mono text-xs">{s.conta} = <strong>{n(s.resultado, s.unidade === '' ? 4 : 2)} {s.unidade}</strong></div>
                {s.referencia && <div className="text-xs text-grafite-claro">{s.referencia}</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

type NormaPais = { codigo: string; titulo: string; conferir: boolean }
const PAISES = normas.paises as Record<string, string>
const NOTAS = normas.notas as Record<string, string>
const CATS = normas.categorias as Record<string, { nome: string; normas: Record<string, NormaPais[]> }>

function PorPais() {
  const [pais, setPais] = useState('AO')
  const [comparar, setComparar] = useState('BR')
  return (
    <div className="bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-3 items-center mb-3 text-sm">
        <label title="País da obra">País da obra <select className="border border-navy/20 px-2 py-1 ml-1" value={pais} onChange={e => setPais(e.target.value)} aria-label="País da obra">{Object.entries(PAISES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label title="Outro país para comparar lado a lado">Comparar com <select className="border border-navy/20 px-2 py-1 ml-1" value={comparar} onChange={e => setComparar(e.target.value)} aria-label="Comparar com">{Object.entries(PAISES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
      </div>
      {NOTAS[pais] && <p className="text-sm text-grafite-claro mb-3 max-w-3xl">{NOTAS[pais]}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm" data-testid="tabela-normas-pais">
          <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">Assunto</th><th className="pr-3">{PAISES[pais]}</th><th>{PAISES[comparar]}</th></tr></thead>
          <tbody>{Object.entries(CATS).map(([k, c]) => (
            <tr key={k} className="border-t border-navy/10 align-top">
              <td className="py-2 pr-3 text-navy">{c.nome}</td>
              {[pais, comparar].map(p => (
                <td key={p} className="py-2 pr-3"><ul>{(c.normas[p] ?? []).map(x => (
                  <li key={x.codigo} title={x.conferir ? 'Referência usual; confirmar a edição em vigor e a adoção oficial antes de usar em projeto assinado' : x.titulo}>
                    <strong>{x.codigo}</strong> — {x.titulo}{x.conferir && <span className="ml-1 text-xs border border-amber-600 text-amber-700 px-1">conferir</span>}
                  </li>
                ))}{(c.normas[p] ?? []).length === 0 && <li className="text-grafite-claro">sem referência própria; usar a internacional</li>}</ul></td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
      <p className="text-xs text-grafite-claro mt-3">Só o número e o nome de cada norma; o texto das normas é protegido e não é copiado. "Conferir" quer dizer que a referência é a usual de mercado, mas a edição em vigor precisa ser confirmada.</p>
    </div>
  )
}

function QuinhentosAgentes() {
  const [disc, setDisc] = useState('todas')
  const [func, setFunc] = useState('todas')
  const nomeD = Object.fromEntries(agentes.disciplinas.map(x => [x.id, x.nome]))
  const nomeF = Object.fromEntries(agentes.funcoes.map(x => [x.id, x.nome]))
  const lista = agentes.agentes.filter(a => (disc === 'todas' || a.disciplina === disc) && (func === 'todas' || a.funcao === func))
  return (
    <div className="bg-white p-5 shadow-sm">
      <p className="text-sm text-grafite-claro mb-3 max-w-3xl">{agentes.disciplinas.length} disciplinas × {agentes.funcoes.length} trabalhos = {agentes.agentes.length} agentes. Cada um sabe o que pedir de entrada, o passo a passo, o que entregar (pranchas, modelo BIM, planilhas), o que conferir e quais indicadores acompanhar, com as normas de cada país. Ainda não foram provados: as provas feitas até aqui valem para os 12 especialistas.</p>
      <div className="flex flex-wrap gap-3 mb-3 text-sm">
        <select className="border border-navy/20 px-2 py-1" value={disc} onChange={e => setDisc(e.target.value)} aria-label="Disciplina" title="Filtrar por disciplina"><option value="todas">Todas as disciplinas</option>{agentes.disciplinas.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
        <select className="border border-navy/20 px-2 py-1" value={func} onChange={e => setFunc(e.target.value)} aria-label="Trabalho" title="Filtrar pelo trabalho que o agente faz"><option value="todas">Todos os trabalhos</option>{agentes.funcoes.map(x => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
        <span className="text-xs text-grafite-claro self-center" data-testid="total-agentes-500">{lista.length} agentes</span>
      </div>
      <ul className="divide-y divide-navy/10 text-sm">
        {lista.slice(0, 100).map(a => (
          <li key={a.id} className="py-2">
            <div><span className="font-mono text-xs text-grafite-claro mr-2">{a.id}</span><span className="text-navy font-medium">{nomeF[a.funcao]}</span> · {nomeD[a.disciplina]}</div>
            <div className="text-xs text-grafite-claro">Entrega: {a.saidas.join('; ')}. Indicadores: {a.indicadores.join('; ')}.</div>
          </li>
        ))}
      </ul>
      {lista.length > 100 && <p className="text-xs text-grafite-claro mt-2">Mostrando 100 de {lista.length}. Use os filtros para achar o agente.</p>}
    </div>
  )
}

export default function EngenhariaInternacional() {
  const [sub, setSub] = useState<Sub>('tres-normas')
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {SUBS.map(s => (
          <button key={s.id} type="button" role="tab" aria-selected={sub === s.id} title={s.dica} onClick={() => setSub(s.id)}
            className={`text-sm px-3 py-1 border ${sub === s.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`}>{s.nome}</button>
        ))}
      </div>
      {sub === 'tres-normas' && <TresNormas />}
      {sub === 'paises' && <PorPais />}
      {sub === 'agentes' && <QuinhentosAgentes />}
    </div>
  )
}
