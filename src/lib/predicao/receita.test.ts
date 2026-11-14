import { describe, it, expect } from 'vitest'
import {
  NAO_E_PROMESSA,
  PERCENTUAL_INSTITUTO,
  PRODUTOS,
  comPreco,
  ordemDeAtaque,
  pisoDe90Dias,
  receita90,
  royaltyDoPiso,
  semPreco,
  type Produto,
} from './receita'
import { PRECO_INSTALACAO, PRECO_USUARIO_MES } from '@/lib/precos'

/**
 * O que estes testes prendem, e é o ponto inteiro do passo: que produto sem preço decidido pelo
 * dono NÃO entra na conta. Uma planilha que chuta mensalidade e número de clientes produz um
 * número que ninguém pode cobrar; esses testes impedem que esse número apareça.
 */

describe('mapa de receita', () => {
  it('todo produto diz quem compra, o que custa atender e o que falta para vender', () => {
    for (const p of PRODUTOS) {
      expect(p.quemCompra.length, p.nome).toBeGreaterThan(15)
      expect(p.custoDeAtender.length, p.nome).toBeGreaterThan(25)
      expect(p.oQueFalta.length, p.nome).toBeGreaterThan(10)
      expect(p.precoVemDe.length, p.nome).toBeGreaterThan(25)
      expect(p.meta90, p.nome).toBeGreaterThan(0)
    }
  })

  it('preço não decidido vale zero na conta, nunca um chute', () => {
    for (const p of semPreco()) expect(receita90(p), p.nome).toBe(0)
    expect(semPreco().length).toBeGreaterThan(0)
  })

  it('o preço decidido é o mesmo que a plataforma cobra, não uma cópia desatualizada', () => {
    const usuario = PRODUTOS.find(p => p.id === 'plataforma-juridica-usuario')!
    const instalacao = PRODUTOS.find(p => p.id === 'plataforma-juridica-instalacao')!
    expect(usuario.preco).toBe(PRECO_USUARIO_MES)
    expect(instalacao.preco).toBe(PRECO_INSTALACAO)
  })

  it('a receita de 90 dias de cobrança mensal conta os meses; a de uma vez, não', () => {
    const usuario = PRODUTOS.find(p => p.id === 'plataforma-juridica-usuario')!
    expect(receita90(usuario)).toBe(PRECO_USUARIO_MES * usuario.meta90 * usuario.mesesNoPrazo)
    const instalacao = PRODUTOS.find(p => p.id === 'plataforma-juridica-instalacao')!
    expect(receita90(instalacao)).toBe(PRECO_INSTALACAO * instalacao.meta90)
  })

  it('o piso dos 90 dias é a soma só do que tem preço decidido', () => {
    expect(pisoDe90Dias()).toBe(comPreco().reduce((s, p) => s + receita90(p), 0))
    const inventado: Produto = { ...PRODUTOS[0], id: 'x', nome: 'Zzz', preco: null, meta90: 1000 }
    expect(pisoDe90Dias([...PRODUTOS, inventado])).toBe(pisoDe90Dias())
  })

  it('a plataforma jurídica não paga os 5%, e o royalty do piso reflete isso', () => {
    for (const p of PRODUTOS.filter(x => x.id.startsWith('plataforma-juridica'))) expect(p.pagaRoyalty).toBe(false)
    expect(PERCENTUAL_INSTITUTO).toBe(0.05)
    // Hoje tudo o que tem preço é a plataforma jurídica, então o royalty do piso é zero — e isso
    // é informação, não erro: o dinheiro do Instituto depende de destravar os outros produtos.
    expect(royaltyDoPiso()).toBe(0)
  })

  it('a ordem de ataque põe na frente o que já dá para vender', () => {
    const ordem = ordemDeAtaque()
    const primeiroSemPreco = ordem.findIndex(p => p.preco === null)
    expect(ordem.slice(0, primeiroSemPreco).every(p => p.preco !== null)).toBe(true)
    expect(ordem.slice(primeiroSemPreco).every(p => p.preco === null)).toBe(true)
  })

  it('entre os que faltam preço, quem destrava com menos esforço vem primeiro', () => {
    const faltam = ordemDeAtaque().filter(p => p.preco === null)
    for (let i = 1; i < faltam.length; i++) expect(faltam[i - 1].esforco).toBeLessThanOrEqual(faltam[i].esforco)
    expect(faltam[0].id).toBe('trilhas-estudo')
  })

  it('a primeira linha do aviso diz que isto não é promessa de receita', () => {
    expect(NAO_E_PROMESSA[0]).toContain('não é promessa de receita')
    expect(NAO_E_PROMESSA.join(' ')).toContain('O total é um piso')
  })
})
