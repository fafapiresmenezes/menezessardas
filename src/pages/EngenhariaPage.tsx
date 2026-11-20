// Porta de engenharia do theye.club (plano mestre v4, fase E, prioridade 3), em modo demonstração.
// E1: catálogo de matérias. E2: equivalências com a plataforma jurídica. E4: cálculo com memória. E7: estudos para órgãos públicos.
import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import catalogo from '@/lib/engenharia/catalogo.json'
import { EQUIVALENCIAS, ESTUDOS_ENGENHARIA } from '@/lib/engenharia/plataforma'
import { vigaConcreto, memoriaDeCalculo, AVISO_ENGENHARIA, pilarCompressaoCentrada, lajeUmaDirecao, type DadosViga, type DadosPilar, type DadosLaje } from '@/lib/engenharia/calculo'
import MedicaoDeObra from '@/components/MedicaoDeObra'
import AgentesEngenharia from '@/components/engenharia/AgentesEngenharia'
import EngenhariaInternacional from '@/components/engenharia/EngenhariaInternacional'
import CasaAguas from '@/components/aguas/CasaAguas'

type Aba = 'mundo' | 'calculo' | 'medicao' | 'catalogo' | 'equivalencias' | 'estudos' | 'agentes' | 'aguas'
const ABAS: { id: Aba; nome: string; dica: string }[] = [
  { id: 'calculo', nome: 'Cálculo estrutural', dica: 'Dimensiona uma viga de concreto armado e mostra toda a conta, item por item da norma' },
  { id: 'mundo', nome: 'Mundo: normas, custos e 500 agentes', dica: 'A mesma viga em três normas (Brasil, Europa, EUA) com material e custo; as normas de cada país onde há obra; e os 500 agentes de produção' },
  { id: 'medicao', nome: 'Medição de obra', dica: 'Mede quanto da obra está pronto e quanto se paga no período, com a lista de serviços que o cliente monta do jeito dele' },
  { id: 'catalogo', nome: 'Matérias e consultores', dica: 'Todas as matérias de engenharia e do Instituto, com ementa, normas e escolas de origem' },
  { id: 'estudos', nome: 'Estudos para órgãos públicos', dica: 'Estudos do Instituto em IA, cibersegurança, nuvem e superinteligência aplicadas à engenharia' },
  { id: 'agentes', nome: 'Agentes', dica: 'As fichas dos agentes de engenharia: por especialidade, por posição, produtos, o corpus Atlas e as provas' },
  { id: 'aguas', nome: 'Águas', dica: 'A casa de Águas do Instituto, vista como disciplina de engenharia (a página /aguas continua a existir)' },
]
const ABA_PADRAO: Aba = 'calculo'
function abaValida(x: string | null): Aba { return ABAS.some(a => a.id === x) ? (x as Aba) : ABA_PADRAO }

const CAMPOS: { chave: keyof DadosViga; rotulo: string; unidade: string; dica: string }[] = [
  { chave: 'vao', rotulo: 'Vão', unidade: 'm', dica: 'Distância entre os apoios da viga' },
  { chave: 'g', rotulo: 'Carga permanente (g)', unidade: 'kN/m', dica: 'Peso próprio, alvenaria, revestimento: o que fica sempre' },
  { chave: 'q', rotulo: 'Carga variável (q)', unidade: 'kN/m', dica: 'Uso da edificação (NBR 6120). Entra com ψ0 = 0,5 quando houver outra variável' },
  { chave: 'bw', rotulo: 'Largura (bw)', unidade: 'cm', dica: 'Largura da seção da viga' },
  { chave: 'h', rotulo: 'Altura (h)', unidade: 'cm', dica: 'Altura total da seção da viga' },
  { chave: 'cobrimentoUtil', rotulo: 'h − d', unidade: 'cm', dica: 'Distância da face tracionada ao centro da armadura (cobrimento + estribo + meia barra)' },
  { chave: 'fck', rotulo: 'fck', unidade: 'MPa', dica: 'Resistência característica do concreto (C25 = 25 MPa). Esta versão vale até C50' },
  { chave: 'fyk', rotulo: 'fyk', unidade: 'MPa', dica: 'Resistência do aço (CA-50 = 500 MPa)' },
]

