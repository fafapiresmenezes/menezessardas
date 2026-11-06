// Rotação de estilo das peças (06/11/2026): perfis reprodutíveis, diferentes entre si e dentro dos limites.
import { describe, it, expect } from 'vitest'
import { sortearPerfil, instrucoesDoPerfil, medirTexto, aderencia, distancia, gerador, hash32, ESCOLAS, REFERENCIAS, LIMITES, DISTANCIA_MINIMA, type Perfil } from './estiloPecas'
import { pecaEmHtml, ehTitulo } from './formatarPeca'

describe('estiloPecas', () => {
  it('tem 8 escolas, mais de 50 referências e toda referência aponta para uma escola existente', () => {
    expect(ESCOLAS).toHaveLength(8)
    expect(REFERENCIAS.length).toBeGreaterThanOrEqual(50)
    const ids = new Set(ESCOLAS.map(e => e.id))
    expect(REFERENCIAS.every(r => ids.has(r.escola))).toBe(true)
    expect(REFERENCIAS.some(r => r.nome === 'Luiz Fux')).toBe(true)
    expect(new Set(REFERENCIAS.map(r => r.nome)).size).toBe(REFERENCIAS.length)
  })

  it('gerador e hash são reprodutíveis', () => {
    const a = gerador(42), b = gerador(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(hash32('peça')).toBe(hash32('peça'))
    expect(hash32('peça')).not.toBe(hash32('peca'))
  })

  it('mesma semente dá o mesmo perfil; pesos somam 1 e parâmetros ficam nos limites', () => {
    const p1 = sortearPerfil({ semente: 7, especialidade: 'imobiliario' })
    const p2 = sortearPerfil({ semente: 7, especialidade: 'imobiliario' })
    expect(p1).toEqual(p2)
    expect(p1.mistura.reduce((s, m) => s + m.peso, 0)).toBeCloseTo(1, 1)
    for (const [k, [min, max]] of Object.entries(LIMITES)) {
      const v = p1.parametros[k as keyof typeof LIMITES]
      expect(v).toBeGreaterThanOrEqual(min); expect(v).toBeLessThanOrEqual(max)
    }
  })

  it('100 peças seguidas: cada uma fica longe das 6 anteriores e nenhuma combinação se repete', () => {
    const historico: Perfil[] = []
    const assinaturas = new Set<string>()
    for (let i = 0; i < 100; i++) {
      const anteriores = historico.slice(-6)
      const p = sortearPerfil({ semente: hash32(`u1|peça ${i}`), especialidade: i % 2 ? 'imobiliario' : 'civel', anteriores, usados: anteriores.flatMap(a => Object.values(a.conectivos).flat()) })
      if (anteriores.length) expect(Math.min(...anteriores.map(a => distancia(a.parametros, p.parametros)))).toBeGreaterThanOrEqual(DISTANCIA_MINIMA * 0.9)
      assinaturas.add(JSON.stringify([p.parametros, p.conectivos, p.abertura]))
      historico.push(p)
    }
    expect(assinaturas.size).toBe(100)
  })

  it('conectivos da peça anterior são evitados na seguinte', () => {
    const a = sortearPerfil({ semente: 1 })
    const b = sortearPerfil({ semente: 2, anteriores: [a], usados: Object.values(a.conectivos).flat() })
    const usadosA = new Set(Object.values(a.conectivos).flat())
    expect(Object.values(b.conectivos).flat().filter(c => usadosA.has(c))).toHaveLength(0)
  })

  it('a área puxa as escolas afins com mais frequência', () => {
    const conta = (esp?: string) => Array.from({ length: 300 }, (_, i) => sortearPerfil({ semente: i, especialidade: esp })).filter(p => p.mistura.some(m => m.id === 'imobiliaria')).length
    expect(conta('imobiliario')).toBeGreaterThan(conta() * 1.3)
  })

  it('instruções trazem números, conectivos, vícios a evitar e a formatação', () => {
    const t = instrucoesDoPerfil(sortearPerfil({ semente: 99 }))
    expect(t).toContain('PERFIL DE ESCRITA DESTA PEÇA')
    expect(t).toMatch(/cerca de \d+ palavras/)
    expect(t).toContain('Cada conectivo no máximo duas vezes')
    expect(t).toContain('Evite:')
    expect(t).toContain('[conferir no tribunal]')
    expect(t).toContain('FORMATAÇÃO')
  })

  it('medirTexto calcula frases, ritmo, riqueza e repetição de conectivos; aderência fica entre 0 e 100', () => {
    const texto = 'O locatário deixou de pagar três aluguéis. Contudo, foi notificado em 10 de março e nada fez, embora tivesse prazo suficiente para purgar a mora nos termos do art. 62 da Lei 8.245/91. Contudo, permaneceu inerte.\n\nAlém disso, a cláusula quinta prevê multa. Contudo, o réu ignora a cláusula.'
    const m = medirTexto(texto)
    expect(m.frases).toBe(5)
    expect(m.paragrafos).toBe(2)
    expect(m.conectivos.contudo).toBe(3)
    expect(m.maiorRepeticao).toBe(3)
    expect(m.riqueza).toBeGreaterThan(0.5)
    const n = aderencia(m, sortearPerfil({ semente: 3 }))
    expect(n).toBeGreaterThanOrEqual(0); expect(n).toBeLessThanOrEqual(100)
    expect(aderencia(medirTexto(''), sortearPerfil({ semente: 3 }))).toBe(0)
  })
})

describe('formatarPeca', () => {
  it('reconhece títulos e monta o Word com fonte, margens, citação recuada e pedidos', () => {
    expect(ehTitulo('I – DOS FATOS')).toBe(true)
    expect(ehTitulo('## Do pedido')).toBe(true)
    expect(ehTitulo('O réu não pagou.')).toBe(false)
    const html = pecaEmHtml('EXCELENTÍSSIMO SENHOR DOUTOR JUIZ\n\nI – DOS FATOS\n\nO **réu** não pagou <nada>.\n\n> Art. 62. Nas ações de despejo...\n\na) a citação do réu;\nb) a procedência do pedido.', 'Despejo')
    expect(html).toContain("font-family: 'Times New Roman'")
    expect(html).toContain('margin: 3cm 2cm 2cm 3cm')
    expect(html).toContain('<h2>I – DOS FATOS</h2>')
    expect(html).toContain('<b>réu</b>')
    expect(html).toContain('&lt;nada&gt;')
    expect(html).toContain('<blockquote>Art. 62.')
    expect(html).toContain('<ul class="pedidos"><li>a) a citação do réu;</li>')
  })
})
