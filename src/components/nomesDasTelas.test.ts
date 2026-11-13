import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { gruposMenu, BLOCOS_INICIO, DICAS, nomeDaTela } from './menuTelas'
import { ROTAS_TELAS } from '@/data/rotas'

// Passo A27 — o teste que impede a volta da desorganização.
// Cada tela tem UM nome só: o mesmo no menu, no título da própria tela e na tela de entrada.
// Se alguém renomear uma tela em um lugar e esquecer os outros, este teste falha e diz onde.

const app = readFileSync('src/App.tsx', 'utf8')

/** A tela de entrada não usa a moldura (Layout): ela é a própria entrada, com a marca no alto. */
const SEM_MOLDURA = ['/inicio']

/** rota -> arquivo da tela, lido do App.tsx (é ele quem decide qual tela abre em cada endereço). */
function arquivoDaRota(rota: string): string {
  const re = new RegExp(`path="${rota.replace(/[/]/g, '\\/')}"[\\s\\S]{0,240}?<([A-ZÀ-Ý][\\wÀ-ÿ]+)\\s*/>`)
  const comp = app.match(re)?.[1]
  expect(comp, `o endereço ${rota} não está no App.tsx`).toBeTruthy()
  // `const ` e `^` importam: sem eles, o nome de um componente que TERMINA com o nome de outro
  // (PortalInstitutoPage e InstitutoPage) casa com a linha errada e o teste passa a ler o arquivo
  // de outra tela. Aconteceu em 13/11/2026, quando as páginas das portas do Instituto entraram.
  const imp = app.match(new RegExp(`^const ${comp}\\s*=\\s*lazy\\(\\(\\) => import\\('@/pages/([^']+)'\\)`, 'm'))
    ?? app.match(new RegExp(`^import ${comp} from '@/pages/([^']+)'`, 'm'))
  expect(imp, `a tela ${comp} (${rota}) não é importada de @/pages`).toBeTruthy()
  return `src/pages/${imp![1]}.tsx`
}

const tituloNaTela = (rota: string) => readFileSync(arquivoDaRota(rota), 'utf8')

describe('o nome de cada tela (menu, título da tela e tela de entrada)', () => {
  it('toda tela do menu mostra, no seu título, exatamente o nome que o menu dá a ela', () => {
    for (const grupo of gruposMenu) {
      for (const tela of grupo.itens) {
        if (SEM_MOLDURA.includes(tela.href)) continue
        expect(tituloNaTela(tela.href), `${tela.href} (menu: "${tela.label}")`).toContain(`<Layout title="${tela.label}">`)
      }
    }
  })

  it('as telas internas, abertas de dentro de outra tela, também mostram o nome da lista de telas', () => {
    const doMenu = new Set(gruposMenu.flatMap(g => g.itens.map(i => i.href)))
    const internas = ROTAS_TELAS.filter(r => !doMenu.has(r.rota))
    expect(internas.length).toBeGreaterThan(0)
    for (const { rota, nome } of internas) {
      expect(tituloNaTela(rota), `${rota} ("${nome}")`).toContain(`title="${nome}"`)
    }
  })

  it('a tela de entrada usa os quatro blocos do menu e o mesmo nome de tela em cada atalho', () => {
    const quatro = gruposMenu.filter(g => /^\d\. /.test(g.titulo))
    expect(quatro.map(g => g.bloco)).toEqual(['Todo dia', 'Processos', 'Escrever peças', 'Escritório'])
    expect(BLOCOS_INICIO.map(b => b.titulo)).toEqual(quatro.map(g => g.bloco))
    expect(BLOCOS_INICIO.map(b => b.dica)).toEqual(quatro.map(g => g.dica))
    quatro.forEach((g, i) => expect(g.titulo).toBe(`${i + 1}. ${g.bloco}`))
    for (const bloco of BLOCOS_INICIO) {
      expect(bloco.itens.length, bloco.titulo).toBeGreaterThan(0)
      for (const atalho of bloco.itens) {
        expect(nomeDaTela(atalho.destino), `${atalho.destino} não está no menu`).toBeTruthy()
        expect(atalho.titulo, atalho.destino).toBe(nomeDaTela(atalho.destino))
        // o atalho da entrada tem de estar no mesmo bloco em que o menu põe a tela
        const grupo = gruposMenu.find(g => g.itens.some(i => i.href === atalho.destino))!
        expect(grupo.bloco, atalho.destino).toBe(bloco.titulo)
      }
    }
  })

  it('a busca, a lista de telas e a escolha da tela inicial usam o mesmo nome do menu', () => {
    for (const { rota, nome } of ROTAS_TELAS) {
      const doMenu = nomeDaTela(rota)
      if (doMenu) expect(nome, rota).toBe(doMenu)
      expect(nome.length, rota).toBeGreaterThan(2)
    }
    expect(new Set(ROTAS_TELAS.map(r => r.nome)).size).toBe(ROTAS_TELAS.length)
    // nenhuma tela do menu fica fora da lista de telas (busca global, "Testar telas" e tela inicial)
    for (const tela of gruposMenu.flatMap(g => g.itens)) expect(ROTAS_TELAS.some(r => r.rota === tela.href), tela.href).toBe(true)
  })

  it('cada tela aparece em um lugar só do menu, com nome próprio e dica em português claro', () => {
    const telas = gruposMenu.flatMap(g => g.itens)
    expect(new Set(telas.map(t => t.href)).size, 'a mesma tela está em dois lugares do menu').toBe(telas.length)
    expect(new Set(telas.map(t => t.label)).size, 'duas telas com o mesmo nome').toBe(telas.length)
    for (const t of telas) expect((DICAS[t.href] ?? '').length, t.href).toBeGreaterThan(15)
  })
})
