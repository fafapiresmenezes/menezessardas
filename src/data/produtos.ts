/**
 * O caderno de produtos do Instituto, lido do PDF comercial que M pediu para usar
 * ("aquele cardápio que a gente fez", 13/11/2026): cardapio-produtos-direito-v2.pdf, de
 * 12/11/2026, 31 páginas, 21 produtos.
 *
 * Os dados vêm do PDF, não de invenção: título, para quem, o que é, entregas, chancela
 * sugerida, preço médio e prazo saíram da extração guardada em
 * /mnt/project-files/instituto/cardapio-produtos.json.
 *
 * Preço aqui é PREÇO MÉDIO de referência do caderno, não proposta: quem fecha preço é M.
 */
export type Eixo =
  'lgpd' | 'regulacao-financeira' | 'compliance' | 'inteligencia-artificial' | 'ensino-doutrina' | 'legislativo' | 'metodos-adequados' | 'clima-esg' | 'litigancia-estrategica' | 'ciberseguranca' | 'quantica'

export type Produto = {
  numero: number
  eixo: Eixo
  titulo: string
  paraQuem: string
  oQueE: string
  entregas: readonly string[]
  chancela: string
  prazo: string
}

export const EIXOS = ['lgpd', 'regulacao-financeira', 'compliance', 'inteligencia-artificial', 'ensino-doutrina', 'legislativo', 'metodos-adequados', 'clima-esg', 'litigancia-estrategica', 'ciberseguranca', 'quantica'] as const satisfies readonly Eixo[]

