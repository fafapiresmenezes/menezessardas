// Passo C6: o grafo que liga as fontes. Nada aqui toca rede nem banco: o grafo de exemplo é
// montado em memória, com nomes fictícios, e serve para trancar o comportamento do resolvedor,
// da conferência e da consulta de pressão.
import { describe, it, expect } from 'vitest'
import {
  CORTE, conferir, ciclos, emPalavras, normalizar, parecenca, pressionam, resolver,
} from './grafo'
import type { Grafo, No } from './grafo'

const nos: No[] = [
  { id: 'soja', tipo: 'commodity', nome: 'Soja em grão', fonte: 'cepea' },
  { id: 'bacia', tipo: 'bacia', nome: 'Bacia do Rio Exemplo', identificadores: { ana_sar: '17' }, fonte: 'ana_snirh' },
  { id: 'porto', tipo: 'empreendimento', nome: 'Porto de Exemplo', fonte: 'antaq' },
  { id: 'rodovia', tipo: 'empreendimento', nome: 'Rodovia do Exemplo', fonte: 'antt' },
  { id: 'empresa', tipo: 'empresa', nome: 'Agro Exemplo S.A.', identificadores: { cnpj: '00000000000191' }, fonte: 'receita' },
  { id: 'orgao', tipo: 'orgao_publico', nome: 'Agência de Exemplo', fonte: 'gov' },
]

const grafo = (): Grafo => ({
  nos,
  arestas: [
    { origem: 'bacia', destino: 'soja', tipo: 'insumo_de', fonte: 'ana_snirh', valido_de: '2020-01-01' },
    { origem: 'porto', destino: 'soja', tipo: 'escoa_por', fonte: 'antaq', valido_de: '2020-01-01' },
    { origem: 'rodovia', destino: 'porto', tipo: 'escoa_por', fonte: 'antt', valido_de: '2020-01-01' },
    { origem: 'empresa', destino: 'soja', tipo: 'fornece', fonte: 'receita', valido_de: '2020-01-01' },
    { origem: 'orgao', destino: 'empresa', tipo: 'regula', fonte: 'gov', valido_de: '2020-01-01' },
    { origem: 'empresa', destino: 'porto', tipo: 'opera_em', fonte: 'antaq', valido_de: '2020-01-01' },
  ],
  eventos: [
    { id: 'e1', tipo: 'medicao_reservatorio', subtipo: 'volume_util', titulo: 'Volume útil caiu', ocorrido_em: '2026-11-10', observado_em: '2026-11-12', valor: 28.4, unidade: '%', fonte: 'ana_snirh', entidades: ['bacia'] },
    { id: 'e2', tipo: 'interdicao', titulo: 'Trecho interditado', ocorrido_em: '2026-11-11', observado_em: '2026-11-11', fonte: 'antt', entidades: ['rodovia'] },
    { id: 'e3', tipo: 'noticia', titulo: 'Notícia antiga', ocorrido_em: '2026-01-01', observado_em: '2026-01-02', fonte: 'gdelt', entidades: ['porto'] },
  ],
})

const semana = { de: '2026-11-09', ate: '2026-11-15' }

describe('resolvedor de entidades', () => {
  it('identificador oficial manda, mesmo com o nome escrito diferente', () => {
    const r = resolver({ nome: 'AGRO EXEMPLO INDUSTRIA LTDA', identificadores: { cnpj: '00000000000191' } }, nos)
    expect(r.no?.id).toBe('empresa')
    expect(r.confianca).toBe(1)
  })

  it('nome igual depois de normalizar resolve, sufixo de razão social não atrapalha', () => {
    expect(normalizar('Agro Exemplo S.A.')).toBe('agro exemplo')
    const r = resolver({ nome: 'agro exemplo ltda' }, nos)
    expect(r.no?.id).toBe('empresa')
    expect(r.confianca).toBeLessThan(1)
  })

  it('nome que não chega no corte NÃO vira nó por chute: devolve nulo com o motivo e o quase-foi', () => {
    const r = resolver({ nome: 'Transportadora Outra Coisa' }, nos)
    expect(r.no).toBeNull()
    expect(r.motivo).toContain('conferência humana')
    expect(r.confianca).toBeLessThan(CORTE)
  })

  it('dois nós com o mesmo nome param a resolução em vez de escolher um', () => {
    const repetidos = [...nos, { id: 'soja2', tipo: 'commodity', nome: 'Soja em Grão', fonte: 'outra' }]
    const r = resolver({ nome: 'soja em grao' }, repetidos)
    expect(r.no).toBeNull()
    expect(r.motivo).toContain('mesmo nome')
  })

  it('a parecença é simétrica e vai de 0 a 1', () => {
    expect(parecenca('Porto de Exemplo', 'porto exemplo')).toBe(parecenca('porto exemplo', 'Porto de Exemplo'))
    expect(parecenca('Porto de Exemplo', 'Porto de Exemplo')).toBe(1)
    expect(parecenca('abc', '')).toBe(0)
  })
})