const CAMPOS_PILAR: { chave: keyof DadosPilar; rotulo: string; unidade: string; dica: string }[] = [
  { chave: 'bw', rotulo: 'Menor lado', unidade: 'cm', dica: 'Menor dimensão da seção do pilar' },
  { chave: 'h', rotulo: 'Maior lado', unidade: 'cm', dica: 'Maior dimensão da seção do pilar' },
  { chave: 'fck', rotulo: 'fck', unidade: 'MPa', dica: 'Resistência característica do concreto. Esta versão vale até C50' },
  { chave: 'fyk', rotulo: 'fyk', unidade: 'MPa', dica: 'Resistência do aço (CA-50 = 500 MPa)' },
  { chave: 'nd', rotulo: 'Força normal (Nd)', unidade: 'kN', dica: 'Carga vertical de cálculo, já majorada, sem momento' },
]

const CAMPOS_LAJE: { chave: keyof DadosLaje; rotulo: string; unidade: string; dica: string }[] = [
  { chave: 'vao', rotulo: 'Vão menor', unidade: 'm', dica: 'Direção da armadura principal, laje biapoiada' },
  { chave: 'g', rotulo: 'Carga permanente (g)', unidade: 'kN/m²', dica: 'Peso próprio, revestimento, contrapiso: o que fica sempre' },
  { chave: 'q', rotulo: 'Carga variável (q)', unidade: 'kN/m²', dica: 'Uso da edificação (NBR 6120)' },
  { chave: 'h', rotulo: 'Espessura (h)', unidade: 'cm', dica: 'Espessura total da laje' },
  { chave: 'cobrimentoUtil', rotulo: 'h − d', unidade: 'cm', dica: 'Distância da face tracionada ao centro da armadura' },
  { chave: 'fck', rotulo: 'fck', unidade: 'MPa', dica: 'Resistência característica do concreto. Esta versão vale até C50' },
  { chave: 'fyk', rotulo: 'fyk', unidade: 'MPa', dica: 'Resistência do aço (CA-50 = 500 MPa)' },
]

