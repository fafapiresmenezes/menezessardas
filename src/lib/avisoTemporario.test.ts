import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { avisoTemporario } from '@/lib/avisoTemporario'

describe('aviso temporário dos botões de download', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('liga na hora e desliga sozinho depois de 3 segundos', () => {
    const estados: boolean[] = []
    const aviso = avisoTemporario(v => estados.push(v))
    aviso.marcar()
    expect(estados).toEqual([true])
    vi.advanceTimersByTime(2999)
    expect(estados).toEqual([true])
    vi.advanceTimersByTime(1)
    expect(estados).toEqual([true, false])
  })

  it('dois cliques seguidos reiniciam a contagem em vez de desligar cedo', () => {
    const estados: boolean[] = []
    const aviso = avisoTemporario(v => estados.push(v), 1000)
    aviso.marcar()
    vi.advanceTimersByTime(800)
    aviso.marcar()
    vi.advanceTimersByTime(800)
    expect(estados).toEqual([true, true])
    vi.advanceTimersByTime(200)
    expect(estados).toEqual([true, true, false])
  })

  it('limpar() cancela o temporizador ao sair da tela', () => {
    const estados: boolean[] = []
    const aviso = avisoTemporario(v => estados.push(v))
    aviso.marcar()
    aviso.limpar()
    vi.advanceTimersByTime(5000)
    expect(estados).toEqual([true])
  })
})
