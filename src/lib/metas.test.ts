import { describe, expect, it } from 'vitest'
import { corDesvio, pctRitmo } from '@/components/MetasDoMes'

describe('metas do mês', () => {
  it('calcula o ritmo e a cor pelo desvio', () => {
    expect(pctRitmo(50, 100)).toBe(50); expect(pctRitmo(10, 0)).toBeNull()
    expect(corDesvio(null).rotulo).toBe('sem meta'); expect(corDesvio(100).classe).toBe('bg-regular'); expect(corDesvio(80).classe).toBe('bg-atencao'); expect(corDesvio(40).classe).toBe('bg-critico')
  })
})
