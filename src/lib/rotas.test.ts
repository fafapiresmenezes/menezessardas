import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { ROTAS_TELAS } from '@/data/rotas'

describe('telas da plataforma', () => {
  it('toda rota da lista existe no App.tsx e no E2E de produção', () => {
    const app = readFileSync('src/App.tsx', 'utf8'); const e2e = readFileSync('e2e/producao-telas.mjs', 'utf8')
    for (const { rota } of ROTAS_TELAS) { expect(app, rota).toContain(`path="${rota}"`); expect(e2e, rota).toContain(`'${rota.slice(1)}'`) }
    expect(new Set(ROTAS_TELAS.map(r => r.rota)).size).toBe(ROTAS_TELAS.length)
  })
})
