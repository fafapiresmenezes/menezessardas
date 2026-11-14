// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DICIONARIOS } from '@/lib/i18n'
import { VERTENTES } from '@/data/vertentes'
import FrentesDoInstitutoPage from './FrentesDoInstitutoPage'

/**
 * O que estes testes prendem: que cada quadradinho da prateleira de frentes mostra o NOME de
 * verdade da frente, nas quatro línguas, e nunca "Abre undefined". Esse bug nasceu de uma chave
 * trocada ("vertentes." no plural, quando o dicionário é "vertente." no singular). Um teste de
 * tela sozinho não pegaria a troca em todas as línguas, por isso o segundo teste confere direto
 * no dicionário.
 */

afterEach(cleanup)

describe('Prateleira de frentes do Instituto', () => {
  it('desenha o nome real de cada frente, nunca "undefined"', () => {
    render(
      <MemoryRouter>
        <FrentesDoInstitutoPage />
      </MemoryRouter>,
    )
    // Nenhum título de cartão pode cair em "Abre undefined".
    expect(screen.queryByTitle(/Abre undefined/)).toBeNull()
    // O nome da frente jurídica (idioma padrão: português) aparece de fato.
    expect(screen.getByText('Plataforma jurídica')).toBeTruthy()
  })

  it('tem nome e resumo de cada frente nas quatro línguas', () => {
    for (const v of VERTENTES) {
      for (const [codigo, dic] of Object.entries(DICIONARIOS)) {
        const nome = (dic as Record<string, string>)[`vertente.${v.id}.nome`]
        const resumo = (dic as Record<string, string>)[`vertente.${v.id}.resumo`]
        expect(nome, `vertente.${v.id}.nome em ${codigo}`).toBeTruthy()
        expect(resumo, `vertente.${v.id}.resumo em ${codigo}`).toBeTruthy()
      }
    }
  })
})
