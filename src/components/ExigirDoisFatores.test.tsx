// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let fatores: { status: string }[] = []
const rpc = vi.fn()
const signOut = vi.fn(async () => undefined)
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { auth: { mfa: { listFactors: async () => ({ data: { totp: fatores } }) }, signOut }, rpc },
}))
vi.mock('@/lib/contratoSaas', () => ({ CONTRATO_SAAS_TEXTO: 'Contrato de adesão SaaS.', CONTRATO_SAAS_VERSAO: '1.0', hashContratoSaas: async () => 'h1' }))
const { default: ExigirDoisFatores, adminSemDoisFatores, PRAZO_2FA } = await import('./ExigirDoisFatores')
const { default: AceiteContratoSaas } = await import('./AceiteContratoSaas')

const montar = (rota: string, admin = true) => render(<MemoryRouter initialEntries={[rota]}><ExigirDoisFatores admin={admin} /></MemoryRouter>)

describe('Dois fatores obrigatório para administradores', () => {
  beforeEach(() => { cleanup(); fatores = []; vi.useRealTimers() })
  afterEach(() => vi.useRealTimers())

  it('não incomoda quem não é administrador nem quem já ativou', async () => {
    fatores = [{ status: 'verified' }]
    expect(await adminSemDoisFatores()).toBe(false)
    montar('/dashboard')
    await waitFor(() => expect(screen.queryByTestId('aviso-2fa')).toBeNull())
    fatores = []
    montar('/dashboard', false)
    await waitFor(() => expect(screen.queryByTestId('aviso-2fa')).toBeNull())
  })

  it('antes do prazo mostra aviso com a contagem de dias e link para Configurações', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(PRAZO_2FA.getTime() - 3 * 86400000))
    montar('/dashboard')
    const aviso = await screen.findByTestId('aviso-2fa')
    expect(aviso.textContent).toContain('até 6 de novembro (3 dias)')
    expect(screen.getByText('Ativar agora').getAttribute('href')).toBe('/settings')
  })

  it('depois do prazo bloqueia a tela, menos em Configurações', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date(PRAZO_2FA.getTime() + 86400000))
    montar('/dashboard')
    const bloqueio = await screen.findByTestId('bloqueio-2fa')
    expect(bloqueio.getAttribute('role')).toBe('alertdialog')
    cleanup(); montar('/settings')
    await waitFor(() => expect(screen.queryByTestId('bloqueio-2fa')).toBeNull())
  })
})

describe('Contrato de adesão SaaS (escritório parceiro)', () => {
  beforeEach(() => { cleanup(); rpc.mockReset() })

  it('não aparece na sede nem para quem não é administrador; aparece ao parceiro com aceite pendente e grava', async () => {
    rpc.mockImplementation(async (nome: string) => nome === 'contrato_saas_pendente' ? { data: true, error: null } : { error: null })
    render(<AceiteContratoSaas admin sede />)
    expect(screen.queryByTestId('aceite-contrato-saas')).toBeNull()
    cleanup(); render(<AceiteContratoSaas admin={false} sede={false} />)
    expect(screen.queryByTestId('aceite-contrato-saas')).toBeNull()
    cleanup(); render(<AceiteContratoSaas admin sede={false} />)
    const dialogo = await screen.findByTestId('aceite-contrato-saas')
    expect(dialogo.textContent).toContain('Contrato de adesão SaaS.')
    const botao = screen.getByTestId('aceitar-saas') as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.click(screen.getByTestId('saas-lido'))
    fireEvent.click(botao)
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('aceitar_contrato_saas', { p_versao: '1.0', p_hash: 'h1', p_navegador: navigator.userAgent }))
    await waitFor(() => expect(screen.queryByTestId('aceite-contrato-saas')).toBeNull())
  })
})
