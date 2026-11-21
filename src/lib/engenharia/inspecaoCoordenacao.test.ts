import { describe, it, expect } from 'vitest'
import { novaInspecao, resumoInspecao, fecharInspecao, relatorioInspecao, inspecoesParaCSV, carregarInspecoes, salvarInspecoes, MODELOS_INSPECAO, type Armazem } from './inspecao'
import { mesclar, aplicar, editar, novoApontamento, vencedor, painel, normalizarSala, apontamentosDeConflitos, apontamentosParaCSV, type Apontamento } from './coordenacao'

const memoria = (): Armazem & { d: Record<string, string> } => { const d: Record<string, string> = {}; return { d, getItem: k => d[k] ?? null, setItem: (k, v) => { d[k] = v } } }
const t0 = new Date('2026-11-21T10:00:00Z')

describe('inspeção de obra', () => {
  it('todos os modelos têm itens e normas citadas só por número', () => {
    expect(MODELOS_INSPECAO.length).toBeGreaterThanOrEqual(7)
    for (const m of MODELOS_INSPECAO) { expect(m.itens.length).toBeGreaterThanOrEqual(5); expect(m.normas).toMatch(/\d/) }
  })

  it('resumo: conformidade ignora N/A e pendentes; fechar exige tudo avaliado e NC descrita', () => {
    let i = novaInspecao('alvenaria', { obra: 'Galpão', local: 'Térreo', responsavel: 'Eng.' }, t0)
    expect(resumoInspecao(i).pendentes).toBe(i.itens.length)
    expect(() => fecharInspecao(i)).toThrow(/Faltam/)
    i = { ...i, itens: i.itens.map((x, k) => ({ ...x, estado: k === 0 ? 'nc' : k === 1 ? 'na' : 'ok' })) }
    const r = resumoInspecao(i)
    expect(r.nc).toBe(1); expect(r.na).toBe(1)
    expect(r.conformidadePct).toBeCloseTo(((i.itens.length - 2) / (i.itens.length - 1)) * 100)
    expect(() => fecharInspecao(i)).toThrow(/sem descrição/)
    i = { ...i, itens: i.itens.map((x, k) => (k === 0 ? { ...x, obs: 'Fiada fora de prumo, 2 cm' } : x)) }
    const f = fecharInspecao(i, t0)
    expect(f.fechada).toBe(true)
    const txt = relatorioInspecao({ ...f, fotos: [{ id: 'f1', dataUrl: 'data:', quando: t0.toISOString(), lat: -22.9, lon: -43.2, precisaoM: 5, legenda: 'prumo' }] })
    expect(txt).toContain('NÃO CONFORME'); expect(txt).toContain('Fiada fora de prumo'); expect(txt).toContain('-22.900000'); expect(txt).toContain('responsável técnico')
    expect(inspecoesParaCSV([f]).split('\n')).toHaveLength(1 + f.itens.length)
  })

  it('guarda e recupera do aparelho; lixo no armazém vira lista vazia; sem espaço devolve false', () => {
    const a = memoria()
    const i = novaInspecao('concretagem', { obra: 'X', local: '', responsavel: '' }, t0)
    expect(salvarInspecoes(a, [i])).toBe(true)
    expect(carregarInspecoes(a)[0].id).toBe(i.id)
    a.setItem('theye-engenharia-inspecoes-v1', '{quebrado')
    expect(carregarInspecoes(a)).toEqual([])
    expect(salvarInspecoes({ getItem: () => null, setItem: () => { throw new Error('QuotaExceeded') } }, [i])).toBe(false)
  })
})

describe('mesa de coordenação: junção convergente', () => {
  const base = novoApontamento({ titulo: 'T1 cruza V1', elemento: 'T1, V1', disciplinas: 'Estrutura × Hidráulica', descricao: '', responsavel: '', prazo: '' }, 'Ana', t0)

  it('versão maior vence; empate decide igual nos dois lados', () => {
    const a = editar(base, { situacao: 'em análise' }, 'Ana', new Date('2026-11-21T10:01:00Z'))
    const b = editar(base, { situacao: 'resolvido' }, 'Bruno', new Date('2026-11-21T10:01:00Z'))
    expect(vencedor(a, b)).toBe(vencedor(b, a))
    const c = editar(a, { responsavel: 'Carla' }, 'Carla', new Date('2026-11-21T10:02:00Z'))
    expect(vencedor(b, c)).toBe(c)
  })

  it('qualquer ordem de chegada dá o mesmo estado (comutativo, idempotente)', () => {
    const outro = novoApontamento({ titulo: 'Duto x eletrocalha', elemento: 'D1, E1', disciplinas: 'Clima × Elétrica', descricao: '', responsavel: '', prazo: '' }, 'Bruno', new Date('2026-11-21T10:00:30Z'))
    const evs: Apontamento[] = [base, outro, editar(base, { situacao: 'resolvido' }, 'Bruno', new Date('2026-11-21T10:03:00Z')), editar(outro, { prazo: '2026-11-25' }, 'Ana', new Date('2026-11-21T10:04:00Z'))]
    const perm = [[0, 1, 2, 3], [3, 2, 1, 0], [2, 0, 3, 1], [1, 3, 0, 2]]
    const res = perm.map(o => o.reduce((s, k) => aplicar(s, { tipo: 'upsert', ap: evs[k] }), [] as Apontamento[]))
    for (const r of res) expect(r).toEqual(res[0])
    expect(mesclar(res[0], res[0])).toEqual(res[0])
    expect(res[0].find(a => a.id === base.id)!.situacao).toBe('resolvido')
  })

  it('remoção é uma versão como outra (não volta quando chega cópia antiga)', () => {
    const removido = editar(base, { apagado: true }, 'Ana', new Date('2026-11-21T10:05:00Z'))
    const s = mesclar([removido], [base])
    expect(s[0].apagado).toBe(true)
    expect(painel(s).total).toBe(0)
  })

  it('ignora mensagens malformadas', () => {
    expect(mesclar([base], [null as unknown as Apontamento, { id: 3 } as unknown as Apontamento])).toEqual([base])
  })

  it('painel conta atrasados; sala vira nome de canal; conflitos viram pauta; CSV', () => {
    const atrasado = editar(base, { prazo: '2026-11-01' }, 'Ana', t0)
    expect(painel([atrasado], '2026-11-21').atrasados).toBe(1)
    expect(normalizarSala('  Obra Luanda — Bloco Á/2 ')).toBe('obra-luanda-bloco-a-2')
    const aps = apontamentosDeConflitos([{ a: 'T1', b: 'V1', disciplinas: 'H × E', tipo: 'duro', texto: 'cruza' }], 'Ana', t0)
    expect(aps[0].id).toBe('ap-conf-T1-V1')
    expect(aps[0].titulo).toContain('Cruzamento')
    expect(apontamentosParaCSV(aps).split('\n')).toHaveLength(2)
  })
})
