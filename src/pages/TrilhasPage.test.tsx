// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const TrilhasPage = (await import('./TrilhasPage')).default

afterEach(() => { cleanup(); localStorage.clear() })
const abrir = () => render(<MemoryRouter><TrilhasPage /></MemoryRouter>)

describe('tela das trilhas de estudo', () => {
  it('mostra uma trilha com módulos, tempo e as semanas do plano', () => {
    abrir()
    expect(screen.getByText(/Semana 1/)).toBeTruthy()
    expect(document.body.textContent).toMatch(/Tempo estimado/)
    expect(document.querySelectorAll('input[type="checkbox"]').length).toBeGreaterThan(0)
  })

  it('o que NÃO é prometido fica na tela, não só no documento', () => {
    abrir()
    expect(screen.getByTestId('nao-promessa').textContent).toContain('certificado')
  })

  it('marcar um módulo muda o progresso e fica guardado no navegador', () => {
    abrir()
    const caixa = document.querySelector('input[type="checkbox"]') as HTMLInputElement
    fireEvent.click(caixa)
    expect(Object.keys(localStorage).some(k => k.startsWith('theye-trilha-lidos'))).toBe(true)
    cleanup()
    abrir()
    expect((document.querySelector('input[type="checkbox"]') as HTMLInputElement).checked).toBe(true)
  })

  it('cada módulo com fonte leva ao endereço da fonte', () => {
    abrir()
    const link = document.querySelector('a[target="_blank"]') as HTMLAnchorElement
    expect(link.getAttribute('href')).toMatch(/^https?:\/\//)
    expect(link.getAttribute('title')).toContain('fonte deste módulo')
  })

  it('mudar o tempo por semana muda o número de semanas', () => {
    abrir()
    const antes = document.body.textContent!.match(/Semana \d+/g)!.length
    const tempo = screen.getByTitle(/Quanto tempo você tem por semana/) as HTMLSelectElement
    fireEvent.change(tempo, { target: { value: '300' } })
    const depois = document.body.textContent!.match(/Semana \d+/g)!.length
    expect(depois).toBeLessThan(antes)
  })
})
