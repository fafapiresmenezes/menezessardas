import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import PerfilJulgador from '@/components/PerfilJulgador'
import { useImoveis } from '@/hooks/useImoveis'
import { radarPortais, type NovidadePortal } from '@/lib/legislacao'
import { diasAte } from '@/lib/datas'
import { FlaskConical, BarChart3, Leaf, ExternalLink, MessageSquare } from 'lucide-react'

type Aba = 'inovacao' | 'jurimetria' | 'esg'
const ABAS: { valor: Aba; rotulo: string; Icone: typeof FlaskConical }[] = [
  { valor: 'inovacao', rotulo: 'Inovação e sandboxes', Icone: FlaskConical },
  { valor: 'jurimetria', rotulo: 'Jurimetria e predição', Icone: BarChart3 },
  { valor: 'esg', rotulo: 'ESG e compliance', Icone: Leaf },
]

// Programas oficiais de ambiente regulatório experimental (links para as páginas dos próprios reguladores).
const SANDBOXES = [
  { orgao: 'CVM', nome: 'Sandbox regulatório da CVM', base: 'Resolução CVM 29/2021', url: 'https://www.gov.br/cvm/pt-br/assuntos/sandbox', uso: 'Tokenização de imóveis, crowdfunding imobiliário, fundos.' },
  { orgao: 'Banco Central', nome: 'Sandbox regulatório do BC', base: 'Resolução CMN 4.865/2020 e BCB 50/2020', url: 'https://www.bcb.gov.br/estabilidadefinanceira/sandbox', uso: 'Pagamento de aluguel, garantias digitais, crédito imobiliário.' },
  { orgao: 'SUSEP', nome: 'Sandbox da SUSEP', base: 'Resolução CNSP 381/2020', url: 'https://www.gov.br/susep/pt-br', uso: 'Seguro-fiança e seguros sob demanda para locação.' },
  { orgao: 'ANPD', nome: 'Sandbox de IA e proteção de dados', base: 'LGPD, art. 55-J', url: 'https://www.gov.br/anpd/pt-br', uso: 'Análise de crédito de locatários com IA, dados de fiadores.' },
  { orgao: 'Federal', nome: 'Marco Legal das Startups', base: 'Lei Complementar 182/2021, art. 11', url: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp182.htm', uso: 'Base legal de qualquer sandbox; proptechs clientes do escritório.' },
]

function Agente({ agente, texto }: { agente: string; texto: string }) {
  return (
    <Link to={`/assistente?agente=${agente}`} className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm">
      <MessageSquare size={16} aria-hidden="true" /> {texto}
    </Link>
  )
}

function Inovacao() {
  const [radar, setRadar] = useState<NovidadePortal[]>([])
  useEffect(() => { radarPortais().then(setRadar).catch(() => setRadar([])) }, [])
  const filtrados = radar.filter(n => /sandbox|startup|inova|tokeniz|proptech|cripto|ativo virtual|intelig[eê]ncia artificial/i.test(`${n.titulo} ${n.resumo ?? ''}`))
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1">Ambientes regulatórios experimentais (sandboxes)</h2>
        <p className="text-sm text-grafite-claro mb-4">Onde um cliente pode testar um produto imobiliário inovador com regras temporárias. Links para a página oficial de cada regulador.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-2 pr-3">Regulador</th><th className="pr-3">Programa e base legal</th><th>Uso no mercado imobiliário</th></tr></thead>
            <tbody>
              {SANDBOXES.map(s => (
                <tr key={s.nome} className="border-t border-navy/10 align-top">
                  <td className="py-2 pr-3 font-medium text-navy">{s.orgao}</td>
                  <td className="py-2 pr-3"><a href={s.url} target="_blank" rel="noreferrer" className="underline decoration-dourado inline-flex items-center gap-1">{s.nome} <ExternalLink size={12} aria-hidden="true" /></a><span className="block text-xs text-grafite-claro">{s.base}</span></td>
                  <td className="py-2">{s.uso}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4"><Agente agente="inovacao" texto="Perguntar ao agente de Inovação" /></div>
      </section>
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1">Radar de inovação regulatória</h2>
        <p className="text-sm text-grafite-claro mb-3">Itens do radar diário (Câmara e imprensa jurídica) sobre sandboxes, startups, tokenização e IA.</p>
        {filtrados.length ? (
          <ul className="space-y-2">{filtrados.slice(0, 12).map(n => (
            <li key={n.id} className="text-sm"><a href={n.link} target="_blank" rel="noreferrer" className="text-navy underline decoration-dourado">{n.titulo}</a><span className="text-xs text-grafite-claro"> · {n.fonte}{n.data ? ` · ${n.data}` : ''}</span></li>
          ))}</ul>
        ) : <p className="text-sm text-grafite-claro">Nada sobre inovação na captura mais recente. O radar roda todo dia às 8h30; veja tudo em <Link to="/legislacao" className="underline decoration-dourado">Legislação</Link>.</p>}
      </section>
    </div>
  )
}

function Jurimetria() {
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1">Metodologia do Instituto</h2>
        <ul className="list-disc pl-5 text-sm text-grafite space-y-1">
          <li>Só dados públicos e agregados: DataJud (CNJ), Banco Central e imprensa. Nenhum dado pessoal.</li>
          <li>Toda proporção vem com intervalo de confiança de 95% (Wilson) e tamanho da amostra; amostra pequena gera aviso, não previsão.</li>
          <li>Perfil do julgador descreve padrões decisórios do órgão, nunca traços psicológicos.</li>
          <li>Risco de contrato é índice de exposição com fatores declarados, até existir histórico de pagamentos para calibrar.</li>
        </ul>
        <Link to="/previsoes" className="mt-4 inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm"><BarChart3 size={16} aria-hidden="true" /> Abrir Previsões</Link>
      </section>
      <PerfilJulgador />
    </div>
  )
}

function Esg() {
  const { imoveis } = useImoveis()
  const linhas = useMemo(() => imoveis.map(i => {
    const docs = i.documentos ?? []
    const vencidos = docs.filter(d => (diasAte(d.dataVencimento ?? null) ?? 1) < 0).length
    const exige = ['avcb', 'habite_se', 'alvara', 'iptu']
    const faltando = exige.filter(t => !docs.some(d => String(d.tipo).includes(t))).length
    const regulatorio = Math.min(5, 1 + vencidos * 2 + faltando)
    const ambiental = /industrial|galp|posto|terreno/i.test(`${i.tipo} ${i.uso}`) ? 4 : 2
    const lgpd = 2
    return { i, vencidos, faltando, regulatorio, ambiental, lgpd, total: regulatorio + ambiental + lgpd }
  }).sort((a, b) => b.total - a.total), [imoveis])
  const cor = (n: number) => (n >= 4 ? 'bg-criticoFundo text-critico' : n >= 3 ? 'bg-atencaoFundo text-atencao' : 'bg-regularFundo text-regular')
  return (
    <div className="space-y-6">
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1">Matriz ESG e compliance dos imóveis</h2>
        <p className="text-sm text-grafite-claro mb-4">Exposição de 1 (baixa) a 5 (alta). Regulatório: documentos vencidos ou ausentes (AVCB, habite-se, alvará, IPTU). Ambiental: uso com potencial de passivo (Lei 6.938/81). LGPD: dados de locatários e fiadores em contrato.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-2 pr-3">Imóvel</th><th className="pr-2">Regulatório</th><th className="pr-2">Ambiental</th><th className="pr-2">LGPD</th><th>Pendências</th></tr></thead>
            <tbody>
              {linhas.map(l => (
                <tr key={l.i.id} className="border-t border-navy/10">
                  <td className="py-2 pr-3"><Link to={`/imoveis/${l.i.id}`} className="text-navy underline decoration-dourado">{l.i.endereco}</Link></td>
                  {[l.regulatorio, l.ambiental, l.lgpd].map((n, k) => <td key={k} className="pr-2"><span className={`inline-block w-8 text-center py-1 ${cor(n)}`}>{n}</span></td>)}
                  <td className="text-xs text-grafite">{l.vencidos ? `${l.vencidos} vencido(s)` : ''}{l.vencidos && l.faltando ? ' · ' : ''}{l.faltando ? `${l.faltando} ausente(s)` : ''}{!l.vencidos && !l.faltando ? 'Em dia' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4"><Agente agente="compliance" texto="Perguntar ao agente de ESG e compliance" /></div>
      </section>
    </div>
  )
}

export default function InstitutoPage() {
  const [aba, setAba] = useState<Aba>('inovacao')
  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Instituto THEYE</p>
          <h1 className="text-3xl text-navy">Ferramentas do Instituto</h1>
          <p className="text-sm text-grafite-claro mt-1">Inovação regulatória, jurimetria e ESG aplicados à carteira do escritório.</p>
        </header>
        <div role="tablist" aria-label="Temas do Instituto" className="flex flex-wrap gap-2">
          {ABAS.map(({ valor, rotulo, Icone }) => (
            <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => setAba(valor)}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm border ${aba === valor ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy/20'}`}>
              <Icone size={16} aria-hidden="true" /> {rotulo}
            </button>
          ))}
        </div>
        <div role="tabpanel">{aba === 'inovacao' ? <Inovacao /> : aba === 'jurimetria' ? <Jurimetria /> : <Esg />}</div>
      </div>
    </Layout>
  )
}