function baixar(nome: string, texto: string) {
  const url = URL.createObjectURL(new Blob([texto], { type: 'text/plain;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url; a.download = nome; a.click()
  URL.revokeObjectURL(url)
}

function CalculoViga() {
  const [dados, setDados] = useState<DadosViga>({ vao: 6, g: 15, q: 5, bw: 20, h: 50, cobrimentoUtil: 5, fck: 25, fyk: 500 })
  const res = useMemo(() => vigaConcreto(dados), [dados])
  const entrada = Object.fromEntries(CAMPOS.map(c => [c.rotulo, `${dados[c.chave]} ${c.unidade}`]))
  const memoria = memoriaDeCalculo('Viga biapoiada de concreto armado', entrada, res.passos, res.avisos)
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <form className="bg-white p-5 shadow-sm space-y-3" aria-label="Dados da viga" onSubmit={e => e.preventDefault()}>
        <h3 className="text-navy font-medium">Viga biapoiada, carga uniforme</h3>
        {CAMPOS.map(c => (
          <label key={c.chave} className="flex items-center justify-between gap-3 text-sm" title={c.dica}>
            <span>{c.rotulo} <span className="text-grafite-claro">({c.unidade})</span></span>
            <input type="number" step="any" className="w-24 border border-navy/20 px-2 py-1 text-right" value={dados[c.chave]}
              onChange={e => setDados({ ...dados, [c.chave]: Number(e.target.value) || 0 })} data-testid={`campo-${c.chave}`} />
          </label>
        ))}
        <p className="text-xs text-grafite-claro pt-2">{AVISO_ENGENHARIA}</p>
      </form>
      <div className="bg-white p-5 shadow-sm">
        <div className="grid sm:grid-cols-4 gap-3 mb-4" data-testid="resumo-viga">
          {[
            ['Momento de cálculo', `${res.esforcos.valores.mMax.toLocaleString('pt-BR')} kN·m`],
            ['Armadura de flexão', `${res.flexao.valores.asAdotar.toLocaleString('pt-BR')} cm²`],
            ['Estribos', `${res.cortante.valores.aswSAdotar.toLocaleString('pt-BR')} cm²/m`],
            ['x/d', `${res.flexao.valores.xd.toLocaleString('pt-BR')}`],
          ].map(([k, v]) => (
            <div key={k} className="border border-navy/10 p-3"><div className="text-xs text-grafite-claro">{k}</div><div className="text-lg text-navy">{v}</div></div>
          ))}
        </div>
        {res.avisos.length > 0 && (
          <ul className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm space-y-1" role="alert">
            {res.avisos.map(a => <li key={a}>{a}</li>)}
          </ul>
        )}
        <ol className="space-y-3 text-sm" data-testid="memoria-passos">
          {res.passos.map((p, i) => (
            <li key={i} className="border-b border-navy/10 pb-2">
              <div className="font-medium text-navy">{i + 1}. {p.titulo}</div>
              <div className="font-mono text-xs">{p.formula}</div>
              <div className="font-mono text-xs">{p.conta} = <strong>{p.resultado.toLocaleString('pt-BR')} {p.unidade}</strong></div>
              {p.referencia && <div className="text-xs text-grafite-claro">{p.referencia}</div>}
            </li>
          ))}
        </ol>
        <button type="button" className="mt-4 bg-navy text-white px-4 py-2 text-sm" title="Baixa a memória de cálculo completa em texto, com campo para o responsável técnico e a ART"
          onClick={() => baixar('memoria-de-calculo-viga.txt', memoria)}>Baixar memória de cálculo</button>
      </div>
    </div>
  )
}

function CalculoPilar() {
  const [dados, setDados] = useState<DadosPilar>({ bw: 25, h: 25, fck: 25, fyk: 500, nd: 1200 })
  const res = useMemo(() => pilarCompressaoCentrada(dados), [dados])
  const entrada = Object.fromEntries(CAMPOS_PILAR.map(c => [c.rotulo, `${dados[c.chave]} ${c.unidade}`]))
  const memoria = memoriaDeCalculo('Pilar, compressão centrada', entrada, res.passos, res.avisos)
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <form className="bg-white p-5 shadow-sm space-y-3" aria-label="Dados do pilar" onSubmit={e => e.preventDefault()}>
        <h3 className="text-navy font-medium">Pilar curto, carga centrada</h3>
        {CAMPOS_PILAR.map(c => (
          <label key={c.chave} className="flex items-center justify-between gap-3 text-sm" title={c.dica}>
            <span>{c.rotulo} <span className="text-grafite-claro">({c.unidade})</span></span>
            <input type="number" step="any" className="w-24 border border-navy/20 px-2 py-1 text-right" value={dados[c.chave]}
              onChange={e => setDados({ ...dados, [c.chave]: Number(e.target.value) || 0 })} data-testid={`campo-pilar-${c.chave}`} />
          </label>
        ))}
        <p className="text-xs text-grafite-claro pt-2">{AVISO_ENGENHARIA}</p>
      </form>
      <div className="bg-white p-5 shadow-sm">
        <div className="grid sm:grid-cols-3 gap-3 mb-4" data-testid="resumo-pilar">
          {[
            ['Área da seção', `${res.valores.ac.toLocaleString('pt-BR')} cm²`],
            ['Armadura adotada', `${res.valores.asAdotar.toLocaleString('pt-BR')} cm²`],
            ['Taxa adotada', `${res.valores.taxaAdotada.toLocaleString('pt-BR')} %`],
          ].map(([k, v]) => (
            <div key={k} className="border border-navy/10 p-3"><div className="text-xs text-grafite-claro">{k}</div><div className="text-lg text-navy">{v}</div></div>
          ))}
        </div>
        {res.avisos.length > 0 && (
          <ul className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm space-y-1" role="alert">
            {res.avisos.map(a => <li key={a}>{a}</li>)}
          </ul>
        )}
        <ol className="space-y-3 text-sm" data-testid="memoria-passos-pilar">
          {res.passos.map((p, i) => (
            <li key={i} className="border-b border-navy/10 pb-2">
              <div className="font-medium text-navy">{i + 1}. {p.titulo}</div>
              <div className="font-mono text-xs">{p.formula}</div>
              <div className="font-mono text-xs">{p.conta} = <strong>{p.resultado.toLocaleString('pt-BR')} {p.unidade}</strong></div>
              {p.referencia && <div className="text-xs text-grafite-claro">{p.referencia}</div>}
            </li>
          ))}
        </ol>
        <button type="button" className="mt-4 bg-navy text-white px-4 py-2 text-sm" title="Baixa a memória de cálculo completa em texto, com campo para o responsável técnico e a ART"
          onClick={() => baixar('memoria-de-calculo-pilar.txt', memoria)}>Baixar memória de cálculo</button>
      </div>
    </div>
  )
}

function CalculoLaje() {
  const [dados, setDados] = useState<DadosLaje>({ vao: 4, g: 3, q: 2, h: 12, cobrimentoUtil: 2, fck: 25, fyk: 500 })
  const res = useMemo(() => lajeUmaDirecao(dados), [dados])
  const entrada = Object.fromEntries(CAMPOS_LAJE.map(c => [c.rotulo, `${dados[c.chave]} ${c.unidade}`]))
  const memoria = memoriaDeCalculo('Laje maciça armada em uma direção', entrada, res.passos, res.avisos)
  return (
    <div className="grid lg:grid-cols-[320px_1fr] gap-6">
      <form className="bg-white p-5 shadow-sm space-y-3" aria-label="Dados da laje" onSubmit={e => e.preventDefault()}>
        <h3 className="text-navy font-medium">Laje biapoiada, uma direção</h3>
        {CAMPOS_LAJE.map(c => (
          <label key={c.chave} className="flex items-center justify-between gap-3 text-sm" title={c.dica}>
            <span>{c.rotulo} <span className="text-grafite-claro">({c.unidade})</span></span>
            <input type="number" step="any" className="w-24 border border-navy/20 px-2 py-1 text-right" value={dados[c.chave]}
              onChange={e => setDados({ ...dados, [c.chave]: Number(e.target.value) || 0 })} data-testid={`campo-laje-${c.chave}`} />
          </label>
        ))}
        <p className="text-xs text-grafite-claro pt-2">{AVISO_ENGENHARIA}</p>
      </form>
      <div className="bg-white p-5 shadow-sm">
        <div className="grid sm:grid-cols-3 gap-3 mb-4" data-testid="resumo-laje">
          {[
            ['Momento de cálculo (faixa de 1 m)', `${res.esforcos.valores.mMax.toLocaleString('pt-BR')} kN·m`],
            ['Armadura por metro', `${res.flexao.valores.asAdotar.toLocaleString('pt-BR')} cm²/m`],
            ['x/d', `${res.flexao.valores.xd.toLocaleString('pt-BR')}`],
          ].map(([k, v]) => (
            <div key={k} className="border border-navy/10 p-3"><div className="text-xs text-grafite-claro">{k}</div><div className="text-lg text-navy">{v}</div></div>
          ))}
        </div>
        {res.avisos.length > 0 && (
          <ul className="mb-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm space-y-1" role="alert">
            {res.avisos.map(a => <li key={a}>{a}</li>)}
          </ul>
        )}
        <ol className="space-y-3 text-sm" data-testid="memoria-passos-laje">
          {res.passos.map((p, i) => (
            <li key={i} className="border-b border-navy/10 pb-2">
              <div className="font-medium text-navy">{i + 1}. {p.titulo}</div>
              <div className="font-mono text-xs">{p.formula}</div>
              <div className="font-mono text-xs">{p.conta} = <strong>{p.resultado.toLocaleString('pt-BR')} {p.unidade}</strong></div>
              {p.referencia && <div className="text-xs text-grafite-claro">{p.referencia}</div>}
            </li>
          ))}
        </ol>
        <button type="button" className="mt-4 bg-navy text-white px-4 py-2 text-sm" title="Baixa a memória de cálculo completa em texto, com campo para o responsável técnico e a ART"
          onClick={() => baixar('memoria-de-calculo-laje.txt', memoria)}>Baixar memória de cálculo</button>
      </div>
    </div>
  )
}

type SubAbaCalculo = 'viga' | 'pilar' | 'laje'
const SUBABAS_CALCULO: { id: SubAbaCalculo; nome: string; dica: string }[] = [
  { id: 'viga', nome: 'Viga', dica: 'Dimensiona uma viga de concreto armado biapoiada' },
  { id: 'pilar', nome: 'Pilar', dica: 'Dimensiona um pilar curto em compressão centrada' },
  { id: 'laje', nome: 'Laje', dica: 'Dimensiona uma laje maciça armada em uma direção' },
]

function Calculo() {
  const [subaba, setSubaba] = useState<SubAbaCalculo>('viga')
  return (
    <div>
      <div className="flex gap-2 mb-4" role="tablist" aria-label="Tipo de elemento">
        {SUBABAS_CALCULO.map(s => (
          <button key={s.id} type="button" role="tab" aria-selected={subaba === s.id} title={s.dica}
            className={`text-sm px-3 py-1 border ${subaba === s.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`}
            onClick={() => setSubaba(s.id)} data-testid={`subaba-${s.id}`}>{s.nome}</button>
        ))}
      </div>
      {subaba === 'viga' && <CalculoViga />}
      {subaba === 'pilar' && <CalculoPilar />}
      {subaba === 'laje' && <CalculoLaje />}
    </div>
  )
}

function Catalogo() {
  const [ramo, setRamo] = useState('todos')
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const ramos = catalogo.ramos as Record<string, string>
  const lista = catalogo.materias.filter(m =>
    (ramo === 'todos' || m.ramo === ramo) &&
    (!busca || `${m.nome} ${m.ementa.join(' ')} ${m.normas.join(' ')}`.toLowerCase().includes(busca.toLowerCase())))
  return (
    <div className="bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <select className="border border-navy/20 px-2 py-1 text-sm" value={ramo} onChange={e => setRamo(e.target.value)} title="Filtrar por ramo da engenharia" aria-label="Ramo">
          <option value="todos">Todos os ramos ({catalogo.materias.length} matérias)</option>
          {Object.entries(ramos).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <input className="border border-navy/20 px-2 py-1 text-sm flex-1 min-w-[200px]" placeholder="Buscar matéria, assunto ou norma (ex.: NBR 6118)" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar" />
        <span className="text-xs text-grafite-claro" data-testid="total-materias">{lista.length} matérias</span>
      </div>
      <ul className="divide-y divide-navy/10">
        {lista.map(m => (
          <li key={m.id} className="py-2">
            <button type="button" className="text-left w-full" onClick={() => setAberta(aberta === m.id ? null : m.id)} title="Abrir ementa, normas e escolas">
              <span className="text-navy font-medium">{m.nome}</span> <span className="text-xs text-grafite-claro">· {ramos[m.ramo]}</span>
            </button>
            {aberta === m.id && (
              <div className="text-sm mt-2 grid md:grid-cols-3 gap-3">
                <div><div className="text-xs uppercase text-grafite-claro">Ementa</div><ul className="list-disc ml-4">{m.ementa.map(t => <li key={t}>{t}</li>)}</ul></div>
                <div><div className="text-xs uppercase text-grafite-claro">Normas e leis</div><ul className="list-disc ml-4">{m.normas.map(t => <li key={t}>{t}</li>)}</ul></div>
                <div><div className="text-xs uppercase text-grafite-claro">Escolas com matéria equivalente</div><p>{m.escolas.join(', ')}</p>
                  <p className="text-xs text-grafite-claro mt-2">Consultor: responde citando a norma pelo número e mostrando a conta. Liberado depois da avaliação de 20 perguntas por ramo.</p></div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function EngenhariaPage() {
  // A aba vive no endereço (?aba=agentes), para se poder ligar directamente a ela a partir de outros sítios.
  const [params, setParams] = useSearchParams()
  const aba = abaValida(params.get('aba'))
  const setAba = (a: Aba) => setParams(a === ABA_PADRAO ? {} : { aba: a }, { replace: true })
  return (
    <Layout title="Engenharia">
      <section className="bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg text-navy mb-1">THEYE Engenharia <span className="text-xs border border-navy/30 px-2 py-0.5 align-middle">demonstração</span></h2>
        <p className="text-sm text-grafite-claro max-w-3xl">Plataforma de engenharia do Instituto THEYE: projetos e obras, cronograma, memoriais e laudos. Cálculos com a conta inteira à vista e consultores por matéria. {AVISO_ENGENHARIA}</p>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist">
          {ABAS.map(a => (
            <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} title={a.dica}
              className={`text-sm px-3 py-1.5 border ${aba === a.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`}
              onClick={() => setAba(a.id)}>{a.nome}</button>
          ))}
        </div>
      </section>
      {aba === 'calculo' && <Calculo />}
      {aba === 'mundo' && <EngenhariaInternacional />}
      {aba === 'medicao' && <MedicaoDeObra />}
      {aba === 'catalogo' && <Catalogo />}
      {aba === 'equivalencias' && (
        <section className="bg-white p-5 shadow-sm overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="py-2 pr-3">No direito</th><th className="pr-3">Na engenharia</th><th className="pr-3">Tela</th><th>Como funciona</th></tr></thead>
            <tbody>{EQUIVALENCIAS.map(e => (
              <tr key={e.direito} className="border-t border-navy/10 align-top"><td className="py-2 pr-3">{e.direito}</td><td className="pr-3 text-navy font-medium">{e.engenharia}</td><td className="pr-3">{e.tela}</td><td>{e.explicacao}</td></tr>
            ))}</tbody>
          </table>
        </section>
      )}
      {aba === 'agentes' && <AgentesEngenharia />}
      {aba === 'aguas' && (
        <div className="space-y-4" data-testid="engenharia-aguas">
          <p className="text-sm text-grafite-claro bg-white p-4 shadow-sm">Águas é uma frente do Instituto; aqui aparece como disciplina de engenharia. A mesma casa continua a abrir em Águas, no menu.</p>
          <CasaAguas />
        </div>
      )}
      {aba === 'estudos' && (
        <section className="grid md:grid-cols-2 gap-4" data-testid="estudos-engenharia">
          {ESTUDOS_ENGENHARIA.map(e => (
            <article key={e.id} className="bg-white p-5 shadow-sm text-sm space-y-1">
              <div className="text-xs uppercase text-grafite-claro">{e.tema} · {e.semanas} semanas</div>
              <h3 className="text-navy font-medium">{e.nome}</h3>
              <p><strong>Escopo:</strong> {e.escopo}</p>
              <p><strong>Método:</strong> {e.metodo}</p>
              <p><strong>O órgão recebe:</strong> {e.entregavel}</p>
              <p className="text-xs text-grafite-claro">{e.contratacao}</p>
            </article>
          ))}
        </section>
      )}
    </Layout>
  )
}
