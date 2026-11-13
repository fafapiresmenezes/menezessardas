import { supabase, supabaseConfigurado } from '@/lib/supabase'

export type Especialidade =
  | `nivel_${string}` | 'imobiliario' | 'condominial' | 'registral' | 'consumidor' | 'tributario' | 'trabalhista' | 'familia' | 'lgpd' | 'inovacao' | 'compliance' | 'empresarial' | 'previdenciario' | 'penal' | 'civel' | 'ambiental' | 'constitucional' | 'administrativo' | 'processo_civil' | 'processo_penal' | 'eleitoral' | 'bancario' | 'digital' | 'propriedade_intelectual' | 'internacional' | 'agrario' | 'saude' | 'concorrencial' | 'urbanistico' | 'energia' | 'securitario' | 'transito' | 'maritimo' | 'militar' | 'desportivo' | 'infancia_idoso' | 'direitos_humanos' | 'financeiro_publico' | 'arbitragem' | 'terceiro_setor' | 'sindical' | 'educacional' | 'recuperacao' | 'etica_advocacia' | 'teoria' | 'pesquisa' | 'geral'

export const ESPECIALIDADES: { valor: Especialidade; rotulo: string; descricao: string }[] = [
  { valor: 'imobiliario', rotulo: 'Imobiliário', descricao: 'Locação, comodato, compra e venda, garantias, despejo' },
  { valor: 'condominial', rotulo: 'Condominial', descricao: 'Convenção, assembleias, cotas, obras' },
  { valor: 'registral', rotulo: 'Registral e notarial', descricao: 'Matrícula, averbação, ITBI, usucapião' },
  { valor: 'consumidor', rotulo: 'Consumidor', descricao: 'Relações de consumo, vícios, cobranças indevidas, distrato, indenizações' },
  { valor: 'tributario', rotulo: 'Tributário', descricao: 'Impostos e contribuições, reforma tributária, defesas, execução fiscal, planejamento' },
  { valor: 'trabalhista', rotulo: 'Trabalhista', descricao: 'Contrato de trabalho, rescisão, verbas e reclamações' },
  { valor: 'familia', rotulo: 'Família e sucessões', descricao: 'Divórcio, alimentos, guarda, união estável, inventário' },
  { valor: 'lgpd', rotulo: 'LGPD', descricao: 'Dados de locatários, fiadores e fornecedores' },
  { valor: 'inovacao', rotulo: 'Inovação e sandboxes', descricao: 'Sandboxes regulatórios, startups, proptechs' },
  { valor: 'compliance', rotulo: 'ESG e compliance', descricao: 'Integridade, passivo ambiental, due diligence' },
  { valor: 'empresarial', rotulo: 'Empresarial e societário', descricao: 'Sociedades, contratos empresariais, recuperação judicial e falência' },
  { valor: 'previdenciario', rotulo: 'Previdenciário', descricao: 'Aposentadorias, benefícios do INSS, revisões' },
  { valor: 'penal', rotulo: 'Penal', descricao: 'Crimes, defesa, inquérito, execução penal' },
  { valor: 'civel', rotulo: 'Cível e contratos', descricao: 'Contratos em geral, responsabilidade civil, cobranças' },
  { valor: 'ambiental', rotulo: 'Ambiental', descricao: 'Licenciamento, passivo ambiental, áreas protegidas' },
  { valor: 'constitucional', rotulo: 'Constitucional', descricao: 'Direitos fundamentais, mandado de segurança, controle de constitucionalidade' },
  { valor: 'administrativo', rotulo: 'Administrativo e licitações', descricao: 'Licitações e contratos públicos, servidores, improbidade, concessões' },
  { valor: 'processo_civil', rotulo: 'Processo civil e recursos', descricao: 'Tutelas de urgência, execução, cumprimento de sentença, recursos ao STJ e STF' },
  { valor: 'processo_penal', rotulo: 'Processo penal e execução penal', descricao: 'Inquérito, prisão e liberdade, júri, recursos, execução da pena' },
  { valor: 'eleitoral', rotulo: 'Eleitoral', descricao: 'Registro de candidatura, propaganda, prestação de contas, inelegibilidade' },
  { valor: 'bancario', rotulo: 'Bancário e financeiro', descricao: 'Contratos bancários, juros, superendividamento, mercado de capitais' },
  { valor: 'digital', rotulo: 'Digital e tecnologia', descricao: 'Marco Civil da Internet, crimes digitais, inteligência artificial, comércio eletrônico' },
  { valor: 'propriedade_intelectual', rotulo: 'Propriedade intelectual', descricao: 'Marcas, patentes, direitos autorais, software e franquia' },
  { valor: 'internacional', rotulo: 'Internacional e comércio exterior', descricao: 'Tratados, contratos internacionais, sentença estrangeira, migração e aduana' },
  { valor: 'agrario', rotulo: 'Agrário e agronegócio', descricao: 'Arrendamento e parceria rural, CPR, crédito rural, regularização de terras' },
  { valor: 'saude', rotulo: 'Médico e da saúde', descricao: 'Planos de saúde, erro médico, SUS, medicamentos e bioética' },
  { valor: 'concorrencial', rotulo: 'Concorrencial e regulatório', descricao: 'CADE, agências reguladoras, atos de concentração, defesa da concorrência' },
  { valor: 'urbanistico', rotulo: 'Urbanístico', descricao: 'Estatuto da Cidade, plano diretor, zoneamento, loteamento e regularização' },
  { valor: 'energia', rotulo: 'Energia, mineração e infraestrutura', descricao: 'Setor elétrico, petróleo e gás, mineração, saneamento e PPPs' },
  { valor: 'securitario', rotulo: 'Seguros', descricao: 'Contrato de seguro, sinistro, resseguro, previdência privada' },
  { valor: 'transito', rotulo: 'Trânsito e transportes', descricao: 'Multas, CNH, acidentes, transporte de cargas e passageiros' },
  { valor: 'maritimo', rotulo: 'Marítimo, portuário e aeronáutico', descricao: 'Navegação, portos, transporte aéreo, responsabilidade do transportador' },
  { valor: 'militar', rotulo: 'Militar', descricao: 'Crimes militares, processo disciplinar, carreira e previdência dos militares' },
  { valor: 'desportivo', rotulo: 'Desportivo', descricao: 'Contratos de atletas, justiça desportiva, clubes e SAF' },
  { valor: 'infancia_idoso', rotulo: 'Infância, pessoa idosa e pessoa com deficiência', descricao: 'ECA, adoção, ato infracional, Estatuto da Pessoa Idosa, inclusão' },
  { valor: 'direitos_humanos', rotulo: 'Direitos humanos', descricao: 'Sistema interamericano, igualdade, combate à discriminação, grupos vulneráveis' },
  { valor: 'financeiro_publico', rotulo: 'Financeiro e contas públicas', descricao: 'Orçamento, responsabilidade fiscal, tribunais de contas, precatórios' },
  { valor: 'arbitragem', rotulo: 'Arbitragem e mediação', descricao: 'Cláusula arbitral, procedimento, mediação, acordos e negociação' },
  { valor: 'terceiro_setor', rotulo: 'Terceiro setor', descricao: 'Associações, fundações, parcerias com o poder público, imunidades' },
  { valor: 'sindical', rotulo: 'Sindical e coletivo do trabalho', descricao: 'Negociação coletiva, greve, dissídios, representação sindical' },
  { valor: 'educacional', rotulo: 'Educacional', descricao: 'Escolas e universidades, mensalidades, financiamento estudantil, regulação do MEC' },
  { valor: 'recuperacao', rotulo: 'Recuperação judicial e falência', descricao: 'Recuperação judicial e extrajudicial, falência, habilitação de créditos' },
  { valor: 'etica_advocacia', rotulo: 'Ética e estatuto da advocacia', descricao: 'Estatuto da OAB, Código de Ética, honorários, prerrogativas' },
  { valor: 'teoria', rotulo: 'Teoria e filosofia do direito', descricao: 'Hermenêutica, argumentação, história e sociologia do direito' },
  { valor: 'pesquisa', rotulo: 'Pesquisador do Instituto', descricao: 'Jurisprudência brasileira, direito comparado e propostas para o direito brasileiro' },
  { valor: 'geral', rotulo: 'Geral', descricao: 'Qualquer tema do direito brasileiro' },
]

