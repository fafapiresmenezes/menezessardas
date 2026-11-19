import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import VisaoPorNivel from './VisaoPorNivel'

let alcance = { id: 'u1', cargo: 'socio' as string | null, admin: false, veTudo: true }
let mapa = { gestor: ['/funil'], advogado: [] as string[] }
const gravar = vi.fn(async (_n: string, _t: string[]) => undefined)
vi.mock('@/lib/equipe', () => ({ ehSede: async () => true }))
vi.mock('@/lib/hierarquia', async () => ({
  ...(await vi.importActual<typeof import('@/lib/hierarquia')>('@/lib/hierarquia')),
  meuAlcance: async () => alcance,
  lerOcultas: async () => mapa,
  gravarOcultas: (n: string, t: string[]) => gravar(n, t),
}))

describe('O que cada nível vê (três níveis em cascata)', () => {
  beforeEach(() => { cleanup(); gravar.mockClear(); alcance = { id: 'u1', cargo: 'socio', admin: false, veTudo: true }; mapa = { gestor: ['/funil'], advogado: [] } })

  it('o chefe escolhe as telas do gestor e do advogado; esconder grava só aquele nível', async () => {
    render(<VisaoPorNivel />)
    const funil = await screen.findByTestId('visao-gestor-/funil') as HTMLInputElement
    await waitFor(() => expect(funil.checked).toBe(false))
    expect(screen.getByTestId('visao-advogado')).toBeTruthy()
    const indicadores = screen.getByTestId('visao-gestor-/indicadores') as HTMLInputElement
    expect(indicadores.checked).toBe(true)
    fireEvent.click(indicadores)
    await waitFor(() => expect(gravar).toHaveBeenCalledWith('gestor', ['/funil', '/indicadores']))
    expect(screen.getByTestId('visao-nivel-msg').textContent).toContain('Salvo')
    // O dinheiro não entra aqui: é liberado pessoa a pessoa.
    expect(screen.queryByTestId('visao-gestor-/financeiro')).toBeNull()
    // Telas de que todo mundo precisa não podem ser escondidas.
    expect(screen.queryByTestId('visao-gestor-/meu-dia')).toBeNull()
  })

  it('o gestor só escolhe as telas do advogado', async () => {
    alcance = { id: 'u2', cargo: 'gestor', admin: false, veTudo: true }
    render(<VisaoPorNivel />)
    expect(await screen.findByTestId('visao-advogado')).toBeTruthy()
    expect(screen.queryByTestId('visao-gestor')).toBeNull()
  })

  it('o advogado não vê este quadro', async () => {
    alcance = { id: 'u3', cargo: 'pleno', admin: false, veTudo: false }
    const { container } = render(<VisaoPorNivel />)
    await new Promise(r => setTimeout(r, 20))
    expect(container.querySelector('[data-testid=visao-por-nivel]')).toBeNull()
  })
})
