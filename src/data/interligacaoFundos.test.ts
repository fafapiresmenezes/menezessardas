// Plano v5, R05 — interligação: o mesmo facto entra uma vez e os ecrãs todos contam a mesma história.
import { describe, it, expect } from 'vitest'
import { PROJETOS_DEMO } from '@/data/demoObraAngola'
import { CONTRATOS_DEMO } from '@/data/contratosDemo'
import { PAGAMENTOS_DEMO, RAZAO_RETIDO } from '@/data/pagamentosDemo'
import { FORNECEDORES_DEMO, GARANTIAS_DEMO, RISCOS_DEMO } from '@/data/operacaoDemo'
import { DOCUMENTOS_DEMO, AUDITORIA_DEMO } from '@/data/documentosDemo'

const PROJ = new Map(PROJETOS_DEMO.map(p => [p.id, p]))
const TUDO = [
  ...CONTRATOS_DEMO, ...PAGAMENTOS_DEMO, ...FORNECEDORES_DEMO,
  ...GARANTIAS_DEMO, ...RISCOS_DEMO, ...DOCUMENTOS_DEMO, ...AUDITORIA_DEMO,
]

describe('interligação dos sectores (R05)', () => {
  it('toda a etiqueta de projecto aponta para um projecto que existe na carteira', () => {
    for (const x of TUDO) {
      if (x.item.projeto) expect(PROJ.has(x.item.projeto), `projecto desconhecido: ${x.item.projeto}`).toBe(true)
    }
  })

  it('o país da etiqueta bate com o país do projecto (um facto, uma verdade)', () => {
    for (const x of TUDO) {
      if (x.item.projeto) expect(x.item.pais, `país trocado em ${JSON.stringify(x.item)}`).toBe(PROJ.get(x.item.projeto)!.pais)
    }
  })

  it('cada projecto da carteira tem contrato, pagamento e pelo menos um risco ou garantia', () => {
    for (const p of PROJETOS_DEMO) {
      expect(CONTRATOS_DEMO.some(c => c.item.projeto === p.id), `projecto sem contrato: ${p.id}`).toBe(true)
      expect(PAGAMENTOS_DEMO.some(x => x.item.projeto === p.id), `projecto sem pagamento: ${p.id}`).toBe(true)
      expect(
        RISCOS_DEMO.some(r => r.item.projeto === p.id) || GARANTIAS_DEMO.some(g => g.item.projeto === p.id),
        `projecto sem risco nem garantia: ${p.id}`
      ).toBe(true)
    }
  })

  it('o pagamento retido conta a mesma história que os riscos: terreno por confirmar', () => {
    const retido = PAGAMENTOS_DEMO.find(p => p.estado === 'retido')!
    expect(RAZAO_RETIDO[retido.id].toLowerCase()).toContain('título de concessão')
    expect(RISCOS_DEMO.some(r => r.titulo.toLowerCase().includes('título de concessão') && r.item.projeto === retido.item.projeto)).toBe(true)
  })

  it('o registo de auditoria só fala de coisas que existem na casa', () => {
    const reais = [
      ...DOCUMENTOS_DEMO.map(d => d.nome),
      ...PAGAMENTOS_DEMO.map(p => p.descricao),
      'Visão do presidente', // consulta de ecrã
    ]
    for (const ev of AUDITORIA_DEMO) {
      expect(reais.some(n => n === ev.alvo || n.startsWith(ev.alvo)), `auditoria sobre coisa fantasma: ${ev.alvo}`).toBe(true)
    }
  })

  it('as moedas são sempre as duas da casa (Kz e US$), escritas sempre da mesma maneira', () => {
    for (const c of CONTRATOS_DEMO) expect(['Kz', 'US$']).toContain(c.moeda)
    for (const p of PAGAMENTOS_DEMO) expect(['Kz', 'US$']).toContain(p.moeda)
  })
})
