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
const montar = () => render(<MemoryRouter initialEntries={['/login?ir=/instituto']}><Routes><Route path="/login" element={<LoginPage />} /><Route path="*" element={<Onde />} /></Routes></MemoryRouter>)
const preencher = (email: string, senha: string) => { fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: email } }); fireEvent.change(screen.getByLabelText('Senha'), { target: { value: senha } }) }
// No cadastro há também o campo do escritório (pedido de M, 12/11/2026), sempre em maiúsculas.
const preencherEscritorio = (nome = 'SARDAS E MENEZES') => {
  if (nome === 'SARDAS E MENEZES') { fireEvent.change(screen.getByTestId('lista-escritorio'), { target: { value: nome } }); return }
  fireEvent.change(screen.getByTestId('lista-escritorio'), { target: { value: '__outro__' } })
  fireEvent.change(screen.getByTestId('campo-escritorio'), { target: { value: nome } })
}

describe('Tela de login', () => {
  it('link de senha colado: lê o código do link do e-mail e a sessão da página que deu erro', async () => {
    const { lerLinkDeSenha } = await import('./LoginPage')
    expect(lerLinkDeSenha('https://x.supabase.co/auth/v1/verify?token=abc123&type=recovery&redirect_to=http://localhost:3000').token).toBe('abc123')
    const s = lerLinkDeSenha(' http://localhost:3000/#access_token=AAA.BBB&expires_in=3600&refresh_token=rrr&type=recovery ')
    expect(s.acesso).toBe('AAA.BBB'); expect(s.renovacao).toBe('rrr')
    expect(lerLinkDeSenha('nada aqui')).toEqual({ token: undefined, acesso: undefined, renovacao: undefined })
  })
  it('a primeira tela não mostra e-mail e senha: a entrada só aparece depois de clicar num quadradinho', () => {
    cleanup()
    render(<MemoryRouter initialEntries={['/login']}><Routes><Route path="/login" element={<LoginPage />} /></Routes></MemoryRouter>)
    expect(screen.queryByTestId('cartao-entrada')).toBeNull()
    expect(screen.queryByLabelText('Senha')).toBeNull()
    cleanup(); montar()
    expect(screen.getByTestId('cartao-entrada')).toBeTruthy()
  })
  beforeEach(() => { cleanup(); configurado = true; nivel = { nextLevel: 'aal1', currentLevel: 'aal1' }; signInWithPassword.mockClear(); signUp.mockClear(); challengeAndVerify.mockClear() })

  it('entra com e-mail e senha e vai para a entrada por área; senha errada e servidor fora viram avisos diferentes', async () => {
    montar()
    preencher('fatima@gmenezes.com', 'segredo123')
    fireEvent.click(screen.getByText('Entrar'))
    await waitFor(() => expect(signInWithPassword).toHaveBeenCalledWith({ email: 'fatima@gmenezes.com', password: 'segredo123' }))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/instituto'))
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
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/instituto'))
  })

  it('criar conta: bloqueia robô (menos de 3 s), exige 8 caracteres, cadastra e avisa que não precisa de aprovação; esqueci a senha orienta', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-02T10:00:00Z'))
    montar()
    fireEvent.click(screen.getByText('Criar conta'))
    expect(screen.getByText(/Crie sua conta com e-mail, senha e o nome do seu escritório/)).toBeTruthy()
    preencher('novo@gmenezes.com', 'SenhaForte123')
    preencherEscritorio()
    // A pergunta é uma lista suspensa com o registro dos escritórios; o campo escrito só aparece em "não está na lista".
    expect(screen.getByLabelText('Qual é o seu escritório?')).toBeTruthy()
    expect(screen.queryByTestId('campo-escritorio')).toBeNull()
    expect((screen.getByTestId('lista-escritorio') as HTMLSelectElement).value).toBe('SARDAS E MENEZES')
    fireEvent.click(screen.getByText('Criar acesso'))
    expect((await screen.findByRole('alert')).textContent).toContain('Tente novamente em alguns segundos')
    vi.setSystemTime(new Date('2026-11-02T10:00:05Z'))
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'curta' } })
    fireEvent.click(screen.getByText('Criar acesso'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/A senha precisa ter pelo menos 12 caracteres/))
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'SenhaForte123' } })
    fireEvent.click(screen.getByText('Criar acesso'))
    await waitFor(() => expect(signUp).toHaveBeenCalledWith({ email: 'novo@gmenezes.com', password: 'SenhaForte123', options: { data: { escritorio: 'SARDAS E MENEZES' } } }))
    expect((await screen.findByRole('status')).textContent).toContain('precisa liberar a sua entrada')
    expect(screen.getByText('Entrar')).toBeTruthy()
    fireEvent.click(screen.getByText('Esqueci minha senha'))
    expect(screen.getAllByRole('status').some(s => s.textContent!.includes('mandamos um link para você mesmo criar uma senha nova'))).toBe(true)
    vi.useRealTimers()
  })

  it('conta nova sem aprovação: entra direto quando o servidor já devolve a sessão; e-mail não confirmado tem aviso próprio', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-10T10:00:00Z'))
    montar()
    fireEvent.click(screen.getByText('Criar conta'))
    expect(screen.getByText(/precisa liberar a sua entrada/)).toBeTruthy()
    preencher('aluna@escritorio.com', 'SenhaForte123')
    preencherEscritorio('ESCRITÓRIO NOVO')
    vi.setSystemTime(new Date('2026-11-10T10:00:05Z'))
    signUp.mockResolvedValueOnce({ data: { session: { access_token: 't' } }, error: null })
    fireEvent.click(screen.getByText('Criar acesso'))
    await waitFor(() => expect(screen.getByTestId('onde').textContent).toBe('/instituto'))
    vi.useRealTimers()
    cleanup(); montar()
    signInWithPassword.mockResolvedValueOnce({ error: { status: 400, message: 'Email not confirmed' } })
    preencher('aluna@escritorio.com', 'SenhaForte123'); fireEvent.click(screen.getByText('Entrar'))
    expect((await screen.findByRole('alert')).textContent).toContain('Falta confirmar o seu e-mail')
    cleanup(); montar()
    fireEvent.click(screen.getByText('Criar conta'))
    signUp.mockResolvedValueOnce({ error: { message: 'email rate limit exceeded' } })
    preencher('outra@escritorio.com', 'SenhaForte123')
    preencherEscritorio()
    await new Promise(r => setTimeout(r, 3100))
    fireEvent.click(screen.getByText('Criar acesso'))
    expect((await screen.findByRole('alert')).textContent).toContain('Muitas contas criadas em pouco tempo')
  }, 15000)

  it('sem banco (modo demonstração) bloqueia a entrada — ninguém sem senha real passa', async () => {
    // M em 13/11/2026: "Não deixe ninguém sem senha acessar nada."
    configurado = false
    Object.defineProperty(window, 'location', { value: { ...window.location, reload: vi.fn() }, writable: true })
    montar()
    expect(screen.queryByText('Criar conta')).toBeNull()
    preencher('admin@exemplo.com', 'senha123'); fireEvent.click(screen.getByText('Entrar'))
    expect((await screen.findByRole('alert')).textContent).toContain('não está configurada')
    expect(screen.queryByTestId('onde')).toBeNull()
    expect(signInWithPassword).not.toHaveBeenCalled()
    expect(entrarDemo).not.toHaveBeenCalled()
  })
})
