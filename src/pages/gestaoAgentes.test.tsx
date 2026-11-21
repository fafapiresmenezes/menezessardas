/**
 * Fase F3: a aba de agentes da área administrativa.
 * Confere que os 20 agentes aparecem, que o cartão abre a ficha e que o campo
 * "o que ele NÃO faz" chega à tela — é ele que impede o agente de extrapolar.
 */
import { render, screen, within, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, afterEach } from 'vitest'
import GestaoInstitutoPage from './GestaoInstitutoPage'
import { AGENTES_ADMINISTRACAO } from '@/data/agentesAdministracao'

afterEach(cleanup)

const abrir = (rota: string) =>
  render(<MemoryRouter initialEntries={[rota]}><GestaoInstitutoPage /></MemoryRouter>)

describe('Agentes da administração (F3)', () => {
  it('são 20 fichas, cada uma com perguntas-tipo e limites escritos', () => {
    expect(AGENTES_ADMINISTRACAO).toHaveLength(20)
    const ids = AGENTES_ADMINISTRACAO.map(a => a.id)
    expect(new Set(ids).size).toBe(20)
    for (const a of AGENTES_ADMINISTRACAO) {
      expect(a.perguntas_tipo).toHaveLength(3)
      expect(a.o_que_nao_faz.length).toBeGreaterThanOrEqual(3)
      expect(a.prompt_base).toContain('NÃO faz')
      expect(a.prompt_base).toContain(a.nome)
    }
  })

  it('a aba ?aba=agentes mostra os agentes em cartão', () => {
    abrir('/gestao-instituto?aba=agentes')
    expect(screen.getByTestId('agentes-administracao')).toBeTruthy()
    expect(screen.getByTestId('contagem-agentes').textContent).toContain('20 de 20')
    expect(screen.getAllByRole('button', { name: /Consultor de cibersegurança/ })).toHaveLength(1)
    // a visão geral não aparece junto
    expect(screen.queryByTestId('pendencias-de-m')).toBeNull()
  })

  it('sem a aba no endereço, mostra a visão geral e não os agentes', () => {
    abrir('/gestao-instituto')
    expect(screen.getByTestId('pendencias-de-m')).toBeTruthy()
    expect(screen.queryByTestId('agentes-administracao')).toBeNull()
  })

  it('clicar no cartão abre a ficha com o que o agente NÃO faz', () => {
    abrir('/gestao-instituto?aba=agentes')
    fireEvent.click(screen.getByRole('button', { name: /Consultor de cibersegurança/ }))
    const ficha = screen.getByTestId('ficha-agente')
    expect(within(ficha).getByText('O que ele NÃO faz')).toBeTruthy()
    // o limite aparece duas vezes de propósito: na lista e dentro do roteiro do agente
    expect(within(ficha).getAllByText(/não escreve exploit/i).length).toBeGreaterThanOrEqual(1)
    // a regra de ouro de M tem de estar escrita na ficha deste agente
    expect(within(ficha).getAllByText(/COLE-ISTO/).length).toBeGreaterThanOrEqual(1)
  })
})

describe('Repositório da administração (F4)', () => {
  it('a aba ?aba=repositorio mostra os 7 blocos', () => {
    render(<MemoryRouter initialEntries={['/gestao-instituto?aba=repositorio']}><GestaoInstitutoPage /></MemoryRouter>)
    expect(screen.getByTestId('repositorio-instituto')).toBeTruthy()
    for (const chave of ['agentes', 'atlas', 'biblioteca', 'white-papers', 'bench', 'universidades', 'bancos']) {
      expect(screen.getByTestId(`bloco-${chave}`)).toBeTruthy()
    }
    // o bloco de agentes está pronto e os que dependem de import estão honestamente "a trazer"
    const atlas = screen.getByTestId('bloco-atlas')
    expect(within(atlas).getByText('A trazer')).toBeTruthy()
  })
})
