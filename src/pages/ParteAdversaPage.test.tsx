// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let salvas: object[] = []
const insert = vi.fn(async (_l: object) => ({ error: null }))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data: unknown; error: unknown }> => ({ data: null, error: null }))
const registrarEvento = vi.fn(async (_e: object) => undefined)
vi.mock('@/lib/trilha', () => ({ registrarEvento: (e: object) => registrarEvento(e) }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: salvas }) }) }), insert: (l: object) => insert(l) }),
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: ParteAdversaPage } = await import('./ParteAdversaPage')

const preencher = (cnpj = '') => {
  fireEvent.change(screen.getByLabelText('Nome da parte adversa'), { target: { value: 'Empresa Ré Ltda' } })
  fireEvent.change(screen.getByLabelText('CNPJ (se for empresa, opcional)'), { target: { value: cnpj } })
  fireEvent.change(screen.getByLabelText('Caso ou contrato'), { target: { value: 'Despejo loja 3' } })
}

describe('Parte adversa (B03)', () => {
  beforeEach(() => { cleanup(); salvas = []; insert.mockClear(); registrarEvento.mockClear(); invoke.mockReset() })

  it('exige caso e finalidade; monta a ficha com fontes públicas, registra a consulta e a trilha', async () => {
    invoke.mockImplementation(async (f: string) => f === 'buscar-partes'
      ? { data: { comunica: { ok: true, total: 1, itens: [{ data: '2026-10-01', tribunal: 'TJRJ', orgao: '1ª Vara', tipo: 'Intimação', classe: 'Despejo', numero: '0001234-56.2026.8.19.0001', trecho: 'x' }] }, queridoDiario: { ok: true, total: 0, itens: [] } }, error: null }
      : { data: { risco: 'baixo', alertas: [], receita: { nome: 'EMPRESA RÉ LTDA', situacao: 'ATIVA' } }, error: null })
    render(<MemoryRouter><ParteAdversaPage /></MemoryRouter>)
    expect(screen.getByTestId('adversa-regras').textContent).toContain('não monta perfil psicológico')
    preencher('10.945.994/0001-72')
    const botao = screen.getByRole('button', { name: /Montar ficha/ }) as HTMLButtonElement
    expect(botao.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Finalidade da consulta'), { target: { value: 'ver outras ações de despejo' } })
    expect(botao.disabled).toBe(false)
    fireEvent.click(botao)
    await waitFor(() => expect(screen.getByTestId('adversa-comunica').textContent).toContain('0001234-56.2026.8.19.0001'))
    expect(screen.getByTestId('adversa-empresa').textContent).toContain('EMPRESA RÉ LTDA · ATIVA · risco baixo')
    expect(invoke).toHaveBeenCalledWith('kyc', { body: { cnpj: '10945994000172' } })
    const linha = insert.mock.calls[0][0] as { caso: string; finalidade: string; documento: string; fontes: string[] }
    expect(linha).toMatchObject({ caso: 'Despejo loja 3', finalidade: 'ver outras ações de despejo', documento: '10945994000172' })
    expect(linha.fontes).toContain('Comunica PJe (CNJ)')
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'parte_adversa_consultada', entidade: 'Despejo loja 3', resumo: 'Ficha pública de Empresa Ré Ltda · finalidade: ver outras ações de despejo' })
  })

  it('CNPJ incompleto trava o botão; sem CNPJ não chama a Receita; fonte fora do ar vira aviso', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'x' } })
    render(<MemoryRouter><ParteAdversaPage /></MemoryRouter>)
    preencher('123')
    fireEvent.change(screen.getByLabelText('Finalidade da consulta'), { target: { value: 'preparar a contestação' } })
    expect((screen.getByRole('button', { name: /Montar ficha/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('CNPJ (se for empresa, opcional)'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Montar ficha/ }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('não responderam'))
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(insert).not.toHaveBeenCalled()
  })
})
