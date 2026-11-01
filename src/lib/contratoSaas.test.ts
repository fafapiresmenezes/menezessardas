// Passo 422: contrato SaaS da Value Pas — versão, cláusulas essenciais e impressão digital estável.
import { describe, it, expect } from 'vitest'
import { CONTRATO_SAAS_TEXTO, CONTRATO_SAAS_VERSAO, hashContratoSaas } from './contratoSaas'

describe('contrato SaaS', () => {
  it('traz versão, preços da proposta, desconto do 1º ano, LGPD, SLA e foro', () => {
    expect(CONTRATO_SAAS_TEXTO).toContain(`Versão ${CONTRATO_SAAS_VERSAO}`)
    expect(CONTRATO_SAAS_TEXTO).toContain('R$ 390,00 por operador e R$ 120,00 por leitor')
    expect(CONTRATO_SAAS_TEXTO).toContain('desconto de 30%')
    expect(CONTRATO_SAAS_TEXTO).toContain('Lei 13.709/2018')
    expect(CONTRATO_SAAS_TEXTO).toContain('99%')
    expect(CONTRATO_SAAS_TEXTO).toContain('comarca do Rio de Janeiro/RJ')
  })
  it('a impressão digital é SHA-256 em hexadecimal e estável entre chamadas', async () => {
    const a = await hashContratoSaas()
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(await hashContratoSaas()).toBe(a)
  })
})
