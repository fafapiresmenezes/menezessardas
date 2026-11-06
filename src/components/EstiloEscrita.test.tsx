// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let pecas: object[] = []
const insert = vi.fn(async () => ({ error: null }))
const del = vi.fn(async () => ({}))
vi.mock('../lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({ select: () => ({ order: async () => ({ data: pecas }) }), insert, delete: () => ({ eq: del }) }) },
}))
vi.mock('../lib/pdf', () => ({ extrairTextoPdf: async () => 'Texto extraído do PDF. '.repeat(20) }))
const { default: EstiloEscrita } = await import('./EstiloEscrita')
const longo = 'Excelentíssimo Senhor Doutor Juiz de Direito. '.repeat(6)

describe('Meu estilo de escrita', () => {
  beforeEach(() => { cleanup(); pecas = []; insert.mockClear(); del.mockClear() })

  it('exige 200 caracteres, guarda a peça com título e recarrega a lista', async () => {
    render(<EstiloEscrita />)
    expect((await screen.findByTestId('secao-estilo')).textContent).toContain('Nenhuma peça ainda.')
    fireEvent.change(screen.getByLabelText('Texto da peça'), { target: { value: 'curto' } })
    fireEvent.click(screen.getByTestId('salvar-estilo'))
    expect((await screen.findByRole('status')).textContent).toContain('pelo menos 200 caracteres')
    fireEvent.change(screen.getByLabelText('Título da peça'), { target: { value: 'Contestação' } })
    fireEvent.change(screen.getByLabelText('Texto da peça'), { target: { value: longo } })
    pecas = [{ id: 'p1', titulo: 'Contestação', texto: longo, criado_em: '2026-11-01T00:00:00Z' }]
    fireEvent.click(screen.getByTestId('salvar-estilo'))
    await waitFor(() => expect(insert).toHaveBeenCalledWith({ titulo: 'Contestação', texto: longo.trim() }))
    expect((await screen.findByRole('status')).textContent).toContain('Peça guardada')
    await waitFor(() => expect(screen.getByLabelText('Peças enviadas').textContent).toContain('Contestação'))
    fireEvent.click(screen.getByLabelText('Apagar Contestação'))
    await waitFor(() => expect(del).toHaveBeenCalledWith('id', 'p1'))
  })

  it('lê um PDF enviado e preenche texto e título; com 10 peças o formulário some', async () => {
    render(<EstiloEscrita />)
    const arquivo = new File(['%PDF'], 'parecer-2025.pdf', { type: 'application/pdf' })
    fireEvent.change(await screen.findByLabelText(/Arquivo \(Word, PDF ou TXT\)/), { target: { files: [arquivo] } })
    await waitFor(() => expect((screen.getByLabelText('Texto da peça') as HTMLTextAreaElement).value).toContain('Texto extraído do PDF.'))
    expect((screen.getByLabelText('Título da peça') as HTMLInputElement).value).toBe('parecer-2025')
    cleanup(); pecas = Array.from({ length: 10 }, (_, i) => ({ id: `p${i}`, titulo: `Peça ${i}`, texto: longo, criado_em: '2026-11-01T00:00:00Z' }))
    render(<EstiloEscrita />)
    await waitFor(() => expect(screen.getByTestId('secao-estilo').textContent).toContain('Limite de 10 peças atingido'))
    expect(screen.queryByTestId('salvar-estilo')).toBeNull()
  })
})
