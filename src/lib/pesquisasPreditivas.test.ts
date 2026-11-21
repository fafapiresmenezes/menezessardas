import { describe, it, expect } from 'vitest'
import {
  PONTOS_INICIAIS, RECARGA_MENSAL, acertoDoGrupo, recargasAte, chancesDoGrupo, poteDaPergunta, retornoDoPalpite, saldoDePontos,
  validarPalpite, validarPergunta, type Pergunta,
} from './pesquisasPreditivas'

const base: Pergunta = {
  id: 1, titulo: 'Pergunta de teste', detalhe: '', categoria: 'Geral', opcoes: ['Sim', 'Não'],
  criterio: 'Fonte pública oficial', fecha_em: '2099-01-01T00:00:00Z', resultado: null, resolvida_em: null,
}

describe('pesquisas preditivas com pontos (sem dinheiro)', () => {
  it('a chance do grupo é a parte dos pontos em cada resposta', () => {
    const pote = poteDaPergunta(base, [{ pergunta_id: 1, opcao: 0, pontos: 30 }, { pergunta_id: 1, opcao: 1, pontos: 10 }, { pergunta_id: 2, opcao: 0, pontos: 99 }])
    expect(pote).toEqual([30, 10])
    expect(chancesDoGrupo(pote)).toEqual([75, 25])
    expect(chancesDoGrupo([0, 0])).toEqual([50, 50])
  })

  it('quem acerta divide os pontos da rodada; anulada devolve; aberta não paga', () => {
    const pote = [100, 50]
    expect(retornoDoPalpite({ pergunta_id: 1, opcao: 0, pontos: 100 }, pote, 0)).toBe(150)
    expect(retornoDoPalpite({ pergunta_id: 1, opcao: 1, pontos: 50 }, pote, 0)).toBe(0)
    expect(retornoDoPalpite({ pergunta_id: 1, opcao: 1, pontos: 50 }, pote, -1)).toBe(50)
    expect(retornoDoPalpite({ pergunta_id: 1, opcao: 1, pontos: 50 }, pote, null)).toBe(0)
  })

  it('o saldo é o mesmo que o banco calcula (conferido no ensaio do SQL 155: 1050 e 950)', () => {
    const resolvida = { ...base, resultado: 0 }
    const todos = [{ pergunta_id: 1, opcao: 0, pontos: 100 }, { pergunta_id: 1, opcao: 1, pontos: 50 }]
    const antes = new Date('2026-11-22T00:00:00Z')
    expect(saldoDePontos([resolvida], todos, [todos[0]], antes)).toBe(1050)
    expect(saldoDePontos([resolvida], todos, [todos[1]], antes)).toBe(950)
    expect(saldoDePontos([], [], [], antes)).toBe(PONTOS_INICIAIS)
  })

  it('a Moeda do Olho recarrega 1.000 de graça todo dia 1 (horário de Brasília)', () => {
    expect(recargasAte(new Date('2026-12-01T02:59:00Z'))).toBe(0)
    expect(recargasAte(new Date('2026-12-01T03:00:00Z'))).toBe(1)
    expect(recargasAte(new Date('2027-01-01T02:59:00Z'))).toBe(1)
    expect(recargasAte(new Date('2027-01-01T03:00:00Z'))).toBe(2)
    expect(saldoDePontos([], [], [], new Date('2027-01-15T00:00:00Z'))).toBe(PONTOS_INICIAIS + 2 * RECARGA_MENSAL)
  })

  it('palpite inválido diz o motivo em palavras simples', () => {
    const agora = new Date('2026-11-20T00:00:00Z')
    expect(validarPalpite(base, 0, 10, 1000, agora)).toBeNull()
    expect(validarPalpite(base, 5, 10, 1000, agora)).toMatch(/Escolha/)
    expect(validarPalpite(base, 0, 0, 1000, agora)).toMatch(/pelo menos/)
    expect(validarPalpite(base, 0, 500, 1000, agora)).toMatch(/máximo/)
    expect(validarPalpite(base, 0, 100, 50, agora)).toMatch(/suficientes/)
    expect(validarPalpite({ ...base, resultado: 0 }, 0, 10, 1000, agora)).toMatch(/fechou/)
  })

  it('pergunta nova precisa de fonte pública e data futura', () => {
    const agora = new Date('2026-11-20T00:00:00Z')
    const ok = { titulo: 'A Selic vai subir em dezembro?', criterio: 'Comunicado oficial do Copom', opcoes: ['Sim', 'Não'], fecha_em: '2026-12-31T00:00:00Z' }
    expect(validarPergunta(ok, agora)).toBeNull()
    expect(validarPergunta({ ...ok, criterio: 'eu acho' }, agora)).toMatch(/fonte/)
    expect(validarPergunta({ ...ok, opcoes: ['Sim', 'sim'] }, agora)).toMatch(/repetidas/)
    expect(validarPergunta({ ...ok, fecha_em: '2026-01-01T00:00:00Z' }, agora)).toMatch(/futuro/)
  })

  it('a medida de acerto só aparece com 5 perguntas resolvidas', () => {
    const ps = [1, 2, 3, 4].map(id => ({ ...base, id, resultado: 0 }))
    const todos = ps.map(p => ({ pergunta_id: p.id, opcao: 0, pontos: 10 }))
    expect(acertoDoGrupo(ps, todos).brier).toBeNull()
    const cinco = [...ps, { ...base, id: 5, resultado: 0 }]
    const r = acertoDoGrupo(cinco, [...todos, { pergunta_id: 5, opcao: 0, pontos: 10 }])
    expect(r.n).toBe(5)
    expect(r.brier).toBe(0)
  })

  it('nenhuma palavra de dinheiro real na lógica: só pontos', async () => {
    const fs = await import('fs')
    const tela = fs.readFileSync('src/pages/EstalecasPage.tsx', 'utf8')
    expect(tela).not.toMatch(/R\$|binance|depositar|sacar|carteira cripto|pix/i)
    expect(tela).toContain('não valem dinheiro')
  })
})
