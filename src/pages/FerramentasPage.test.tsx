// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { FERRAMENTAS } from '@/lib/ferramentas/catalogo'

vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: FerramentasPage } = await import('./FerramentasPage')
const { default: EstudosPage } = await import('./EstudosPage')

function abrirECalcular(id: string, nome: string) {
  fireEvent.click(within(screen.getByTestId('lista-ferramentas')).getByText(nome))
  const painel = screen.getByTestId(`ferramenta-${id}`)
  fireEvent.click(within(painel).getByRole('button', { name: /calcular|gerar/i }))
  return painel
}

describe('Ferramentas do dia a dia (tela)', () => {
  beforeEach(() => cleanup())

  it('lista as ferramentas e começa sem nenhuma aberta', () => {
    render(<MemoryRouter><FerramentasPage /></MemoryRouter>)
    expect(screen.getByTestId('ferramenta-vazia')).toBeTruthy()
    expect(screen.getByText(/ferramentas para a rotina do advogado/)).toBeTruthy()
  })

  it.each(FERRAMENTAS.filter(f => f.categoria !== 'Estudos para entidades').map(f => [f.id, f.nome] as const))('%s abre e calcula na tela', (id, nome) => {
    render(<MemoryRouter><FerramentasPage /></MemoryRouter>)
    const painel = abrirECalcular(id, nome)
    expect(within(painel).queryByTestId('ferramenta-erro')).toBeNull()
    expect(within(painel).getByTestId('ferramenta-resultado')).toBeTruthy()
  })

  it('erro de entrada aparece como aviso na tela', () => {
    render(<MemoryRouter><FerramentasPage /></MemoryRouter>)
    fireEvent.click(within(screen.getByTestId('lista-ferramentas')).getByText('Prazo em dias corridos'))
    const painel = screen.getByTestId('ferramenta-prazo-corrido')
    fireEvent.change(within(painel).getByLabelText('Dias corridos'), { target: { value: '0' } })
    fireEvent.click(within(painel).getByRole('button', { name: /calcular/i }))
    expect(within(painel).getByTestId('ferramenta-erro').textContent).toMatch(/maior que zero/)
  })

  it('busca filtra a lista e o endereço ?f= abre a ferramenta direto', () => {
    render(<MemoryRouter initialEntries={['/ferramentas?f=cpf']}><FerramentasPage /></MemoryRouter>)
    expect(screen.getByTestId('ferramenta-cpf')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Buscar ferramenta'), { target: { value: 'renovatoria' } })
    const botoes = within(screen.getByTestId('lista-ferramentas')).getAllByRole('button'); expect(botoes.length).toBeLessThan(5); expect(botoes.map(b => b.textContent).join(' ')).toMatch(/Janela da ação renovatória/)
  })
})

describe('Estudos para entidades (tela)', () => {
  beforeEach(() => cleanup())
  it('mostra o catálogo e só as ferramentas de estudos', () => {
    render(<MemoryRouter><EstudosPage /></MemoryRouter>)
    expect(screen.getByTestId('catalogo-estudos').querySelectorAll('tbody tr').length).toBe(11)
    expect(within(screen.getByTestId('lista-ferramentas')).queryByText('Validar CPF')).toBeNull()
  })
  it.each(FERRAMENTAS.filter(f => f.categoria === 'Estudos para entidades').map(f => [f.id, f.nome] as const))('%s abre e calcula na tela', (id, nome) => {
    render(<MemoryRouter><EstudosPage /></MemoryRouter>)
    const painel = abrirECalcular(id, nome)
    expect(within(painel).queryByTestId('ferramenta-erro')).toBeNull()
    expect(within(painel).getByTestId('ferramenta-resultado')).toBeTruthy()
  })
})
