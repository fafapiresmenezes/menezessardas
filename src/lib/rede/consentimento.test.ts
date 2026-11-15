// Passo D1: o que a rede de opinião coleta, de quem e por quanto tempo. Nada aqui toca rede.
import { describe, it, expect } from 'vitest'
import {
  DADOS, IDADE_MINIMA, IDADE_SEM_RESPONSAVEL, MINIMO_PARA_AGREGADO, NUNCA, comPrazo,
  participacao, podeMostrarAgregado, saiEmAgregado, semFinalidade,
} from './consentimento'

describe('a lista do que se coleta', () => {
  it('todo dado tem finalidade escrita, base legal e destino do prazo', () => {
    expect(semFinalidade()).toEqual([])
    expect(DADOS.every(d => ['consentimento', 'legitimo_interesse', 'obrigacao_legal'].includes(d.base))).toBe(true)
    expect(DADOS.every(d => d.guardar_dias === null || d.guardar_dias > 0)).toBe(true)
  })

  it('o que sai em agregado é só opinião e recorte, nunca e-mail nem apelido', () => {
    const sai = saiEmAgregado().map(d => d.o_que).join(' ')
    expect(sai).not.toMatch(/E-mail|Apelido/)
    expect(saiEmAgregado().length).toBeGreaterThan(0)
  })

  it('voto e recorte somem sozinhos em dois anos', () => {
    const prazos = comPrazo()
    expect(prazos.length).toBeGreaterThan(2)
    expect(prazos.find(d => d.o_que.startsWith('Voto'))!.guardar_dias).toBe(730)
  })
})

describe('regra de menores', () => {
  it('abaixo de 16 não entra', () => {
    const r = participacao(15)
    expect(r.pode).toBe(false)
    expect(r.motivo).toContain(String(IDADE_MINIMA))
  })

  it('de 16 a 17 entra com o aceite de quem responde pela pessoa', () => {
    for (const i of [16, 17]) {
      const r = participacao(i)
      expect(r.pode).toBe(true)
      expect(r.pode && r.exigeResponsavel).toBe(true)
    }
  })

  it('de 18 em diante o aceite é só da pessoa', () => {
    const r = participacao(IDADE_SEM_RESPONSAVEL)
    expect(r.pode && r.exigeResponsavel).toBe(false)
  })

  it('idade que não é número não vira participação por descuido', () => {
    expect(participacao(Number.NaN).pode).toBe(false)
    expect(participacao(-3).pode).toBe(false)
  })
})

describe('agregado não identifica gente', () => {
  it('abaixo de dez votos o resultado não sai, e a tela recebe o motivo', () => {
    expect(podeMostrarAgregado(MINIMO_PARA_AGREGADO - 1).pode).toBe(false)
    expect(podeMostrarAgregado(9).motivo).toContain('pelo menos 10')
    expect(podeMostrarAgregado(10).pode).toBe(true)
  })
})

describe('os limites permanentes continuam escritos', () => {
  it('rosto, emoção, perfil psicológico e redes sociais de terceiros seguem proibidos', () => {
    const t = NUNCA.join(' ')
    expect(t).toMatch(/rosto, emoção, mentira nem perfil psicológico/)
    expect(t).toMatch(/Não vasculha a rede social/)
  })

  it('o jogo não usa pessoa real, e a rede não faz propaganda eleitoral', () => {
    const t = NUNCA.join(' ')
    expect(t).toMatch(/nome, imagem nem semelhança de pessoa real/)
    expect(t).toMatch(/propaganda eleitoral/)
  })
})
