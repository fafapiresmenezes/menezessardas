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
