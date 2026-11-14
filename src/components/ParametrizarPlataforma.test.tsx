// @vitest-environment jsdom
// Pedido de M em 13/11/2026: "garanta que Fatima quando entrar veja uma tela enorme dizendo
// parametrize a plataforma e defina a hierarquia, somente uma vez". As tres pontas que importam:
// aparece para quem administra, NAO aparece para quem nao administra, e nunca mais volta depois
// que a administracao diz que terminou. O "uma vez" e' por escritorio e mora no banco
// (configuracoes.parametrizacao_feita), nao no navegador.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ParametrizarPlataforma from './ParametrizarPlataforma'

const perfil = vi.fn()
const estado = vi.fn()
const marcar = vi.fn()
vi.mock('@/lib/equipe', () => ({ perfilAtual: () => perfil() }))
vi.mock('@/lib/parametrizacao', () => ({
  estadoParametrizacao: () => estado(),
  marcarParametrizada: () => marcar(),
  CHAVE_PARAMETRIZACAO: 'parametrizacao_feita',
}))

const montar = () => render(<MemoryRouter><ParametrizarPlataforma /></MemoryRouter>)

// Este projeto roda o vitest com environment 'node' por padrao, entao nao ha limpeza automatica
// entre os testes: sem o cleanup(), a tela montada num teste continua no document e o teste
// seguinte "acha" um dialogo que nao e' o dele.
beforeEach(() => {
  cleanup()
  vi.clearAllMocks()
  try { sessionStorage.clear() } catch { /* sem armazenamento */ }
  marcar.mockResolvedValue(undefined)
})

describe('tela grande de parametrizacao no primeiro acesso', () => {
  it('a administracao do escritorio ainda nao parametrizado ve a tela, com os tres passos', async () => {
    perfil.mockResolvedValue('admin'); estado.mockResolvedValue({ feita: false, comCargo: 0 })
    montar()
    await screen.findByTestId('parametrizar-plataforma')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toMatch(/Parametrize a plataforma e defina a hierarquia/)
    expect(screen.getByTestId('parametrizar-1')).toBeTruthy()
    expect(screen.getByTestId('parametrizar-3')).toBeTruthy()
  })

  it('quem nao administra nunca ve a tela, mesmo sem parametrizacao', async () => {
    perfil.mockResolvedValue('operador'); estado.mockResolvedValue({ feita: false, comCargo: 0 })
    montar()
    await waitFor(() => expect(perfil).toHaveBeenCalled())
    expect(screen.queryByTestId('parametrizar-plataforma')).toBeNull()
  })

  it('escritorio ja parametrizado nao ve a tela nunca mais', async () => {
    perfil.mockResolvedValue('admin'); estado.mockResolvedValue({ feita: true, comCargo: 4 })
    montar()
    await waitFor(() => expect(estado).toHaveBeenCalled())
    expect(screen.queryByTestId('parametrizar-plataforma')).toBeNull()
  })

  it('"Ja parametrizei" grava no banco e fecha', async () => {
    perfil.mockResolvedValue('admin'); estado.mockResolvedValue({ feita: false, comCargo: 0 })
    montar()
    fireEvent.click(await screen.findByTestId('parametrizar-terminei'))
    await waitFor(() => expect(marcar).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(screen.queryByTestId('parametrizar-plataforma')).toBeNull())
  })

  it('"Agora nao" fecha sem gravar, e por isso a tela volta no proximo acesso', async () => {
    perfil.mockResolvedValue('admin'); estado.mockResolvedValue({ feita: false, comCargo: 0 })
    const r = montar()
    fireEvent.click(await screen.findByTestId('parametrizar-depois'))
    await waitFor(() => expect(screen.queryByTestId('parametrizar-plataforma')).toBeNull())
    expect(marcar).not.toHaveBeenCalled()
    r.unmount()
    cleanup()
    montar() // mesma visita: fica fechada
    await waitFor(() => expect(screen.queryByTestId('parametrizar-plataforma')).toBeNull())
    cleanup()
    try { sessionStorage.clear() } catch { /* sem armazenamento */ }
    montar() // visita nova: volta, porque nada foi gravado
    await screen.findByTestId('parametrizar-plataforma')
  })
})
