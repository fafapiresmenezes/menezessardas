/**
 * Controle de acesso por escritório (P0 Urgente - 15/11/2026)
 *
 * Responsabilidades:
 * - Listar escritórios que o usuário acessa
 * - Validar acesso do usuário a um escritório específico
 * - Verificar se o usuário é bloqueado em funções pagas
 */

import { supabase, supabaseConfigurado } from '../supabase'

export type UsuarioBloqueado = 'marcelo_alexandrino' | 'antonio_costa' | null

interface UsuarioEscritorio {
  escritorioId: string
  escritorioNome: string
  role: 'admin' | 'operador' | 'leitor'
}

/**
 * Lista todos os escritórios que o usuário atual acessa.
 * Para Marcelo e Antonio (gratuitos), retorna todos os escritórios que têm acesso.
 */
export async function listarEscritoriosDoUsuario(): Promise<UsuarioEscritorio[]> {
  if (!supabaseConfigurado) {
    return [
      {
        escritorioId: '00000000-0000-0000-0000-000000000001',
        escritorioNome: 'Sardas e Menezes',
        role: 'admin',
      },
      {
        escritorioId: '00000000-0000-0000-0000-000000000002',
        escritorioNome: 'Instituto THEYE',
        role: 'leitor',
      },
    ]
  }

  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.id) return []

    const { data, error } = await supabase
      .from('usuarios_escritorios')
      .select('escritorio_id, role, escritorios(nome)')
      .eq('user_id', user.user.id)

    if (error) throw error

    return (data ?? []).map((item: any) => ({
      escritorioId: item.escritorio_id,
      escritorioNome: item.escritorios?.nome ?? 'Sem nome',
      role: item.role,
    }))
  } catch (err) {
    console.error('Erro ao listar escritórios do usuário:', err)
    return []
  }
}

/**
 * Verifica se o usuário é um dos usuários bloqueados (Marcelo/Antonio).
 * Retorna o identificador se for bloqueado, null caso contrário.
 */
export async function verificarUsuarioBloqueado(): Promise<UsuarioBloqueado> {
  if (!supabaseConfigurado) return null

  try {
    const { data: user } = await supabase.auth.getUser()
    if (!user?.user?.email) return null

    const email = user.user.email.toLowerCase()

    // Lista de usuários bloqueados em funções pagas
    const bloqueados: Record<string, UsuarioBloqueado> = {
      'marcelo@iclub.com.br': 'marcelo_alexandrino',
      'marcelo.alexandrino@iclub.com.br': 'marcelo_alexandrino',
      'antonio@iclub.com.br': 'antonio_costa',
      'antonio.costa@iclub.com.br': 'antonio_costa',
    }

    return bloqueados[email] ?? null
  } catch (err) {
    console.error('Erro ao verificar usuário bloqueado:', err)
    return null
  }
}

/**
 * Valida se o usuário tem acesso ao escritório especificado.
 */
export async function temAcessoAoEscritorio(escritorioId: string): Promise<boolean> {
  const escritorios = await listarEscritoriosDoUsuario()
  return escritorios.some(e => e.escritorioId === escritorioId)
}

/**
 * Obtém o escritório atual do usuário (aquele em que está trabalhando agora).
 * Se não houver nenhum selecionado, retorna o primeiro disponível.
 */
export async function obterEscritorioAtual(): Promise<UsuarioEscritorio | null> {
  // Tenta ler do sessionStorage primeiro (seleção atual do usuário)
  try {
    const armazenado = sessionStorage.getItem('escritorio-atual-id')
    if (armazenado) {
      const escritorios = await listarEscritoriosDoUsuario()
      const encontrado = escritorios.find(e => e.escritorioId === armazenado)
      if (encontrado) return encontrado
    }
  } catch {
    // sem sessionStorage
  }

  // Caso contrário, retorna o primeiro disponível
  const escritorios = await listarEscritoriosDoUsuario()
  return escritorios.length > 0 ? escritorios[0] : null
}

/**
 * Define qual é o escritório atual do usuário.
 */
export async function definirEscritorioAtual(escritorioId: string): Promise<void> {
  // Valida se o usuário tem acesso
  const temAcesso = await temAcessoAoEscritorio(escritorioId)
  if (!temAcesso) {
    throw new Error(`Usuário não tem acesso ao escritório ${escritorioId}`)
  }

  try {
    sessionStorage.setItem('escritorio-atual-id', escritorioId)
  } catch {
    // sem sessionStorage
  }
}

/**
 * Esquece o escritório atual (ao sair ou trocar de conta).
 */
export function esqueceEscritorio(): void {
  try {
    sessionStorage.removeItem('escritorio-atual-id')
  } catch {
    // sem sessionStorage
  }
}
