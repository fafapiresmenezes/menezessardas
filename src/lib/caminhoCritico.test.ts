import { describe, expect, it } from 'vitest'
import { caminhoCritico } from './caminhoCritico'

const base = [
  { id: 'a', titulo: 'Documentos', prazo: '2026-11-03', situacao: 'a_fazer', depende_de: null },
  { id: 'b', titulo: 'Minuta', prazo: '2026-11-10', situacao: 'a_fazer', depende_de: 'a' },
  { id: 'c', titulo: 'Assinatura', prazo: '2026-11-20', situacao: 'a_fazer', depende_de: 'b' },
  { id: 'd', titulo: 'KYC (paralelo)', prazo: '2026-11-05', situacao: 'a_fazer', depende_de: null },
]
describe('caminhoCritico', () => {
  it('segue a cadeia mais longa e prevê o fim no último prazo quando tudo está no ritmo', () => {
    const r = caminhoCritico(base, '2026-10-31', '2026-10-31')
    expect(r.caminho).toEqual(['a', 'b', 'c'])
    expect(r.fimPrevisto).toBe('2026-11-20')
    expect(r.atraso).toBe(0)
  })
  it('empurra as etapas dependentes quando a anterior atrasa', () => {
    // Hoje é 10/11 e "Documentos" (prazo 03/11) ainda não terminou: ela termina no mínimo hoje, e Minuta (7 dias) e Assinatura (10 dias) deslizam.
    const r = caminhoCritico(base, '2026-10-31', '2026-11-10')
    expect(r.fins.a).toBe('2026-11-10')
    expect(r.fins.b).toBe('2026-11-17')
    expect(r.fimPrevisto).toBe('2026-11-27')
    expect(r.atraso).toBe(7)
  })
  it('etapa feita não desliza as seguintes além do prazo', () => {
    const r = caminhoCritico(base.map(e => (e.id === 'a' ? { ...e, situacao: 'feito' } : e)), '2026-10-31', '2026-11-10')
    expect(r.fins.a).toBe('2026-11-03')
    expect(r.fimPrevisto).toBe('2026-11-20')
  })
  it('tolera ciclo de dependências sem travar', () => {
    const r = caminhoCritico([{ id: 'x', titulo: 'x', prazo: '2026-11-05', situacao: 'a_fazer', depende_de: 'y' }, { id: 'y', titulo: 'y', prazo: '2026-11-08', situacao: 'a_fazer', depende_de: 'x' }], '2026-10-31', '2026-10-31')
    expect(r.fimPrevisto).not.toBeNull()
  })
})
