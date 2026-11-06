import { describe, it, expect, vi } from 'vitest'
const insert = vi.fn(async (_l: object) => ({ error: null as unknown }))
vi.mock('@/lib/supabase', () => ({ supabase: { from: () => ({ insert: (l: object) => insert(l) }) } }))
const { mascarar, guardarNaBiblioteca, filtrar } = await import('./biblioteca')

describe('biblioteca "Já pesquisado" (B04)', () => {
  it('mascara CPF com e sem pontuação, preserva CNPJ e número de processo', () => {
    expect(mascarar('CPF 123.456.789-09 e 12345678909.')).toBe('CPF ***.***.***-** e ***.***.***-**.')
    expect(mascarar('CNPJ 10.945.994/0001-72')).toBe('CNPJ 10.945.994/0001-72')
    expect(mascarar('Processo 0001234-56.2026.8.19.0001')).toBe('Processo 0001234-56.2026.8.19.0001')
  })
  it('guarda com máscara e etiquetas normalizadas; erro do banco devolve false', async () => {
    expect(await guardarNaBiblioteca({ tipo: 'nota', titulo: 'Cliente 123.456.789-09', conteudo: 'x', etiquetas: [' Despejo ', ''] })).toBe(true)
    expect(insert.mock.calls[0][0]).toMatchObject({ titulo: 'Cliente ***.***.***-**', etiquetas: ['despejo'], caso: null })
    insert.mockResolvedValueOnce({ error: { message: 'x' } })
    expect(await guardarNaBiblioteca({ tipo: 'nota', titulo: 'a b', conteudo: 'x' })).toBe(false)
  })
  it('filtra por tipo e por todos os termos, sem acento', () => {
    const itens = [
      { id: 1, tipo: 'assistente' as const, titulo: 'Renovatória', conteudo: 'prazo decadencial', etiquetas: ['locação'], caso: null, criado_em: '' },
      { id: 2, tipo: 'fontes' as const, titulo: 'Empresa X', conteudo: 'despejo', etiquetas: [], caso: 'Loja 3', criado_em: '' },
    ]
    expect(filtrar(itens, 'renovatoria prazo', 'todos').map(i => i.id)).toEqual([1])
    expect(filtrar(itens, 'locacao', 'todos').map(i => i.id)).toEqual([1])
    expect(filtrar(itens, '', 'fontes').map(i => i.id)).toEqual([2])
    expect(filtrar(itens, 'loja', 'assistente')).toEqual([])
  })
})
