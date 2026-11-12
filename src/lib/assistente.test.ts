// Passos 431–432: assistente jurídico no modo demonstração — vocabulário, preferência, histórico e resposta de exemplo.
import { describe, it, expect, beforeEach } from 'vitest'

const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}
const { ESPECIALIDADES, MODOS, AREAS_DIREITO, especialidadePreferida, guardarEspecialidade, historicoConsultas, apagarConsulta, perguntar } = await import('./assistente')

describe('vocabulário do assistente', () => {
  it('especialidades e modos únicos, com rótulo e descrição; áreas da tela de entrada cobrem 10 ramos', () => {
    expect(new Set(ESPECIALIDADES.map(e => e.valor)).size).toBe(ESPECIALIDADES.length)
    for (const e of ESPECIALIDADES) { expect(e.rotulo).toBeTruthy(); expect(e.descricao.length).toBeGreaterThan(10) }
    expect(MODOS.map(m => m.valor)).toEqual(['responder', 'redigir', 'caminhos'])
    expect(AREAS_DIREITO).toHaveLength(11)
    expect(AREAS_DIREITO.map(a => a.chave)).toContain('justica')
    expect(AREAS_DIREITO.map(a => a.chave)).toContain('imobiliario')
  })
})

describe('modo demonstração', () => {
  beforeEach(() => mem.clear())

  it('preferência começa em imobiliário e é lembrada', async () => {
    expect(await especialidadePreferida()).toBe('imobiliario')
    await guardarEspecialidade('trabalhista')
    expect(await especialidadePreferida()).toBe('trabalhista')
  })

  it('perguntar devolve resposta de exemplo com fonte do Planalto e entra no histórico (máx. 30); apagar remove', async () => {
    const c = await perguntar('Tenho direito à renovatória?', 'imobiliario', [])
    expect(c.resposta).toContain('art. 51')
    expect(c.fontes[0].url).toMatch(/planalto\.gov\.br/)
    expect(c.matriz).toBeUndefined()
    const m = await perguntar('Quais caminhos?', 'imobiliario', [], 'caminhos')
    expect(m.matriz?.caminhos.length).toBeGreaterThan(1)
    expect(m.matriz?.recomendado).toBeGreaterThanOrEqual(0)
    const hist = await historicoConsultas()
    expect(hist.map(h => h.id)).toEqual([m.id, c.id])
    await apagarConsulta(c.id)
    expect((await historicoConsultas()).map(h => h.id)).toEqual([m.id])
    for (let i = 0; i < 35; i++) await perguntar(`p${i}`, 'geral', [])
    expect(await historicoConsultas()).toHaveLength(30)
  })
})
