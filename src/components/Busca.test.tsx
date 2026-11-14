// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'

const rpc = vi.fn(async (_n: string, _a: object) => ({ data: [{ tipo: 'Contratos', id: 'c9', rotulo: 'Locação Rua B', detalhe: 'Rua B, 20', rota: '/contrato/i9' }] }))
let configurado = false
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { rpc: (n: string, a: object) => rpc(n, a) } }))
vi.mock('@/lib/repositorio', () => ({
  repositorio: {
    listarImoveis: async () => [{ id: 'i1', endereco: 'Rua das Acácias, 10', proprietario: 'João' }],
    listarContratos: async () => [{ id: 'c1', imovelId: 'i1', parte: 'Maria Locatária' }],
  },
}))
vi.mock('@/lib/fornecedores', () => ({ listarFornecedores: async () => [{ id: 'f1', nome: 'Limpeza Total', cnpj: '12.345.678/0001-90' }] }))
vi.mock('@/data/rotas', () => ({ ROTAS_TELAS: [{ rota: '/dashboard', nome: 'Painel' }, { rota: '/meu-dia', nome: 'Meu dia' }] }))
const { default: Busca } = await import('./Busca')

function Onde() { const l = useLocation(); return <p data-testid="onde">{l.pathname}</p> }
const montar = (fechar = vi.fn()) => { render(<MemoryRouter><Busca aberta fechar={fechar} /><Routes><Route path="*" element={<Onde />} /></Routes></MemoryRouter>); return fechar }

describe('Busca global (Ctrl+K)', () => {
  beforeEach(() => { cleanup(); configurado = false; rpc.mockClear() })

  it('fechada não aparece; aberta lista páginas e, depois de carregar, imóveis, contratos e fornecedores', async () => {
    const { container } = render(<MemoryRouter><Busca aberta={false} fechar={() => {}} /></MemoryRouter>)
    expect(container.querySelector('[role=dialog]')).toBeNull()
    cleanup(); montar()
    expect(screen.getByRole('dialog', { name: 'Busca global' })).toBeTruthy()
    expect(screen.getAllByRole('option').length).toBe(4) // 2 telas internas + as 2 telas da lista simulada
    fireEvent.change(screen.getByLabelText('Buscar na plataforma'), { target: { value: 'acacias' } })
    await waitFor(() => expect(screen.getAllByText('Rua das Acácias, 10').length).toBe(2))
    expect(screen.getByRole('option', { name: /Maria Locatária/ })).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Buscar na plataforma'), { target: { value: '12.345' } })
    expect(screen.getByText('Limpeza Total')).toBeTruthy()
    fireEvent.change(screen.getByLabelText('Buscar na plataforma'), { target: { value: 'zzz' } })
    expect(screen.getByTestId('busca-vazia').textContent).toContain('Nada encontrado para “zzz”')
  })

  it('setas movem a seleção, Enter abre a tela e fecha; Escape e clique fora fecham', async () => {
    const fechar = montar()
    const campo = screen.getByLabelText('Buscar na plataforma')
    fireEvent.change(campo, { target: { value: 'meu dia' } })
    fireEvent.keyDown(campo, { key: 'ArrowDown' }); fireEvent.keyDown(campo, { key: 'ArrowUp' })
    expect(screen.getByRole('option', { name: /Meu dia/ }).getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(fechar).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('onde').textContent).toBe('/meu-dia')
    fireEvent.keyDown(campo, { key: 'Escape' })
    expect(fechar).toHaveBeenCalledTimes(2)
    fireEvent.click(screen.getAllByRole('presentation')[0])
    expect(fechar).toHaveBeenCalledTimes(3)
    fireEvent.change(campo, { target: { value: '' } })
    fireEvent.click(screen.getByRole('option', { name: /Painel/ }))
    expect(screen.getByTestId('onde').textContent).toBe('/dashboard')
  })

  it('com banco configurado e 2+ letras, consulta busca_global após 250 ms e junta aos resultados de páginas', async () => {
    configurado = true
    montar()
    fireEvent.change(screen.getByLabelText('Buscar na plataforma'), { target: { value: 'lo' } })
    expect(rpc).not.toHaveBeenCalled()
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('busca_global', { termo: 'lo' }))
    expect(await screen.findByText('Locação Rua B')).toBeTruthy()
    expect(screen.getByText('Rua B, 20')).toBeTruthy()
  })
})
