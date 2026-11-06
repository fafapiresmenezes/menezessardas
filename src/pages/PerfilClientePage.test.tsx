// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

let salvos: object[] = []
const insert = vi.fn(async (_l: object) => ({ error: null as unknown }))
const del = vi.fn(async (_c: string, _v: number) => ({ error: null as unknown }))
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: { from: () => ({
    select: () => ({ order: () => ({ limit: async () => ({ data: salvos }) }) }),
    insert: (l: object) => insert(l),
    delete: () => ({ eq: (c: string, v: number) => del(c, v) }),
  }) },
}))
vi.mock('@/components/Layout', () => ({ default: ({ title, children }: { title: string; children: React.ReactNode }) => <div><h1>{title}</h1>{children}</div> }))
const { default: PerfilClientePage } = await import('./PerfilClientePage')

describe('Perfil do cliente (B02)', () => {
  beforeEach(() => { cleanup(); salvos = []; insert.mockClear(); del.mockClear() })

  it('perguntas ficam travadas até o consentimento; guardar exige nome; grava consentimento e resultado', async () => {
    render(<MemoryRouter><PerfilClientePage /></MemoryRouter>)
    expect(screen.getByTestId('perfil-vazio')).toBeTruthy()
    expect((screen.getByTestId('perfil-perguntas') as HTMLFieldSetElement).disabled).toBe(true)
    fireEvent.click(screen.getByTestId('perfil-aceite').querySelector('input')!)
    expect((screen.getByTestId('perfil-perguntas') as HTMLFieldSetElement).disabled).toBe(false)
    fireEvent.click(screen.getByLabelText('Resumo curto, sem termos jurídicos'))
    fireEvent.click(screen.getByLabelText('Resolver com acordo'))
    expect(screen.getByTestId('perfil-sugestoes').textContent).toContain('mediação')
    const guardar = screen.getByRole('button', { name: 'Guardar perfil' }) as HTMLButtonElement
    expect(guardar.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Nome do cliente'), { target: { value: 'Cliente Teste' } })
    expect(guardar.disabled).toBe(false)
    fireEvent.click(guardar)
    await waitFor(() => expect(screen.getByRole('status').textContent).toContain('Perfil de Cliente Teste guardado'))
    const linha = insert.mock.calls[0][0] as { cliente_nome: string; consentimento_em: string; respostas: Record<string, string> }
    expect(linha.cliente_nome).toBe('Cliente Teste')
    expect(linha.consentimento_em).toMatch(/^\d{4}-/)
    expect(linha.respostas).toEqual({ q3: 'resumo', q8: 'acordo' })
  })

  it('erro ao guardar vira alerta; perfil guardado pode ser apagado com confirmação', async () => {
    salvos = [{ id: 7, cliente_nome: 'Ana', criado_em: '2026-11-06T10:00:00Z', apagar_em: '2028-11-06T10:00:00Z', resultado: { sugestoes: ['Use linguagem simples.'] } }]
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<MemoryRouter><PerfilClientePage /></MemoryRouter>)
    await waitFor(() => expect(screen.getAllByTestId('perfil-item').length).toBe(1))
    fireEvent.click(screen.getByLabelText('Apagar perfil de Ana'))
    await waitFor(() => expect(del).toHaveBeenCalledWith('id', 7))
    insert.mockResolvedValueOnce({ error: { message: 'x' } })
    fireEvent.click(screen.getByTestId('perfil-aceite').querySelector('input')!)
    fireEvent.change(screen.getByLabelText('Nome do cliente'), { target: { value: 'Bia' } })
    fireEvent.click(screen.getByLabelText('WhatsApp'))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar perfil' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Não foi possível guardar'))
  })
})
