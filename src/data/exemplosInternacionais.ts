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
    nome: 'Lobito Atlantic Railway (Corredor do Lobito)',
    financiador: 'Africa Finance Corporation + US DFC + DBSA',
    resumo: 'Ferrovia do porto do Lobito ao interior do continente: a AFC estruturou o pacote de dívida, com empréstimo de US$ 553 milhões da DFC assinado em Dezembro de 2025 e fecho financeiro em Janeiro de 2026.',
    valorPublicado: 'US$ 753 milhões (fecho financeiro, 2026).',
    fonte: { nome: 'Africa Finance Corporation (comunicado oficial)', url: 'https://www.africafc.org/news-and-insights/news/afc-achieves-financial-close-on-landmark-us-753-mm-lobito-corridor-railway-project-marking-a-major-milestone-for-regional-integration-and-economic-transformation' },
  },
  {
    id: 'transnamib',
    pais: 'NA',
    nome: 'Recapitalização e modernização da TransNamib',
    financiador: 'DBSA + Development Bank of Namibia',
    resumo: 'Financiamento conjunto dos dois bancos de desenvolvimento para recapitalizar a operadora ferroviária nacional da Namíbia, aprovado em 2022.',
    valorPublicado: 'N$ 2,6 mil milhões (2022).',
    fonte: { nome: 'Development Bank of Namibia (comunicado oficial)', url: 'https://dbn.com.na/component/k2/item/97-dbsa-and-dbn-fast-track-transnamib-with-n-2-6-billion' },
  },
  {
    id: 'gg-namibia',
    pais: 'NA',
    nome: 'Parceria UE–Namíbia (Global Gateway): matérias-primas e hidrogénio verde',
    financiador: 'União Europeia — Global Gateway',
    resumo: 'Pacote da parceria estratégica entre a União Europeia e a Namíbia para cadeias de matérias-primas sustentáveis e hidrogénio verde, divulgado pela Comissão Europeia.',
    valorPublicado: '€ 1,3 mil milhões noticiados (2025).',
    fonte: { nome: 'Comissão Europeia (página oficial)', url: 'https://international-partnerships.ec.europa.eu/news-and-events/news/global-gateway-namibia-becomes-pioneer-africas-green-transition-2025-04-11_en' },
  },
]
