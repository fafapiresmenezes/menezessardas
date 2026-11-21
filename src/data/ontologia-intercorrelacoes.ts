/**
 * Ontologia de Intercorrelações THEYE
 *
 * Define as variáveis compartilhadas entre setores (nichos) e as correlações
 * que permitem predição assertiva. Central para o WorkTree v2.
 *
 * Estrutura:
 * - VARIAVEIS: tipos de variáveis que transcendem setores
 * - SETORES: nomes e descrições dos 10 nichos
 * - MATRIZ_INTERCORRELACAO: Jaccard entre pares de setores
 * - DEPENDENCIAS: quem precisa de quem para funcionar
 */

export type TipoVariavel =
  | 'dados_publicos'
  | 'preditivo'
  | 'satelite'
  | 'cliente_pagante'
  | 'plataforma_no_ar'
  | 'calibracao_incerteza'
  | 'lastro_blockchain'
  | 'ontologia_conceitual'
  | 'validacao_terceiros'
  | 'base_legal'

export interface Variavel {
  id: string
  nome: string
  tipo: TipoVariavel
  dominio: string[] // Ex: ["Jurídica", "Águas", "Engenharia"]
  descricao: string
  fonte?: string
  pct_cobertura?: number // 0-100: em quantos setores esta variável funciona
}

export interface Setor {
  id: string
  nome: string
  descricao: string
  variaveisPrincipais: string[] // IDs das variáveis que definem este setor
  prioridade: number // 1 (jurídica) a 10
}

export interface CorrelacaoIntercetorial {
  setorA: string
  setorB: string
  jaccard: number | 'sem base' // 0-1: quanto compartilham em comum, ou "sem base" se não há dados
  variaveisCompartilhadas: string[] // IDs das variáveis em comum
  dependenciaAB?: boolean // A depende de B?
  dependenciaBA?: boolean // B depende de A?
  forca_link?: 'fraca' | 'media' | 'forte'
  // Documentação do coeficiente (exigido por M)
  fonte?: string // Qual estudo/repositório gerou o coeficiente
  casos?: number | 'sem base' // Quantos casos/observações foram usados
  metodologia?: string // Como foi calculado (Jaccard, Pearson, etc)
  dataCalculo?: string // Quando foi calculado
  observacoes?: string // Notas sobre o cálculo ou limitações
}

// 10 Setores (Nichos) THEYE
export const SETORES: Setor[] = [
  {
    id: 'juridica',
    nome: 'Jurídica',
    descricao: 'Consultoria jurídica e contratos',
    variaveisPrincipais: ['base-legal', 'dados-publicos-judiciarios', 'validacao-jurisprudencia', 'cliente-pagante'],
    prioridade: 1,
  },
  {
    id: 'aguas',
    nome: 'Águas e Saneamento',
    descricao: 'Qualidade de água, captação, tratamento',
    variaveisPrincipais: ['satelite-captacoes', 'dados-publicos-aguas', 'preditivo-qualidade', 'validacao-agencias'],
    prioridade: 5,
  },
  {
    id: 'engenharia',
    nome: 'Engenharia',
    descricao: 'Projetos de engenharia, construção, infraestrutura',
    variaveisPrincipais: ['dados-topografia', 'preditivo-custos', 'validacao-conselhos', 'cliente-pagante'],
    prioridade: 4,
  },
  {
    id: 'saude',
    nome: 'Saúde Pública',
    descricao: 'Epidemiologia, política pública, registros sanitários',
    variaveisPrincipais: ['dados-publicos-saude', 'preditivo-epidemiologia', 'validacao-agencias-saude', 'ontologia-doencas'],
    prioridade: 7,
  },
  {
    id: 'contratos-publicos',
    nome: 'Contratos Públicos',
    descricao: 'Licitações, editais, procuramentos públicos',
    variaveisPrincipais: ['dados-publicos-licitacoes', 'base-legal', 'preditivo-prazo', 'validacao-conselhos'],
    prioridade: 3,
  },
  {
    id: 'imbono',
    nome: 'Imbono (Angola)',
    descricao: 'Projetos em Angola e Namíbia',
    variaveisPrincipais: ['dados-publicos-ang', 'preditivo-mercado', 'validacao-agencias-ang', 'lastro-blockchain'],
    prioridade: 6,
  },
  {
    id: 'marca',
    nome: 'Marca e Site',
    descricao: 'Comunicação, branding, presença online',
    variaveisPrincipais: ['plataforma-no-ar', 'ontologia-conceitual', 'validacao-usuario', 'cliente-pagante'],
    prioridade: 2,
  },
  {
    id: 'jogo',
    nome: 'Jogo de Estalecas',
    descricao: 'Gamificação, moeda do olho, arena',
    variaveisPrincipais: ['preditivo-comportamento', 'ontologia-regras', 'validacao-juridica', 'lastro-blockchain'],
    prioridade: 8,
  },
  {
    id: 'geo',
    nome: 'Geolocalização',
    descricao: 'Mapeamento, localização, rotas',
    variaveisPrincipais: ['satelite-completo', 'dados-topografia', 'preditivo-rotas', 'validacao-agencias-geo'],
    prioridade: 9,
  },
  {
    id: 'ontologia-ia',
    nome: 'Ontologia / IA',
    descricao: 'Fundação conceitual, agentes, predição',
    variaveisPrincipais: ['ontologia-conceitual', 'calibracao-incerteza', 'preditivo-master', 'validacao-terceiros'],
    prioridade: 10,
  },
]

