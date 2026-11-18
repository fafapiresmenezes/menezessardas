/**
 * Exemplos REAIS de projectos financiados por fundos internacionais em Angola e na Namíbia,
 * tirados de repositórios públicos e citados com a fonte (pedido de M, 18/11/2026).
 * São factos publicados — nada aqui é previsão, e nada vem de cliente algum.
 */
export interface ExemploInternacional {
  id: string
  pais: 'AO' | 'NA'
  nome: string
  financiador: string
  resumo: string
  /** O que o repositório publicou, com ano. Sem número inventado. */
  valorPublicado: string
  fonte: { nome: string; url: string }
}

/** Repositórios públicos onde estes factos vivem (e onde se procura mais). */
export const REPOSITORIOS_FUNDOS = [
  { nome: 'Banco Mundial — Projects & Operations', url: 'https://projects.worldbank.org', oQueDa: 'Todos os projectos do Banco Mundial por país, com valores, datas e documentos.' },
  { nome: 'Banco Africano de Desenvolvimento — Data Portal', url: 'https://projectsportal.afdb.org', oQueDa: 'Projectos do BAD por país e sector, com montantes aprovados.' },
  { nome: 'IATI d-portal', url: 'https://d-portal.org', oQueDa: 'Registo internacional de ajuda e financiamento ao desenvolvimento, por país e doador.' },
] as const

export const EXEMPLOS_INTERNACIONAIS: ExemploInternacional[] = [
  {
    id: 'bita',
    pais: 'AO',
    nome: 'Sistema de abastecimento de água do Bita (Luanda)',
    financiador: 'Banco Mundial (garantia) + banca comercial',
    resumo: 'Garantia do Banco Mundial (projecto P163610, aprovada em 2019) que destravou financiamento comercial para levar água tratada ao sul de Luanda.',
    valorPublicado: 'Garantia de até US$ 500 milhões; pacote total noticiado de ~US$ 1,1 mil milhões (2019).',
    fonte: { nome: 'Banco Mundial, projecto P163610', url: 'https://projects.worldbank.org/en/projects-operations/project-detail/P163610' },
  },
  {
    id: 'estradas-ao',
    pais: 'AO',
    nome: 'Programa nacional de estradas e 186 pontes',
    financiador: 'Consórcio comercial liderado pela Africa Finance Corporation',
    resumo: 'Financiamento comercial para reabilitar estradas nacionais e construir 186 pontes, anunciado em 2024.',
    valorPublicado: '€ 381 milhões (anúncio de 2024).',
    fonte: { nome: 'Africa Finance Corporation (notícia oficial)', url: 'https://www.africafc.org/news-and-insights/news/angolas-road-network-set-for-transformation-as-africa-finance-corporation-leads-commercial-funding-for-381-million-project' },
  },
  {
    id: 'ferrovia-na',
    pais: 'NA',
    nome: 'Modernização da linha férrea principal da Namíbia',
    financiador: 'Banco Africano de Desenvolvimento',
    resumo: 'Empréstimo aprovado em 2023 para modernizar a linha principal (troço Kranzberg–Otjiwarongo e obras ligadas).',
    valorPublicado: 'US$ 196 milhões (aprovação de 2023).',
    fonte: { nome: 'International Railway Journal (sobre a aprovação do BAD)', url: 'https://www.railjournal.com/infrastructure/afdb-provides-us-196m-loan-to-upgrade-namibian-main-line/' },
  },
  {
    id: 'lobito',
    pais: 'AO',
    nome: 'Corredor económico do Lobito (multinacional)',
    financiador: 'Banco Africano de Desenvolvimento e parceiros',
    resumo: 'Corredor ferro-rodoviário que liga o porto do Lobito ao interior do continente; o BAD aprovou em 2026 empréstimo e doação para o troço da Zâmbia, dentro do programa do corredor.',
    valorPublicado: 'US$ 255 milhões de empréstimo + US$ 10 milhões de doação (troço da Zâmbia, 2026).',
    fonte: { nome: 'AllAfrica (comunicado do BAD)', url: 'https://allafrica.com/stories/202608070250.html' },
  },
]
