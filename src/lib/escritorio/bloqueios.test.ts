/**
 * Testes para bloqueio de funções pagas
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  estaBloqueoEmFuncaoPaga,
  validarAcessoAFuncaoPaga,
  obterAvisoPaga,
  comBloqueioFuncaoPaga,
  AVISO_CUSTO,
  ROTULO_MARCELO,
  ROTULO_ANTONIO,
} from './bloqueios'
import * as acessoModule from './acesso'

// Mock do módulo acesso
vi.mock('./acesso', () => ({
  verificarUsuarioBloqueado: vi.fn(),
}))

describe('Bloqueio de Funções Pagas', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('estaBloqueoEmFuncaoPaga', () => {
    it('deve retornar false para usuário normal', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(null)

      const bloqueado = await estaBloqueoEmFuncaoPaga('jusbrasil')
      expect(bloqueado).toBe(false)
    })

    it('deve retornar true para Marcelo Alexandrino', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'marcelo_alexandrino'
      )

      const bloqueado = await estaBloqueoEmFuncaoPaga('jusbrasil')
      expect(bloqueado).toBe(true)
    })

    it('deve retornar true para Antonio Costa', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'antonio_costa'
      )

      const bloqueado = await estaBloqueoEmFuncaoPaga('ia_analise')
      expect(bloqueado).toBe(true)
    })
  })

  describe('validarAcessoAFuncaoPaga', () => {
    it('não deve lançar erro para usuário normal', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(null)

      await expect(validarAcessoAFuncaoPaga('jusbrasil')).resolves.toBeUndefined()
    })

    it('deve lançar erro para Marcelo Alexandrino', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'marcelo_alexandrino'
      )

      await expect(validarAcessoAFuncaoPaga('jusbrasil')).rejects.toThrow(
        /Marcelo Alexandrino/
      )
    })

    it('deve lançar erro para Antonio Costa', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'antonio_costa'
      )

      await expect(validarAcessoAFuncaoPaga('ia_geracao')).rejects.toThrow(
        /Antonio Costa/
      )
    })

    it('deve incluir o aviso de custo na mensagem de erro', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'marcelo_alexandrino'
      )

      await expect(validarAcessoAFuncaoPaga('jusbrasil')).rejects.toThrow(AVISO_CUSTO)
    })
  })

  describe('obterAvisoPaga', () => {
    it('deve retornar null para usuário normal', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(null)

      const aviso = await obterAvisoPaga('jusbrasil')
      expect(aviso).toBeNull()
    })

    it('deve retornar aviso para Marcelo Alexandrino', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'marcelo_alexandrino'
      )

      const aviso = await obterAvisoPaga('jusbrasil')
      expect(aviso).toContain(ROTULO_MARCELO)
      expect(aviso).toContain(AVISO_CUSTO)
    })

    it('deve retornar aviso para Antonio Costa', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'antonio_costa'
      )

      const aviso = await obterAvisoPaga('ia_analise')
      expect(aviso).toContain(ROTULO_ANTONIO)
      expect(aviso).toContain(AVISO_CUSTO)
    })
  })

  describe('comBloqueioFuncaoPaga', () => {
    it('deve executar função para usuário normal', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(null)

      const minhaFuncao = vi.fn().mockResolvedValueOnce('resultado')
      const resultado = await comBloqueioFuncaoPaga('jusbrasil', minhaFuncao)

      expect(resultado).toBe('resultado')
      expect(minhaFuncao).toHaveBeenCalled()
    })

    it('deve bloquear execução para Marcelo Alexandrino', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'marcelo_alexandrino'
      )

      const minhaFuncao = vi.fn()
      await expect(comBloqueioFuncaoPaga('jusbrasil', minhaFuncao)).rejects.toThrow()
      expect(minhaFuncao).not.toHaveBeenCalled()
    })

    it('deve bloquear execução para Antonio Costa', async () => {
      vi.mocked(acessoModule.verificarUsuarioBloqueado).mockResolvedValueOnce(
        'antonio_costa'
      )

      const minhaFuncao = vi.fn()
      await expect(comBloqueioFuncaoPaga('ia_geracao', minhaFuncao)).rejects.toThrow()
      expect(minhaFuncao).not.toHaveBeenCalled()
    })
  })
})
