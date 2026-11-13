// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const EscolhaDoMercadoPage = (await import('./EscolhaDoMercadoPage')).default
const { CANDIDATOS, finalistas } = await import('@/lib/predicao/mercados')

afterEach(cleanup)

describe('tela da escolha do mercado', () => {
  it('mostra os três finalistas que saem da matriz, na ordem', () => {
    render(<MemoryRouter><EscolhaDoMercadoPage /></MemoryRouter>)
    const bloco = screen.getByTestId('finalistas').textContent!
    finalistas().forEach((c, i) => expect(bloco).toContain(`${i + 1}. ${c.nome}`))
  })

  it('diz que a escolha ainda é do dono, e não finge que já foi feita', () => {
    render(<MemoryRouter><EscolhaDoMercadoPage /></MemoryRouter>)
    expect(screen.getByTestId('escolha-pendente').textContent).toContain('proposta')
  })

  it('mostra o que derruba TODOS os candidatos, inclusive os finalistas', () => {
    render(<MemoryRouter><EscolhaDoMercadoPage /></MemoryRouter>)
    const texto = screen.getByTestId('todos').textContent!
    for (const c of CANDIDATOS) expect(texto).toContain(c.contra)
  })

  it('a régua de cada critério está na tela, antes das notas', () => {
    render(<MemoryRouter><EscolhaDoMercadoPage /></MemoryRouter>)
    const criterios = screen.getByTestId('criterios').textContent!
    expect(criterios).toContain('3 = série diária pública')
    expect(criterios).toContain('0 = mercado dominado por fundo quantitativo')
  })

  it('o aviso de que não é recomendação de investimento aparece', () => {
    render(<MemoryRouter><EscolhaDoMercadoPage /></MemoryRouter>)
    expect(screen.getByTestId('nao-e-recomendacao').textContent).toContain('não é recomendação de investimento')
  })

  it('cada candidato traz o endereço da fonte do dado, clicável', () => {
    render(<MemoryRouter><EscolhaDoMercadoPage /></MemoryRouter>)
    for (const c of CANDIDATOS) {
      expect(document.querySelector(`a[href="${c.fonteEndereco}"]`), c.nome).toBeTruthy()
    }
  })
})
