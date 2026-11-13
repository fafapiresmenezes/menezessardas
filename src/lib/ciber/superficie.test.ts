import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import {
  EXEMPLO, achados, resumo, risco, alivio, PESO_EXPOSICAO, PESO_SENSIBILIDADE,
  type Ativo,
} from './superficie'

/**
 * O que estes testes prendem: a conta de risco, as regras de achado, e as duas promessas do passo
 * D3 — só defesa, e nada de varredura. A última é prendida no texto: nenhum arquivo desta parte
 * pode conter chamada de rede, e a tela tem de dizer que os dados são de exemplo.
 */
const LIB = readFileSync('src/lib/ciber/superficie.ts', 'utf8')
const TELA = readFileSync('src/pages/SuperficieAtaquePage.tsx', 'utf8')

const ativo = (a: Partial<Ativo> = {}): Ativo => ({
  id: 'x', nome: 'Coisa', o_que_guarda: 'algo', exposicao: 'internet', sensibilidade: 'sigiloso',
  controles: [], alcancam: [], ...a,
})

describe('superfície de ataque (D3)', () => {
  it('o risco é exposição × sensibilidade, menos o que os controles seguram', () => {
    expect(risco(ativo())).toBe(PESO_EXPOSICAO.internet * PESO_SENSIBILIDADE.sigiloso) // 9
    expect(risco(ativo({ controles: ['segundo_fator'] }))).toBe(5.9)                   // 9 × 0,65
    expect(risco(ativo({ exposicao: 'interno', sensibilidade: 'publico' }))).toBe(1)
  })

  it('controle nenhum zera o risco: o alívio para em 0,8', () => {
    const todos = ativo({ controles: ['segundo_fator', 'acesso_minimo', 'trilha', 'cifrado', 'copia', 'revisao'] })
    expect(alivio(todos.controles)).toBe(0.8)
    expect(risco(todos)).toBeGreaterThan(0)
  })

  it('acha conta compartilhada, acesso parado e sigiloso sem segundo fator', () => {
    const lista = achados()
    expect(lista.some(a => /compartilhada/i.test(a.o_que))).toBe(true)
    expect(lista.some(a => /parado há 190 dias/.test(a.o_que))).toBe(true)
    expect(lista.some(a => /sem segundo fator/i.test(a.o_que))).toBe(true)
    // Os graves vêm primeiro.
    expect(lista[0].gravidade).toBe('alta')
  })

  it('todo achado diz por que e o que fazer, e o que fazer é sempre defensivo', () => {
    for (const a of achados()) {
      expect(a.por_que.length).toBeGreaterThan(30)
      expect(a.o_que_fazer.length).toBeGreaterThan(15)
      expect(a.o_que_fazer).not.toMatch(/invad|explor|atac|derrub|varrer|sondar/i)
    }
  })

  it('o resumo conta o que a tela mostra no alto', () => {
    const r = resumo()
    expect(r.ativos).toBe(EXEMPLO.length)
    expect(r.expostos).toBe(EXEMPLO.filter(a => a.exposicao === 'internet').length)
    expect(r.graves).toBeGreaterThan(0)
    expect(r.pior.length).toBeGreaterThan(0)
  })

  it('nada aqui varre, sonda ou chama rede, e a tela diz que os dados são de exemplo', () => {
    for (const fonte of [LIB, TELA]) {
      expect(fonte).not.toMatch(/\bfetch\(|XMLHttpRequest|axios|WebSocket|nmap|navigator\.sendBeacon/)
    }
    expect(TELA).toMatch(/dados de exemplo/i)
    expect(TELA).toMatch(/não varre/i)
    // Nenhum nome de pessoa no exemplo: papel basta.
    for (const a of EXEMPLO) for (const q of a.alcancam) expect(q.papel).not.toMatch(/[A-Z][a-z]+ [A-Z][a-z]+/)
  })
})
