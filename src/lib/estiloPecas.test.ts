// Rotação de estilo das peças (06/11/2026): perfis reprodutíveis, diferentes entre si e dentro dos limites.
import { describe, it, expect } from 'vitest'
import { NARRATIVA, instrucoesDeNarrativa, tomDoJulgador, instrucoesDoJulgador, BANCA, escolherRedator, instrucoesDoRedator, chaveArea, sortearPerfil, instrucoesDoPerfil, instrucoesDeRedacao, amostrasDoAutor, medirTexto, aderencia, distancia, gerador, hash32, ESCOLAS, REFERENCIAS, LIMITES, DISTANCIA_MINIMA, type Perfil } from './estiloPecas'
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

describe('rotação em todos os agentes', () => {
  it('instruções curtas mudam só a redação e mantêm estrutura e números', () => {
    const t = instrucoesDeRedacao(sortearPerfil({ semente: 5 }))
    expect(t).toContain('REDAÇÃO DESTA RESPOSTA')
    expect(t).toContain('mantenha a estrutura, os números')
    expect(t).not.toContain('FORMATAÇÃO')
  })
  it('amostras do autor respeitam o limite de caracteres', () => {
    const a = amostrasDoAutor([{ titulo: 'A', texto: 'x'.repeat(10000) }, { titulo: 'B', texto: 'y'.repeat(10000) }, { titulo: 'C', texto: 'z' }], 15000)
    expect(a).toHaveLength(2)
    expect(a.join('').replace(/### [AB]\n/g, '')).toHaveLength(15000)
  })
})

describe('banca de redatores', () => {
  it('tem catorze redatores, sem repetir, cada um ligado a uma escola e a uma referência conhecidas', () => {
    expect(BANCA).toHaveLength(14)
    expect(new Set(BANCA.map(b => b.id)).size).toBe(14)
    const escolas = new Set(ESCOLAS.map(e => e.id))
    for (const b of BANCA) {
      expect(escolas.has(b.escola)).toBe(true)
      expect(REFERENCIAS.some(r => r.nome === b.referencia && r.escola === b.escola)).toBe(true)
      expect(b.metodo.length).toBeGreaterThan(60)
    }
  })

  it('entende a área como está gravada no processo', () => {
    expect(chaveArea('Cível')).toBe('civel')
    expect(chaveArea('Família e sucessões')).toBe('familia')
    expect(chaveArea('Imobiliário')).toBe('imobiliario')
    expect(chaveArea('Tributário')).toBe('tributario')
    expect(chaveArea(null)).toBe('')
  })

  it('escolhe pela área e pelo tipo da peça', () => {
    expect(escolherRedator({ area: 'Tributário', titulo: 'EXECUÇÃO FISCAL' }).id).toBe('barros-carvalho')
    expect(escolherRedator({ area: 'Imobiliário', titulo: 'AÇÃO DE DESPEJO' }).id).toBe('capanema')
    expect(escolherRedator({ area: 'Família e sucessões', titulo: 'INVENTÁRIO E PARTILHA' }).id).toBe('pontes-de-miranda')
    expect(escolherRedator({ area: 'Consumidor', titulo: 'Responder à contestação (réplica)' }).id).toBe('nancy-andrighi')
    expect(escolherRedator({ area: 'Cível', titulo: 'Responder ao recurso da outra parte (contrarrazões)' }).id).toBe('barbosa-moreira')
  })

  it('cada setor tem o seu redator titular, que é a primeira escolha', () => {
    const titulares: Record<string, string> = { 'Cível': 'tepedino', 'Constitucional': 'barroso', 'Trabalhista': 'godinho-delgado', 'Penal': 'evandro-lins', 'Tributário': 'barros-carvalho', 'Consumidor': 'lima-marques', 'Empresarial': 'ulhoa-coelho', 'Imobiliário': 'capanema', 'Família e sucessões': 'pontes-de-miranda' }
    for (const [area, id] of Object.entries(titulares)) {
      for (const semente of [1, 7, 42, 2026]) expect(escolherRedator({ area, titulo: 'Manifestação', semente }).id).toBe(id)
      // o rodízio só vale onde há outro redator do mesmo setor à altura
      if (['Cível', 'Constitucional', 'Trabalhista', 'Consumidor'].includes(area)) expect(escolherRedator({ area, titulo: 'Manifestação', anteriores: [id] }).id).not.toBe(id)
    }
  })

  it('faz rodízio: quem escreveu a última peça da mesma área cede a vez quando há outro à altura', () => {
    const primeiro = escolherRedator({ area: 'Cível', titulo: 'Manifestação' })
    const segundo = escolherRedator({ area: 'Cível', titulo: 'Manifestação', anteriores: [primeiro.id] })
    expect(segundo.id).not.toBe(primeiro.id)
  })

  it('as instruções nomeiam a tradição e proíbem atribuir o texto ao jurista', () => {
    const t = instrucoesDoRedator(BANCA[0]!)
    expect(t).toContain('Rui Barbosa')
    expect(t).toMatch(/não lhe atribua frases/)
    expect(t).toMatch(/Mantenha as forças dessa tradição: força do argumento/)
    expect(t).toMatch(/proibido reproduzir as fraquezas dela: prolixidade/)
    expect(BANCA.every(b => b.forcas.length > 20 && b.evitar.length > 20)).toBe(true)
  })

  it('o perfil sorteado puxa para a escola do redator', () => {
    let dominante = 0
    for (let i = 1; i <= 40; i++) if (sortearPerfil({ semente: i, escolas: ['imobiliaria'] }).mistura.some(m => m.id === 'imobiliaria')) dominante++
    expect(dominante).toBeGreaterThan(28)
  })
})

describe('narrativa e tom do julgador', () => {
  it('tem dez técnicas de narrativa e proíbe criar fato', () => {
    expect(NARRATIVA).toHaveLength(10)
    expect(instrucoesDeNarrativa()).toMatch(/10\. Fecho pela consequência/)
    expect(instrucoesDeNarrativa()).toMatch(/nunca cria fato/)
  })
  it('com pouco texto do julgador não conclui nada e fica sóbrio, sem humor', () => {
    const tom = tomDoJulgador(['Digam as partes em 5 dias.'])
    expect(tom.suficiente).toBe(false)
    expect(instrucoesDoJulgador(tom, '2ª Vara Cível')).toMatch(/tom sóbrio, direto e respeitoso, sem humor/)
  })
  it('julgador técnico e conciso pede peça direta e ancorada em norma; tom sério não admite leveza', () => {
    const tom = tomDoJulgador(['Indefiro o pedido. Aplica-se o art. 373 do CPC e a Súmula 7 do STJ. O precedente do Tema 1076 resolve a questão. Sob pena de preclusão, junte o autor o documento. '.repeat(8)])
    expect(tom.suficiente).toBe(true)
    expect(tom.extensao).toBe('conciso')
    expect(tom.tracos).toEqual(expect.arrayContaining(['tecnico', 'rigoroso']))
    const t = instrucoesDoJulgador(tom, null)
    expect(t).toMatch(/vá direto ao ponto/)
    expect(t).toMatch(/tom sério: nenhuma leveza/)
    expect(t).toMatch(/nunca piada/)
  })
  it('julgador de escrita leve admite uma única imagem, sem ironia contra pessoa', () => {
    const tom = tomDoJulgador(['Ora, convenhamos, a tese do réu é curiosa! Diga-se de passagem, como diria o poeta, o tempo não para, e o prazo também não. A dignidade da família pede sensibilidade neste drama. '.repeat(8)])
    expect(tom.tracos).toEqual(expect.arrayContaining(['leve', 'humanista']))
    expect(instrucoesDoJulgador(tom, null)).toMatch(/no máximo uma vez/)
  })
})

