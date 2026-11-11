// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { detectar } from '@/lib/pesquisa/pesquisa'
import { cnj } from '@/test/cnj'

const invoke = vi.fn(async (_f: string, _o: { body: Record<string, unknown> }): Promise<{ data: unknown; error: unknown }> => ({ data: {}, error: null }))
vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: { functions: { invoke: (f: string, o: { body: Record<string, unknown> }) => invoke(f, o) } } }))
const { default: BuscaFontesOficiais } = await import('./BuscaFontesOficiais')
const abrir = (termo: string) => render(<MemoryRouter><BuscaFontesOficiais d={detectar(termo)} /></MemoryRouter>)
const pub = (id: string, numero: string, data: string) => ({ id, data, numero, tribunal: 'TJRJ', orgao: '1ª Vara', tipo: 'Intimação', documento: 'Sentença', classe: 'Comum', texto: `Texto completo ${id}`, link: 'https://tj/doc', partes: [{ nome: 'ACME LTDA', polo: 'P' }], advogados: [{ nome: 'Ana', oab: '1/RJ' }] })

describe('Busca nas fontes oficiais', () => {
  beforeEach(() => { cleanup(); invoke.mockReset() })

  it('processo: mostra a capa do DataJud, todos os andamentos e as publicações com texto completo', async () => {
    const n = cnj(1234567)
    invoke.mockResolvedValue({ data: { datajud: { ok: true, encontrado: true, tribunal: 'TJRJ', classe: 'Despejo', orgao: '1ª Vara', graus: ['G1', 'G2'], assuntos: ['Locação'], ajuizamento: '2023-01-01T00:00:00', movimentos: [{ data: '2025-01-01T10:00:00', nome: 'Sentença', grau: 'G1', complemento: 'procedente' }, { data: '2023-01-01T10:00:00', nome: 'Distribuição', grau: 'G1' }] }, comunica: { ok: true, itens: [pub('1', n, '2025-01-02')] } }, error: null })
    abrir(n); fireEvent.click(screen.getByTestId('buscar-oficiais'))
    await screen.findByTestId('capa')
    expect(invoke).toHaveBeenCalledWith('fontes-oficiais', expect.objectContaining({ body: { tipo: 'processo', termo: n } }))
    expect(screen.getByTestId('movimentos').children).toHaveLength(2)
    expect(screen.getByText(/Sentença \(procedente\)/)).toBeTruthy()
    expect(screen.getByText('Texto completo 1')).toBeTruthy()
  })

  it('nome: percorre os blocos do período, junta as publicações por processo e permite copiar os números', async () => {
    const a = cnj(1111111), b = cnj(2222222)
    let k = 0
    invoke.mockImplementation(async () => ({ data: { comunica: { ok: true, itens: ++k === 1 ? [pub('1', a, '2026-10-01'), pub('2', b, '2026-09-01')] : k === 2 ? [pub('3', a, '2026-07-01')] : [] } }, error: null }))
    const escrever = vi.fn(async () => undefined); Object.assign(navigator, { clipboard: { writeText: escrever } })
    abrir('ACME Ltda'); fireEvent.click(screen.getByTestId('buscar-oficiais'))
    await waitFor(() => expect(screen.getByTestId('buscar-oficiais').textContent).toBe('Buscar nas fontes oficiais'))
    expect(invoke).toHaveBeenCalledTimes(4) // último ano = 4 blocos de 90 dias
    const corpo = invoke.mock.calls[0][1].body
    expect(corpo).toMatchObject({ tipo: 'nome', termo: 'ACME Ltda', diarios: true }); expect(corpo.inicio).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(invoke.mock.calls[1][1].body.diarios).toBe(false)
    expect(screen.getByText('2 processo(s) encontrado(s) nas publicações')).toBeTruthy()
    expect(screen.getByText(/2 publicação\(ões\), de 01\/07\/2026 a 01\/10\/2026/)).toBeTruthy()
    expect(screen.getAllByText(/ACME LTDA \(polo passivo\)/).length).toBe(2)
    fireEvent.click(screen.getByTestId('copiar-numeros'))
    await screen.findByText('Números copiados')
    expect(escrever).toHaveBeenCalledWith(`${a}\n${b}`)
  })

  it('advogado pelo nome e 5 anos de histórico (20 blocos)', async () => {
    invoke.mockResolvedValue({ data: { comunica: { ok: true, itens: [] } }, error: null })
    abrir('Ana Advogada')
    fireEvent.click(screen.getByLabelText('advogado'))
    fireEvent.change(screen.getByLabelText('Histórico'), { target: { value: '60' } })
    fireEvent.click(screen.getByTestId('buscar-oficiais'))
    await screen.findByText(/Nenhuma publicação encontrada/)
    expect(invoke).toHaveBeenCalledTimes(20)
    expect(invoke.mock.calls[0][1].body.tipo).toBe('advogado')
  })

  it('CNPJ: busca a razão social na Receita e depois as publicações por ela', async () => {
    invoke.mockImplementation(async (_f, o) => ({ data: o.body.tipo === 'cnpj' ? { receita: { ok: true, encontrado: true, nome: 'ACME LTDA', situacao: 'ATIVA', socios: [{ nome: 'JOAO', qualificacao: 'Sócio' }] } } : { comunica: { ok: true, itens: [] } }, error: null }))
    abrir('11.222.333/0001-81'); fireEvent.click(screen.getByTestId('buscar-oficiais'))
    await screen.findByText(/Nenhuma publicação encontrada/)
    expect(screen.getByTestId('receita').textContent).toContain('JOAO (Sócio)')
    expect(invoke.mock.calls[1][1].body).toMatchObject({ tipo: 'nome', termo: 'ACME LTDA' })
  })

  it('erro de um bloco vira aviso e os outros blocos continuam', async () => {
    let k = 0
    invoke.mockImplementation(async () => (++k === 2 ? { data: null, error: { message: 'x', context: { json: async () => ({ erro: 'Comunica PJe 503' }) } } } : { data: { comunica: { ok: true, itens: [] } }, error: null }))
    abrir('123456/RJ'); fireEvent.click(screen.getByTestId('buscar-oficiais'))
    await screen.findByTestId('avisos-oficiais')
    expect(screen.getByTestId('avisos-oficiais').textContent).toContain('Comunica PJe 503')
    expect(invoke).toHaveBeenCalledTimes(4)
  })

  it('CPF explica que nenhuma fonte oficial busca por CPF e não chama nada', () => {
    abrir('529.982.247-25')
    expect(screen.getByTestId('aviso-cpf').textContent).toMatch(/CPF/)
    expect(screen.queryByTestId('buscar-oficiais')).toBeNull()
  })
})
