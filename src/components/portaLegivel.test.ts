import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { VERTENTES } from '@/data/vertentes'
import { DICIONARIOS } from '@/lib/i18n'
import { destinoSeguro, entradaPara, DESTINO_PADRAO } from '@/lib/destino'

/**
 * M, em 13/11/2026 às 22:47: "os produtos estão aparecendo em cinza e não dá para ler. É cinza com
 * letra branca, cinza com letra branca, cinza com letra branca."
 *
 * A causa foram três hábitos de escrita, e este teste proíbe os três nos arquivos da porta:
 *  1. letra branca com transparência (`text-white/60`): sobre preto vira cinza, e sobre o quadro
 *     cinza do modo escuro some;
 *  2. letra menor que 12 px (`text-[10px]`, `text-[11px]`);
 *  3. `bg-white` e `text-white` soltos: o modo escuro da plataforma repinta `bg-white` de cinza
 *     escuro, e o botão branco de letra preta virava cinza de letra preta.
 *
 * A medição de verdade, cor por cor, é feita no navegador antes de publicar (auditoria de contraste
 * com a régua WCAG AA). Este teste é a tranca barata que roda sempre.
 */
const ARQUIVOS = [
  'src/components/Produtos.tsx',
  'src/components/Vertentes.tsx',
  'src/components/Doacoes.tsx',
  'src/components/SeletorIdioma.tsx',
  'src/pages/BoasVindasPage.tsx',
]

// O atalho do Stokasticos fica de fora: é discreto de propósito e está parado por ordem de M.
const semStokasticos = (txt: string) => txt.replace(/<Link\s+to="\/stokasticos"[\s\S]*?<\/Link>/g, '')
const semComentarios = (txt: string) => txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
const ler = (arq: string) => semComentarios(semStokasticos(readFileSync(join(process.cwd(), arq), 'utf-8')))

describe('a porta do Instituto dá para ler', () => {
  for (const arq of ARQUIVOS) {
    it(`${arq}: sem letra branca transparente`, () => {
      expect(ler(arq).match(/text-white\/\d+/g) ?? []).toEqual([])
    })
    it(`${arq}: sem letra menor que 12 px`, () => {
      expect(ler(arq).match(/text-\[(?:[0-9]|1[01])px\]/g) ?? []).toEqual([])
    })
    it(`${arq}: sem bg-white, que o modo escuro repinta de cinza`, () => {
      expect(ler(arq).match(/(?<![\w-])(?:hover:)?bg-white(?![\w/-])/g) ?? []).toEqual([])
    })
  }

  it('a folha de estilo mantém a porta preta com letra clara nos dois modos', () => {
    const css = readFileSync(join(process.cwd(), 'src/index.css'), 'utf-8')
    expect(css).toContain('.porta, .porta h1, .porta h2, .porta h3 { color: #FFFFFF; }')
    expect(css).toContain('.dark section.porta, .dark .porta section { background: transparent;')
  })
})

describe('cada quadradinho leva à sua própria tela', () => {
  it('toda vertente tem endereço próprio, e nenhum se repete', () => {
    const rotas = VERTENTES.map(v => v.rota)
    expect(new Set(rotas).size).toBe(rotas.length)
    for (const r of rotas) expect(r).toMatch(/^\/[a-z-]+$/)
  })

  it('só a plataforma jurídica cai na tela de início', () => {
    expect(VERTENTES.filter(v => v.rota === DESTINO_PADRAO).map(v => v.id)).toEqual(['direito'])
  })

  it('o quadradinho manda para a entrada lembrando o destino', () => {
    expect(entradaPara('/engenharia')).toBe('/login?ir=%2Fengenharia')
    expect(entradaPara('/inicio')).toBe('/login')
  })

  it('destino que não está na lista é ignorado, para ninguém usar a nossa entrada como desvio', () => {
    expect(destinoSeguro('/engenharia')).toBe('/engenharia')
    expect(destinoSeguro('https://exemplo.com')).toBe(DESTINO_PADRAO)
    expect(destinoSeguro('//exemplo.com')).toBe(DESTINO_PADRAO)
    expect(destinoSeguro('/settings')).toBe(DESTINO_PADRAO)
    expect(destinoSeguro(null)).toBe(DESTINO_PADRAO)
  })

  it('cada quadradinho diz três coisas que tem dentro, nas quatro línguas', () => {
    for (const [lingua, dic] of Object.entries(DICIONARIOS)) {
      for (const v of VERTENTES) {
        const itens = (dic as Record<string, string>)[`vertente.${v.id}.dentro`].split(' | ')
        expect(itens, `${lingua} ${v.id}`).toHaveLength(3)
        for (const i of itens) expect(i.length, `${lingua} ${v.id}`).toBeGreaterThan(3)
      }
    }
  })
})
