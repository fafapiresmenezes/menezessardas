// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

const imoveis = [
  { id: 'i1', endereco: 'Rua das Flores 123', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento', uso: 'locado', proprietario: 'João Silva', matricula: '', notas: '', documentos: [] },
  { id: 'i2', endereco: 'Av. Atlântica 500', cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'loja', uso: 'uso_proprio', proprietario: 'Maria Souza', matricula: '', notas: '', documentos: [] },
]
let listarImoveis = vi.fn(async () => imoveis)
const obterImovel = vi.fn(async (id: string) => imoveis.find(i => i.id === id) ?? null)
vi.mock('@/lib/repositorio', async (orig) => ({ ...(await orig() as object), repositorio: { listarImoveis: () => listarImoveis(), obterImovel: (id: string) => obterImovel(id) } }))
const { useImoveis, useImovelById } = await import('./useImoveis')
const { useBaixado } = await import('./useBaixado')

describe('useImoveis, useImovelById e useBaixado', () => {
  beforeEach(() => { listarImoveis = vi.fn(async () => imoveis); obterImovel.mockClear(); vi.useRealTimers() })

  it('lista todos, filtra por endereço ou proprietário sem diferenciar maiúsculas e refaz a busca quando o filtro muda', async () => {
    const { result, rerender } = renderHook(({ f }: { f?: string }) => useImoveis(f), { initialProps: { f: undefined as string | undefined } })
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.imoveis.map(i => i.id)).toEqual(['i1', 'i2'])
    expect(result.current.error).toBeNull()
    rerender({ f: 'atlântica' })
    await waitFor(() => expect(result.current.imoveis.map(i => i.id)).toEqual(['i2']))
    rerender({ f: 'JOÃO' })
    await waitFor(() => expect(result.current.imoveis.map(i => i.id)).toEqual(['i1']))
    rerender({ f: 'nada' })
    await waitFor(() => expect(result.current.imoveis).toEqual([]))
    expect(listarImoveis).toHaveBeenCalledTimes(4)
    expect(result.current.getStatus(-1)).toBe('vencido')
    expect(result.current.getStatus(10)).toBe('critico')
    expect(result.current.getStatus(null)).toBe('sem_prazo')
  })

  it('erro na busca vira mensagem; ficha por id devolve o imóvel ou null', async () => {
    listarImoveis = vi.fn(async () => { throw new Error('Banco fora do ar') })
    const { result } = renderHook(() => useImoveis())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('Banco fora do ar')
    expect(result.current.imoveis).toEqual([])
    const um = renderHook(({ id }: { id: string }) => useImovelById(id), { initialProps: { id: 'i2' } })
    await waitFor(() => expect(um.result.current.loading).toBe(false))
    expect(um.result.current.imovel?.endereco).toBe('Av. Atlântica 500')
    um.rerender({ id: 'x' })
    await waitFor(() => expect(obterImovel).toHaveBeenLastCalledWith('x'))
    await waitFor(() => expect(um.result.current.imovel).toBeNull())
  })

  it('useBaixado liga o rótulo, desliga sozinho depois do prazo, reinicia a contagem e cancela ao desmontar', () => {
    vi.useFakeTimers()
    const { result, unmount } = renderHook(() => useBaixado(3000))
    expect(result.current[0]).toBe(false)
    act(() => result.current[1]())
    expect(result.current[0]).toBe(true)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current[0]).toBe(true)
    act(() => result.current[1]())
    act(() => { vi.advanceTimersByTime(2000) })
    expect(result.current[0]).toBe(true)
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current[0]).toBe(false)
    act(() => result.current[1]())
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    vi.useRealTimers()
  })
})
