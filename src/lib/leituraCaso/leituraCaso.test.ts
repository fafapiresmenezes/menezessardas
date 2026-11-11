import { describe, it, expect } from 'vitest'
import { frases, datasNoTexto, valoresNoTexto, horasNoTexto, dispositivosNoTexto, lerContexto, pontosDoCaso, TIPOS_ACAO } from './contexto'
import { decidir, faixaDecisao } from './decisao'
import { confrontar, soUmMenciona } from './contradicoes'

describe('contexto do caso', () => {
  it('não quebra frase em art., R$ ou datas', () => {
    expect(frases('Conforme o art. 9º da Lei 8.245/91, deve R$ 1.200,50. Pagou em 10.03.2024!')).toEqual(['Conforme o art. 9º da Lei 8.245/91, deve R$ 1.200,50.', 'Pagou em 10.03.2024!'])
  })
  it('acha datas numéricas e por extenso, e ignora datas impossíveis', () => {
    expect(datasNoTexto('Em 05/02/2024 e em 3 de março de 2024; não em 31/02/2024.').map(d => d.iso)).toEqual(['2024-02-05', '2024-03-03'])
  })
  it('lê valores com milhar, centavos e "mil"', () => {
    expect(valoresNoTexto('R$ 1.200,50 e R$ 3 mil e R$2,5 milhões').map(v => v.valor)).toEqual([1200.5, 3000, 2500000])
  })
  it('lê horários', () => { expect(horasNoTexto('às 14h30, depois 9h e 18:05')).toEqual(['14:30', '09:00', '18:05']) })
  it('acha leis, artigos e súmulas', () => {
    const d = dispositivosNoTexto('Com base no art. 62, I, da Lei 8.245/91 e na Súmula 214 do STJ.')
    expect(d.some(x => /art\. 62/.test(x))).toBe(true)
    expect(d).toContain('Súmula 214 do STJ')
  })
  it('monta a linha do tempo em ordem cronológica', () => {
    const c = lerContexto('O aluguel de março venceu em 10/03/2024. O contrato foi assinado em 01/01/2023.')
    expect(c.linhaDoTempo.map(f => f.iso)).toEqual(['2023-01-01', '2024-03-10'])
  })
  it('marca pontos-chave mencionados no relato, sem diferenciar acento', () => {
    const p = pontosDoCaso('despejo', 'Há contrato escrito e FIADOR; a planilha do debito está pronta.')
    expect(p.find(x => x.id === 'contrato')!.mencionado).toBe(true)
    expect(p.find(x => x.id === 'garantia')!.mencionado).toBe(true)
    expect(p.find(x => x.id === 'debito')!.mencionado).toBe(true)
    expect(p.find(x => x.id === 'purgacao')!.mencionado).toBe(false)
  })
  it('todo tipo de ação tem valor único e o despejo cumulado herda os pontos do despejo', () => {
    expect(new Set(TIPOS_ACAO.map(t => t.valor)).size).toBe(TIPOS_ACAO.length)
    expect(pontosDoCaso('despejo_cumulado', '').length).toBe(pontosDoCaso('despejo', '').length)
  })
})

