// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const emDias = (n: number) => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
let configurado = false
const insert = vi.fn(async (_r: unknown): Promise<{ error: { message: string } | null }> => ({ error: null }))
let linhas: Record<string, unknown>[] = []
let existentes: { uid_externo: string }[] = []
vi.mock('@/lib/supabase', () => ({
  get supabaseConfigurado() { return configurado },
  supabase: { from: () => ({ select: (cols: string) => cols === 'uid_externo' ? { in: async () => ({ data: existentes, error: null }) } : Promise.resolve({ data: linhas, error: null }), insert: (r: unknown) => insert(r) }) },
}))
const imoveis = [{ id: 'i1', endereco: 'Rua A 1', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'X', matricula: '', notas: '', documentos: [] }]
let contratos: Record<string, unknown>[] = []
let listarImoveis = vi.fn(async () => imoveis)
vi.mock('@/lib/repositorio', async (orig) => ({ ...(await orig() as object), repositorio: { listarImoveis: () => listarImoveis(), listarContratos: async () => contratos } }))
const { useAlertas, salvarCompromisso, importarCompromissosIcs } = await import('./useAlertas')

describe('useAlertas', () => {
  beforeEach(() => {
    configurado = false; localStorage.clear(); insert.mockClear(); linhas = []; existentes = []; listarImoveis = vi.fn(async () => imoveis)
    contratos = [{ id: 'c1', imovelId: 'i1', tipo: 'locacao_residencial', parte: 'Ana', dataInicio: '2025-01-01', dataVencimento: emDias(20), valor: 1000, periodicidade: 'mensal', indice: 'fixo', garantia: 'caucao', dataUltimoReajuste: null, notas: '', criadoEm: '2025-01-01', documentos: [] }]
  })

  it('sem Supabase: guarda o compromisso no navegador e o lista junto com os alertas dos contratos; críticos = 0 a 30 dias', async () => {
    await salvarCompromisso({ titulo: 'Vistoria', imovel: 'Rua A 1', dataEvento: emDias(45), diasAntes: 7 })
    const guardados = JSON.parse(localStorage.getItem('compromissos_offline')!)
    expect(guardados).toHaveLength(1)
    expect(guardados[0]).toMatchObject({ titulo: 'Vistoria', dataEvento: emDias(45) })
    expect(typeof guardados[0].id).toBe('string')
    const { result } = renderHook(() => useAlertas())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alertas.map(a => [a.tipo, a.titulo, a.diasRestantes])).toEqual([['vencimento', 'Vencimento de contrato', 20], ['compromisso', 'Vistoria', 45]])
    expect(result.current.alertas[1]).toMatchObject({ id: `comp-${guardados[0].id}`, imovelId: '', imovel: 'Rua A 1' })
    expect(result.current.getCriticos()).toBe(1)
    expect(result.current.error).toBeNull()
    await salvarCompromisso({ titulo: 'Entrega de chaves', imovel: 'Rua A 1', dataEvento: emDias(3), diasAntes: 1 })
    await act(() => result.current.recarregar())
    expect(result.current.alertas).toHaveLength(3)
    expect(result.current.getCriticos()).toBe(2)
  })

  it('com Supabase: grava com a maior antecedência, avisos e e-mails normalizados; lê as linhas do banco; erro vira exceção', async () => {
    configurado = true
    await salvarCompromisso({ titulo: 'Audiência', imovel: 'Rua A 1', dataEvento: '2026-12-10', diasAntes: 7, avisosDias: [3, 15], email: 'Fatima@Gmenezes.com; helio@gmenezes.com ' })
    expect(insert).toHaveBeenCalledWith({ titulo: 'Audiência', imovel: 'Rua A 1', data_evento: '2026-12-10', dias_antes: 15, avisos_dias: [3, 15], email_aviso: 'fatima@gmenezes.com,helio@gmenezes.com' })
    await salvarCompromisso({ titulo: 'Sem e-mail', imovel: 'Rua A 1', dataEvento: '2026-12-11', diasAntes: 5 })
    expect(insert).toHaveBeenLastCalledWith(expect.objectContaining({ dias_antes: 5, avisos_dias: [5], email_aviso: null }))
    expect(localStorage.getItem('compromissos_offline')).toBeNull()
    insert.mockResolvedValueOnce({ error: { message: 'permissão negada' } })
    await expect(salvarCompromisso({ titulo: 'x', imovel: 'y', dataEvento: '2026-12-12', diasAntes: 1 })).rejects.toMatchObject({ message: 'permissão negada' })
    linhas = [{ id: 'k1', titulo: 'Perícia', imovel: 'Rua A 1', data_evento: emDias(10), dias_antes: 7, avisos_dias: null }]
    const { result } = renderHook(() => useAlertas())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.alertas.find(a => a.id === 'comp-k1')).toMatchObject({ tipo: 'compromisso', titulo: 'Perícia', diasRestantes: 10 })
  })

  it('importa .ics pulando os UIDs já existentes e os repetidos no próprio arquivo; sem eventos não grava', async () => {
    configurado = true
    expect(await importarCompromissosIcs([])).toEqual({ criados: 0, repetidos: 0 })
    expect(insert).not.toHaveBeenCalled()
    existentes = [{ uid_externo: 'u-velho' }]
    const r = await importarCompromissosIcs([
      { uid: 'u-velho', titulo: 'Já existe', data: '2026-12-01', local: 'Sala 1' },
      { uid: 'u-novo', titulo: 'Reunião', data: '2026-12-02', local: '' },
      { uid: 'u-novo', titulo: 'Reunião repetida', data: '2026-12-02', local: '' },
      { uid: 'u-outro', titulo: 'Vistoria', data: '2026-12-03', local: 'Rua A 1' },
    ])
    expect(r).toEqual({ criados: 2, repetidos: 2 })
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert).toHaveBeenCalledWith([
      { titulo: 'Reunião', imovel: 'Importado do calendário', data_evento: '2026-12-02', dias_antes: 1, avisos_dias: [1], uid_externo: 'u-novo' },
      { titulo: 'Vistoria', imovel: 'Rua A 1', data_evento: '2026-12-03', dias_antes: 1, avisos_dias: [1], uid_externo: 'u-outro' },
    ])
    existentes = [{ uid_externo: 'u-novo' }, { uid_externo: 'u-outro' }]
    insert.mockClear()
    expect(await importarCompromissosIcs([{ uid: 'u-novo', titulo: 'Reunião', data: '2026-12-02', local: '' }])).toEqual({ criados: 0, repetidos: 1 })
    expect(insert).not.toHaveBeenCalled()
  })

  it('falha ao buscar vira mensagem de erro e a lista fica vazia', async () => {
    listarImoveis = vi.fn(async () => { throw new Error('Sem conexão') })
    const { result } = renderHook(() => useAlertas())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Sem conexão')
    expect(result.current.alertas).toEqual([])
    expect(result.current.getCriticos()).toBe(0)
  })
})
