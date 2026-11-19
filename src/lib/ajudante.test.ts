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

describe('o copiloto aprende com o uso', () => {
  it('a tela que o escritório disse que resolveu sobe para o primeiro lugar na mesma pergunta', () => {
    const antes = procurar('como vejo os prazos')
    expect(antes.length).toBeGreaterThan(1)
    const ultima = [...antes].reverse().find(r => r.origem === 'tela' && r.rota)!
    expect(antes[0].rota).not.toBe(ultima.rota)
    const aprendido: Aprendido[] = [{ pergunta: 'Como vejo os prazos?', vezes: 4, achou: true, resolveu: 3, naoResolveu: 0, rotas: { [ultima.rota!]: 3 } }]
    const depois = procurar('como vejo os prazos', 5, undefined, aprendido)
    expect(depois.findIndex(r => r.rota === ultima.rota && r.origem === 'tela')).toBeLessThan(antes.findIndex(r => r.rota === ultima.rota && r.origem === 'tela'))
  })
  it('voto de outra pergunta não mexe nesta', () => {
    const aprendido: Aprendido[] = [{ pergunta: 'outra coisa', vezes: 1, achou: true, resolveu: 1, naoResolveu: 0, rotas: { '/horas': 9 } }]
    expect(procurar('como vejo os prazos', 5, undefined, aprendido)).toEqual(procurar('como vejo os prazos'))
  })
  it('quem não vê a tela não a recebe, mesmo com voto', () => {
    const fechada = { veTudo: false, admin: false, instituto: false, sede: true }
    const aprendido: Aprendido[] = [{ pergunta: 'royalties', vezes: 1, achou: true, resolveu: 5, naoResolveu: 0, rotas: { '/royalties': 5 } }]
    expect(procurar('royalties', 5, fechada, aprendido).some(r => r.rota === '/royalties')).toBe(false)
  })
})
