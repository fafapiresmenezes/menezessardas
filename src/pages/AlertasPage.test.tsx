// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

let loading = false
const alertas = [
  { id: 'a1', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'contrato', titulo: 'Fim do contrato', dataEvento: '2026-11-10', diasRestantes: 8 },
  { id: 'a2', imovelId: 'i1', imovel: 'Rua das Flores 123', tipo: 'documento', titulo: 'IPTU', dataEvento: '2027-03-01', diasRestantes: 120 },
  { id: 'a3', imovelId: 'i2', imovel: 'Av. Atlântica 500', tipo: 'contrato', titulo: 'Reajuste', dataEvento: '2026-10-20', diasRestantes: -13 },
]
const tabelas: Record<string, object[] | object | null> = {}
const update = vi.fn(async (_r: object) => ({}))
const cadeia = (t: string) => { const o: Record<string, unknown> = {}; for (const m of ['select', 'eq', 'is', 'like', 'order', 'limit', 'maybeSingle']) o[m] = () => o; o.then = (f: (v: { data: unknown }) => unknown) => Promise.resolve({ data: tabelas[t] ?? [] }).then(f); return o }
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: (t: string) => ({ ...cadeia(t), update: (r: object) => ({ eq: async () => update(r) }) }), auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) } },
}))
vi.mock('@/hooks/useAlertas', () => ({ useAlertas: () => ({ alertas, loading, getCriticos: () => alertas.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 30).length }) }))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: AlertasPage } = await import('./AlertasPage')
const Onde = () => <p data-testid="onde">{useLocation().pathname}</p>
const montar = () => render(<MemoryRouter><Routes><Route path="*" element={<><AlertasPage /><Onde /></>} /></Routes></MemoryRouter>)

describe('Alertas', () => {
  beforeEach(() => { cleanup(); localStorage.clear(); loading = false; update.mockClear(); for (const k of Object.keys(tabelas)) delete tabelas[k]; tabelas.preferencias_usuario = { alertas_email: true, dias_antecedencia: 15 } })

  it('indicadores viram filtros lembrados; lista ordenada com selo; clicar abre o contrato; preferência de e-mail', async () => {
    montar()
    expect(screen.getByTestId('filtro-todos').textContent).toContain('3'); expect(screen.getByTestId('filtro-vencidos').textContent).toContain('1')
    expect(screen.getByTestId('filtro-30dias').textContent).toContain('1'); expect(screen.getByTestId('filtro-documentos').textContent).toContain('1')
    fireEvent.click(screen.getByTestId('filtro-vencidos'))
    expect(screen.getByTestId('filtro-ativo').textContent).toContain('Mostrando 1 de 3.')
    expect(localStorage.getItem('lsm-alertas-filtro')).toBe('vencidos')
    expect(screen.getByRole('button', { name: /Reajuste - Av. Atlântica 500 - Vencido há 13 dias/ })).toBeTruthy()
    fireEvent.click(screen.getByText('ver todos'))
    expect(screen.getByTestId('filtro-ativo').textContent).toContain('Clique em um número para filtrar a lista.')
    fireEvent.click(screen.getByRole('button', { name: /IPTU - Rua das Flores 123/ }))
    expect(screen.getByTestId('onde').textContent).toBe('/contrato/i1')
    await waitFor(() => expect(screen.getByTestId('pref-email').textContent).toContain('Você recebe estes avisos por e-mail com até 15 dias de antecedência.'))
    fireEvent.click(screen.getByText('alterar em Configurações'))
    expect(screen.getByTestId('onde').textContent).toBe('/settings')
  })

  it('avisos do teto de IA, mudanças de KYC (marcar como visto) e novidades das buscas salvas', async () => {
    tabelas.avisos_teto_ia = [{ id: 1, mes: '2026-11', nivel: 100, pct: 104, gasto_brl: 312, teto_brl: 300, criado_em: '2026-11-02T10:00:00Z', email_enviado_em: '2026-11-02T10:01:00Z' }]
    tabelas.checagens_kyc = [{ id: 7, cnpj: '10945994000172', nome: 'EMPRESA X', risco: 'alto', risco_anterior: 'baixo', consultado_em: '2026-11-01T12:00:00Z' }]
    tabelas.intimacoes = [{ id: 9, oab: 'busca:Maria Silva', data_disponibilizacao: '2026-10-30', tribunal: 'TJRJ', tipo: 'Intimação', numero_processo: '0001-11', link: null }]
    montar()
    await waitFor(() => expect(screen.getByTestId('aviso-teto-ia')).toBeTruthy())
    expect(screen.getByTestId('aviso-teto-ia').textContent).toContain('Teto mensal de IA atingido: inteligência artificial pausada')
    expect(screen.getByTestId('aviso-teto-ia').textContent!.replace(/ /g, ' ')).toContain('R$ 312,00 de R$ 300,00 (104%) em 02/11/2026. Administradores avisados por e-mail.')
    expect(screen.getByTestId('kyc-mudanca').textContent).toContain('EMPRESA X'); expect(screen.getByTestId('kyc-mudanca').textContent).toContain('era baixo, agora alto')
    expect(screen.getByTestId('novidades-buscas').textContent).toContain('Maria Silva'); expect(screen.getByTestId('novidades-buscas').textContent).toContain('TJRJ · Intimação · 0001-11')
    fireEvent.click(screen.getByTestId('kyc-visto'))
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ visto_em: expect.any(String) })))
    fireEvent.click(screen.getByText('Abrir Consumo'))
    expect(screen.getByTestId('onde').textContent).toBe('/consumo')
  })

  it('carregando mostra esqueleto; sem alertas no filtro mostra o vazio; copiar lista e baixar CSV', () => {
    loading = true; montar()
    expect(screen.queryByTestId('filtro-todos')).toBeNull()
    cleanup(); loading = false
    const write = vi.fn(async (_t: string) => undefined); Object.assign(navigator, { clipboard: { writeText: write } })
    URL.createObjectURL = vi.fn(() => 'blob:x'); URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    localStorage.setItem('lsm-alertas-filtro', 'documentos')
    montar()
    expect(screen.getByTestId('filtro-documentos').getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByTestId('copiar-alertas'))
    expect(write.mock.calls[0][0]).toContain('Alertas ·'); expect(write.mock.calls[0][0]).toContain('em 120 dia(s) · Rua das Flores 123 · IPTU · 01/03/2027')
    fireEvent.click(screen.getByTestId('baixar-alertas'))
    expect(click).toHaveBeenCalled(); expect(screen.getByTestId('baixar-alertas').textContent).toBe('baixado')
    alertas.length = 0
    cleanup(); montar()
    expect(screen.getByText('Nenhum alerta neste filtro')).toBeTruthy()
    fireEvent.click(screen.getByTestId('filtro-todos'))
    expect(screen.getByText('Nenhum alerta no momento')).toBeTruthy()
    click.mockRestore()
  })
})
