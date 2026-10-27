import { supabase, supabaseConfigurado } from '@/lib/supabase'

export type Especialidade =
  | 'imobiliario' | 'condominial' | 'registral' | 'consumidor' | 'tributario' | 'trabalhista' | 'lgpd' | 'geral'

export const ESPECIALIDADES: { valor: Especialidade; rotulo: string; descricao: string }[] = [
  { valor: 'imobiliario', rotulo: 'Imobiliário', descricao: 'Locação, comodato, compra e venda, garantias, despejo' },
  { valor: 'condominial', rotulo: 'Condominial', descricao: 'Convenção, assembleias, cotas, obras' },
  { valor: 'registral', rotulo: 'Registral e notarial', descricao: 'Matrícula, averbação, ITBI, usucapião' },
  { valor: 'consumidor', rotulo: 'Consumidor', descricao: 'Incorporadoras, distrato, vícios' },
  { valor: 'tributario', rotulo: 'Tributário', descricao: 'IPTU, ITBI, ganho de capital' },
  { valor: 'trabalhista', rotulo: 'Trabalhista', descricao: 'Empregados de condomínio e prestadores' },
  { valor: 'lgpd', rotulo: 'LGPD', descricao: 'Dados de locatários, fiadores e fornecedores' },
  { valor: 'geral', rotulo: 'Geral', descricao: 'Qualquer tema do direito brasileiro' },
]

export interface Fonte { id: string; titulo: string; url: string }
export interface Consulta {
  id: string
  especialidade: Especialidade
  pergunta: string
  resposta: string
  fontes: Fonte[]
  artigosConsultados?: { lei: string; artigo: string }[]
  criadoEm: string
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
    .select('id,especialidade,pergunta,resposta,fontes,criado_em')
    .order('criado_em', { ascending: false })
    .limit(30)
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({
    id: r.id, especialidade: r.especialidade, pergunta: r.pergunta, resposta: r.resposta,
    fontes: (r.fontes ?? []) as Fonte[], criadoEm: r.criado_em,
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
export async function perguntar(pergunta: string, especialidade: Especialidade, historico: Consulta[]): Promise<Consulta> {
  if (!supabaseConfigurado) {
    const c: Consulta = {
      id: crypto.randomUUID(), especialidade, pergunta, criadoEm: new Date().toISOString(),
      resposta: '**Resposta direta** (exemplo da demonstração)\n\nNa locação comercial com contrato escrito de prazo igual ou superior a cinco anos, o locatário tem direito à renovação, desde que proponha a ação entre um ano e seis meses antes do fim do contrato (art. 51, § 5º, da Lei 8.245/91).\n\nFontes consultadas: Lei do Inquilinato (Lei 8.245/1991)',
      fontes: [{ id: 'inquilinato', titulo: 'Lei do Inquilinato (Lei 8.245/1991)', url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm' }],
    }
    localStorage.setItem(CHAVE_HIST, JSON.stringify([c, ...lerLocal()].slice(0, 30)))
    return c
  }
  const contexto = historico.slice(0, 3).reverse().flatMap(h => [
    { papel: 'usuario', texto: h.pergunta },
    { papel: 'assistente', texto: h.resposta },
  ])
  const { data, error } = await supabase.functions.invoke('assistente-juridico', {
    body: { pergunta, especialidade, historico: contexto },
  })
  if (error) throw new Error(error.message)
  if (data?.erro) throw new Error(data.erro)
  return {
    id: crypto.randomUUID(), especialidade, pergunta, resposta: data.resposta,
    fontes: data.fontes ?? [], artigosConsultados: data.artigosConsultados, criadoEm: data.consultadoEm,
  }
}
