// O ajudante "como faco" so' serve se a resposta vier mesmo do que a plataforma explica, e se o
// aprendizado for o da casa. Este teste tranca as duas coisas.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { baseDeConhecimento, procurar, normalizar, maisPerguntadas, semResposta, type Aprendido } from './ajudante'

vi.mock('./supabase', () => ({ supabase: {}, supabaseConfigurado: false }))

beforeEach(() => vi.clearAllMocks())

describe('de onde sai a resposta', () => {
  it('a base junta as dicas das telas, os passos dos tours e o glossario, e nao esta vazia', () => {
    const base = baseDeConhecimento()
    expect(base.filter(i => i.origem === 'tela').length).toBeGreaterThan(40)
    expect(base.filter(i => i.origem === 'passo').length).toBeGreaterThan(20)
    expect(base.filter(i => i.origem === 'palavra').length).toBeGreaterThan(20)
    // Toda resposta tem titulo e texto: nada entra na base pela metade.
    for (const i of base) { expect(i.titulo.length).toBeGreaterThan(1); expect(i.texto.length).toBeGreaterThan(5) }
  })

  it('pergunta em portugues comum chega na tela certa', () => {
    const r = procurar('como lanco as horas trabalhadas?')
    expect(r.length).toBeGreaterThan(0)
    expect(r.some(x => x.rota === '/horas')).toBe(true)
  })

  it('acento e maiuscula nao atrapalham', () => {
    expect(normalizar('Intimações')).toBe('intimacoes')
    expect(procurar('intimacoes').some(x => x.rota === '/intimacoes')).toBe(true)
  })

  it('pergunta sobre coisa que a plataforma nao faz nao inventa resposta', () => {
    expect(procurar('qwertyuiop zxcvbnm')).toEqual([])
  })

  it('palavra que so' + ' aparece em toda frase nao puxa resposta nenhuma', () => {
    expect(procurar('como faco para')).toEqual([])
  })
})

describe('o aprendizado da casa', () => {
  const lista: Aprendido[] = [
    { pergunta: 'como vejo meus prazos', vezes: 9, achou: true, resolveu: 7, naoResolveu: 0 },
    { pergunta: 'como emito nota fiscal', vezes: 5, achou: false, resolveu: 0, naoResolveu: 0 },
    { pergunta: 'como mudo a senha', vezes: 4, achou: true, resolveu: 0, naoResolveu: 3 },
  ]
  it('o que a equipe mais pergunta traz so o que teve resposta, da mais pedida para a menos', () => {
    expect(maisPerguntadas(lista).map(a => a.pergunta)).toEqual(['como vejo meus prazos', 'como mudo a senha'])
  })
  it('a fila do que falta explicar junta o que nao teve resposta e o que nao resolveu', () => {
    expect(semResposta(lista).map(a => a.pergunta)).toEqual(['como emito nota fiscal', 'como mudo a senha'])
  })
})
