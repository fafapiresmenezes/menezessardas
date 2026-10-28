import { useState } from 'react'
import Layout from '@/components/Layout'
import { ExternalLink, Search } from 'lucide-react'

// Fontes que o advogado usa todo dia: digita uma vez (nome, CNPJ, número do processo ou tema)
// e abre cada site já com a busca feita. As que têm ligação direta estão marcadas.
const FONTES: { nome: string; para: string; url: (t: string) => string; direta?: string }[] = [
  { nome: 'Escavador', para: 'Processos e publicações por nome, CPF/CNPJ ou número', url: t => `https://www.escavador.com/busca?q=${encodeURIComponent(t)}` },
  { nome: 'JusBrasil', para: 'Jurisprudência, diários e processos', url: t => `https://www.jusbrasil.com.br/busca?q=${encodeURIComponent(t)}` },
  { nome: 'DataJud (CNJ)', para: 'Estatísticas de varas e câmaras', url: () => 'https://datajud-wiki.cnj.jus.br/', direta: 'Perfil do julgador' },
  { nome: 'TJRJ – consulta processual', para: 'Andamento de processos no Rio', url: () => 'https://www3.tjrj.jus.br/consultaprocessual/' },
  { nome: 'STJ – jurisprudência', para: 'Acórdãos e súmulas do STJ', url: t => `https://scon.stj.jus.br/SCON/pesquisar.jsp?b=ACOR&livre=${encodeURIComponent(t)}` },
  { nome: 'STF – jurisprudência', para: 'Decisões e temas de repercussão geral', url: t => `https://jurisprudencia.stf.jus.br/pages/search?base=acordaos&queryString=${encodeURIComponent(t)}` },
  { nome: 'Planalto – legislação', para: 'Leis no texto compilado oficial', url: t => `https://www.google.com/search?q=site%3Aplanalto.gov.br+${encodeURIComponent(t)}`, direta: 'Assistente e Legislação' },
  { nome: 'Querido Diário', para: 'Diários oficiais municipais', url: t => `https://queridodiario.ok.org.br/pesquisa?term=${encodeURIComponent(t)}` },
  { nome: 'Receita Federal – CNPJ', para: 'Situação cadastral de empresas', url: () => 'https://solucoes.receita.fazenda.gov.br/servicos/cnpjreva/cnpjreva_solicitacao.asp', direta: 'Fornecedores' },
  { nome: 'Banco Central – índices', para: 'IGP-M, IPCA e Selic', url: () => 'https://www3.bcb.gov.br/CALCIDADAO/publico/exibirFormCorrecaoValores.do?method=exibirFormCorrecaoValores', direta: 'Reajuste de contratos' },
]

export default function FontesPage() {
  const [termo, setTermo] = useState('')
  return (
    <Layout title="Fontes do advogado">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <label htmlFor="termo" className="block font-medium mb-2">O que você quer procurar?</label>
          <div className="flex items-center gap-2">
            <Search className="w-5 h-5 text-grafite-claro" aria-hidden />
            <input id="termo" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Nome, CNPJ, número do processo ou tema" className="flex-1 border px-3 py-2" />
          </div>
          <p className="text-sm text-grafite-claro mt-2">Escreva uma vez e clique na fonte: ela abre já com a busca feita.</p>
        </section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FONTES.map(f => (
            <a key={f.nome} data-testid="fonte" href={f.url(termo.trim())} target="_blank" rel="noopener noreferrer" className="bg-white shadow-sm p-5 border-l-4 border-navy hover:border-dourado block">
              <span className="flex items-center justify-between font-serif text-lg text-navy">{f.nome}<ExternalLink className="w-4 h-4" aria-hidden /></span>
              <span className="block text-sm text-grafite-claro mt-1">{f.para}</span>
              {f.direta && <span className="inline-block text-xs bg-pergaminho text-dourado-escuro px-2 py-0.5 mt-2">Ligada à plataforma: {f.direta}</span>}
            </a>
          ))}
        </div>
      </div>
    </Layout>
  )
}
