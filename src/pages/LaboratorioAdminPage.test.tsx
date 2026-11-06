// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let funcao: 'admin' | 'operador' | 'leitor' = 'operador'
const registrar = vi.fn(async (_e: object) => undefined)
const from = vi.fn()
vi.mock('@/lib/equipe', () => ({ perfilAtual: async () => funcao }))
vi.mock('@/lib/trilha', () => ({ registrarEvento: (e: object) => registrar(e) }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { from: (...a: unknown[]) => from(...a) } }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const mod = await import('./LaboratorioAdminPage')
const Pagina = mod.default

describe('Laboratório de autoavaliação (B13)', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); registrar.mockClear(); from.mockClear(); funcao = 'operador' })

  it('operador e leitor não entram', async () => {
    render(<MemoryRouter><Pagina /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('lab-bloqueado')).toBeTruthy())
    expect(screen.queryByTestId('lab-aviso')).toBeNull()
    expect(screen.getByText('Só administradores entram aqui')).toBeTruthy()
  })

  it('admin vê o aviso LGPD; a câmera só libera depois de assinar; a assinatura vai só para a trilha e para este navegador', async () => {
    funcao = 'admin'
    render(<MemoryRouter><Pagina /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('lab-aviso')).toBeTruthy())
    expect(screen.getByTestId('lab-aviso').textContent).toContain('nunca para avaliar cliente, parte, colega ou qualquer terceiro')
    expect(screen.queryByTestId('lab-camera')).toBeNull()
    const botao = screen.getByRole('button', { name: 'Assinar e liberar o laboratório' }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.click(screen.getByLabelText('Li e assino este aviso como administrador(a).'))
    fireEvent.click(botao)
    await waitFor(() => expect(screen.getByTestId('lab-camera')).toBeTruthy())
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'laboratorio_admin_aviso_assinado', entidade: 'laboratorio-admin' }))
    expect(mod.lerAssinaturaLocal()?.versao).toBe(mod.AVISO_VERSAO)
    expect(from).not.toHaveBeenCalled() // nada do laboratório vai para o banco
    expect(screen.queryByRole('button', { name: /salvar|guardar/i })).toBeNull()
  })

  it('câmera negada pelo navegador é informada; encerrar apaga tudo', async () => {
    funcao = 'admin'
    localStorage.setItem('lab-admin-aviso', JSON.stringify({ versao: mod.AVISO_VERSAO, em: '2026-11-06T04:00:00Z' }))
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => { throw new Error('NotAllowedError') } } })
    render(<MemoryRouter><Pagina /></MemoryRouter>)
    await waitFor(() => expect(screen.getByTestId('lab-assinado')).toBeTruthy())
    fireEvent.click(screen.getByRole('button', { name: 'Ligar câmera' }))
    await waitFor(() => expect(screen.getByText('A câmera não foi liberada pelo navegador.')).toBeTruthy())
    expect(screen.getByTestId('lab-indice').textContent).toBe('—')
    expect(screen.getByTestId('lab-segundos').textContent).toBe('0')
  })

  it('o índice de agitação é só a diferença média entre quadros, de 0 a 100', () => {
    const a = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255])
    expect(mod.agitacao(a, a)).toBe(0)
    expect(mod.agitacao(new Uint8ClampedArray([0, 0, 0, 255]), new Uint8ClampedArray([255, 255, 255, 255]))).toBe(100)
    expect(mod.agitacao(new Uint8ClampedArray([]), new Uint8ClampedArray([1, 2, 3, 4]))).toBe(0)
  })
})
