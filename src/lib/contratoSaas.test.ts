// Passo 422: contrato SaaS da Value Pas — versão, cláusulas essenciais e impressão digital estável.
import { describe, it, expect } from 'vitest'
import { CONTRATO_SAAS_TEXTO, CONTRATO_SAAS_VERSAO, hashContratoSaas } from './contratoSaas'

describe('contrato SaaS', () => {
  it('traz versão 2.0, instalação em 3 parcelas, R$ 200 por usuário, LGPD, SLA e foro', () => {
    expect(CONTRATO_SAAS_TEXTO).toContain(`Versão ${CONTRATO_SAAS_VERSAO}`)
    expect(CONTRATO_SAAS_VERSAO).toBe('2.0 (10/11/2026)')
    expect(CONTRATO_SAAS_TEXTO).toContain('Taxa de instalação: R$ 15.000,00')
    expect(CONTRATO_SAAS_TEXTO).toContain('3 (três) parcelas mensais e iguais de R$ 5.000,00 (cinco mil reais), sem juros')
    expect(CONTRATO_SAAS_TEXTO).toContain('R$ 200,00 (duzentos reais) por usuário ativo')
    expect(CONTRATO_SAAS_TEXTO).not.toContain('390,00')
    expect(CONTRATO_SAAS_TEXTO).not.toContain('desconto de 30%')
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