export const PRODUTOS = [
  {
    numero: 1,
    eixo: 'lgpd',
    titulo: 'Diagnóstico de conformidade LGPD para órgão público',
    paraQuem: 'Secretarias estaduais e municipais, autarquias, tribunais de contas, empresas públicas',
    oQueE: 'Mapeamento integral do ciclo de dados pessoais em um órgão da administração pública, com plano de adequação à Lei 13.709/2018 e às orientações da ANPD.',
    entregas: ['Inventário de dados (ROPA) completo', 'Relatório de impacto (RIPD) nos tratamentos críticos', 'Plano de adequação em 12 meses com indicadores', 'Minutas de política de privacidade, aviso e termo de consentimento', 'Oficina de capacitação do encarregado (DPO)'],
    chancela: 'Doutor em direito digital com publicações em proteção de dados; ex-integrante de autoridade reguladora.',
    prazo: '4 a 7 meses',
  },
  {
    numero: 2,
    eixo: 'regulacao-financeira',
    titulo: 'Estudo de impacto regulatório para sandbox do BACEN',
    paraQuem: 'Fintechs, instituições de pagamento, cooperativas de crédito, projetos de open finance e de ativos virtuais',
    oQueE: 'Elaboração de estudo técnico-jurídico para pleito de ingresso no sandbox regulatório do Banco Central (Resolução BCB 29/2020 e atualizações), com análise de riscos e desenho de salvaguardas.',
    entregas: ['Análise de adequação do projeto ao arcabouço do BCB', 'Matriz de riscos regulatórios e mitigadores', 'Minuta do plano de testagem e critérios de saída', 'Pareceres sobre interações com LGPD e PLD-FT', 'Acompanhamento da fase de seleção'],
    chancela: 'Ex-servidor do BCB; doutor em direito bancário; especialista em open finance.',
    prazo: '3 a 6 meses',
  },
  {
    numero: 3,
    eixo: 'compliance',
    titulo: 'Programa de integridade (compliance) — Lei 12.846/2013',
    paraQuem: 'Empresas de médio e grande porte que contratam com o poder público; concessionárias; empresas estatais',
    oQueE: 'Desenho, implantação e avaliação de programa de integridade empresarial em conformidade com a Lei Anticorrupção e o Decreto 11.129/2022, com foco em pleitos de atenuação de sanções e habilitação em licitações.',
    entregas: ['Avaliação de riscos de integridade (risk assessment)', 'Código de conduta e políticas correlatas', 'Canal de denúncias com protocolo de apuração', 'Treinamentos presenciais e à distância', 'Relatório anual de efetividade (segundo métricas da CGU)'],
    chancela: 'Ex-procurador; doutor em direito administrativo sancionador; auditor com credencial ACFE.',
    prazo: '6 a 12 meses',
  },
  {
    numero: 4,
    eixo: 'inteligencia-artificial',
    titulo: 'Parecer sobre uso de IA generativa no Judiciário',
    paraQuem: 'Tribunais estaduais e federais, mps, defensorias, procuradorias, corregedorias',
    oQueE: 'Parecer jurídico customizado para tribunais e órgãos auxiliares da Justiça sobre adoção, governança e limites da IA generativa à luz da Resolução CNJ 615/2025 (que substituiu a 332/2020).',
    entregas: ['Enquadramento de riscos dos sistemas em uso', 'Minuta de política interna de uso responsável', 'Fluxo de supervisão humana significativa', 'Parâmetros para contratação de fornecedores', 'Capacitação de gestores e servidores'],
    chancela: 'Ex-magistrado; doutor em direito processual com pesquisa em tecnologia aplicada.',
    prazo: '2 a 4 meses',
  },
  {
    numero: 5,
    eixo: 'regulacao-financeira',
    titulo: 'Modelo de regulação de ativos virtuais (Lei 14.478/2022)',
    paraQuem: 'Exchanges, custodiantes, bancos digitais com desks de cripto, gestoras de ativos tokenizados',
    oQueE: 'Consultoria para desenhar regulamentos, normas internas e protocolos de compliance para prestadoras de serviços de ativos virtuais, à luz da regulamentação do Banco Central (BCB) sobre ativos virtuais, editada em 2025.',
    entregas: ['Diagnóstico regulatório atual', 'Protocolos de PLD-FT específicos para VASPs', 'Modelo de governança e segregação patrimonial', 'Minuta de contrato com clientes e termos de risco', 'Opinião jurídica sobre tokenização de recebíveis'],
    chancela: 'Doutor em direito financeiro; especialista em blockchain com publicações internacionais.',
    prazo: '4 a 8 meses',
  },
  {
    numero: 6,
    eixo: 'ensino-doutrina',
    titulo: 'Curso executivo em direito digital',
    paraQuem: 'Áreas jurídicas corporativas, procuradorias, assessorias legislativas, oabs seccionais',
    oQueE: 'Programa de ensino continuado, modular, com 60 a 120 horas, voltado a quadros jurídicos de empresas e órgãos públicos, com certificação do Instituto.',
    entregas: ['Grade modular com 6 a 12 blocos', 'Material didático inédito (doutrina + casos)', 'Aulas síncronas com doutores convidados', 'Simulações práticas (clínica regulatória)', 'Certificado com carga horária atestada'],
    chancela: 'Coordenação por professor titular de PPGD; corpo docente com doutores de USP, UFMG, FGV e UERJ.',
    prazo: '4 a 9 meses',
  },
  {
    numero: 7,
    eixo: 'legislativo',
    titulo: 'Observatório de projetos de lei (monitoramento legislativo)',
    paraQuem: 'Associações setoriais, grandes empresas, confederações, órgãos públicos, escritórios de relações institucionais',
    oQueE: 'Serviço continuado de monitoramento e análise de projetos de lei e normas infralegais em temas de interesse do contratante, com boletins e alertas de impacto.',
    entregas: ['Mapeamento customizado de temas e PLs', 'Boletim semanal com análise de risco regulatório', 'Pareceres sob demanda em PLs críticos', 'Reuniões mensais com corpo técnico do contratante', 'Dossiês para audiências públicas'],
    chancela: 'Ex-consultor legislativo da Câmara/Senado; doutor em direito constitucional.',
    prazo: 'Contrato',
  },
  {
    numero: 8,
    eixo: 'legislativo',
    titulo: 'Estudo de direito comparado — regulação de plataformas digitais',
    paraQuem: 'Ministérios, agências reguladoras, confederações empresariais, plataformas digitais',
    oQueE: 'Estudo aprofundado comparando o Digital Services Act (UE), o Online Safety Act (Reino Unido) e o PL 2630/2020, com recomendações para o modelo brasileiro.',
    entregas: ['Relatório comparado de 120 a 180 páginas', 'Matriz de convergências e divergências', 'Análise de constitucionalidade do modelo brasileiro', 'Sugestões redacionais para regulamentação', 'Apresentação executiva com o corpo de pesquisadores'],
    chancela: 'Professor titular de direito constitucional; doutor em direito comparado; co-autoria internacional.',
    prazo: '5 a 8 meses',
  },
  {
    numero: 9,
    eixo: 'inteligencia-artificial',
    titulo: 'Plano de adequação ao Marco Legal da IA (PL 2338/2023)',
    paraQuem: 'Instituições financeiras, operadoras de saúde, empresas de tecnologia, órgãos públicos com uso intensivo de ia',
    oQueE: 'Avaliação prévia dos sistemas de IA em uso pelo contratante à luz do PL 2338/2023, com classificação de risco e plano de conformidade antecipada.',
    entregas: ['Inventário de sistemas de IA', 'Classificação por grau de risco (vedado, alto, moderado)', 'Avaliação de impacto algorítmico (AIA)', 'Plano de governança e supervisão humana', 'Treinamento das equipes técnicas e jurídicas'],
    chancela: 'Doutor em direito e tecnologia; pesquisador com experiência em frameworks europeus.',
    prazo: '4 a 7 meses',
  },
  {
    numero: 10,
    eixo: 'lgpd',
    titulo: 'Parecer sobre open finance e proteção do consumidor',
    paraQuem: 'Bancos, fintechs, iniciadoras de pagamento, cooperativas, procons',
    oQueE: 'Parecer técnico-jurídico sobre a interface entre o open finance, o CDC e a LGPD, com foco em compartilhamento de dados, consentimento granular e deveres de informação.',
    entregas: ['Mapeamento regulatório BCB + ANPD + Senacon', 'Análise dos consentimentos e sua renovação', 'Protocolo de atendimento a reclamações', 'Minuta de contratação e termos de uso', 'Nota técnica para órgão regulador'],
    chancela: 'Doutor em direito do consumidor; ex-dirigente do Senacon ou de agência bancária.',
    prazo: '3 a 5 meses',
  },
  {
    numero: 11,
    eixo: 'inteligencia-artificial',
    titulo: 'Programa de ouvidoria digital com IA',
    paraQuem: 'Ouvidorias federais, estaduais e municipais; ouvidorias de tribunais e de agências reguladoras',
    oQueE: 'Projeto para modernização de ouvidorias públicas com uso responsável de IA para triagem, resposta e indicadores, respeitando as diretrizes do CNJ 615/2025 e da LAI.',
    entregas: ['Modelo funcional e jurídico da ouvidoria digital', 'Matriz de riscos de IA aplicada a demandas', 'Governança de dados e supervisão humana', 'Indicadores (SLAs) e painéis públicos', 'Capacitação da equipe'],
    chancela: 'Ex-ouvidor-geral; doutor em direito administrativo; especialista em governo digital.',
    prazo: '5 a 8 meses',
  },
  {
    numero: 12,
    eixo: 'metodos-adequados',
    titulo: 'Protocolo de mediação e autocomposição para órgãos públicos',
    paraQuem: 'Procuradorias estaduais e municipais, autarquias, câmaras administrativas de conflitos',
    oQueE: 'Desenho de protocolos institucionais de mediação e conciliação à luz da Lei 13.140/2015 e das boas práticas do CNJ, para reduzir litigiosidade administrativa.',
    entregas: ['Diagnóstico de litigiosidade recorrente', 'Protocolos por tema (tributário, servidor, contratos)', 'Minutas de atos normativos e portarias', 'Capacitação de mediadores internos', 'Indicadores de resolutividade'],
    chancela: 'Ex-desembargador; doutor em processo civil; mediador com certificação CNJ.',
    prazo: '4 a 7 meses',
  },
  {
    numero: 13,
    eixo: 'clima-esg',
    titulo: 'Estudo sobre climate litigation brasileira',
    paraQuem: 'Empresas de energia, mineração, agronegócio, infraestrutura; estados e municípios; procuradorias',
    oQueE: 'Mapeamento da jurisprudência brasileira e comparada em litígios climáticos, com cenários de risco e estratégias defensivas e propositivas.',
    entregas: ['Mapeamento atualizado de processos no Brasil', 'Comparativo com 6 jurisdições (UE, EUA, Holanda, Reino Unido, Colômbia, Austrália)', 'Matriz de cenários de risco', 'Protocolos de resposta e due diligence climática', 'White paper publicável'],
    chancela: 'Doutor em direito ambiental; pesquisador afiliado a rede internacional de climate litigation.',
    prazo: '5 a 8 meses',
  },
  {
    numero: 14,
    eixo: 'ensino-doutrina',
    titulo: 'Programa de capacitação em arbitragem tributária',
    paraQuem: 'Procuradorias da fazenda, grandes contribuintes, câmaras arbitrais, escritórios especializados',
    oQueE: 'Formação de alto nível em arbitragem tributária, modalidade jurídica ainda em construção no Brasil e em expansão no debate tributário.',
    entregas: ['Programa de 80 a 120 horas', 'Módulos sobre arbitrabilidade e competência', 'Simulações de procedimento', 'Doutrina e jurisprudência comparada', 'Corpo docente com árbitros atuantes'],
    chancela: 'Ex-ministro do STJ ou conselheiro do CARF; doutor em direito tributário; árbitro com CV internacional.',
    prazo: '5 a 7 meses',
  },
  {
    numero: 15,
    eixo: 'litigancia-estrategica',
    titulo: 'Núcleo de litigância estratégica pro bono',
    paraQuem: 'Grandes escritórios, departamentos jurídicos, fundações, órgãos de defensoria',
    oQueE: 'Montagem de núcleo permanente para patrocínio de causas estruturais pro bono em parceria com organizações da sociedade civil, com rigor acadêmico e pautas de direitos fundamentais.',
    entregas: ['Diagnóstico e definição de carteira', 'Protocolo de seleção e aceite de causas', 'Supervisão acadêmica permanente', 'Produção de peças e amici curiae', 'Relatório anual de impacto'],
    chancela: 'Professor titular de direitos humanos; ex-defensor público-geral; doutora em direito constitucional.',
    prazo: 'Ciclo anual',
  },
  {
    numero: 16,
    eixo: 'clima-esg',
    titulo: 'Estudo sobre tokenização de ativos e crédito de carbono',
    paraQuem: 'Gestoras, securitizadoras, projetos redd+, empresas de infraestrutura verde',
    oQueE: 'Parecer e plano de implementação para tokenização de recebíveis, imóveis e créditos de carbono, à luz das Resoluções CVM 88 e 175 e da Lei 15.042/2024 (SBCE).',
    entregas: ['Classificação do token como valor mobiliário ou utility', 'Estrutura jurídica do veículo emissor', 'Tratamento tributário e contábil', 'Governança do projeto e auditoria', 'Minuta de whitepaper e disclaimers'],
    chancela: 'Doutor em direito do mercado de capitais; especialista em direito ambiental; auditor independente.',
    prazo: '4 a 7 meses',
  },
  {
    numero: 17,
    eixo: 'clima-esg',
    titulo: 'Programa de ESG jurídico corporativo',
    paraQuem: 'Companhias abertas, empresas com capital aberto previsto, grandes fornecedores de cadeia global',
    oQueE: 'Implantação de programa ESG com lastro jurídico sólido, integrando as diretrizes CVM 59/2021, a CSRD europeia e a ISSB (IFRS S1/S2).',
    entregas: ['Diagnóstico de maturidade ESG', 'Política de direitos humanos e cadeia de suprimentos', 'Protocolos de reporte não financeiro', 'Governança climática do conselho', 'Treinamento do comitê de auditoria'],
    chancela: 'Doutor em direito societário; conselheiro de administração certificado IBGC; especialista em sustainability reporting.',
    prazo: '6 a 10 meses',
  },
  {
    numero: 18,
    eixo: 'ciberseguranca',
    titulo: 'Diagnóstico de cibersegurança jurídica',
    paraQuem: 'Órgãos públicos federais, estaduais e municipais; empresas de infraestrutura crítica; operadoras de saúde',
    oQueE: 'Avaliação jurídica dos controles de cibersegurança da organização à luz da LGPD, da Política Nacional de Cibersegurança (Decreto 12.573/2025, que substituiu o Decreto 10.222/2020) e normas setoriais.',
    entregas: ['Mapa de obrigações jurídicas de segurança', 'Protocolo de resposta a incidentes', 'Fluxo de notificação ANPD e titulares', 'Avaliação contratual (cláusulas com fornecedores)', 'Simulação de incidente (tabletop exercise)'],
    chancela: 'Doutor em direito digital; ex-integrante de GSI/Presidência; perito em forense digital.',
    prazo: '3 a 6 meses',
  },
  {
    numero: 19,
    eixo: 'ensino-doutrina',
    titulo: 'Pesquisa doutrinária sob encomenda (white papers)',
    paraQuem: 'Escritórios de advocacia, associações, empresas em casos emblemáticos, órgãos públicos',
    oQueE: 'Produção de white papers e pareceres doutrinários de alta profundidade, com rigor acadêmico, para subsidiar teses, defesas ou posicionamentos institucionais.',
    entregas: ['Pesquisa dogmática de 80 a 200 páginas', 'Levantamento jurisprudencial atualizado', 'Direito comparado de 2 a 5 jurisdições', 'Parecer assinado por doutor de referência', 'Apresentação executiva para o contratante'],
    chancela: 'Professor titular ou associado em PPGD reconhecido pela CAPES (nota 6 ou 7).',
    prazo: '2 a 5 meses',
  },
  {
    numero: 20,
    eixo: 'lgpd',
    titulo: 'Advocacy regulatório continuado (acompanhamento sandbox ANPD)',
    paraQuem: 'Participantes do sandbox anpd, candidatos a futuros ciclos, parceiros acadêmicos',
    oQueE: 'Assessoria jurídica continuada para participantes do sandbox regulatório da ANPD (IA e proteção de dados), com acompanhamento de ciclos e monitoramento.',
    entregas: ['Preparação da candidatura e documentos', 'Acompanhamento das fases de nivelamento e testagem', 'Relatórios de monitoramento', 'Interlocução técnica com a ANPD', 'Publicação de lições aprendidas'],
    chancela: 'Ex-servidor da ANPD; doutor em direito regulatório; pesquisador em governança algorítmica.',
    prazo: '8 a 14 meses',
  },
  {
    numero: 21,
    eixo: 'quantica',
    titulo: 'Programa de adequação pós-quântica (PQC)',
    paraQuem: 'Bancos, órgãos públicos com segredo de estado, big techs, operadoras de telecom, cartórios eletrônicos',
    oQueE: 'Diagnóstico e plano de migração para criptografia pós-quântica (NIST FIPS 203 ML-KEM, FIPS 204 ML-DSA, FIPS 205 SLH- DSA), cobrindo certificados, assinatura eletrônica, LGPD, segredo de Estado e contratos com segredo comercial de longo prazo.',
    entregas: ['Inventário criptográfico', 'Mapa de riscos até 2035', 'Plano de migração em ondas', 'Política interna PQC', 'Treinamento para o jurídico', 'Parecer para ANPD'],
    chancela: 'Criptógrafo acadêmico brasileiro (INMETRO/RNP) em co-assinatura com professor titular de direito digital.',
    prazo: '8 meses',
  },
] as const satisfies readonly Produto[]

// O PDF do caderno NÃO vai para dentro de public/: hospedagem estática não pede senha, e o
// caderno traz preço médio de cada produto. Preço aparece só depois da entrada (ver
// src/pages/CadernoDeProdutosPage.tsx); a vitrine da porta mostra o que existe, sem preço.
export const CADERNO_EM = '12/11/2026'

export const porEixo = (e: Eixo) => PRODUTOS.filter(p => p.eixo === e)
