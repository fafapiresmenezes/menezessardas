// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'

let configurado = true
const invoke = vi.fn(async (_n: string, _o: object): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: {}, error: null }))
vi.mock('@/lib/supabase', () => ({ get supabaseConfigurado() { return configurado }, supabase: { functions: { invoke: (n: string, o: object) => invoke(n, o) } } }))
const { default: PerfilJulgador } = await import('./PerfilJulgador')
const perfil = {
  resumo: 'Órgão com volume alto.', tendencias: ['Procedência parcial frequente.'], temas: ['Locação'], comoArgumentar: ['Pedidos escalonados.'], cuidados: ['Dados não identificam o magistrado.'], confianca: 'alta',
  estatisticas: { processos: 1234, classes: [{ nome: 'Despejo', total: 800 }, { nome: 'Execução', total: 400 }], assuntos: [], resultados: [{ nome: 'Procedência', total: 10 }], porAno: [{ ano: '2025', total: 500 }] },
  noticias: [{ titulo: 'Juíza decide sobre despejo', link: 'https://noticia/1', fonte: 'Conjur', data: '2026-10-01' }],
  tribunal: 'TJRJ', orgao: '10ª Vara Cível', nome: 'Maria da Silva', geradoEm: '2026-11-01T00:00:00Z',
}

describe('Perfil do julgador (DataJud e imprensa)', () => {
  beforeEach(() => { cleanup(); configurado = true; invoke.mockClear() })

  it('exige nome ou órgão; chama perfil-julgador com os campos e mostra estatísticas, tendências, cuidados e notícias', async () => {
    invoke.mockResolvedValueOnce({ data: perfil, error: null })
    render(<PerfilJulgador />)
    fireEvent.click(screen.getByText('Montar perfil'))
    expect(screen.getByRole('alert').textContent).toContain('Informe o nome do julgador ou o órgão')
    expect(invoke).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Nome do juiz ou desembargador'), { target: { value: 'Maria da Silva' } })
    fireEvent.change(screen.getByLabelText('Tribunal'), { target: { value: 'tjsp' } })
    fireEvent.change(screen.getByLabelText('Tema do caso (opcional)'), { target: { value: 'despejo' } })
    fireEvent.click(screen.getByText('Montar perfil'))
    expect(screen.getByText('Consultando o CNJ e a imprensa…')).toBeTruthy()
    await waitFor(() => expect(invoke).toHaveBeenCalledWith('perfil-julgador', { body: { nome: 'Maria da Silva', orgao: '', tribunal: 'tjsp', tema: 'despejo' } }))
    expect(await screen.findByText('Maria da Silva · TJRJ')).toBeTruthy()
    expect(screen.getByText('Dados sólidos')).toBeTruthy()
    expect(screen.getByText('Classes mais comuns (1.234 processos)')).toBeTruthy()
    expect(screen.getByTitle('Despejo')).toBeTruthy()
    expect(screen.getByText('Procedência parcial frequente.')).toBeTruthy()
    expect(screen.getByText('Dados não identificam o magistrado.')).toBeTruthy()
    const noticia = screen.getByText('Juíza decide sobre despejo').closest('a') as HTMLAnchorElement
    expect(noticia.href).toBe('https://noticia/1')
    expect(noticia.rel).toBe('noreferrer')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('erro da função e erro no retorno viram alerta; sem banco usa o exemplo da demonstração', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'CNJ fora do ar' } })
    render(<PerfilJulgador />)
    fireEvent.change(screen.getByLabelText('Órgão julgador (vara ou câmara)'), { target: { value: '10ª Vara' } })
    fireEvent.click(screen.getByText('Montar perfil'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('CNJ fora do ar'))
    invoke.mockResolvedValueOnce({ data: { erro: 'órgão não encontrado' }, error: null })
    fireEvent.click(screen.getByText('Montar perfil'))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('órgão não encontrado'))
    cleanup(); configurado = false
    render(<PerfilJulgador />)
    fireEvent.change(screen.getByLabelText('Nome do juiz ou desembargador'), { target: { value: 'Teste' } })
    fireEvent.click(screen.getByText('Montar perfil'))
    expect(await screen.findByText('Teste · TJRJ')).toBeTruthy()
    expect(screen.getByText('Dados parciais')).toBeTruthy()
    expect(invoke).toHaveBeenCalledTimes(2)
  })
})
