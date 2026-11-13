// Passo D2: as trilhas de estudo. Tudo aqui é conta em cima do arquivo de consultores do repositório;
// nenhum teste toca rede.
import { describe, it, expect } from 'vitest'
import {
  AGENTES, EMENTAS_EM, MINUTOS_FONTE, MINUTOS_TOPICO, NAO_PROMESSA, PROMESSA, areas, horas,
  plano, procurar, progresso, semEmenta, trilhaDoAgente, trilhasProntas, semanasAteOFim,
} from './trilhas'
import type { Agente } from './trilhas'

const agente = (over: Partial<Agente> = {}): Agente => ({
  id: 'agente-999', nome: 'Consultor de teste', area: 'Teste', nicho: 'Teste',
  ementa: { topicos: ['Um', 'Dois', 'Três'], fontes: [{ titulo: 'Fonte A', url: 'https://a' }] },
  ...over,
})

describe('a trilha sai da ementa que já existe', () => {
  it('um módulo por tópico, na ordem, com a fonte da ementa', () => {
    const t = trilhaDoAgente(agente())
    expect(t.modulos.map(m => m.titulo)).toEqual(['Um', 'Dois', 'Três'])
    expect(t.modulos.map(m => m.n)).toEqual([1, 2, 3])
    expect(t.modulos.every(m => m.fonte?.url === 'https://a')).toBe(true)
    expect(t.minutos).toBe(3 * (MINUTOS_TOPICO + MINUTOS_FONTE))
  })

  it('módulo sem fonte é marcado, não escondido', () => {
    const t = trilhaDoAgente(agente({ ementa: { topicos: ['Um'], fontes: [] } }))
    expect(t.modulos[0].semFonte).toBe(true)
    expect(t.modulosSemFonte).toBe(1)
    expect(t.modulos[0].minutos).toBe(MINUTOS_TOPICO)
  })

  it('as fontes giram entre os módulos quando há mais tópico que fonte', () => {
    const t = trilhaDoAgente(agente({ ementa: { topicos: ['Um', 'Dois', 'Três'], fontes: [{ titulo: 'A', url: 'https://a' }, { titulo: 'B', url: 'https://b' }] } }))
    expect(t.modulos.map(m => m.fonte!.url)).toEqual(['https://a', 'https://b', 'https://a'])
  })
})

describe('o catálogo de verdade do repositório', () => {
  it('toda trilha pronta tem pelo menos um módulo, e quem não tem ementa fica de fora e é contado', () => {
    const prontas = trilhasProntas()
    expect(prontas.length).toBeGreaterThan(400)
    expect(prontas.every(t => t.modulos.length > 0)).toBe(true)
    expect(prontas.length + semEmenta()).toBe(AGENTES.length)
  })

  it('as áreas saem ordenadas da maior para a menor', () => {
    const a = areas()
    expect(a.length).toBeGreaterThan(3)
    expect(a[0].trilhas).toBeGreaterThanOrEqual(a[1].trilhas)
    expect(a.reduce((s, x) => s + x.trilhas, 0)).toBe(trilhasProntas().length)
  })

  it('a busca acha por nome, área ou nicho, e sem termo devolve tudo', () => {
    expect(procurar('').length).toBe(trilhasProntas().length)
    const r = procurar('direito')
    expect(r.length).toBeGreaterThan(50)
    expect(r.every(t => `${t.nome} ${t.area} ${t.nicho}`.toLowerCase().includes('direito'))).toBe(true)
  })

  it('a data da ementa está escrita, para ninguém achar que o conteúdo é de hoje', () => {
    expect(EMENTAS_EM).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('plano de semanas', () => {
  const t = trilhaDoAgente(agente({ ementa: { topicos: ['Um', 'Dois', 'Três', 'Quatro'], fontes: [{ titulo: 'A', url: 'https://a' }] } }))

  it('respeita o tempo da semana e não parte módulo ao meio', () => {
    const p = plano(t, 100) // cada módulo tem 45 min: cabem dois por semana
    expect(p.map(s => s.modulos.length)).toEqual([2, 2])
    expect(p.every(s => s.minutos <= 100)).toBe(true)
  })

  it('módulo maior que a semana inteira ganha a própria semana, em vez de sumir', () => {
    const p = plano(t, 10)
    expect(p).toHaveLength(4)
    expect(p.flatMap(s => s.modulos)).toHaveLength(4)
    expect(semanasAteOFim(t, 10)).toBe(4)
  })

  it('nenhum módulo se perde nem se repete, qualquer que seja o tempo', () => {
    for (const minutos of [1, 30, 45, 90, 1000]) {
      const ns = plano(t, minutos).flatMap(s => s.modulos.map(m => m.n))
      expect(ns).toEqual([1, 2, 3, 4])
    }
  })
})

describe('progresso e honestidade', () => {
  const t = trilhaDoAgente(agente())

  it('conta só o que existe na trilha e aponta o próximo módulo', () => {
    const p = progresso(t, [1, 99])
    expect(p.lidos).toEqual([1])
    expect(p.porcento).toBe(33)
    expect(p.proximo!.n).toBe(2)
    expect(p.minutosQueFaltam).toBe(2 * (MINUTOS_TOPICO + MINUTOS_FONTE))
  })

  it('trilha inteira lida não deixa próximo módulo nem minuto sobrando', () => {
    const p = progresso(t, [1, 2, 3])
    expect(p.porcento).toBe(100)
    expect(p.proximo).toBeNull()
    expect(p.minutosQueFaltam).toBe(0)
  })

  it('a lista do que NÃO é prometido fala de certificado e de medir aprendizado', () => {
    const tudo = NAO_PROMESSA.join(' ')
    expect(tudo).toContain('certificado')
    expect(tudo).toContain('Não mede se você aprendeu')
    expect(PROMESSA.length).toBe(3)
  })

  it('o tempo é escrito em hora e minuto, do jeito que se fala', () => {
    expect(horas(45)).toBe('45 min')
    expect(horas(60)).toBe('1 h')
    expect(horas(135)).toBe('2 h 15 min')
  })
})
