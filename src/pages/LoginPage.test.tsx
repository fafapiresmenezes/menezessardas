// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let configurado = true
let nivel = { nextLevel: 'aal1', currentLevel: 'aal1' }
const signInWithPassword = vi.fn(async (_c: object): Promise<{ error: { status?: number; message: string } | null }> => ({ error: null }))
const signUp = vi.fn(async (_c: object): Promise<{ data?: { session: object | null }; error: { message: string } | null }> => ({ data: { session: null }, error: null }))
const challengeAndVerify = vi.fn(async (_c: object): Promise<{ error: { message: string } | null }> => ({ error: null }))
vi.mock('@/lib/supabase', () => ({
  get supabaseConfigurado() { return configurado },
  supabase: { auth: {
    signInWithPassword: (c: object) => signInWithPassword(c), signUp: (c: object) => signUp(c), signOut: async () => ({}),
    mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: nivel }), listFactors: async () => ({ data: { totp: [{ id: 'f1', status: 'verified' }] } }), challengeAndVerify: (c: object) => challengeAndVerify(c) },
  } },
}))
const entrarDemo = vi.fn((e: string, s: string) => e === 'admin@exemplo.com' && s === 'senha123')
vi.mock('@/lib/authDemo', () => ({ entrarDemo: (e: string, s: string) => entrarDemo(e, s) }))
vi.mock('@/components/Marca', () => ({ default: () => <div data-testid="marca" /> }))
const { default: LoginPage } = await import('./LoginPage')

function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = () => render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
const preencher = (email: string, senha: string) => { fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } }); fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } }) }

describe('Tela de login', () => {
  beforeEach(() => { cleanup(); configurado = true; nivel = { nextLevel: 'aal1', currentLevel: 'aal1' }; signInWithPassword.mockClear(); signUp.mockClear(); challengeAndVerify.mockClear() })

  it('entra com e-mail e senha e vai para a entrada por área; senha errada e servidor fora viram avisos diferentes', async () => {
    montar()
    preencher('fatima@gmenezes.com', 'segredo123')
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: 'fatima@gmenezes.com', password: 'segredo123' }))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/inicio'))
    cleanup(); montar()
    signInWithPassword.mockResolvedValueOnce({ error: { status: 400, message: 'Invalid login credentials' } })
    preencher('a@b.com', 'x'); fireEvent.click(screen.getByText('Entrar'))
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou senha incorretos.')
    signInWithPassword.mockResolvedValueOnce({ error: { status: 503, message: 'fetch failed' } })
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível falar com o servidor'))
  })

  it('conta com dois fatores pede o código após a senha; código errado recusa, certo entra', async () => {
    montar()
    preencher('m@gmenezes.com', 'segredo123')
    nivel = { nextLevel: 'aal2', currentLevel: 'aal1' }
    fireEvent.click(screen.getByText('Entrar'))
    const form = await screen.findByTestId('form-2fa')
    expect(form).toBeTruthy()
    challengeAndVerify.mockResolvedValueOnce({ error: { message: 'invalid' } })
    fireEvent.change(screen.getByLabelText('Código de 6 dígitos'), { target: { value: '123 456' } })
    fireEvent.click(screen.getByText('Confirmar código'))
    await waitFor(() => expect(screen.getAllByRole('alert').some(a => a.textContent === 'Código não confere. Tente de novo.')).toBe(true))
    expect(challengeAndVerify).toHaveBeenCalledWith({ factorId: 'f1', code: '123456' })
    fireEvent.click(screen.getByText('Confirmar código'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/inicio'))
  })

  it('criar conta: bloqueia robô (menos de 3 s), exige 8 caracteres, cadastra e avisa que não precisa de aprovação; esqueci a senha orienta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-02T10:00:00Z'))
    montar()
    fireEvent.click(screen.getByText('Criar conta'))
    expect(screen.getByText(/Crie sua conta com e-mail e senha/)).toBeTruthy()
    preencher('novo@gmenezes.com', 'senhaforte1')
    fireEvent.click(screen.getByText('Criar acesso'))
    expect((await screen.findByRole('alert')).textContent).toContain('Tente novamente em alguns segundos')
    vi.setSystemTime(new Date('2026-11-02T10:00:05Z'))
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'curta' } })
    fireEvent.click(screen.getByText('Criar acesso'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('A senha precisa ter pelo menos 8 caracteres.'))
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senhaforte1' } })
    fireEvent.click(screen.getByText('Criar acesso'))
    await waitFor(() => expect(signUp).toHaveBeenCalledWith({ email: 'novo@gmenezes.com', password: 'senhaforte1' }))
    expect((await screen.findByRole('status')).textContent).toContain('Não precisa esperar aprovação')
    expect(screen.getByText('Entrar')).toBeTruthy()
    fireEvent.click(screen.getByText('Esqueci minha senha'))
    expect(screen.getAllByRole('status').some(s => s.textContent!.includes('senha provisória (menu Equipe)'))).toBe(true)
    vi.useRealTimers()
  })

  it('conta nova sem aprovação: entra direto quando o servidor já devolve a sessão; e-mail não confirmado tem aviso próprio', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-10T10:00:00Z'))
    montar()
    fireEvent.click(screen.getByText('Criar conta'))
    expect(screen.getByText(/já entra como leitor, sem esperar aprovação/)).toBeTruthy()
    preencher('aluna@escritorio.com', 'senhaforte1')
    vi.setSystemTime(new Date('2026-11-10T10:00:05Z'))
    signUp.mockResolvedValueOnce({ data: { session: { access_token: 't' } }, error: null })
    fireEvent.click(screen.getByText('Criar acesso'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/inicio'))
    vi.useRealTimers()
    cleanup(); montar()
    signInWithPassword.mockResolvedValueOnce({ error: { status: 400, message: 'Email not confirmed' } })
    preencher('aluna@escritorio.com', 'senhaforte1'); fireEvent.click(screen.getByText('Entrar'))
    expect((await screen.findByRole('alert')).textContent).toContain('Falta confirmar o seu e-mail')
    cleanup(); montar()
    fireEvent.click(screen.getByText('Criar conta'))
    signUp.mockResolvedValueOnce({ error: { message: 'email rate limit exceeded' } })
    preencher('outra@escritorio.com', 'senhaforte1')
    await new Promise(r => setTimeout(r, 3100))
    fireEvent.click(screen.getByText('Criar acesso'))
    expect((await screen.findByRole('alert')).textContent).toContain('Muitas contas criadas em pouco tempo')
  }, 15000)

  it('sem banco (demonstração) entra com as credenciais de exemplo e recusa outras', async () => {
    configurado = false
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true })
    montar()
    expect(screen.queryByText('Criar conta')).toBeNull()
    preencher('x@y.com', 'errada'); fireEvent.click(screen.getByText('Entrar'))
    expect((await screen.findByRole('alert')).textContent).toBe('E-mail ou senha incorretos.')
    preencher('admin@exemplo.com', 'senha123'); fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/inicio'))
    expect(signInWithPassword).not.toHaveBeenCalled()
  })
})