export interface Fonte { id: string; titulo: string; url: string }
export type Modo = 'responder' | 'redigir' | 'caminhos'
export const MODOS: { valor: Modo; rotulo: string; descricao: string }[] = [
  { valor: 'responder', rotulo: 'Perguntar', descricao: 'Parecer curto com artigo e lei' },
  { valor: 'redigir', rotulo: 'Redigir', descricao: 'Peça, notificação ou contrato pronto para revisão' },
  { valor: 'caminhos', rotulo: 'Caminhos', descricao: 'Matriz de opções com êxito, rapidez, custo e risco' },
]
export interface Caminho {
  nome: string
  descricao: string
  fundamento: string
  exito: number
  rapidez: number
  custo: number
  risco: number
  zonaCinzenta?: string
}
export interface Matriz {
  sintese: string
  caminhos: Caminho[]
  recomendado: number
  porque: string
  proximosPassos: string[]
}
export interface Consulta {
  id: string
  especialidade: Especialidade
  modo: Modo
  pergunta: string
  resposta: string
  fontes: Fonte[]
  matriz?: Matriz
  artigosConsultados?: { lei: string; artigo: string }[]
  /** Peças: perfil de escrita sorteado pela rotação de estilo e a aderência medida (0–100). */
  estilo?: { mistura: { nome: string; peso: number }[]; aderencia?: number }
  criadoEm: string
}