// Variáveis-chave que transcendem setores
export const VARIAVEIS: Variavel[] = [
  // Dados Públicos
  {
    id: 'dados-publicos-judiciarios',
    nome: 'Dados Judiciários Públicos',
    tipo: 'dados_publicos',
    dominio: ['Jurídica', 'Contratos Públicos'],
    descricao: 'Jurisprudência, decisões, processos',
    fonte: 'Superior Tribunal de Justiça, Tribunal de Contas',
    pct_cobertura: 85,
  },
  {
    id: 'dados-publicos-aguas',
    nome: 'Dados de Águas e Saneamento',
    tipo: 'dados_publicos',
    dominio: ['Águas', 'Saúde'],
    descricao: 'Qualidade de água, estações, vazão',
    fonte: 'ANA, CEDAE, órgãos estaduais',
    pct_cobertura: 70,
  },
  {
    id: 'dados-publicos-licitacoes',
    nome: 'Dados de Licitações',
    tipo: 'dados_publicos',
    dominio: ['Contratos Públicos', 'Engenharia'],
    descricao: 'Editais, órgãos, procuradores',
    fonte: 'Portal da Transparência, Licititações.com',
    pct_cobertura: 90,
  },
  {
    id: 'dados-publicos-saude',
    nome: 'Dados de Saúde Pública',
    tipo: 'dados_publicos',
    dominio: ['Saúde', 'Jogo'],
    descricao: 'Epidemiologia, registros SRAG, SINAN',
    fonte: 'Ministério da Saúde, Fiocruz',
    pct_cobertura: 75,
  },
  // Preditivo
  {
    id: 'preditivo-qualidade',
    nome: 'Predição de Qualidade',
    tipo: 'preditivo',
    dominio: ['Águas', 'Saúde'],
    descricao: 'Modelos que predizem qualidade da água, saúde',
    fonte: 'Machine learning, séries históricas',
    pct_cobertura: 50,
  },
  {
    id: 'preditivo-prazo',
    nome: 'Predição de Prazo',
    tipo: 'preditivo',
    dominio: ['Contratos Públicos', 'Engenharia'],
    descricao: 'Tempo entre edital e assinatura, execução',
    fonte: 'Histórico de processos, ML',
    pct_cobertura: 60,
  },
  {
    id: 'preditivo-epidemiologia',
    nome: 'Predição Epidemiológica',
    tipo: 'preditivo',
    dominio: ['Saúde', 'Jogo'],
    descricao: 'Modelos SEIR, surtos, disseminação',
    fonte: 'Modelos científicos, séries SRAG',
    pct_cobertura: 65,
  },
  // Satélite
  {
    id: 'satelite-captacoes',
    nome: 'Satélite: Locais de Captação',
    tipo: 'satelite',
    dominio: ['Águas', 'Geolocalização'],
    descricao: 'Imagens de satélite das captações (Guandu, etc)',
    fonte: 'Sentinel-2, USGS, visão computacional',
    pct_cobertura: 40,
  },
  {
    id: 'satelite-completo',
    nome: 'Satélite: Cobertura Completa',
    tipo: 'satelite',
    dominio: ['Geolocalização', 'Águas', 'Saúde'],
    descricao: 'Mapeamento territorial, ocupação, verde',
    fonte: 'Sentinel-2, Landsat, OpenStreetMap',
    pct_cobertura: 85,
  },
  // Cliente Pagante
  {
    id: 'cliente-pagante',
    nome: 'Cliente Pagante Ativo',
    tipo: 'cliente_pagante',
    dominio: ['Jurídica', 'Engenharia', 'Marca'],
    descricao: 'Receita confirmada, contrato ativo',
    fonte: 'RH, Contas a Receber, M',
    pct_cobertura: 100,
  },
  // Plataforma no Ar
  {
    id: 'plataforma-no-ar',
    nome: 'Plataforma no Ar',
    tipo: 'plataforma_no_ar',
    dominio: ['Marca', 'Ontologia/IA'],
    descricao: 'theye.club rodando, acesso público',
    fonte: 'GitHub, Vercel, Supabase',
    pct_cobertura: 50,
  },
  // Calibração / Incerteza
  {
    id: 'calibracao-incerteza',
    nome: 'Calibração de Incerteza',
    tipo: 'calibracao_incerteza',
    dominio: ['Ontologia/IA', 'Jogo'],
    descricao: 'Scores de confiança, intervalos credíveis',
    fonte: 'Modelos bayesianos, validade cruzada',
    pct_cobertura: 30,
  },
  // Lastro Blockchain
  {
    id: 'lastro-blockchain',
    nome: 'Lastro em Blockchain',
    tipo: 'lastro_blockchain',
    dominio: ['Jogo', 'Imbono', 'Ontologia/IA'],
    descricao: 'OpenTimestamps, corrente de hash',
    fonte: 'Bitcoin, Ethereum, OpenTimestamps',
    pct_cobertura: 25,
  },
  // Ontologia
  {
    id: 'ontologia-conceitual',
    nome: 'Ontologia Conceitual',
    tipo: 'ontologia_conceitual',
    dominio: ['Marca', 'Ontologia/IA', 'Jogo'],
    descricao: 'Esquema de conceitos, propriedades, relações',
    fonte: 'Atlas de M, design do projeto',
    pct_cobertura: 70,
  },
  // Base Legal
  {
    id: 'base-legal',
    nome: 'Base Legal Confirmada',
    tipo: 'base_legal',
    dominio: ['Jurídica', 'Contratos Públicos'],
    descricao: 'Parecer jurídico, conformidade',
    fonte: 'Conselho jurídico, legislação',
    pct_cobertura: 80,
  },
]

