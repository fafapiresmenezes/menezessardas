// Padrão de escrita das peças com rotação de estilo (pedido de M, 06/11/2026).
//
// Ideia: cada peça redigida pelo Assistente recebe um PERFIL DE ESCRITA próprio, sorteado
// a partir de "escolas" de escrita jurídica brasileira (inspiradas nos grandes juristas e
// doutrinadores, sem copiar texto de ninguém) e misturado por pesos. Uma variação controlada
// (ruído gaussiano com limites) e uma distância mínima em relação às últimas peças garantem
// que duas peças nunca saiam com o mesmo ritmo, os mesmos conectivos e a mesma estrutura.
//
// Objetivo: peças excelentes e naturais, sempre revisadas e assinadas pelo advogado.
// Não é ferramenta para esconder o uso de IA onde houver dever de informar.
//
// Arquivo puro (sem rede), importado pela Edge Function assistente-juridico e pela interface.

/** Parâmetros numéricos de um estilo. Todos são metas para o redator, não regras rígidas. */
export interface Parametros {
  /** Média de palavras por frase. */
  frase: number
  /** Desvio-padrão das frases (ritmo: alto = alterna frases curtas e longas). */
  ritmo: number
  /** Frases por parágrafo. */
  paragrafo: number
  /** Citações de doutrina a cada 1.000 palavras. */
  doutrina: number
  /** Precedentes (jurisprudência) a cada 1.000 palavras. */
  jurisprudencia: number
  /** 0 = impessoal ("requer-se"), 1 = primeira pessoa do plural ("requeremos"). */
  pessoalidade: number
  /** 0 = sóbrio, 1 = retórico (perguntas retóricas, ênfase, imagens). */
  retorica: number
  /** 0 = sem latinismos, 1 = uso frequente (com tradução quando incomum). */
  latinismo: number
}

export const LIMITES: Record<keyof Parametros, [number, number]> = {
  frase: [14, 38],
  ritmo: [4, 16],
  paragrafo: [2, 7],
  doutrina: [0, 6],
  jurisprudencia: [0, 6],
  pessoalidade: [0, 1],
  retorica: [0, 1],
  latinismo: [0, 1],
}
const CHAVES = Object.keys(LIMITES) as (keyof Parametros)[]

export interface Escola {
  id: string
  nome: string
  descricao: string
  parametros: Parametros
  /** Como costuma abrir o mérito. */
  aberturas: string[]
  /** Como costuma fechar (antes dos pedidos). */
  fechos: string[]
  numeracao: 'romana' | 'arabica' | 'decimal'
}

/**
 * Oito escolas de escrita jurídica brasileira. Os traços são descrições gerais de estilo
 * (estrutura, ritmo, densidade de citação), não reprodução de obra nenhuma.
 */
export const ESCOLAS: Escola[] = [
  {
    id: 'classica', nome: 'Clássica erudita',
    descricao: 'Períodos longos e bem articulados, vocabulário rico, doutrina clássica e tom solene.',
    parametros: { frase: 33, ritmo: 12, paragrafo: 5, doutrina: 4, jurisprudencia: 1.5, pessoalidade: 0.2, retorica: 0.7, latinismo: 0.7 },
    aberturas: ['parte da natureza do instituto', 'situa a questão na tradição do direito civil'],
    fechos: ['retoma o princípio que governa o caso', 'conclui com síntese solene do direito invocado'],
    numeracao: 'romana',
  },
  {
    id: 'didatica', nome: 'Didática constitucional',
    descricao: 'Frases curtas, ideia por parágrafo, enumerações claras ("em primeiro lugar", "em segundo lugar"), linguagem acessível.',
    parametros: { frase: 18, ritmo: 6, paragrafo: 3, doutrina: 1.5, jurisprudencia: 2.5, pessoalidade: 0.6, retorica: 0.3, latinismo: 0.1 },
    aberturas: ['anuncia em uma frase a tese e os pontos que vai demonstrar', 'resume a controvérsia em linguagem simples'],
    fechos: ['recapitula os pontos demonstrados em lista curta', 'fecha com a consequência prática da tese'],
    numeracao: 'arabica',
  },
  {
    id: 'processualista', nome: 'Processualista sistemática',
    descricao: 'Estrutura rigorosa por pressupostos e requisitos, remissões precisas ao CPC, precedentes qualificados (temas repetitivos, súmulas).',
    parametros: { frase: 24, ritmo: 7, paragrafo: 4, doutrina: 2.5, jurisprudencia: 4, pessoalidade: 0.3, retorica: 0.15, latinismo: 0.35 },
    aberturas: ['demonstra primeiro o cabimento e a tempestividade', 'organiza o mérito pelos requisitos legais, um a um'],
    fechos: ['amarra cada requisito ao pedido correspondente', 'indica o precedente vinculante aplicável'],
    numeracao: 'decimal',
  },
  {
    id: 'civil-constitucional', nome: 'Civil-constitucional',
    descricao: 'Lê o contrato à luz da função social, da boa-fé objetiva e da dignidade; argumentação por princípios com ancoragem na lei.',
    parametros: { frase: 27, ritmo: 9, paragrafo: 4, doutrina: 3.5, jurisprudencia: 2.5, pessoalidade: 0.35, retorica: 0.45, latinismo: 0.25 },
    aberturas: ['parte da função econômica e social do contrato', 'mostra como a boa-fé objetiva orienta a leitura da cláusula'],
    fechos: ['harmoniza a solução com a Constituição e o Código Civil', 'mostra o equilíbrio contratual alcançado pelo pedido'],
    numeracao: 'romana',
  },
  {
    id: 'pragmatica', nome: 'Pragmática de tribunal superior',
    descricao: 'Objetiva, vai direto ao ponto decisivo, prioriza a jurisprudência dominante e a consequência prática da decisão.',
    parametros: { frase: 20, ritmo: 6, paragrafo: 3, doutrina: 0.8, jurisprudencia: 4.5, pessoalidade: 0.25, retorica: 0.1, latinismo: 0.15 },
    aberturas: ['começa pelo ponto que decide a causa', 'apresenta o entendimento consolidado do tribunal e encaixa o caso'],
    fechos: ['mostra que o caso se ajusta ao precedente', 'aponta o resultado prático e o risco de decisão contrária'],
    numeracao: 'arabica',
  },
  {
    id: 'empresarial', nome: 'Corporativa de grande banca',
    descricao: 'Sumário executivo no início, seções curtas com títulos informativos, linguagem de negócios, riscos e alternativas explícitos.',
    parametros: { frase: 21, ritmo: 7, paragrafo: 3, doutrina: 1, jurisprudencia: 2, pessoalidade: 0.5, retorica: 0.1, latinismo: 0.05 },
    aberturas: ['abre com sumário executivo de três frases', 'apresenta o problema, o impacto e a solução proposta'],
    fechos: ['fecha com quadro de riscos e próximos passos', 'resume o que se pede em tópicos objetivos'],
    numeracao: 'decimal',
  },
  {
    id: 'combativa', nome: 'Advocacia combativa',
    descricao: 'Narrativa forte dos fatos, ênfase na injustiça concreta, perguntas retóricas pontuais e frases curtas de impacto alternadas com longas.',
    parametros: { frase: 22, ritmo: 14, paragrafo: 4, doutrina: 1.5, jurisprudencia: 3, pessoalidade: 0.75, retorica: 0.85, latinismo: 0.2 },
    aberturas: ['abre com o fato mais grave, narrado com concretude', 'contrapõe o que foi prometido ao que foi entregue'],
    fechos: ['fecha com frase curta que resume a injustiça a corrigir', 'mostra o dano de não decidir agora'],
    numeracao: 'romana',
  },
  {
    id: 'imobiliaria', nome: 'Imobiliária técnica',
    descricao: 'Precisão de matrícula, cláusula, índice e prazo; remissões à Lei do Inquilinato e à Lei de Registros; tabelas de valores quando cabem.',
    parametros: { frase: 23, ritmo: 8, paragrafo: 3, doutrina: 2, jurisprudencia: 3, pessoalidade: 0.3, retorica: 0.15, latinismo: 0.15 },
    aberturas: ['identifica imóvel, matrícula, contrato e cláusula em discussão', 'parte da cronologia do contrato com datas e valores'],
    fechos: ['liga cada valor ou prazo ao dispositivo legal e à cláusula', 'resume o débito ou a obrigação em tabela antes dos pedidos'],
    numeracao: 'arabica',
  },
]

