// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, within } from '@testing-library/react'

let configurado = true
const rpc = vi.fn(async (_f: string, _p?: object): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: null, error: null }))
const signOut = vi.fn(async () => undefined)
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { rpc: (f: string, p?: object) => rpc(f, p), auth: { signOut: () => signOut() } } }))
vi.mock('@/lib/contratoSaas', async (orig) => ({ ...(await orig() as object), hashContratoSaas: async () => 'hash-teste' }))
const { default: CalibracaoPrevisoes, lerCalibracao } = await import('./CalibracaoPrevisoes')
const { default: AceiteContratoSaas } = await import('./AceiteContratoSaas')
const { CONTRATO_SAAS_VERSAO } = await import('@/lib/contratoSaas')

const calib = { contratos_com_desfecho: 3, previsoes_registradas: 12, brier_inadimplencia: 0.0812, n_inadimplencia: 3, acerto_inadimplencia_pct: 100, brier_renovacao: null, n_renovacao: 0, acerto_renovacao_pct: null }

describe('CalibracaoPrevisoes e AceiteContratoSaas', () => {
  beforeEach(() => { cleanup(); configurado = true; rpc.mockReset().mockResolvedValue({ data: null, error: null }); signOut.mockClear() })

  it('calibração: nada sem dados; com dados mostra Brier formatado, qualidade, acerto e casos; sem Supabase não consulta', async () => {
    const { container } = render(<CalibracaoPrevisoes />)
    await waitFor(() => expect(rpc.mock.calls[0]![0]).toBe('calibracao_previsoes'))
    expect(container.innerHTML).toBe('')
    cleanup()
    rpc.mockResolvedValue({ data: calib, error: null })
    render(<CalibracaoPrevisoes compacto />)
    await waitFor(() => expect(screen.getByTestId('calibracao')).toBeTruthy())
    expect(screen.getByText(/3 de 12 contratos previstos já têm desfecho real registrado/)).toBeTruthy()
    const inad = within(screen.getByTestId('calib-inadimplência')).getAllByRole('cell').map(c => c.textContent)
    expect(inad).toEqual(['Inadimplência', '0,081', 'excelente', '100%', '3'])
    const ren = within(screen.getByTestId('calib-renovação')).getAllByRole('cell').map(c => c.textContent)
    expect(ren).toEqual(['Renovação', '—', '—', '—', '0'])
    expect(screen.getByRole('heading', { name: 'Calibração das previsões (Brier)' }).className).toContain('uppercase')
    cleanup()
    rpc.mockResolvedValue({ data: { ...calib, contratos_com_desfecho: 0, brier_inadimplencia: 0.3, brier_renovacao: 0.2 }, error: null })
    render(<CalibracaoPrevisoes />)
    await waitFor(() => expect(screen.getByText(/Registre em Previsões o que aconteceu de fato/)).toBeTruthy())
    expect(within(screen.getByTestId('calib-inadimplência')).getAllByRole('cell')[2]!.textContent).toBe('pior que chute')
    expect(within(screen.getByTestId('calib-renovação')).getAllByRole('cell')[2]!.textContent).toBe('fraca')
    configurado = false
    rpc.mockClear()
    expect(await lerCalibracao()).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('aceite SaaS: só para admin de escritório parceiro com pendência; aceitar exige marcar a leitura e grava versão, hash e navegador; erro aparece; sair encerra a sessão', async () => {
    rpc.mockImplementation(async (f: string) => f === 'contrato_saas_pendente' ? { data: true, error: null } : { data: null, error: null })
    const { container } = render(<AceiteContratoSaas admin sede />)
    expect(container.innerHTML).toBe('')
    expect(rpc).not.toHaveBeenCalled()
    cleanup(); render(<AceiteContratoSaas admin={false} sede={false} />)
    expect(rpc).not.toHaveBeenCalled()
    cleanup(); render(<AceiteContratoSaas admin sede={false} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    expect(rpc).toHaveBeenCalledWith('contrato_saas_pendente', { p_versao: CONTRATO_SAAS_VERSAO })
    expect(screen.getByText(`Versão ${CONTRATO_SAAS_VERSAO}.`, { exact: false })).toBeTruthy()
    expect(screen.getByText(/CONTRATO DE ADESÃO/)).toBeTruthy()
    const aceitar = screen.getByTestId('aceitar-saas') as HTMLButtonElement
    expect(aceitar.disabled).toBe(true)
    screen.getByTestId('saas-lido').click()
    await waitFor(() => expect(aceitar.disabled).toBe(false))
    rpc.mockImplementationOnce(async () => ({ data: null, error: { message: 'sem permissão' } }))
    aceitar.click()
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Não deu para gravar o aceite: sem permissão'))
    expect(rpc).toHaveBeenLastCalledWith('aceitar_contrato_saas', { p_versao: CONTRATO_SAAS_VERSAO, p_hash: 'hash-teste', p_navegador: navigator.userAgent })
    aceitar.click()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    cleanup(); render(<AceiteContratoSaas admin sede={false} />)
    await waitFor(() => expect(screen.getByRole('dialog')).toBeTruthy())
    const assign = vi.fn(); Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, assign } })
    screen.getByText('Não aceito (sair)').click()
    await waitFor(() => expect(signOut).toHaveBeenCalled())
    await waitFor(() => expect(assign).toHaveBeenCalledWith('#/'))
  })
})
