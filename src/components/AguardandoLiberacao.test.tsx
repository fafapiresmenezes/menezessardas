// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let situacao: { estado: string; escritorio?: string; desde?: string } = { estado: 'pendente', escritorio: 'SARDAS E MENEZES', desde: '2026-11-12T12:00:00Z' }
const entrar = vi.fn(async (_n: string) => ({ estado: 'pendente', escritorio: 'OUTRO ESCRITORIO' }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { auth: { signOut: async () => ({ error: null }) } } }))
vi.mock('@/lib/equipe', () => ({
  meuPedidoEntrada: async () => situacao,
  entrarEmEscritorio: (n: string) => entrar(n),
  nomeDeEscritorio: (t: string) => t.toUpperCase().replace(/\s+/g, ' ').trim(),
}))
const { default: AguardandoLiberacao } = await import('./AguardandoLiberacao')

describe('Tela de quem ainda não foi liberado pelo escritório', () => {
  beforeEach(() => { cleanup(); entrar.mockClear(); situacao = { estado: 'pendente', escritorio: 'SARDAS E MENEZES', desde: '2026-11-12T12:00:00Z' } })

  it('pedido pendente: diz o escritório, explica os 3 passos e não mostra nada da plataforma', async () => {
    render(<AguardandoLiberacao aoEntrar={() => undefined} />)
    const bloco = await screen.findByTestId('pedido-pendente')
    expect(bloco.textContent).toContain('SARDAS E MENEZES')
    expect(bloco.querySelectorAll('ol > li')).toHaveLength(3)
    expect(screen.queryByTestId('form-escritorio')).toBeNull()
  })

  it('quando o escritório libera, "conferir" leva a pessoa para dentro', async () => {
    const aoEntrar = vi.fn()
    render(<AguardandoLiberacao aoEntrar={aoEntrar} />)
    await screen.findByTestId('pedido-pendente')
    situacao = { estado: 'dentro' }
    fireEvent.click(screen.getByTestId('conferir-liberacao'))
    await waitFor(() => expect(aoEntrar).toHaveBeenCalled())
  })

  it('quem escreveu o nome errado troca o escritório, sempre em maiúsculas', async () => {
    render(<AguardandoLiberacao aoEntrar={() => undefined} />)
    await screen.findByTestId('pedido-pendente')
    fireEvent.click(screen.getByTestId('trocar-escritorio'))
    fireEvent.change(screen.getByTestId('campo-nome-escritorio'), { target: { value: 'outro  escritorio' } })
    expect((screen.getByTestId('campo-nome-escritorio') as HTMLInputElement).value).toBe('OUTRO  ESCRITORIO')
    fireEvent.submit(screen.getByTestId('form-escritorio'))
    await waitFor(() => expect(entrar).toHaveBeenCalledWith('OUTRO  ESCRITORIO'))
    await waitFor(() => expect(screen.getByTestId('pedido-pendente').textContent).toContain('OUTRO ESCRITORIO'))
  })

  it('conta sem escritório: pergunta o nome e recusa nome curto demais', async () => {
    situacao = { estado: 'nenhum' }
    render(<AguardandoLiberacao aoEntrar={() => undefined} />)
    await screen.findByTestId('form-escritorio')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('De qual escritório você é?')
    fireEvent.change(screen.getByTestId('campo-nome-escritorio'), { target: { value: 'ab' } })
    fireEvent.submit(screen.getByTestId('form-escritorio'))
    expect((await screen.findByRole('alert')).textContent).toContain('pelo menos 3 letras')
    expect(entrar).not.toHaveBeenCalled()
  })

  it('pedido recusado: avisa e deixa pedir de novo', async () => {
    situacao = { estado: 'recusado', escritorio: 'SARDAS E MENEZES' }
    render(<AguardandoLiberacao aoEntrar={() => undefined} />)
    expect((await screen.findByTestId('pedido-recusado')).textContent).toContain('não foi aceito')
    expect(screen.getByTestId('form-escritorio')).toBeTruthy()
  })
})