type DadosPeca = { perfilEstilo?: { mistura?: { nome: string; peso: number }[] }; aderencia?: number } | null
const estiloDe = (_modo: string, dados: unknown): Consulta['estilo'] => {
  const d = dados as DadosPeca
  return d?.perfilEstilo?.mistura ? { mistura: d.perfilEstilo.mistura, aderencia: d.aderencia } : undefined
}

const MATRIZ_EXEMPLO: Matriz = {
  sintese: 'Locatário comercial com contrato de 5 anos a vencer em 10 meses; o locador sinaliza que não renovará (exemplo da demonstração).',
  caminhos: [
    { nome: 'Ação renovatória agora', descricao: 'Propor a renovatória dentro da janela legal, com proposta de novo aluguel e prova dos requisitos.', fundamento: 'art. 51 e art. 71 da Lei 8.245/91', exito: 4, rapidez: 2, custo: 2, risco: 4, zonaCinzenta: 'Comprovação do "mesmo ramo" por 3 anos quando houve mudança parcial de atividade.' },
    { nome: 'Negociar renovação amigável', descricao: 'Notificar o locador propondo renovação com reajuste, preservando o prazo da ação como garantia.', fundamento: 'art. 51 da Lei 8.245/91; art. 421 do Código Civil', exito: 3, rapidez: 4, custo: 5, risco: 3 },
    { nome: 'Aguardar e desocupar', descricao: 'Planejar a mudança do ponto e eventual indenização por fundo de comércio se houver retomada indevida.', fundamento: 'art. 52, § 3º, da Lei 8.245/91', exito: 2, rapidez: 5, custo: 3, risco: 2 },
  ],
  recomendado: 1,
  porque: 'A negociação preserva a relação e o prazo da ação continua correndo como salvaguarda; se não houver acordo em 60 dias, ajuíza-se a renovatória.',
  proximosPassos: ['Conferir a data limite da renovatória (entre 1 ano e 6 meses antes do fim).', 'Reunir contratos, comprovantes de pagamento e prova do ramo.', 'Enviar notificação com proposta.'],
}

const CHAVE_PREF = 'lsm-especialidade'
const CHAVE_HIST = 'lsm-consultas-v1'

export async function especialidadePreferida(): Promise<Especialidade> {
  const local = localStorage.getItem(CHAVE_PREF) as Especialidade | null
  if (!supabaseConfigurado) return local ?? 'imobiliario'
  const { data } = await supabase.from('preferencias_usuario').select('especialidade').maybeSingle()
  return (data?.especialidade as Especialidade) ?? local ?? 'imobiliario'
}

export async function guardarEspecialidade(e: Especialidade) {
  localStorage.setItem(CHAVE_PREF, e)
  if (!supabaseConfigurado) return
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('preferencias_usuario').upsert({ usuario_id: user.id, especialidade: e, atualizado_em: new Date().toISOString() })
}

function lerLocal(): Consulta[] {
  try { return JSON.parse(localStorage.getItem(CHAVE_HIST) || '[]') } catch { return [] }
}

export async function historicoConsultas(): Promise<Consulta[]> {
  if (!supabaseConfigurado) return lerLocal()
  const { data, error } = await supabase
    .from('consultas_juridicas')
    .select('id,especialidade,modo,dados,pergunta,resposta,fontes,criado_em')
    .order('criado_em', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id: r.id, especialidade: r.especialidade, modo: (r.modo ?? 'responder') as Modo, pergunta: r.pergunta, resposta: r.resposta,
    fontes: (r.fontes ?? []) as Fonte[], matriz: r.modo === 'caminhos' && r.dados ? (r.dados as Matriz) : undefined, estilo: estiloDe(r.modo, r.dados), criadoEm: r.criado_em,
  }))
}

