// @vitest-environment jsdom
// Entrada multilíngue (pedido de M, 13/11/2026): escolher a língua nas boas-vindas tem efeito
// na tela de entrada, e a fileira de idiomas no pé da entrada troca a língua na hora.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { reiniciarIdioma } from '@/lib/i18n'

vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { auth: {
    signInWithPassword: async () => ({ error: null }), signUp: async () => ({ data: { session: null }, error: null }), signOut: async () => ({}),
    mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: { nextLevel: 'aal1', currentLevel: 'aal1' } }), listFactors: async () => ({ data: { totp: [] } }), challengeAndVerify: async () => ({ error: null }) },
  } },
}))
vi.mock('@/components/Marca', () => ({ default: () => <div data-testid="marca" /> }))
const { default: LoginPage } = await import('./LoginPage')
const { default: BoasVindasPage } = await import('./BoasVindasPage')

function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montarEntrada = () => render(<MemoryRouter><LoginPage /></MemoryRouter>)
const montarBoasVindas = () => render(
  <MemoryRouter initialEntries={['/boas-vindas']}>
    <Routes><Route path="/boas-vindas" element={<BoasVindasPage />} /><Route path="*" element={<Onde />} /></Routes>
  </MemoryRouter>,
)

describe('entrada do instituto em várias línguas', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); reiniciarIdioma() })
  afterEach(() => { localStorage.clear(); reiniciarIdioma() })

  it('a tela de escolha mostra os quatro idiomas no nome de cada um e convida nas quatro línguas', () => {
    montarBoasVindas()
    for (const nome of ['Português', 'English', '中文', 'Español']) expect(screen.getAllByText(nome).length).toBeGreaterThan(0)
    for (const codigo of ['pt', 'en', 'zh', 'es']) expect(screen.getByTestId(`idioma-${codigo}`)).toBeTruthy()
    const convite = screen.getByText(/Escolha o seu idioma/)
    expect(convite.textContent).toContain('Choose your language')
    expect(convite.textContent).toContain('请选择语言')
    expect(convite.textContent).toContain('Elija su idioma')
  })

  it('escolher chinês leva ao login e a tela de entrada já fala chinês', () => {
    montarBoasVindas()
    fireEvent.click(screen.getByTestId('idioma-zh'))
    expect(screen.getByTestId('onde').textContent).toBe('/login')
    expect(localStorage.getItem('theye-idioma')).toBe('zh')
    cleanup()
    montarEntrada()
    expect(screen.getByText('登录')).toBeTruthy()
    expect(screen.getByLabelText('邮箱')).toBeTruthy()
    expect(screen.getByLabelText('密码')).toBeTruthy()
    expect(screen.getByText('忘记密码')).toBeTruthy()
    expect(screen.getByText('创建账户')).toBeTruthy()
  })

  it('por padrão a entrada fala português (nada escolhido ainda)', () => {
    montarEntrada()
    expect(screen.getByText('Entrar')).toBeTruthy()
    expect(screen.getByLabelText('E-mail')).toBeTruthy()
    expect(screen.getByText('Esqueci minha senha')).toBeTruthy()
  })

  it('a fileira de idiomas no pé da entrada troca a língua na hora e guarda a escolha', () => {
    montarEntrada()
    const fileira = screen.getByTestId('seletor-idioma')
    expect(fileira).toBeTruthy()
    expect(screen.getByTestId('trocar-idioma-pt').getAttribute('aria-current')).toBe('true')

    fireEvent.click(screen.getByTestId('trocar-idioma-en'))
    expect(screen.getByText('Sign in')).toBeTruthy()
    expect(screen.getByLabelText('Email')).toBeTruthy()
    expect(screen.queryByText('Esqueci minha senha')).toBeNull()
    expect(screen.getByTestId('trocar-idioma-en').getAttribute('aria-current')).toBe('true')
    expect(screen.getByTestId('trocar-idioma-pt').getAttribute('aria-current')).toBeNull()
    expect(localStorage.getItem('theye-idioma')).toBe('en')

    fireEvent.click(screen.getByTestId('trocar-idioma-es'))
    expect(screen.getByText('Entrar')).toBeTruthy()
    expect(screen.getByLabelText('Contraseña')).toBeTruthy()
    expect(screen.getByText('Olvidé mi contraseña')).toBeTruthy()

    fireEvent.click(screen.getByTestId('trocar-idioma-pt'))
    expect(screen.getByLabelText('Senha')).toBeTruthy()
    expect(localStorage.getItem('theye-idioma')).toBe('pt')
  })

  it('criar conta e recuperar senha também falam a língua escolhida', () => {
    montarEntrada()
    fireEvent.click(screen.getByTestId('trocar-idioma-es'))
    fireEvent.click(screen.getByText('Crear cuenta'))
    expect(screen.getByText(/Cree su cuenta con correo, contraseña/)).toBeTruthy()
    expect(screen.getByText('Despacho (en letras mayúsculas)')).toBeTruthy()
    expect((screen.getByTestId('campo-escritorio') as HTMLInputElement).placeholder).toBe('EJ.: SARDAS E MENEZES')
    expect(screen.getByText('Crear acceso')).toBeTruthy()
    fireEvent.click(screen.getByText('Olvidé mi contraseña'))
    expect(screen.getAllByRole('status').some(s => s.textContent!.includes('contraseña provisional'))).toBe(true)
  })

  it('o símbolo escondido do Stokasticos continua intocado na tela de escolha', () => {
    montarBoasVindas()
    const elo = screen.getByTitle('Stokasticos — escola de magia do caos dedicada a Peter J. Carroll')
    expect(elo.textContent).toBe('☉ → ∞ +')
    expect(elo.getAttribute('href')).toBe('/stokasticos')
  })
})
