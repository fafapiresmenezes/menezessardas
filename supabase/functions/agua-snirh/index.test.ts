// Águas, fase 2: retratos de outorgas e barragens. Sem rede.
import { describe, it, expect } from 'vitest'
import { fingirDeno } from '../_testes/deno'
import { canonizar as canonSrc } from '../../../src/lib/predicao/ontologia'

fingirDeno({ SUPABASE_URL: 'https://db', SUPABASE_SERVICE_ROLE_KEY: 'k', VITEST: '1' })
const mod = await import('./index')

describe('retratos do SNIRH', () => {
  it('a consulta de estatística vai toda codificada (a ANA recusa colchete cru)', () => {
    const u = mod.urlEstatistica('https://x/0', "DATA_DE_VENCIMENTO > DATE '2026-11-19'", ['UF', 'FINALIDADE_PRINCIPAL'], [{ tipo: 'count', campo: 'INT_CD', nome: 'n' }])
    expect(u).not.toMatch(/[[\]{}"' ]/)
    const p = new URL(u).searchParams
    expect(JSON.parse(p.get('outStatistics')!)).toEqual([{ statisticType: 'count', onStatisticField: 'INT_CD', outStatisticFieldName: 'n' }])
    expect(p.get('groupByFieldsForStatistics')).toBe('UF,FINALIDADE_PRINCIPAL')
  })

  it('lê os grupos e acusa erro do servidor em vez de fingir que veio vazio', () => {
    expect(mod.lerGrupos({ features: [{ attributes: { UF: 'MG', FINALIDADE_PRINCIPAL: 'Irrigação', N: 3, VOL: 10 } }] })).toEqual([{ uf: 'MG', finalidade_principal: 'Irrigação', n: 3, vol: 10 }])
    expect(() => mod.lerGrupos({ error: { message: 'Unable to complete operation.' } })).toThrow('Unable')
  })

  it('cada grupo vira um evento do dia, com a UF e sem nome de pessoa', async () => {
    const ev = await mod.eventosDe('outorgas', [{ uf: 'MG', finalidade_principal: 'Irrigação', n: 3, vol: 10 }], '2026-11-18', '2026-11-19T02:00:00Z')
    expect(ev[0].uf).toBe('MG')
    expect(ev[0].linha).toMatchObject({ tipo: 'retrato_outorgas', subtipo: 'Irrigação', valor: 3, ocorrido_em: '2026-11-18T00:00:00-03:00', fonte: 'ana_outorgas' })
    expect(JSON.stringify(ev[0].linha)).not.toMatch(/requerente|empreendedor/i)
    const b = await mod.eventosDe('barragens', [{ ing_sg_ufmunicipio: 'BA', categoria_risco: 'Alto', dano_potencial: 'Alto', n: 7 }], '2026-11-18', '2026-11-19T02:00:00Z')
    expect(b[0].uf).toBe('BA')
    expect(b[0].linha.subtipo).toBe('risco Alto · dano Alto')
  })

  it('o hash usa a mesma receita da biblioteca do navegador', () => {
    const c = { b: 1, a: { y: 2 } }
    expect(mod.canonizar(c)).toBe(canonSrc(c))
  })
})

describe('outorgas vigentes', () => {
  it('conta só o que vence depois do dia, com o vencimento escrito como texto dd/mm/aaaa', () => {
    const w = mod.ondeVigentes('2026-11-18')
    expect(w).toContain("DATA_DE_VENCIMENTO = '19/11/2026'")
    expect(w).toContain("DATA_DE_VENCIMENTO = '30/11/2026'")
    expect(w).not.toContain("'18/11/2026'")
    expect(w).toContain("LIKE '%/12/2026'")
    expect(w).not.toContain("LIKE '%/11/2026'")
    expect(w).toContain("LIKE '%/2027'")
    expect(w).not.toContain("LIKE '%/2026'")
  })
})
