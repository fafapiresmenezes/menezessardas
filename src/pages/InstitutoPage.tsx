import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import PerfilJulgador from '@/components/PerfilJulgador'
import { useImoveis } from '@/hooks/useImoveis'
import { radarPortais, type NovidadePortal } from '@/lib/legislacao'
import { diasAte } from '@/lib/datas'
import { FlaskConical, BarChart3, Leaf, ExternalLink, MessageSquare, BookOpen, Scale } from 'lucide-react'
import { MEDICOES, PLANO_M31, DECK_URL } from '@/data/medicoes'
import PesquisaDireito from '@/components/PesquisaDireito'
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'

type Aba = 'inovacao' | 'jurimetria' | 'esg' | 'case' | 'pesquisa'
const ABAS: { valor: Aba; rotulo: string; Icone: typeof FlaskConical }[] = [
  { valor: 'inovacao', rotulo: 'Inovação e sandboxes', Icone: FlaskConical },
  { valor: 'jurimetria', rotulo: 'Jurimetria e predição', Icone: BarChart3 },
  { valor: 'esg', rotulo: 'ESG e compliance', Icone: Leaf },
  { valor: 'pesquisa', rotulo: 'Pesquisa e desenvolvimento do direito', Icone: Scale },
  { valor: 'case', rotulo: 'Case study desta plataforma', Icone: BookOpen },
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


// Case study do Instituto THEYE: a própria plataforma como estudo de caso, com a trajetória das medições
// e os hashes dos PDFs (cadeia verificável; .ots no Bitcoin via OpenTimestamps).
// Passo 45: o case study em PDF (trajetória, tabela de medições com SHA-256 e .ots, nota de método), gerado no navegador.
export function linhasCaseStudy(): { texto: string; tamanho?: number; negrito?: boolean }[] {
  const primeira = MEDICOES[0], ultima = MEDICOES[MEDICOES.length - 1]
  const nota = (n: number) => n.toFixed(2).replace('.', ',')
  const L: { texto: string; tamanho?: number; negrito?: boolean }[] = [
    { texto: 'Case study: plataforma GMenezes Advogados Associados', tamanho: 16, negrito: true },
    { texto: `Instituto THEYE · de ${nota(primeira.nota)} a ${nota(ultima.nota)} em ${MEDICOES.length} medições (M${primeira.n} a M${ultima.n}) · gerado em ${new Date().toLocaleDateString('pt-BR')}`, tamanho: 9 }, { texto: ' ' },
    { texto: '1. Trajetória de notas', tamanho: 12, negrito: true },
  ]
  for (const m of MEDICOES) L.push({ texto: `M${m.n} · ${m.data.split('-').reverse().join('/')} · ${nota(m.nota)} ${'#'.repeat(Math.max(1, Math.round((m.nota - 7) * 10)))}`, tamanho: 8.5 })
  L.push({ texto: ' ' }, { texto: '2. Tabela de medições (PDF, SHA-256 e prova OpenTimestamps)', tamanho: 12, negrito: true })
  for (const m of MEDICOES) {
    L.push({ texto: `M${m.n} · ${m.data.split('-').reverse().join('/')} · nota ${nota(m.nota)} · ${m.arquivo} · .ots: ${m.ots ? 'sim (Bitcoin)' : 'não'}`, tamanho: 8.5, negrito: true })
    L.push({ texto: `SHA-256 ${m.sha256}`, tamanho: 7.5 })
    for (const q of quebrar(`Entregue: ${m.entregue}`, 8)) L.push({ texto: q, tamanho: 8 })
  }
  L.push({ texto: `Plano M31 · ${PLANO_M31.data.split('-').reverse().join('/')} · média ${nota(PLANO_M31.media)} · ${PLANO_M31.arquivo} · .ots: sim`, tamanho: 8.5, negrito: true }, { texto: `SHA-256 ${PLANO_M31.sha256}`, tamanho: 7.5 })
  L.push({ texto: ' ' }, { texto: '3. Nota de método', tamanho: 12, negrito: true })
  for (const q of quebrar('Cada entrega é medida em dez critérios ponderados: funcionalidade, confiabilidade, segurança, usabilidade, desempenho, inteligência artificial, dados, acessibilidade, documentação e adoção. A nota é a média ponderada, de 0 a 10, atribuída pelo agente de medição com base em testes em produção (navegador real, zero erros de JavaScript, CSS carregado) e nos critérios de Nielsen, SUS, WCAG 2.2 AA, ISO 9241-110 e HEART. Cada medição gera um PDF cujo SHA-256 é encadeado ao da medição anterior (cadeia-de-medicoes.txt) e carimbado no Bitcoin pelo OpenTimestamps (.ots), o que impede alterar o histórico sem que se perceba. Para conferir: calcule o SHA-256 do PDF e compare com a tabela; verifique o .ots em opentimestamps.org. Limite: a nota mede a plataforma, não o uso pela equipe; o que falta para 10 depende de dados reais, logo oficial e adoção.', 9)) L.push({ texto: q, tamanho: 9 })
  L.push({ texto: ' ' }, { texto: 'Instituto THEYE · plataforma desenvolvida para GMenezes Advogados Associados · dados fictícios até a equipe cadastrar os reais.', tamanho: 8 })
  return L
}

function CaseStudy() {
  const primeira = MEDICOES[0], ultima = MEDICOES[MEDICOES.length - 1]
  const [msgPdf, setMsgPdf] = useState('')
  const caseEmPdf = () => {
    const pdf = gerarPdfTexto('Case study GMenezes', linhasCaseStudy())
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }))
    const a = document.createElement('a'); a.href = url; a.download = `case-study-gmenezes-M${ultima.n}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 2000)
    setMsgPdf(`Case study em PDF gerado com ${MEDICOES.length} medições, SHA-256 e provas .ots.`)
  }
  return (
    <div className="space-y-6" data-testid="case-study">
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1">Case study: de {primeira.nota.toFixed(2).replace('.', ',')} a {ultima.nota.toFixed(2).replace('.', ',')} em {MEDICOES.length} medições</h2>
        <p className="text-sm text-grafite-claro mb-4">Esta plataforma foi construída pelo Instituto THEYE para o escritório GMenezes Advogados Associados e medida a cada entrega com dez critérios ponderados (funcionalidade, confiabilidade, segurança, usabilidade, desempenho, IA, dados, acessibilidade, documentação e adoção). Cada medição vira um PDF cujo SHA-256 é encadeado ao anterior e carimbado no Bitcoin (OpenTimestamps), de modo que ninguém pode alterar o histórico depois.</p>
        <div className="flex items-end gap-1 h-32" aria-hidden>
          {MEDICOES.map(m => <div key={m.n} className={m.n === ultima.n ? 'flex-1 bg-dourado' : 'flex-1 bg-navy'} style={{ height: `${((m.nota - 7) / 3) * 100}%` }} title={`M${m.n}: ${m.nota}`} />)}
        </div>
        <div className="flex gap-1 text-[10px] text-grafite-claro mt-1">{MEDICOES.map(m => <span key={m.n} className="flex-1 text-center">{m.n}</span>)}</div>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={DECK_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 uppercase tracking-wider text-sm">Deck de apresentação <ExternalLink size={14} aria-hidden="true" /></a>
          <Link to="/testar" className="inline-flex items-center gap-2 border border-navy text-navy min-h-[44px] px-5 uppercase tracking-wider text-sm">Testar tudo agora</Link>
          <button type="button" onClick={caseEmPdf} data-testid="case-study-pdf" className="inline-flex items-center gap-2 border border-navy text-navy min-h-[44px] px-5 uppercase tracking-wider text-sm">Case study em PDF</button>
        </div>
        {msgPdf && <p role="status" className="text-sm mt-2" data-testid="case-study-msg">{msgPdf}</p>}
      </section>
      <section className="bg-white p-6 shadow-sm">
        <h2 className="text-lg mb-1">Cadeia de medições (PDFs e hashes)</h2>
        <p className="text-sm text-grafite-claro mb-3">Os PDFs ficam na Biblioteca do projeto. Para conferir um arquivo, calcule o SHA-256 e compare com a coluna abaixo; o arquivo .ots prova a data no Bitcoin.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-2 pr-3">Medição</th><th className="pr-3">Data</th><th className="pr-3">Nota</th><th className="pr-3">Entregue</th><th>SHA-256</th></tr></thead>
            <tbody>
              {[...MEDICOES].reverse().map(m => (
                <tr key={m.n} className="border-t border-navy/10 align-top">
                  <td className="py-2 pr-3 font-medium text-navy">M{m.n}{m.ots ? ' ₿' : ''}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{m.data.split('-').reverse().join('/')}</td>
                  <td className="py-2 pr-3">{m.nota.toFixed(2).replace('.', ',')}</td>
                  <td className="py-2 pr-3 text-xs text-grafite">{m.entregue}</td>
                  <td className="py-2 font-mono text-[10px] break-all text-grafite-claro">{m.sha256}</td>
                </tr>
              ))}
              <tr className="border-t border-navy/10 align-top">
                <td className="py-2 pr-3 font-medium text-navy">Plano M31 ₿</td>
                <td className="py-2 pr-3 whitespace-nowrap">{PLANO_M31.data.split('-').reverse().join('/')}</td>
                <td className="py-2 pr-3">{PLANO_M31.media.toFixed(2).replace('.', ',')}</td>
                <td className="py-2 pr-3 text-xs text-grafite">Plano ferramenta por ferramenta: 34 ferramentas × 8 pontos de vista, PROMPT por passo, agente guardião.</td>
                <td className="py-2 font-mono text-[10px] break-all text-grafite-claro">{PLANO_M31.sha256}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-grafite-claro mt-3">₿ = prova OpenTimestamps no Bitcoin. O que falta para a nota 10 depende do uso pela equipe (dados reais, logo, Outlook), não de código.</p>
      </section>
    </div>
  )
}

export default function InstitutoPage() {
  const [aba, setAba] = useState<Aba>('inovacao')
  return (
    <Layout title="Instituto THEYE">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <header>
          <p className="text-xs uppercase tracking-[0.2em] text-dourado-escuro">Instituto THEYE</p>
          <h2 className="text-3xl text-navy">Ferramentas do Instituto</h2>
          <p className="text-sm text-grafite-claro mt-1">Inovação regulatória, jurimetria, ESG e pesquisa jurídica (Brasil e mundo) para o desenvolvimento do direito brasileiro.</p>
        </header>
        <div role="tablist" aria-label="Temas do Instituto" className="flex flex-wrap gap-2">
          {ABAS.map(({ valor, rotulo, Icone }) => (
            <button key={valor} role="tab" aria-selected={aba === valor} onClick={() => setAba(valor)}
              className={`inline-flex items-center gap-2 min-h-[44px] px-4 text-sm border ${aba === valor ? 'bg-navy text-white border-navy' : 'bg-white text-navy border-navy/20'}`}>
              <Icone size={16} aria-hidden="true" /> {rotulo}
            </button>
          ))}
        </div>
        <div role="tabpanel">{aba === 'inovacao' ? <Inovacao /> : aba === 'jurimetria' ? <Jurimetria /> : aba === 'esg' ? <Esg /> : aba === 'pesquisa' ? <PesquisaDireito /> : <CaseStudy />}</div>
      </div>
    </Layout>
  )
}
