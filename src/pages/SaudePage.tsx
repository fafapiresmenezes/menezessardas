// Porta de saúde do theye.club (fase S, prioridade depois da engenharia), em modo demonstração.
// S1: catálogo (55 especialidades, graduação, escolas). S2: acervo. S3: consultores com prompt pronto e lastreado em corrente SHA-256.
import { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import dados from '@/lib/saude/saude.json'
import { conferirCorrente, type ConsultorSaude, type ResultadoCorrente } from '@/lib/saude/corrente'

type Aba = 'especialidades' | 'graduacao' | 'dados' | 'acervo' | 'corrente'
const ABAS: { id: Aba; nome: string; dica: string }[] = [
  { id: 'especialidades', nome: 'Especialidades e consultores', dica: 'As 55 especialidades médicas do Brasil, com módulos da residência, diretrizes e o prompt pronto de cada consultor' },
  { id: 'graduacao', nome: 'Graduação', dica: 'Matérias da graduação em medicina pelas Diretrizes Curriculares Nacionais, cada uma com um professor-consultor' },
  { id: 'dados', nome: 'Dados e mercado', dica: 'Analistas de dados e de inteligência de mercado em saúde, com as fontes oficiais de cada um' },
  { id: 'acervo', nome: 'Acervo e escolas', dica: 'Estudos de referência, programas de doutorado e as escolas médicas de referência no mundo e no Brasil' },
  { id: 'corrente', nome: 'Conferir o lastro', dica: 'Recalcula aqui no navegador a corrente SHA-256 de todos os prompts e mostra se algum foi alterado' },
]
const AVISO = 'Apoio ao médico e ao gestor de saúde: não substitui consulta nem decisão do médico assistente. Em emergência, ligue 192.'

const consultores = dados.consultores as ConsultorSaude[]

function Prompt({ c }: { c: ConsultorSaude }) {
  const [copiado, setCopiado] = useState(false)
  return (
    <div className="mt-2">
      <pre className="whitespace-pre-wrap text-xs bg-navy/5 p-3 max-h-64 overflow-auto">{c.instrucao}</pre>
      <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-grafite-claro">
        <button type="button" className="border border-navy/30 px-2 py-0.5 text-navy" title="Copia o prompt inteiro para colar no assistente"
          onClick={() => { void navigator.clipboard?.writeText(c.instrucao); setCopiado(true) }}>{copiado ? 'Copiado' : 'Copiar prompt'}</button>
        <span title="Número do elo e código do elo na corrente que lastreia este prompt">Elo {c.elo} · <code>{c.hash_elo.slice(0, 16)}…</code></span>
      </div>
    </div>
  )
}

function Especialidades() {
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const lista = dados.especialidades.filter(e => !busca || `${e.nome} ${e.sociedade} ${e.diretrizes.join(' ')}`.toLowerCase().includes(busca.toLowerCase()))
  return (
    <div className="bg-white p-5 shadow-sm">
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <input className="border border-navy/20 px-2 py-1 text-sm flex-1 min-w-[200px]" placeholder="Buscar especialidade, sociedade ou diretriz (ex.: KDIGO)" value={busca} onChange={e => setBusca(e.target.value)} aria-label="Buscar especialidade" />
        <span className="text-xs text-grafite-claro" data-testid="total-especialidades">{lista.length} especialidades</span>
      </div>
      <ul className="divide-y divide-navy/10">
        {lista.map(e => {
          const mods = dados.modulos.filter(m => m.especialidade === e.id)
          const arts = dados.artigos.filter(a => a.especialidade === e.id)
          const chefe = consultores.find(c => c.id === `saude-${e.id}`)
          return (
            <li key={e.id} className="py-2">
              <button type="button" className="text-left w-full" onClick={() => setAberta(aberta === e.id ? null : e.id)} title="Abrir módulos, diretrizes, estudos e o prompt do consultor">
                <span className="text-navy font-medium">{e.nome}</span> <span className="text-xs text-grafite-claro">· residência de {e.anos_residencia} anos · {mods.length} módulos</span>
              </button>
              {aberta === e.id && (
                <div className="text-sm mt-2 space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div><div className="text-xs uppercase text-grafite-claro">Módulos da residência</div><ul className="list-disc ml-4">{mods.map(m => <li key={m.id} title={m.topicos.join('; ')}>{m.nome}</li>)}</ul></div>
                    <div><div className="text-xs uppercase text-grafite-claro">Diretrizes</div><ul className="list-disc ml-4">{e.diretrizes.map(t => <li key={t}>{t}</li>)}</ul>
                      <p className="text-xs text-grafite-claro mt-2">{e.sociedade} · {e.acesso}</p></div>
                    <div><div className="text-xs uppercase text-grafite-claro">Estudos marcantes</div>
                      {arts.length ? <ul className="list-disc ml-4">{arts.map(a => <li key={a.id}>{a.estudo} <span className="text-grafite-claro">({a.periodico}, {a.ano})</span></li>)}</ul> : <p className="text-grafite-claro">Entram pela busca automática.</p>}</div>
                  </div>
                  {chefe && <div><div className="text-xs uppercase text-grafite-claro">Prompt do consultor-chefe</div><Prompt c={chefe} /></div>}
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ListaConsultores({ tipo, descricao }: { tipo: 'graduacao' | 'dados'; descricao: (id: string) => string }) {
  const [aberta, setAberta] = useState<string | null>(null)
  return (
    <ul className="bg-white p-5 shadow-sm divide-y divide-navy/10">
      {consultores.filter(c => c.tipo === tipo).map(c => (
        <li key={c.id} className="py-2">
          <button type="button" className="text-left w-full" onClick={() => setAberta(aberta === c.id ? null : c.id)} title="Abrir o prompt pronto deste consultor">
            <span className="text-navy font-medium">{c.nome}</span> <span className="text-xs text-grafite-claro">· {descricao(c.id)}</span>
          </button>
          {aberta === c.id && <Prompt c={c} />}
        </li>
      ))}
    </ul>
  )
}

function Acervo() {
  return (
    <div className="grid lg:grid-cols-2 gap-4 text-sm">
      <section className="bg-white p-5 shadow-sm">
        <h3 className="text-navy font-medium mb-2">Estudos de referência ({dados.artigos.length} de {dados.medicao.artigos_de_referencia.meta})</h3>
        <p className="text-xs text-grafite-claro mb-2">Só estudos clássicos, conhecidos pelo nome. O DOI de cada um e o restante até 500 entram pela busca automática no PubMed, que já está escrita por especialidade.</p>
        <ul className="list-disc ml-4 max-h-96 overflow-auto">{dados.artigos.map(a => <li key={a.id}>{a.estudo} <span className="text-grafite-claro">({a.periodico}, {a.ano}; {a.primeiro_autor})</span></li>)}</ul>
      </section>
      <section className="bg-white p-5 shadow-sm">
        <h3 className="text-navy font-medium mb-2">Programas de doutorado para teses ({dados.programas_doutorado.length})</h3>
        <p className="text-xs text-grafite-claro mb-2">A régua brasileira é a nota CAPES (7 é a máxima). A nota de cada programa ainda vai ser conferida na Plataforma Sucupira antes de as teses entrarem.</p>
        <ul className="list-disc ml-4 max-h-96 overflow-auto">{dados.programas_doutorado.map(p => <li key={p.universidade + p.programa}>{p.universidade}: {p.programa} <span className="text-grafite-claro">({p.area_capes})</span></li>)}</ul>
      </section>
      <section className="bg-white p-5 shadow-sm">
        <h3 className="text-navy font-medium mb-2">100 melhores escolas de medicina do mundo (QS 2025)</h3>
        <ol className="max-h-96 overflow-auto">{dados.escolas_mundo.map(e => <li key={e.nome}><span className="text-grafite-claro w-8 inline-block">{e.posicao_qs_2025}</span>{e.nome} <span className="text-grafite-claro">· {e.pais}</span></li>)}</ol>
      </section>
      <section className="bg-white p-5 shadow-sm">
        <h3 className="text-navy font-medium mb-2">50 escolas médicas de referência no Brasil</h3>
        <p className="text-xs text-grafite-claro mb-2">Lista de partida, sem ordem de ranking: conferir no Ranking Universitário Folha e no Enade.</p>
        <ul className="list-disc ml-4 max-h-96 overflow-auto">{dados.escolas_brasil.map(e => <li key={e.nome}>{e.nome} <span className="text-grafite-claro">· {e.uf}</span></li>)}</ul>
      </section>
    </div>
  )
}

function Corrente() {
  const [res, setRes] = useState<ResultadoCorrente | null>(null)
  const [rodando, setRodando] = useState(false)
  return (
    <section className="bg-white p-5 shadow-sm text-sm space-y-3">
      <p>Cada um dos {consultores.length} prompts tem um código (SHA-256) e cada elo carrega o código do anterior. Mudar uma vírgula em qualquer prompt quebra a corrente daquele ponto em diante. O primeiro elo está pendurado no trilho do plano mestre.</p>
      <p className="text-xs text-grafite-claro break-all">Gênese: <code>{dados.genese}</code><br />Último elo: <code>{dados.hash_final}</code></p>
      <button type="button" className="bg-navy text-white px-4 py-2" disabled={rodando} title="Recalcula a corrente inteira aqui no seu navegador, sem servidor"
        onClick={async () => { setRodando(true); setRes(await conferirCorrente(dados.genese, consultores, dados.hash_final)); setRodando(false) }}>
        {rodando ? 'Conferindo…' : 'Conferir a corrente agora'}</button>
      {res && (
        <p role="status" data-testid="resultado-corrente" className={res.ok ? 'text-green-700' : 'text-red-700'}>
          {res.ok ? `Íntegra: ${res.conferidos} elos conferidos, último elo igual ao gravado.` : `Quebrada no elo ${res.quebraEm ?? 'final'}: algum prompt foi alterado depois de lastreado.`}
        </p>
      )}
    </section>
  )
}

export default function SaudePage() {
  const [aba, setAba] = useState<Aba>('especialidades')
  const m = dados.medicao
  const numeros = useMemo(() => [
    ['Especialidades', `${m.especialidades.feito}`],
    ['Módulos de residência', `${m.modulos_de_residencia.feito}`],
    ['Consultores com prompt', `${m.consultores_com_prompt.feito}`],
    ['Estudos de referência', `${m.artigos_de_referencia.feito} de ${m.artigos_de_referencia.meta}`],
  ], [m])
  const skills = Object.fromEntries(dados.skills_dados.map(s => [`saude-${s.id}`, s.fontes.join('; ')]))
  const grad = Object.fromEntries(dados.graduacao.map(g => [`saude-${g.id}`, g.topicos.join('; ')]))
  return (
    <Layout title="Saúde">
      <section className="bg-white p-6 shadow-sm mb-6">
        <h2 className="text-lg text-navy mb-1">THEYE Saúde <span className="text-xs border border-navy/30 px-2 py-0.5 align-middle">demonstração</span></h2>
        <p className="text-sm text-grafite-claro max-w-3xl">Um consultor para cada especialidade médica, módulo da residência, matéria da graduação e fonte de dados de saúde, com o prompt pronto e lastreado numa corrente SHA-256. {AVISO}</p>
        <div className="grid sm:grid-cols-4 gap-3 mt-4" data-testid="numeros-saude">
          {numeros.map(([k, v]) => <div key={k} className="border border-navy/10 p-3"><div className="text-xs text-grafite-claro">{k}</div><div className="text-lg text-navy">{v}</div></div>)}
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist">
          {ABAS.map(a => (
            <button key={a.id} type="button" role="tab" aria-selected={aba === a.id} title={a.dica}
              className={`text-sm px-3 py-1.5 border ${aba === a.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`}
              onClick={() => setAba(a.id)}>{a.nome}</button>
          ))}
        </div>
      </section>
      {aba === 'especialidades' && <Especialidades />}
      {aba === 'graduacao' && <ListaConsultores tipo="graduacao" descricao={id => grad[id] ?? ''} />}
      {aba === 'dados' && <ListaConsultores tipo="dados" descricao={id => skills[id] ?? ''} />}
      {aba === 'acervo' && <Acervo />}
      {aba === 'corrente' && <Corrente />}
    </Layout>
  )
}