export async function apagarConsulta(id: string) {
  if (!supabaseConfigurado) {
    localStorage.setItem(CHAVE_HIST, JSON.stringify(lerLocal().filter(c => c.id !== id)))
    return
  }
  const { error } = await supabase.from('consultas_juridicas').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

/** Pergunta ao agente da especialidade; a lei é lida ao vivo no Planalto pelo servidor. */
export async function perguntar(pergunta: string, especialidade: Especialidade, historico: Consulta[], modo: Modo = 'responder', contexto = '', estilo = true): Promise<Consulta> {
  if (!supabaseConfigurado) {
    const c: Consulta = {
      id: crypto.randomUUID(), especialidade, modo, pergunta, criadoEm: new Date().toISOString(),
      matriz: modo === 'caminhos' ? MATRIZ_EXEMPLO : undefined,
      resposta: '**Resposta direta** (exemplo da demonstração)\n\nNa locação comercial com contrato escrito de prazo igual ou superior a cinco anos, o locatário tem direito à renovação, desde que proponha a ação entre um ano e seis meses antes do fim do contrato (art. 51, § 5º, da Lei 8.245/91).\n\nFontes consultadas: Lei do Inquilinato (Lei 8.245/1991)',
      fontes: [{ id: 'inquilinato', titulo: 'Lei do Inquilinato (Lei 8.245/1991)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm' }],
    }
    localStorage.setItem(CHAVE_HIST, JSON.stringify([c, ...lerLocal()].slice(0, 30)))
    return c
  }
  const contextoConversa = historico.slice(0, 3).reverse().flatMap(h => [
    { papel: 'usuario', texto: h.pergunta },
    { papel: 'assistente', texto: h.resposta },
  ])
  const { data, error } = await supabase.functions.invoke('assistente-juridico', {
    body: { pergunta, especialidade, historico: contextoConversa, modo, contexto, estilo },
  })
  if (error) throw new Error(error.message)
  if (data?.erro) throw new Error(data.erro)
  return {
    id: crypto.randomUUID(), especialidade, modo, pergunta, resposta: data.resposta,
    fontes: data.fontes ?? [], matriz: modo === 'caminhos' ? (data.dados as Matriz) : undefined,
    artigosConsultados: data.artigosConsultados, estilo: estiloDe(modo, data.dados), criadoEm: data.consultadoEm,
  }
}

// Área de atuação escolhida na tela de entrada (Passo 04): guardada por usuário e usada para filtrar o radar.
export const AREAS_DIREITO: { chave: string; nome: string }[] = [
  { chave: 'imobiliario', nome: 'Imobiliário' }, { chave: 'civel', nome: 'Cível e contratos' }, { chave: 'trabalhista', nome: 'Trabalhista' },
  { chave: 'familia', nome: 'Família e sucessões' }, { chave: 'tributario', nome: 'Tributário' }, { chave: 'empresarial', nome: 'Empresarial' },
  { chave: 'consumidor', nome: 'Consumidor' }, { chave: 'previdenciario', nome: 'Previdenciário' }, { chave: 'penal', nome: 'Penal' }, { chave: 'compliance', nome: 'Compliance e LGPD' },
  { chave: 'justica', nome: 'Órgãos da justiça (MP, tribunais, OAB)' },
  // As demais matérias do direito vêm da lista de especialidades do assistente, para as duas listas nunca divergirem.
  ...ESPECIALIDADES.filter(e => !/^nivel_/.test(e.valor) && !['imobiliario', 'civel', 'trabalhista', 'familia', 'tributario', 'empresarial', 'consumidor', 'previdenciario', 'penal', 'compliance', 'pesquisa', 'geral'].includes(e.valor)).map(e => ({ chave: e.valor as string, nome: e.rotulo })),
]
export async function lerAreaAtual(): Promise<string> {
  try {
    const { data } = await supabase.from('preferencias_usuario').select('area').maybeSingle()
    if (data?.area) return data.area
  } catch { /* sem banco */ }
  try { return localStorage.getItem('lsm-area') || 'imobiliario' } catch { return 'imobiliario' }
}
export async function gravarAreaAtual(area: string): Promise<void> {
  try { localStorage.setItem('lsm-area', area) } catch { /* privado */ }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('preferencias_usuario').upsert({ usuario_id: user.id, area, atualizado_em: new Date().toISOString() })
}
