// Passo 420: senha provisória legível e vocabulário de funções.
import { describe, it, expect } from 'vitest'
import { gerarSenhaProvisoria, rotuloFuncao, descricaoFuncao, SEDE_ID } from './equipe'

describe('gerarSenhaProvisoria', () => {
  it('tem o formato LSM-XXXX-XXXX sem caracteres ambíguos (0, O, 1, I) e varia entre chamadas', () => {
    const vistas = new Set<string>()
    for (let i = 0; i < 50; i++) {
      const s = gerarSenhaProvisoria()
      expect(s).toMatch(/^LSM-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}$/)
      vistas.add(s)
    }
    expect(vistas.size).toBeGreaterThan(45)
  })
})

describe('funções', () => {
  it('toda função tem rótulo e descrição; a sede tem id fixo', () => {
    expect(Object.keys(rotuloFuncao).sort()).toEqual(Object.keys(descricaoFuncao).sort())
    for (const k of Object.keys(rotuloFuncao)) {
      expect(rotuloFuncao[k as keyof typeof rotuloFuncao]).toBeTruthy()
      expect(descricaoFuncao[k as keyof typeof descricaoFuncao]).toBeTruthy()
    }
    expect(SEDE_ID).toBe('00000000-0000-0000-0000-000000000001')
  })
})
