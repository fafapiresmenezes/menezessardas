/**
 * Equipe (S10): quem tem acesso à plataforma e com qual função.
 * Só administradores listam e alteram. Ninguém é apagado: "sem acesso" é
 * função nula, e a RLS das tabelas já bloqueia quem não tem perfil.
 */
import { supabase, supabaseConfigurado } from './supabase'
import { registrarEvento } from './trilha'

export type Funcao = 'admin' | 'operador' | 'leitor'

export interface Pessoa {
  id: string
  email: string
  nome: string
  funcao: Funcao | null
  criadoEm: string
  confirmado: boolean
  ultimoAcesso: string | null
}

export const rotuloFuncao: Record<Funcao | 'nenhuma', string> = {
  admin: 'Administração',
  operador: 'Operação',
  leitor: 'Leitura',
  nenhuma: 'Sem acesso',
}

export const descricaoFuncao: Record<Funcao | 'nenhuma', string> = {
  admin: 'Faz tudo, inclusive equipe e chave da IA.',
  operador: 'Cadastra e edita imóveis, contratos, documentos e fornecedores.',
  leitor: 'Só consulta; não altera nada.',
  nenhuma: 'Não entra na plataforma até receber uma função.',
}

const DEMO: Pessoa[] = [
  { id: 'd1', email: 'leticia@sardasmenezes.adv.br', nome: 'Leticia Sardas', funcao: 'admin', criadoEm: '2026-09-01T12:00:00Z', confirmado: true, ultimoAcesso: '2026-10-25T13:10:00Z' },
  { id: 'd2', email: 'paulo@sardasmenezes.adv.br', nome: 'Paulo Menezes', funcao: 'operador', criadoEm: '2026-09-03T12:00:00Z', confirmado: true, ultimoAcesso: '2026-10-24T18:40:00Z' },
  { id: 'd3', email: 'carla@sardasmenezes.adv.br', nome: 'Carla Nunes', funcao: 'leitor', criadoEm: '2026-09-10T12:00:00Z', confirmado: true, ultimoAcesso: '2026-10-20T09:05:00Z' },
  { id: 'd4', email: 'estagio@sardasmenezes.adv.br', nome: 'Rafael Lima', funcao: null, criadoEm: '2026-10-24T15:30:00Z', confirmado: false, ultimoAcesso: null },
]

let demoAtual: Pessoa[] = DEMO.map(p => ({ ...p }))

export async function perfilAtual(): Promise<Funcao | null> {
  if (!supabaseConfigurado) return 'admin'
  const { data, error } = await supabase.rpc('perfil_atual')
  if (error) throw new Error(error.message)
  return (data as Funcao | null) ?? null
}

export async function listarPessoas(): Promise<Pessoa[]> {
  if (!supabaseConfigurado) return demoAtual
  const { data, error } = await supabase.rpc('listar_usuarios')
  if (error) throw new Error(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(r => ({
    id: String(r.id),
    email: String(r.email),
    nome: String(r.nome_completo ?? r.email),
    funcao: (r.funcao as Funcao | null) ?? null,
    criadoEm: String(r.criado_em),
    confirmado: Boolean(r.confirmado),
    ultimoAcesso: r.ultimo_acesso ? String(r.ultimo_acesso) : null,
  }))
}

export async function definirFuncao(pessoa: Pessoa, funcao: Funcao | null): Promise<void> {
  if (supabaseConfigurado) {
    const { error } = await supabase.rpc('definir_funcao', { p_id: pessoa.id, p_funcao: funcao })
    if (error) throw new Error(error.message)
  } else {
    demoAtual = demoAtual.map(p => (p.id === pessoa.id ? { ...p, funcao } : p))
  }
  await registrarEvento({
    tipo: 'acesso_alterado',
    entidade: pessoa.id,
    resumo: `Acesso de ${pessoa.email}: ${rotuloFuncao[funcao ?? 'nenhuma']}`,
  })
}

const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Senha provisória legível (sem 0/O, 1/I), ex.: LSM-7K2M-9QWX. */
export function gerarSenhaProvisoria(): string {
  const bloco = () => {
    const b = new Uint8Array(4)
    crypto.getRandomValues(b)
    return Array.from(b, x => ALFABETO[x % ALFABETO.length]).join('')
  }
  return `LSM-${bloco()}-${bloco()}`
}

/** Define uma senha provisória para a pessoa; a senha atual dela deixa de valer. */
export async function definirSenhaProvisoria(pessoa: Pessoa): Promise<string> {
  const senha = gerarSenhaProvisoria()
  if (supabaseConfigurado) {
    const { data, error } = await supabase.functions.invoke('definir-senha-provisoria', { body: { id: pessoa.id, senha } })
    if (error) {
      const ctx = (error as { context?: Response }).context
      const corpo = ctx && typeof ctx.json === 'function' ? await ctx.json().catch(() => null) : null
      throw new Error(corpo?.erro ?? error.message)
    }
    if (data?.erro) throw new Error(String(data.erro))
  }
  await registrarEvento({
    tipo: 'acesso_alterado',
    entidade: pessoa.id,
    resumo: `Senha provisória definida para ${pessoa.email}`,
  })
  return senha
}

// Onda B: vários escritórios na mesma plataforma. A sede (GMenezes) administra os parceiros e vê a cobrança por usuário.
export const SEDE_ID = '00000000-0000-0000-0000-000000000001'
export interface Escritorio { id: string; nome: string; plano: string; criadoEm: string; operadores: number; leitores: number; mensal: number; mensal1Ano: number }

export async function ehSede(): Promise<boolean> {
  if (!supabaseConfigurado) return true
  try { const k = sessionStorage.getItem('gm-sede'); if (k) return k === '1' } catch { /* sem sessionStorage */ }
  const { data } = await supabase.rpc('eh_sede')
  const v = data !== false
  try { sessionStorage.setItem('gm-sede', v ? '1' : '0') } catch { /* ignora */ }
  return v
}

export async function listarEscritorios(): Promise<Escritorio[]> {
  if (!supabaseConfigurado) return [{ id: SEDE_ID, nome: 'GMenezes Advogados Associados', plano: 'sede', criadoEm: '2026-10-30', operadores: 3, leitores: 1, mensal: 1290, mensal1Ano: 903 }]
  const { data, error } = await supabase.rpc('cobranca_escritorios')
  if (error) throw new Error(error.message)
  return ((data ?? []) as Record<string, unknown>[]).map(r => ({ id: String(r.id), nome: String(r.nome), plano: String(r.plano), criadoEm: String(r.criado_em), operadores: Number(r.operadores), leitores: Number(r.leitores), mensal: Number(r.mensal), mensal1Ano: Number(r.mensal_1ano) }))
}

export async function criarEscritorio(nome: string): Promise<void> {
  if (!supabaseConfigurado) return
  const { error } = await supabase.rpc('criar_escritorio', { p_nome: nome })
  if (error) throw new Error(error.message)
}

export async function moverParaEscritorio(pessoaId: string, escritorioId: string): Promise<void> {
  if (!supabaseConfigurado) return
  const { error } = await supabase.rpc('mover_para_escritorio', { p_id: pessoaId, p_escritorio: escritorioId })
  if (error) throw new Error(error.message)
}

export async function escritorioDasPessoas(): Promise<Record<string, string>> {
  if (!supabaseConfigurado) return {}
  const { data } = await supabase.rpc('listar_usuarios_v2')
  const m: Record<string, string> = {}
  for (const r of (data ?? []) as Record<string, unknown>[]) if (r.escritorio_id) m[String(r.id)] = String(r.escritorio_id)
  return m
}