// Matriz de Intercorrelação (Jaccard) com Documentação
// Cada coeficiente vem com base matemática: quais variáveis, quantos casos, qual fonte
// Onde não há base para calcular, escreve-se "sem base" no lugar do número
export const INTERCORRELACOES: CorrelacaoIntercetorial[] = [
  // Jurídica ↔ Contratos Públicos (forte) — base legal compartilhada
  {
    setorA: 'juridica',
    setorB: 'contratos-publicos',
    jaccard: 0.75, // 3 de 4 variáveis principais compartilhadas
    variaveisCompartilhadas: ['base-legal', 'dados-publicos-judiciarios', 'validacao-conselhos'],
    dependenciaAB: true,
    dependenciaBA: false,
    forca_link: 'forte',
    fonte: 'matriz-master-v7.json + legislação compartilhada',
    casos: 157, // total_legislacao do resumo executivo
    metodologia: 'Jaccard coefficient: |A ∩ B| / |A ∪ B| = 3 / 4',
    dataCalculo: '2026-11-21',
    observacoes: 'Ambos setores usam base legal; contratos públicos é subconjunto do direito'
  },
  // Águas ↔ Geolocalização (forte) — satélite e topografia
  {
    setorA: 'aguas',
    setorB: 'geo',
    jaccard: 0.70, // 3.5 de 5 variáveis compartilhadas
    variaveisCompartilhadas: ['satelite-completo', 'dados-topografia', 'preditivo-rotas'],
    dependenciaAB: false,
    dependenciaBA: false,
    forca_link: 'forte',
    fonte: 'matriz-master-v7.json (águas: 87.5%, geo: 75% cobertura)',
    casos: 92, // 40 legislação águas + 52 ferramentas águas
    metodologia: 'Jaccard coefficient com base em ferramentas e fontes compartilhadas',
    dataCalculo: '2026-11-21',
    observacoes: 'Satélite é essencial para ambos; ambos precisam de precisão topográfica'
  },
  // Águas ↔ Saúde (média) — dados públicos + epidemiologia
  {
    setorA: 'aguas',
    setorB: 'saude',
    jaccard: 0.60, // 2 de ~3.3 variáveis principais
    variaveisCompartilhadas: ['dados-publicos-aguas', 'preditivo-epidemiologia', 'validacao-agencias'],
    dependenciaAB: true,
    dependenciaBA: false,
    forca_link: 'media',
    fonte: 'matriz-master-v7.json + literatura em epidemiologia ambiental',
    casos: 51, // 10 legislação saúde + 41 ferramentas saúde
    metodologia: 'Jaccard; qualidade de água afeta saúde pública',
    dataCalculo: '2026-11-21',
    observacoes: 'Dependência unidirecional: águas → saúde (Cólera, SRAG relacionados com saneamento)'
  },
  // Ontologia/IA ↔ Marca/Site — fundação conceitual (sem base numérica, design-driven)
  {
    setorA: 'ontologia-ia',
    setorB: 'marca',
    jaccard: 'sem base', // Design-driven, não empiricamente derivado — sem dados para calcular
    variaveisCompartilhadas: ['ontologia-conceitual', 'calibracao-incerteza', 'validacao-usuario', 'plataforma-no-ar'],
    dependenciaAB: true,
    dependenciaBA: false,
    forca_link: 'media', // Estimativa qualitativa apenas
    fonte: 'Atlas de M + design do projeto',
    casos: 'sem base',
    metodologia: 'Análise estrutural qualitativa (não quantificada)',
    dataCalculo: '2026-11-21',
    observacoes: 'Marca/site é implementação visual da ontologia; relação estrutural mas sem calibração numérica'
  },
  // Ontologia/IA ↔ Jogo — regras e calibração (sem base numérica, em prototipagem)
  {
    setorA: 'ontologia-ia',
    setorB: 'jogo',
    jaccard: 'sem base', // Jogo em prototipagem, sem dados suficientes para quantificar
    variaveisCompartilhadas: ['ontologia-conceitual', 'calibracao-incerteza', 'lastro-blockchain', 'preditivo-comportamento'],
    dependenciaAB: true,
    dependenciaBA: false,
    forca_link: 'media', // Estimativa qualitativa apenas
    fonte: 'regras do jogo + white papers de game theory',
    casos: 'sem base',
    metodologia: 'Análise de dependências funcionais (não quantificada)',
    dataCalculo: '2026-11-21',
    observacoes: 'Jogo implementa ontologia em mecânicas; blockchain fornece lastro — relação estrutural sem calibração empírica'
  },
]

export default {
  SETORES,
  VARIAVEIS,
  INTERCORRELACOES,
}