describe('decisão de acordo', () => {
  const base = { lado: 'autor' as const, valorPedido: 100000, chanceAutor: 60, custos: 0, sucumbenciaPct: 0, meses: 0, jurosMesPct: 0, proposta: 0 }
  it('sem tempo nem custo, o valor esperado é chance × valor', () => {
    expect(decidir(base).valorEsperado).toBe(60000)
  })
  it('autor: proposta acima do equivalente compensa, abaixo não', () => {
    expect(decidir({ ...base, proposta: 70000 }).recomendacao).toBe('aceitar')
    expect(decidir({ ...base, proposta: 40000 }).recomendacao).toBe('recusar')
    expect(decidir({ ...base, proposta: 60500 }).recomendacao).toBe('indiferente')
  })
  it('autor: sucumbência, custos e tempo reduzem o valor', () => {
    const r = decidir({ ...base, sucumbenciaPct: 10, custos: 5000, meses: 12, jurosMesPct: 1 })
    // (60000 - 0,4 × 10000) / 1,01^12 - 5000
    expect(r.valorEsperado).toBeCloseTo(56000 / Math.pow(1.01, 12) - 5000, 1)
  })
  it('réu: custo esperado inclui sucumbência; proposta menor que o custo compensa', () => {
    const r = decidir({ ...base, lado: 'reu', sucumbenciaPct: 10, proposta: 50000 })
    expect(r.valorEsperado).toBe(-66000)
    expect(r.acordoEquivalente).toBe(66000)
    expect(r.recomendacao).toBe('aceitar')
    expect(decidir({ ...base, lado: 'reu', proposta: 90000 }).recomendacao).toBe('recusar')
  })
  it('faixa usa as pontas da margem de erro', () => {
    const f = faixaDecisao(base, { min: 50, max: 70 })!
    expect(f.pior.valorEsperado).toBe(50000)
    expect(f.melhor.valorEsperado).toBe(70000)
    expect(faixaDecisao(base, null)).toBeNull()
  })
})

describe('confronto de depoimentos', () => {
  it('acha data, hora e valor diferentes sobre o mesmo assunto', () => {
    const d = confrontar([
      { id: 'a', quem: 'Autor', texto: 'Paguei o aluguel ao proprietário em 05/03/2024 às 14h, no valor de R$ 1.500,00.' },
      { id: 'b', quem: 'Testemunha', texto: 'Vi o pagamento do aluguel ao proprietário em 08/03/2024 às 18h, de R$ 1.200,00.' },
    ])
    const tipos = d.map(x => x.tipo)
    expect(tipos).toContain('data'); expect(tipos).toContain('hora'); expect(tipos).toContain('valor')
    expect(d[0].tipo).toBe('valor')
    expect(d.find(x => x.tipo === 'valor')!.pergunta).toMatch(/recibo/)
  })
  it('acha afirmação contra negação do mesmo fato', () => {
    const d = confrontar([
      { id: 'a', quem: 'Autor', texto: 'O réu recebeu a notificação extrajudicial pelo correio.' },
      { id: 'b', quem: 'Réu', texto: 'O réu não recebeu a notificação extrajudicial pelo correio.' },
    ])
    expect(d.some(x => x.tipo === 'negacao')).toBe(true)
  })
  it('acha quantidade diferente', () => {
    const d = confrontar([
      { id: 'a', quem: 'A', texto: 'Estavam três pessoas na portaria do prédio naquela noite.' },
      { id: 'b', quem: 'B', texto: 'Havia 5 pessoas na portaria do prédio naquela noite.' },
    ])
    expect(d.some(x => x.tipo === 'quantidade')).toBe(true)
  })
  it('não aponta divergência entre assuntos diferentes', () => {
    expect(confrontar([
      { id: 'a', quem: 'A', texto: 'O contrato foi assinado em 01/01/2023.' },
      { id: 'b', quem: 'B', texto: 'A vistoria do imóvel aconteceu em 10/02/2024.' },
    ])).toEqual([])
  })
  it('acha mudança de versão do mesmo depoente', () => {
    const d = confrontar([{ id: 'a', quem: 'Autor', texto: 'Entreguei as chaves do imóvel em 10/05/2024. Morava lá havia anos. Tinha dois filhos. Entreguei as chaves do imóvel em 20/05/2024.' }])
    expect(d.some(x => x.mesmoDepoente && x.tipo === 'data')).toBe(true)
  })
  it('lista fatos que só um depoente menciona', () => {
    const s = soUmMenciona([
      { id: 'a', quem: 'Autor', texto: 'Paguei o aluguel ao proprietário. O síndico cobrou multa condominial de R$ 300,00.' },
      { id: 'b', quem: 'Testemunha', texto: 'Vi o pagamento do aluguel ao proprietário.' },
    ])
    expect(s.map(x => x.trecho)).toEqual(['O síndico cobrou multa condominial de R$ 300,00.'])
  })
})
