import { supabase, supabaseConfigurado } from '@/lib/supabase'

export type Especialidade =
  | `nivel_${string}` | 'imobiliario' | 'condominial' | 'registral' | 'consumidor' | 'tributario' | 'trabalhista' | 'familia' | 'lgpd' | 'inovacao' | 'compliance' | 'empresarial' | 'previdenciario' | 'penal' | 'civel' | 'ambiental' | 'geral'

export const ESPECIALIDADES: { valor: Especialidade; rotulo: string; descricao: string }[] = [
  { valor: 'imobiliario', rotulo: 'Imobiliário', descricao: 'Locação, comodato, compra e venda, garantias, despejo' },
  { valor: 'condominial', rotulo: 'Condominial', descricao: 'Convenção, assembleias, cotas, obras' },
  { valor: 'registral', rotulo: 'Registral e notarial', descricao: 'Matrícula, averbação, ITBI, usucapião' },
  { valor: 'consumidor', rotulo: 'Consumidor', descricao: 'Incorporadoras, distrato, vícios' },
  { valor: 'tributario', rotulo: 'Tributário', descricao: 'IPTU, ITBI, ganho de capital' },
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
  criadoEm: string
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
    fontes: (r.fontes ?? []) as Fonte[], matriz: r.modo === 'caminhos' && r.dados ? (r.dados as Matriz) : undefined, criadoEm: r.criado_em,
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
    artigosConsultados: data.artigosConsultados, criadoEm: data.consultadoEm,
  }
}

// Área de atuação escolhida na tela de entrada (Passo 04): guardada por usuário e usada para filtrar o radar.
export const AREAS_DIREITO: { chave: string; nome: string }[] = [
  { chave: 'imobiliario', nome: 'Imobiliário' }, { chave: 'civel', nome: 'Cível e contratos' }, { chave: 'trabalhista', nome: 'Trabalhista' },
  { chave: 'familia', nome: 'Família e sucessões' }, { chave: 'tributario', nome: 'Tributário' }, { chave: 'empresarial', nome: 'Empresarial' },
  { chave: 'consumidor', nome: 'Consumidor' }, { chave: 'previdenciario', nome: 'Previdenciário' }, { chave: 'penal', nome: 'Penal' }, { chave: 'compliance', nome: 'Compliance e LGPD' },
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
