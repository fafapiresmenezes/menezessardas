import { describe, expect, it } from 'vitest'
import dados from './saude.json'
import { conferirCorrente, type ConsultorSaude } from './corrente'

const consultores = dados.consultores as ConsultorSaude[]

describe('corrente dos prompts de saúde', () => {
  it('tem as 55 especialidades da Resolução CFM 2.472/2026 e um consultor-chefe para cada', () => {
    expect(dados.especialidades).toHaveLength(55)
    expect(consultores.filter(c => c.tipo === 'especialidade')).toHaveLength(55)
  })

  it('confere inteira e chega ao hash final gravado pelo gerador', async () => {
    const r = await conferirCorrente(dados.genese, consultores, dados.hash_final)
    expect(r).toEqual({ ok: true, conferidos: consultores.length, quebraEm: null, hashFinal: dados.hash_final })
  })

  it('acusa o elo exato quando um prompt é alterado', async () => {
    const adulterados = consultores.map((c, i) => (i === 9 ? { ...c, instrucao: c.instrucao + ' ' } : c))
    const r = await conferirCorrente(dados.genese, adulterados, dados.hash_final)
    expect(r.ok).toBe(false)
    expect(r.quebraEm).toBe(10)
  })

  it('todo prompt clínico termina com o aviso de que não substitui o médico', () => {
    for (const c of consultores.filter(c => c.tipo !== 'dados')) expect(c.instrucao).toMatch(/192 \(SAMU\)\."$/)
  })
})