describe('conferência de consistência', () => {
  it('o grafo de exemplo está são', () => {
    expect(conferir(grafo())).toEqual([])
  })

  it('aresta sem fonte, sem data, para nó que não existe ou para si mesma é apontada', () => {
    const g = grafo()
    g.arestas.push({ origem: 'soja', destino: 'soja', tipo: 'fornece', fonte: '', valido_de: '' })
    g.arestas.push({ origem: 'fantasma', destino: 'soja', tipo: 'fornece', fonte: 'x', valido_de: '2020-01-01' })
    const p = conferir(g).map(x => x.o_que)
    expect(p).toContain('Aresta de um nó para ele mesmo.')
    expect(p).toContain('Aresta sem fonte.')
    expect(p).toContain('Aresta sem data de início.')
    expect(p).toContain('Origem não existe no grafo.')
  })

  it('evento que diz ter sido sabido antes de acontecer é apontado', () => {
    const g = grafo()
    g.eventos.push({ id: 'e9', tipo: 'x', ocorrido_em: '2026-11-10', observado_em: '2026-11-01', fonte: 'f', entidades: ['soja'] })
    expect(conferir(g).some(x => x.o_que.includes('Soubemos antes de acontecer'))).toBe(true)
  })

  it('rio acima de si mesmo é ciclo e não passa', () => {
    const g = grafo()
    g.arestas.push({ origem: 'bacia', destino: 'porto', tipo: 'montante_de', fonte: 'ana_snirh', valido_de: '2020-01-01' })
    g.arestas.push({ origem: 'porto', destino: 'bacia', tipo: 'montante_de', fonte: 'ana_snirh', valido_de: '2020-01-01' })
    expect(ciclos(g, 'montante_de').length).toBeGreaterThan(0)
    expect(conferir(g).some(x => x.o_que.includes('acima de si mesmo'))).toBe(true)
  })
})

describe('o que pressiona o preço da soja esta semana', () => {
  it('devolve os nós com fato novo na semana, cada um com caminho e fontes', () => {
    const r = pressionam(grafo(), 'soja', semana)
    expect(r.map(x => x.no).sort()).toEqual(['bacia', 'rodovia'])
    const bacia = r.find(x => x.no === 'bacia')!
    expect(bacia.distancia).toBe(1)
    expect(bacia.fontes).toContain('ana_snirh')
    expect(bacia.eventos[0].valor).toBeCloseTo(28.4, 1)
  })

  it('cada passo do caminho carrega a sua fonte: resposta sem lastro não sai', () => {
    const r = pressionam(grafo(), 'soja', semana)
    for (const p of r) for (const passo of p.caminho) expect(passo.fonte.length).toBeGreaterThan(0)
  })

  it('ligação sem fato novo na janela não entra: topologia não é pressão', () => {
    const r = pressionam(grafo(), 'soja', semana)
    expect(r.some(x => x.no === 'porto')).toBe(false)   // o evento do porto é de janeiro
    expect(r.some(x => x.no === 'empresa')).toBe(false) // a empresa não teve evento
  })

  it('o mais perto vem primeiro: a rodovia chega pelo porto, a dois saltos', () => {
    const r = pressionam(grafo(), 'soja', semana)
    expect(r[0].distancia).toBeLessThanOrEqual(r[r.length - 1].distancia)
    expect(r.find(x => x.no === 'rodovia')!.distancia).toBe(2)
  })

  it('o limite de saltos é respeitado', () => {
    const r = pressionam(grafo(), 'soja', semana, 1)
    expect(r.map(x => x.no)).toEqual(['bacia'])
  })

  it('aresta que já tinha acabado antes da janela não conta', () => {
    const g = grafo()
    g.arestas = g.arestas.map(a => a.origem === 'bacia' ? { ...a, valido_ate: '2021-01-01' } : a)
    expect(pressionam(g, 'soja', semana).some(x => x.no === 'bacia')).toBe(false)
  })

  it('a resposta em palavras diz o fato, a ligação e as fontes', () => {
    const frases = emPalavras(pressionam(grafo(), 'soja', semana))
    expect(frases[0]).toContain('Volume útil caiu')
    expect(frases[0]).toContain('Fontes:')
    expect(frases.join(' ')).toContain('Trecho interditado')
  })
})
