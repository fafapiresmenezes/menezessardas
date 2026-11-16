/**
 * Testes para controle de acesso por escritório
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  listarEscritoriosDoUsuario,
  verificarUsuarioBloqueado,
  temAcessoAoEscritorio,
  obterEscritorioAtual,
  definirEscritorioAtual,
  esqueceEscritorio,
} from './acesso'

// Mock do supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
  supabaseConfigurado: true,
}))

describe('Acesso por Escritório', () => {
  beforeEach(() => {
    // Limpar sessionStorage antes de cada teste
    sessionStorage.clear()
    vi.clearAllMocks()
  })

  describe('verificarUsuarioBloqueado', () => {
    it('deve retornar null para usuário normal', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1', email: 'normal@exemplo.com.br' } },
      } as any)

      const resultado = await verificarUsuarioBloqueado()
      expect(resultado).toBeNull()
    })

    it('deve identificar Marcelo Alexandrino como bloqueado', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'marcelo', email: 'marcelo@iclub.com.br' } },
      } as any)

      const resultado = await verificarUsuarioBloqueado()
      expect(resultado).toBe('marcelo_alexandrino')
    })

    it('deve identificar Antonio Costa como bloqueado', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'antonio', email: 'antonio@iclub.com.br' } },
      } as any)

      const resultado = await verificarUsuarioBloqueado()
      expect(resultado).toBe('antonio_costa')
    })

    it('deve ser case-insensitive no email', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'marcelo', email: 'MARCELO@ICLUB.COM.BR' } },
      } as any)

      const resultado = await verificarUsuarioBloqueado()
      expect(resultado).toBe('marcelo_alexandrino')
    })
  })

  describe('listarEscritoriosDoUsuario', () => {
    it('deve retornar escritórios do usuário normal', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
              {
                escritorio_id: 'escritorio-2',
                role: 'leitor',
                escritorios: { nome: 'Instituto THEYE' },
              },
            ],
          }),
        }),
      } as any)

      const escritorios = await listarEscritoriosDoUsuario()
      expect(escritorios).toHaveLength(2)
      expect(escritorios[0]).toEqual({
        escritorioId: 'escritorio-1',
        escritorioNome: 'Sardas e Menezes',
        role: 'admin',
      })
      expect(escritorios[1]).toEqual({
        escritorioId: 'escritorio-2',
        escritorioNome: 'Instituto THEYE',
        role: 'leitor',
      })
    })

    it('deve retornar array vazio se usuário não está autenticado', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: null },
      } as any)

      const escritorios = await listarEscritoriosDoUsuario()
      expect(escritorios).toEqual([])
    })
  })

  describe('temAcessoAoEscritorio', () => {
    it('deve validar acesso positivo', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
            ],
          }),
        }),
      } as any)

      const temAcesso = await temAcessoAoEscritorio('escritorio-1')
      expect(temAcesso).toBe(true)
    })

    it('deve validar acesso negativo', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
            ],
          }),
        }),
      } as any)

      const temAcesso = await temAcessoAoEscritorio('escritorio-diferente')
      expect(temAcesso).toBe(false)
    })
  })

  describe('obterEscritorioAtual', () => {
    it('deve retornar primeiro escritório se nenhum selecionado', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
            ],
          }),
        }),
      } as any)

      const atual = await obterEscritorioAtual()
      expect(atual).toEqual({
        escritorioId: 'escritorio-1',
        escritorioNome: 'Sardas e Menezes',
        role: 'admin',
      })
    })

    it('deve retornar escritório selecionado do sessionStorage', async () => {
      const { supabase } = await import('../supabase')
      sessionStorage.setItem('escritorio-atual-id', 'escritorio-2')

      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
              {
                escritorio_id: 'escritorio-2',
                role: 'leitor',
                escritorios: { nome: 'Instituto THEYE' },
              },
            ],
          }),
        }),
      } as any)

      const atual = await obterEscritorioAtual()
      expect(atual?.escritorioId).toBe('escritorio-2')
    })

    it('deve retornar null se usuário não tem escritórios', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [],
          }),
        }),
      } as any)

      const atual = await obterEscritorioAtual()
      expect(atual).toBeNull()
    })
  })

  describe('definirEscritorioAtual', () => {
    it('deve definir escritório se usuário tem acesso', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
            ],
          }),
        }),
      } as any)

      await definirEscritorioAtual('escritorio-1')
      expect(sessionStorage.getItem('escritorio-atual-id')).toBe('escritorio-1')
    })

    it('deve lançar erro se usuário não tem acesso', async () => {
      const { supabase } = await import('../supabase')
      vi.mocked(supabase.auth.getUser).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      } as any)

      vi.mocked(supabase.from).mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({
            data: [
              {
                escritorio_id: 'escritorio-1',
                role: 'admin',
                escritorios: { nome: 'Sardas e Menezes' },
              },
            ],
          }),
        }),
      } as any)

      await expect(definirEscritorioAtual('escritorio-diferente')).rejects.toThrow(
        /não tem acesso/
      )
    })
  })

  describe('esqueceEscritorio', () => {
    it('deve limpar o escritório atual do sessionStorage', () => {
      sessionStorage.setItem('escritorio-atual-id', 'escritorio-1')
      esqueceEscritorio()
      expect(sessionStorage.getItem('escritorio-atual-id')).toBeNull()
    })
  })
})