/**
 * Referências de escrita: juristas brasileiros de grande influência, organizados por critérios
 * públicos (ministros do STF e do STJ, doutrinadores mais adotados nas pós-graduações e mais
 * citados em decisões). Servem para nomear as escolas; o redator nunca imita frases de ninguém.
 */
export const REFERENCIAS: { nome: string; area: string; escola: Escola['id'] }[] = [
  { nome: 'Rui Barbosa', area: 'Constitucional', escola: 'classica' },
  { nome: 'Pontes de Miranda', area: 'Civil e processo', escola: 'classica' },
  { nome: 'Clóvis Beviláqua', area: 'Civil', escola: 'classica' },
  { nome: 'Miguel Reale', area: 'Teoria do direito e Civil', escola: 'classica' },
  { nome: 'Orlando Gomes', area: 'Contratos', escola: 'classica' },
  { nome: 'Caio Mário da Silva Pereira', area: 'Civil', escola: 'classica' },
  { nome: 'Washington de Barros Monteiro', area: 'Civil', escola: 'classica' },
  { nome: 'Celso de Mello', area: 'Constitucional (STF)', escola: 'classica' },
  { nome: 'Luís Roberto Barroso', area: 'Constitucional (STF)', escola: 'didatica' },
  { nome: 'José Afonso da Silva', area: 'Constitucional', escola: 'didatica' },
  { nome: 'Paulo Bonavides', area: 'Constitucional', escola: 'didatica' },
  { nome: 'Cármen Lúcia', area: 'Constitucional (STF)', escola: 'didatica' },
  { nome: 'Flávio Tartuce', area: 'Civil', escola: 'didatica' },
  { nome: 'Pablo Stolze Gagliano', area: 'Civil', escola: 'didatica' },
  { nome: 'Carlos Roberto Gonçalves', area: 'Civil', escola: 'didatica' },
  { nome: 'Luiz Fux', area: 'Processo civil (STF)', escola: 'processualista' },
  { nome: 'Fredie Didier Jr.', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Humberto Theodoro Júnior', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Cândido Rangel Dinamarco', area: 'Processo civil', escola: 'processualista' },
  { nome: 'José Carlos Barbosa Moreira', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Ada Pellegrini Grinover', area: 'Processo coletivo', escola: 'processualista' },
  { nome: 'Teresa Arruda Alvim', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Luiz Guilherme Marinoni', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Cassio Scarpinella Bueno', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Daniel Amorim Assumpção Neves', area: 'Processo civil', escola: 'processualista' },
  { nome: 'Nelson Nery Junior', area: 'Processo e Civil', escola: 'processualista' },
  { nome: 'Gustavo Tepedino', area: 'Civil-constitucional', escola: 'civil-constitucional' },
  { nome: 'Anderson Schreiber', area: 'Civil-constitucional', escola: 'civil-constitucional' },
  { nome: 'Judith Martins-Costa', area: 'Boa-fé e contratos', escola: 'civil-constitucional' },
  { nome: 'Paulo Lôbo', area: 'Civil e Família', escola: 'civil-constitucional' },
  { nome: 'Maria Celina Bodin de Moraes', area: 'Responsabilidade civil', escola: 'civil-constitucional' },
  { nome: 'Nelson Rosenvald', area: 'Civil', escola: 'civil-constitucional' },
  { nome: 'Ingo Wolfgang Sarlet', area: 'Direitos fundamentais', escola: 'civil-constitucional' },
  { nome: 'Gilmar Mendes', area: 'Constitucional (STF)', escola: 'civil-constitucional' },
  { nome: 'Nancy Andrighi', area: 'Direito privado (STJ)', escola: 'pragmatica' },
  { nome: 'Luis Felipe Salomão', area: 'Direito privado (STJ)', escola: 'pragmatica' },
  { nome: 'Paulo de Tarso Sanseverino', area: 'Direito privado (STJ)', escola: 'pragmatica' },
  { nome: 'Alexandre de Moraes', area: 'Constitucional (STF)', escola: 'pragmatica' },
  { nome: 'Hely Lopes Meirelles', area: 'Administrativo', escola: 'pragmatica' },
  { nome: 'Paulo de Barros Carvalho', area: 'Tributário', escola: 'processualista' },
  { nome: 'Fábio Ulhoa Coelho', area: 'Empresarial', escola: 'empresarial' },
  { nome: 'Rubens Requião', area: 'Empresarial', escola: 'empresarial' },
  { nome: 'Modesto Carvalhosa', area: 'Societário', escola: 'empresarial' },
  { nome: 'Fábio Konder Comparato', area: 'Empresarial e Constitucional', escola: 'empresarial' },
  { nome: 'Sobral Pinto', area: 'Advocacia', escola: 'combativa' },
  { nome: 'Evandro Lins e Silva', area: 'Advocacia criminal', escola: 'combativa' },
  { nome: 'Lenio Streck', area: 'Hermenêutica', escola: 'combativa' },
  { nome: 'Carlos Ayres Britto', area: 'Constitucional (STF)', escola: 'combativa' },
  { nome: 'Sylvio Capanema de Souza', area: 'Locação (Lei 8.245/91)', escola: 'imobiliaria' },
  { nome: 'Gildo dos Santos', area: 'Locação', escola: 'imobiliaria' },
  { nome: 'Arnaldo Rizzardo', area: 'Contratos e imobiliário', escola: 'imobiliaria' },
  { nome: 'Maria Helena Diniz', area: 'Civil e registros', escola: 'imobiliaria' },
  { nome: 'Sílvio de Salvo Venosa', area: 'Civil e locação', escola: 'imobiliaria' },
]

/**
 * Padrão de formatação: convergência de práticas públicas de grandes bancas brasileiras
 * (Pinheiro Neto, Mattos Filho, Machado Meyer, TozziniFreire, Demarest, BMA, Lefosse,
 * Veirano, Stocche Forbes, Cescon Barrieu, os mais citados nos rankings Análise Advocacia
 * e Chambers), das normas ABNT e das orientações do PJe. Não é o manual interno de nenhuma delas.
 */
export const FORMATACAO = {
  fonte: 'Times New Roman' as const,
  fonteAlternativa: 'Georgia' as const,
  corpo: 12,
  citacaoLonga: 11,
  notas: 10,
  entrelinhas: 1.5,
  margens: { superior: 3, inferior: 2, esquerda: 3, direita: 2 },
  recuoPrimeiraLinha: 2,
  recuoCitacao: 4,
  regras: [
    'Endereçamento em caixa alta, seguido de espaço para despacho.',
    'Qualificação das partes em um único parágrafo, com nomes em negrito e caixa alta.',
    'Títulos de seção numerados, em negrito e caixa alta; subtítulos em negrito.',
    'Parágrafos numerados nas peças longas, para facilitar a remissão pelo juiz.',
    'Citação com mais de três linhas em bloco recuado de 4 cm, fonte menor, sem aspas.',
    'Precedentes com tribunal, classe, número, relator, órgão julgador e data.',
    'Negrito com moderação; nada de sublinhado e itálico só para estrangeirismos.',
    'Pedidos em alíneas (a, b, c), cada um em uma linha, verbos no infinitivo.',
    'Fecho com local, data, nome do advogado e número da OAB.',
  ],
}

/** Conectivos agrupados por função; a rotação escolhe alguns de cada grupo e veta os demais. */
export const CONECTIVOS: Record<string, string[]> = {
  adicao: ['além disso', 'ademais', 'some-se a isso', 'acresce que', 'não bastasse', 'também', 'de igual modo', 'soma-se a esse quadro'],
  oposicao: ['contudo', 'todavia', 'no entanto', 'entretanto', 'ocorre que', 'sucede que', 'ainda assim', 'em sentido contrário'],
  conclusao: ['portanto', 'assim', 'por isso', 'logo', 'dessa forma', 'por conseguinte', 'daí resulta que', 'em suma'],
  causa: ['porque', 'uma vez que', 'já que', 'visto que', 'na medida em que', 'dado que', 'pois'],
  exemplo: ['por exemplo', 'é o caso de', 'a título ilustrativo', 'veja-se', 'basta lembrar'],
  enfase: ['é dizer', 'vale dizer', 'em outras palavras', 'note-se', 'convém frisar', 'importa sublinhar'],
}

/** Vícios que denunciam texto padronizado: o redator é instruído a evitá-los. */
export const VICIOS = [
  'abrir parágrafos seguidos com o mesmo conectivo',
  'repetir "outrossim", "destarte" ou "ademais" mais de uma vez na peça',
  'listas com sempre três itens',
  'frases todas do mesmo tamanho',
  'fórmulas vazias como "é de suma importância" ou "cumpre salientar"',
  'adjetivação em série ("clara, evidente e inequívoca")',
  'concluir cada seção com resumo do que acabou de ser dito',
  'travessões em excesso',
]

// ---------- Matemática da rotação ----------

/** Gerador pseudoaleatório reprodutível (mulberry32): mesma semente, mesmo perfil. */
export function gerador(semente: number) {
  let a = semente >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Hash FNV-1a de 32 bits, para transformar texto em semente. */
export function hash32(s: string) {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) }
  return h >>> 0
}

/** Normal padrão por Box-Muller. */
function normal(r: () => number) {
  const u = Math.max(r(), 1e-12), v = r()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Pesos de Dirichlet(α) via Gamma(α,1) (Marsaglia-Tsang para α ≥ 1, com reforço para α < 1). */
function gama(alfa: number, r: () => number): number {
  if (alfa < 1) return gama(alfa + 1, r) * Math.pow(Math.max(r(), 1e-12), 1 / alfa)
  const d = alfa - 1 / 3, c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x = 0, v = 0
    do { x = normal(r); v = 1 + c * x } while (v <= 0)
    v = v * v * v
    const u = r()
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}

const limitar = (k: keyof Parametros, v: number) => Math.min(LIMITES[k][1], Math.max(LIMITES[k][0], v))
const normalizado = (p: Parametros) => CHAVES.map(k => (p[k] - LIMITES[k][0]) / (LIMITES[k][1] - LIMITES[k][0]))

/** Distância euclidiana entre perfis, com cada eixo levado a 0–1. */
export function distancia(a: Parametros, b: Parametros) {
  const x = normalizado(a), y = normalizado(b)
  return Math.sqrt(x.reduce((s, xi, i) => s + (xi - y[i]!) ** 2, 0) / x.length)
}

export interface Perfil {
  semente: number
  /** Escolas que entraram na mistura, com o peso de cada uma (soma 1). */
  mistura: { id: string; nome: string; peso: number }[]
  parametros: Parametros
  conectivos: Record<string, string[]>
  abertura: string
  fecho: string
  numeracao: Escola['numeracao']
  /** Menor distância às peças anteriores (0 = idêntica, quanto maior mais diferente). */
  distanciaMinima: number
  tentativas: number
}

export const DISTANCIA_MINIMA = 0.12

/** Escolas preferidas por área: entram com peso a priori maior. */
const AFINIDADE: Record<string, Escola['id'][]> = {
  imobiliario: ['imobiliaria', 'civil-constitucional', 'pragmatica'],
  condominial: ['imobiliaria', 'pragmatica'],
  registral: ['imobiliaria', 'classica'],
  empresarial: ['empresarial', 'pragmatica'],
  compliance: ['empresarial', 'didatica'],
  consumidor: ['combativa', 'civil-constitucional'],
  trabalhista: ['combativa', 'pragmatica'],
  penal: ['combativa', 'classica'],
  familia: ['civil-constitucional', 'didatica'],
  civel: ['civil-constitucional', 'processualista'],
}

/** "Cível", "Família e sucessões", "Imobiliário": vira a chave sem acento usada nas tabelas de afinidade. */
export function chaveArea(area?: string | null) {
  const a = String(area ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (/famil|sucess|inventar/.test(a)) return 'familia'
  if (/imobili|locac|condomin/.test(a)) return /condomin/.test(a) ? 'condominial' : 'imobiliario'
  if (/tribut|fiscal/.test(a)) return 'tributario'
  if (/trabalh/.test(a)) return 'trabalhista'
  if (/consum/.test(a)) return 'consumidor'
  if (/empres|societ|recupera/.test(a)) return 'empresarial'
  if (/penal|crim/.test(a)) return 'penal'
  if (/constituc|administr|fazenda|public/.test(a)) return 'publico'
  if (/registr/.test(a)) return 'registral'
  if (/complian/.test(a)) return 'compliance'
  if (/civ/.test(a)) return 'civel'
  return a
}

/** Um redator da banca: um modo de escrever, descrito pelo método de um grande jurista brasileiro. */
export interface Redator {
  id: string
  /** Jurista cuja tradição de escrita serve de referência. O texto nunca é atribuído a ele. */
  referencia: string
  especialidade: string
  escola: Escola['id']
  /** Áreas (chaveArea) em que este redator escreve primeiro. */
  areas: string[]
  /** Palavras do título da tarefa que chamam este redator (recurso, execução, despejo...). */
  pecas: RegExp
  /** Como ele constrói a peça: vai para as instruções do redator. */
  metodo: string
  /** O que se aproveita dessa tradição. */
  forcas: string
  /** Os defeitos de estilo dessa tradição, que o robô é proibido de reproduzir. */
  evitar: string
}

/**
 * Banca de redatores: dez modos de escrever, cada um inspirado no método de um jurista de referência.
 * O robô escolhe o redator pela área e pelo tipo da peça e faz rodízio para não repetir o mesmo em seguida.
 * São referências de estilo e de método: nenhuma peça é escrita, revisada ou endossada por essas pessoas.
 */
export const BANCA: Redator[] = [
  { id: 'rui-barbosa', referencia: 'Rui Barbosa', especialidade: 'Constitucional e tribunais superiores', escola: 'classica', areas: ['publico', 'penal'], pecas: /mandado de seguran|habeas|extraordin|constitucional/i,
    metodo: 'Constrói a peça como defesa de um direito: expõe o fato com gravidade, ergue a tese sobre a Constituição e a encadeia em períodos amplos e bem articulados, com vocabulário preciso e fecho solene.',
    forcas: 'força do argumento, domínio do vernáculo, arquitetura do raciocínio', evitar: 'prolixidade, erudição exibida, períodos que se perdem, citação em língua estrangeira sem tradução' },
  { id: 'pontes-de-miranda', referencia: 'Pontes de Miranda', especialidade: 'Civil, família e sucessões', escola: 'classica', areas: ['familia', 'registral', 'civel'], pecas: /invent[aá]rio|partilha|sucess|usucapi|nulidade|anula/i,
    metodo: 'Classifica antes de argumentar: identifica a natureza do fato jurídico, separa existência, validade e eficácia, e só então tira a consequência, com rigor conceitual e remissão exata ao artigo.',
    forcas: 'precisão conceitual, classificação rigorosa, remissão exata à lei', evitar: 'hermetismo, neologismos, frases truncadas, excesso de parênteses e de remissões cruzadas' },
  { id: 'barbosa-moreira', referencia: 'José Carlos Barbosa Moreira', especialidade: 'Processo civil e recursos', escola: 'processualista', areas: ['civel'], pecas: /recurso|apela|agravo|embargos|contrarraz|ac[oó]rd[aã]o|decis[aã]o/i,
    metodo: 'Abre pelo cabimento, pela tempestividade e pelo interesse; depois ataca a decisão ponto por ponto, na ordem em que foi fundamentada, com frases limpas e sem um adjetivo sobrando.',
    forcas: 'clareza, concisão, ordem lógica, elegância sem enfeite', evitar: 'ironia, tom professoral, digressão teórica que não serve ao caso' },
  { id: 'barroso', referencia: 'Luís Roberto Barroso', especialidade: 'Constitucional e direito público', escola: 'didatica', areas: ['publico', 'compliance'], pecas: /fazenda|munic[ií]pio|\bestado do\b|\buni[aã]o federal\b|administrativ/i,
    metodo: 'Anuncia a tese em uma frase e a demonstra em três ou quatro proposições numeradas, uma ideia por parágrafo, em linguagem que o cliente entenderia, fechando com a consequência prática.',
    forcas: 'didatismo, síntese, estrutura visível, linguagem acessível', evitar: 'frases de efeito, generalidades de princípio sem lei que as sustente, tom de palestra' },
  { id: 'tepedino', referencia: 'Gustavo Tepedino', especialidade: 'Contratos e responsabilidade civil', escola: 'civil-constitucional', areas: ['civel', 'familia'], pecas: /contrat|indeniza|responsabilidade|dano|obriga/i,
    metodo: 'Lê o contrato e o dano à luz da boa-fé objetiva, da função social e da dignidade, sempre ancorando o princípio em um artigo do Código Civil e na situação concreta das partes.',
    forcas: 'leitura sistemática, equilíbrio entre princípio e regra, sensibilidade ao caso concreto', evitar: 'abstração demais, princípio usado no lugar da prova, parágrafos longos de teoria' },
  { id: 'nancy-andrighi', referencia: 'Nancy Andrighi', especialidade: 'Consumidor e direito privado no STJ', escola: 'pragmatica', areas: ['consumidor', 'civel'], pecas: /consum|banc|plano de sa[uú]de|especial|r[eé]plica|contesta/i,
    metodo: 'Vai direto ao ponto que decide a causa: delimita a controvérsia, mostra o entendimento consolidado do tribunal, encaixa o caso nele e aponta o efeito concreto da decisão para a parte.',
    forcas: 'objetividade, foco no ponto decisivo, domínio do precedente, atenção ao efeito prático', evitar: 'empilhar ementas, colar trechos longos de julgados, precedente sem demonstrar a semelhança com o caso' },
  { id: 'capanema', referencia: 'Sylvio Capanema de Souza', especialidade: 'Locação e imobiliário', escola: 'imobiliaria', areas: ['imobiliario', 'condominial'], pecas: /despejo|loca[cç]|aluguel|renovat|revisional|condom/i,
    metodo: 'Parte do contrato, da cláusula e da cronologia, com datas e valores exatos; liga cada um ao artigo da Lei do Inquilinato e resume o débito ou a obrigação antes dos pedidos.',
    forcas: 'precisão de datas, valores e cláusulas, conhecimento da prática forense, tom direto', evitar: 'casuísmo sem fundamento legal, coloquialidade, tabela sem explicação' },
  { id: 'ulhoa-coelho', referencia: 'Fábio Ulhoa Coelho', especialidade: 'Empresarial e societário', escola: 'empresarial', areas: ['empresarial'], pecas: /societ|s[oó]cio|fal[eê]ncia|recupera[cç][aã]o judicial|t[ií]tulo|cheque|duplicata/i,
    metodo: 'Abre com um resumo de três frases, trata a questão pelo risco e pelo custo para a empresa, usa seções curtas com títulos que informam e fecha com o que se pede em tópicos.',
    forcas: 'visão de negócio, clareza executiva, seções curtas, quantificação do risco', evitar: 'jargão corporativo, anglicismos, simplificação que omite o fundamento legal' },
  { id: 'barros-carvalho', referencia: 'Paulo de Barros Carvalho', especialidade: 'Tributário e execução fiscal', escola: 'processualista', areas: ['tributario'], pecas: /fiscal|tribut|imposto|iptu|icms|\biss\b|d[ií]vida ativa|pr[eé]-executividade/i,
    metodo: 'Decompõe a exigência nos seus elementos (fato gerador, sujeito, base, alíquota, tempo) e testa cada um contra a lei e a prova, com linguagem exata e conclusão que decorre do exame.',
    forcas: 'rigor analítico, decomposição da norma, exatidão terminológica', evitar: 'vocabulário de lógica e semiótica, abstração, frases que só o especialista entende' },
  { id: 'sobral-pinto', referencia: 'Sobral Pinto', especialidade: 'Advocacia de defesa e trabalhista', escola: 'combativa', areas: ['trabalhista', 'penal', 'consumidor'], pecas: /defesa|tutela|urg[eê]ncia|liminar|alega[cç][oõ]es finais|memoriais|reclama/i,
    metodo: 'Narra o fato mais grave com concretude, mostra a injustiça a corrigir e sustenta a tese com firmeza e lealdade, alternando frases curtas de impacto com períodos de fundamentação.',
    forcas: 'coragem, narrativa concreta, firmeza com lealdade processual', evitar: 'indignação em excesso, ataque pessoal à parte ou ao juiz, adjetivação, pergunta retórica repetida' },
]

/**
 * Escolhe o redator da banca para uma peça: soma pontos pela área e pelo tipo da peça (título da tarefa)
 * e, em caso de empate ou repetição, prefere quem não escreveu as últimas peças.
 */
export function escolherRedator(opcoes: { area?: string | null; titulo?: string | null; anteriores?: string[]; semente?: number }): Redator {
  const area = chaveArea(opcoes.area)
  const titulo = String(opcoes.titulo ?? '')
  const recentes = opcoes.anteriores ?? []
  const r = gerador(opcoes.semente ?? 1)
  const pontuados = BANCA.map(b => {
    const posicao = b.areas.indexOf(area)
    const pontos = (posicao === 0 ? 4 : posicao > 0 ? 2.5 : 0) + (b.pecas.test(titulo) ? 3 : 0) - (recentes[0] === b.id ? 2.5 : recentes.slice(1, 3).includes(b.id) ? 1 : 0) + r() * 0.5
    return { b, pontos }
  })
  return pontuados.sort((x, y) => y.pontos - x.pontos)[0]!.b
}

/** Bloco das instruções com o redator escolhido. */
export function instrucoesDoRedator(b: Redator) {
  return `REDATOR DESTA PEÇA (banca de redatores do escritório): tradição de escrita de ${b.referencia} (${b.especialidade}).
Método: ${b.metodo}
Mantenha as forças dessa tradição: ${b.forcas}.
É proibido reproduzir as fraquezas dela: ${b.evitar}.
Siga o método e o padrão de qualidade dessa tradição. Não copie trechos de obra nenhuma, não cite ${b.referencia} como autor do texto e não lhe atribua frases; se citar obra dele como doutrina, só com certeza, senão "[doutrina a conferir]".`
}

/** As dez técnicas de narrativa (storytelling forense) aplicadas à exposição dos fatos de toda peça. */
export const NARRATIVA: { nome: string; regra: string }[] = [
  { nome: 'Tema do caso', regra: 'uma frase, logo no começo, que diga do que o caso trata e por que o cliente tem razão; tudo o mais serve a ela' },
  { nome: 'Abertura pelo que está em jogo', regra: 'antes da lei, dizer quem é o cliente e o que ele pode perder ou ganhar com a decisão' },
  { nome: 'Pessoa, não rótulo', regra: 'chamar o cliente pelo nome ou pelo papel na vida (a locadora, o pai, a empresa), sem repetir "o autor" a cada linha' },
  { nome: 'Ordem do tempo', regra: 'contar na ordem em que aconteceu, com data em cada passo decisivo' },
  { nome: 'Fato concreto no lugar do adjetivo', regra: 'valor, data, documento e conduta; nada de "absurdo", "flagrante" ou "inaceitável"' },
  { nome: 'Conflito claro', regra: 'mostrar o que o cliente buscava, o que a outra parte fez e o dano que resultou' },
  { nome: 'Fato desfavorável enfrentado', regra: 'tratar de frente o ponto fraco e explicar por que não muda o resultado, em vez de escondê-lo' },
  { nome: 'Cada fato com sua prova', regra: 'todo fato relevante aponta o documento ou a folha dos autos; se faltar, vai entre colchetes' },
  { nome: 'Ponte para o direito', regra: 'cada fato narrado reaparece na fundamentação; fato que não sustenta pedido sai do texto' },
  { nome: 'Fecho pela consequência', regra: 'terminar mostrando ao julgador o efeito prático de acolher ou negar o pedido' },
]

/** Bloco das instruções com as dez técnicas de narrativa. */
export function instrucoesDeNarrativa() {
  return `NARRATIVA DOS FATOS (dez técnicas; aplique todas na medida do tipo da peça):
${NARRATIVA.map((n, i) => `${i + 1}. ${n.nome}: ${n.regra}.`).join('\n')}
A narrativa nunca cria fato: usa só o que está na publicação e nos dados do caso; o que faltar vai entre colchetes.`
}

export interface TomDoJulgador {
  /** Palavras lidas do próprio julgador (decisões e despachos publicados). */
  amostra: number
  suficiente: boolean
  extensao: 'conciso' | 'medio' | 'extenso'
  tracos: ('leve' | 'humanista' | 'tecnico' | 'rigoroso')[]
}

const MARCAS_DO_JULGADOR: Record<TomDoJulgador['tracos'][number], RegExp> = {
  leve: /!|\bora,|convenhamos|pasme|francamente|diga-se de passagem|como diria|curios[oa]mente|salta aos olhos|com o perdao d|poeta|\bverso\b/g,
  humanista: /dignidade|sofrimento|vulnerab|sensib|humanidade|afeto|melhor interesse|hipossufici|drama|angustia/g,
  tecnico: /\bart\.|§|sumula|tema \d|precedente|repetitiv|enunciado|\bresp\b|informativo/g,
  rigoroso: /preclus|intempestiv|nao conheco|inepcia|sob pena de|deserc|indefiro|litigancia de ma-fe|advirto/g,
}

/**
 * Lê o modo de escrever do julgador nas decisões e despachos dele já publicados no processo.
 * É leitura de texto público, não perfil psicológico. Com pouca amostra, não conclui nada.
 */
export function tomDoJulgador(textos: string[]): TomDoJulgador {
  const bruto = textos.join('\n')
  const t = bruto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const palavras = t.split(/\s+/).filter(Boolean).length
  const frases = Math.max(1, t.split(/[.;!?]+\s/).filter(f => f.trim().split(/\s+/).length > 2).length)
  const media = palavras / frases
  const suficiente = palavras >= 150
  const porMil = (re: RegExp) => ((t.match(re) ?? []).length * 1000) / Math.max(1, palavras)
  const limites: Record<TomDoJulgador['tracos'][number], number> = { leve: 4, humanista: 4, tecnico: 12, rigoroso: 5 }
  const tracos = suficiente ? (Object.keys(MARCAS_DO_JULGADOR) as TomDoJulgador['tracos']).filter(k => porMil(MARCAS_DO_JULGADOR[k]) >= limites[k]) : []
  return { amostra: palavras, suficiente, extensao: media < 20 ? 'conciso' : media > 34 ? 'extenso' : 'medio', tracos }
}

/** Bloco das instruções que ajusta o tom da peça a quem vai julgá-la. */
export function instrucoesDoJulgador(tom: TomDoJulgador, orgao?: string | null) {
  const quem = orgao ? ` (${orgao})` : ''
  const base = `TOM AJUSTADO AO JULGADOR${quem}: a peça é escrita para quem vai decidir.`
  const respeito = 'Em qualquer caso: respeito ao julgador e à parte contrária; nunca piada, nunca ironia contra pessoa alguma, nunca imitar ou comentar o estilo do julgador.'
  if (!tom.suficiente) return `${base} Há pouco texto do julgador nos autos para conhecer o estilo dele: use tom sóbrio, direto e respeitoso, sem humor. ${respeito}`
  const linhas = [
    tom.extensao === 'conciso' ? 'O julgador escreve curto: vá direto ao ponto, parágrafos breves, pedido logo visível, sem repetição.' : tom.extensao === 'extenso' ? 'O julgador fundamenta com fôlego: desenvolva o raciocínio por inteiro, sem pular etapas.' : 'O julgador escreve em extensão média: equilíbrio entre síntese e fundamentação.',
    tom.tracos.includes('tecnico') ? 'Ele decide com artigo, súmula e precedente: ancore cada tese na norma e no precedente aplicável (marcado "[conferir no tribunal]").' : '',
    tom.tracos.includes('humanista') ? 'Ele dá peso ao lado humano do caso: deixe a narrativa mostrar as pessoas e a consequência concreta da decisão.' : '',
    tom.tracos.includes('rigoroso') ? 'Ele é rigoroso com forma e prazo: demonstre tempestividade, cabimento e cumprimento de cada requisito logo no início.' : '',
    tom.tracos.includes('leve') ? 'Ele escreve com leveza: cabe, no máximo uma vez, uma imagem bem escolhida ou frase de espírito elegante, se servir ao argumento.' : 'Ele escreve em tom sério: nenhuma leveza, nenhuma figura de efeito.',
  ].filter(Boolean)
  return `${base} Leitura feita sobre ${tom.amostra} palavras de decisões e despachos dele neste processo.\n${linhas.map(l => `- ${l}`).join('\n')}\n${respeito}`
}

/**
 * Sorteia o perfil de escrita de uma peça.
 * 1. Escolhe 2 ou 3 escolas (com preferência pela área) e pesos de Dirichlet.
 * 2. Mistura os parâmetros pela média ponderada e soma ruído gaussiano (σ = 8% da faixa).
 * 3. Se ficar a menos de DISTANCIA_MINIMA de alguma das peças anteriores, sorteia de novo
 *    (até 24 vezes) e fica com o perfil mais distante.
 * 4. Sorteia conectivos (2 por grupo), evitando os usados nas peças anteriores.
 */
export function sortearPerfil(opcoes: { semente: number; especialidade?: string; escolas?: Escola['id'][]; anteriores?: Perfil[] | Parametros[]; usados?: string[] }): Perfil {
  const r = gerador(opcoes.semente)
  const anteriores = (opcoes.anteriores ?? []).map(a => ('parametros' in a ? a.parametros : a) as Parametros)
  const preferidas = opcoes.escolas?.length ? opcoes.escolas : AFINIDADE[chaveArea(opcoes.especialidade)] ?? []
  let melhor: Perfil | null = null

  for (let t = 1; t <= 24; t++) {
    const quantas = r() < 0.6 ? 2 : 3
    const pool = [...ESCOLAS]
    const escolhidas: Escola[] = []
    while (escolhidas.length < quantas) {
      const pesos = pool.map(e => (preferidas.includes(e.id) ? (opcoes.escolas?.length ? 8 : 3) : 1))
      let alvo = r() * pesos.reduce((s, p) => s + p, 0)
      let i = 0
      while (alvo > pesos[i]! && i < pool.length - 1) { alvo -= pesos[i]!; i++ }
      escolhidas.push(pool.splice(i, 1)[0]!)
    }
    const brutos = escolhidas.map(() => gama(1.2, r))
    const soma = brutos.reduce((s, x) => s + x, 0)
    const pesos = brutos.map(x => x / soma)
    const parametros = {} as Parametros
    for (const k of CHAVES) {
      const media = escolhidas.reduce((s, e, i) => s + e.parametros[k] * pesos[i]!, 0)
      const faixa = LIMITES[k][1] - LIMITES[k][0]
      parametros[k] = Math.round(limitar(k, media + normal(r) * faixa * 0.08) * 100) / 100
    }
    const dMin = anteriores.length ? Math.min(...anteriores.map(a => distancia(a, parametros))) : 1
    const dominante = escolhidas[pesos.indexOf(Math.max(...pesos))]!
    const candidato: Perfil = {
      semente: opcoes.semente,
      mistura: escolhidas.map((e, i) => ({ id: e.id, nome: e.nome, peso: Math.round(pesos[i]! * 100) / 100 })).sort((a, b) => b.peso - a.peso),
      parametros,
      conectivos: {},
      abertura: escolhidas[Math.floor(r() * escolhidas.length)]!.aberturas[Math.floor(r() * 2)]!,
      fecho: escolhidas[Math.floor(r() * escolhidas.length)]!.fechos[Math.floor(r() * 2)]!,
      numeracao: dominante.numeracao,
      distanciaMinima: Math.round(dMin * 1000) / 1000,
      tentativas: t,
    }
    if (!melhor || candidato.distanciaMinima > melhor.distanciaMinima) melhor = candidato
    if (dMin >= DISTANCIA_MINIMA) break
  }

  const usados = new Set((opcoes.usados ?? []).map(u => u.toLowerCase()))
  for (const [grupo, lista] of Object.entries(CONECTIVOS)) {
    const livres = lista.filter(c => !usados.has(c))
    const base = livres.length >= 2 ? livres : lista
    const embaralhada = [...base].sort(() => r() - 0.5)
    melhor!.conectivos[grupo] = embaralhada.slice(0, 2)
  }
  return melhor!
}

const nivel = (v: number, baixo: string, medio: string, alto: string) => (v < 0.34 ? baixo : v < 0.67 ? medio : alto)

/** Converte o perfil em instruções para o redator (bloco do prompt de sistema). */
export function instrucoesDoPerfil(p: Perfil) {
  const q = p.parametros
  const todos = Object.values(p.conectivos).flat()
  return `PERFIL DE ESCRITA DESTA PEÇA (sorteado para esta peça; a próxima terá outro):
- Escolas misturadas: ${p.mistura.map(m => `${m.nome} ${Math.round(m.peso * 100)}%`).join(', ')}.
- Referências de escrita desta peça (imite o método e a clareza, nunca copie texto nem atribua frases a eles): ${p.mistura.flatMap(m => REFERENCIAS.filter(r => r.escola === m.id).slice(0, 3).map(r => r.nome)).join(', ')}.
- Frases com cerca de ${Math.round(q.frase)} palavras em média, alternando curtas e longas (variação de ±${Math.round(q.ritmo)} palavras). Nunca deixe três frases seguidas do mesmo tamanho.
- Parágrafos de ${Math.max(2, Math.round(q.paragrafo - 1))} a ${Math.round(q.paragrafo + 1)} frases.
- Doutrina: cerca de ${q.doutrina.toFixed(1).replace('.', ',')} referência(s) a cada 1.000 palavras; jurisprudência: cerca de ${q.jurisprudencia.toFixed(1).replace('.', ',')}. Cite autor e obra só quando tiver certeza; caso contrário marque "[doutrina a conferir]". Precedentes sempre com "[conferir no tribunal]".
- Voz: ${nivel(q.pessoalidade, 'impessoal ("requer-se", "demonstra-se")', 'mista, predominando a impessoal', 'primeira pessoa do plural ("requeremos", "demonstraremos")')}. Tom: ${nivel(q.retorica, 'sóbrio e técnico', 'firme, com ênfase pontual', 'enfático, com até duas perguntas retóricas em toda a peça')}. Latinismos: ${nivel(q.latinismo, 'evite', 'só os consagrados', 'pode usar, traduzindo os menos comuns')}.
- Abertura do mérito: ${p.abertura}. Fecho antes dos pedidos: ${p.fecho}.
- Numeração das seções: ${p.numeracao === 'romana' ? 'romana (I, II, III)' : p.numeracao === 'decimal' ? 'decimal (1, 1.1, 1.2)' : 'arábica (1, 2, 3)'}.
- Conectivos preferidos nesta peça: ${todos.join(', ')}. Cada conectivo no máximo duas vezes.
- Evite: ${VICIOS.join('; ')}.
FORMATAÇÃO (padrão de grandes escritórios): ${FORMATACAO.regras.join(' ')}`
}

// ---------- Medição do texto produzido ----------

export interface Medida {
  palavras: number
  frases: number
  mediaFrase: number
  desvioFrase: number
  paragrafos: number
  /** Riqueza de vocabulário: palavras distintas / total (nas primeiras 1.000 palavras). */
  riqueza: number
  /** Conectivos encontrados e quantas vezes cada um. */
  conectivos: Record<string, number>
  /** Conectivo que mais se repete (vício quando > 2). */
  maiorRepeticao: number
}

/** Estilometria simples do texto final: confere se a peça seguiu o perfil sorteado. */
export function medirTexto(texto: string): Medida {
  const limpo = texto.replace(/\r/g, '')
  const paragrafos = limpo.split(/\n\s*\n/).filter(p => p.trim().length > 40).length
  const frases = limpo.split(/(?<=[.!?;])\s+(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ"“(])/).map(f => f.trim()).filter(f => f.split(/\s+/).length >= 3)
  const tamanhos = frases.map(f => f.split(/\s+/).length)
  const media = tamanhos.length ? tamanhos.reduce((s, x) => s + x, 0) / tamanhos.length : 0
  const desvio = tamanhos.length ? Math.sqrt(tamanhos.reduce((s, x) => s + (x - media) ** 2, 0) / tamanhos.length) : 0
  const palavras = limpo.toLowerCase().match(/[a-záéíóúâêôãõçà-]+/g) ?? []
  const amostra = palavras.slice(0, 1000)
  const minusculo = ` ${limpo.toLowerCase().replace(/\s+/g, ' ')} `
  const conectivos: Record<string, number> = {}
  for (const c of Object.values(CONECTIVOS).flat()) {
    if (c.length < 5) continue // "pois", "logo", "assim" aparecem em outros sentidos
    const n = minusculo.split(new RegExp(`[\\s,.;(]${c.replace(/[-]/g, '\\-')}[\\s,.;]`)).length - 1
    if (n) conectivos[c] = n
  }
  return {
    palavras: palavras.length,
    frases: frases.length,
    mediaFrase: Math.round(media * 10) / 10,
    desvioFrase: Math.round(desvio * 10) / 10,
    paragrafos,
    riqueza: amostra.length ? Math.round((new Set(amostra).size / amostra.length) * 1000) / 1000 : 0,
    conectivos,
    maiorRepeticao: Math.max(0, ...Object.values(conectivos)),
  }
}

/** Nota de aderência (0–100) entre o texto medido e o perfil pedido. */
export function aderencia(m: Medida, p: Perfil) {
  if (!m.frases) return 0
  const dFrase = Math.min(1, Math.abs(m.mediaFrase - p.parametros.frase) / p.parametros.frase)
  const dRitmo = Math.min(1, Math.abs(m.desvioFrase - p.parametros.ritmo) / p.parametros.ritmo)
  const penal = m.maiorRepeticao > 2 ? 0.15 : 0
  return Math.round(Math.max(0, 1 - 0.5 * dFrase - 0.35 * dRitmo - penal) * 100)
}

/**
 * Versão curta do perfil para textos que não são peças (pareceres, matrizes, diagnósticos,
 * respostas dos agentes): varia ritmo, voz, conectivos e evita vícios, sem mexer em
 * estrutura, números ou formatação exigidos por cada agente.
 */
export function instrucoesDeRedacao(p: Perfil) {
  const q = p.parametros
  return `REDAÇÃO DESTA RESPOSTA (rotação de estilo; a próxima terá outra):
- Frases com cerca de ${Math.round(Math.min(q.frase, 26))} palavras em média, alternando curtas e longas; nunca três frases seguidas do mesmo tamanho.
- Voz ${nivel(q.pessoalidade, 'impessoal', 'mista', 'na primeira pessoa do plural')}; tom ${nivel(q.retorica, 'sóbrio', 'firme', 'enfático, sem exagero')}.
- Conectivos preferidos: ${Object.values(p.conectivos).flat().join(', ')}. Cada um no máximo duas vezes.
- Evite: ${VICIOS.join('; ')}.
- Esta orientação muda só a redação: mantenha a estrutura, os números, as citações e o formato pedidos acima.`
}

/** Corta as amostras do autor para caber no prompt (peças: até 70 mil caracteres; demais textos: 15 mil). */
export function amostrasDoAutor(pecas: { titulo: string; texto: string }[], limite: number) {
  let total = 0
  const amostras: string[] = []
  for (const p of pecas) {
    const t = p.texto.slice(0, Math.max(0, limite - total)); if (!t) break
    total += t.length; amostras.push(`### ${p.titulo}\n${t}`)
  }
  return amostras
}
