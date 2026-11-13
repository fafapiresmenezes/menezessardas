import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { gruposMenu, gruposVisiveis, atalhosDoMenu, podeVerNivel, DICAS, ATALHOS_PADRAO, type Visao } from './menuTelas'

const ninguem: Visao = { veTudo: false, admin: false, instituto: false, sede: true }
const telas = gruposMenu.flatMap(g => g.itens)

describe('mapa das telas em hierarquia', () => {
  it('toda tela do menu existe na plataforma, aparece uma vez só e tem a dica que explica para que serve', () => {
    const app = readFileSync('src/App.tsx', 'utf8')
    for (const t of telas) { expect(app, t.href).toContain(`path="${t.href}"`); expect((DICAS[t.href] ?? '').length, t.href).toBeGreaterThan(15) }
    expect(new Set(telas.map(t => t.href)).size).toBe(telas.length)
    expect(new Set(telas.map(t => t.label)).size).toBe(telas.length)
    for (const a of ATALHOS_PADRAO) expect(telas.some(t => t.href === a), a).toBe(true)
  })

  it('os quatro primeiros blocos têm o mesmo nome dos blocos da tela de entrada', () => {
    const inicio = readFileSync('src/pages/InicioPage.tsx', 'utf8')
    for (const bloco of ['Todo dia', 'Processos', 'Escrever peças', 'Escritório']) { expect(inicio).toContain(`titulo: '${bloco}'`); expect(gruposMenu.some(g => g.bloco === bloco), bloco).toBe(true) }
  })

  it('cada nível vê só o que é seu: dinheiro para sócios e gestor, pessoas para o administrador, plataforma para o Instituto', () => {
    const ids = (v: Visao) => gruposVisiveis(v).map(g => g.id)
    expect(ids(ninguem)).toEqual(['hoje', 'processos', 'pesquisa', 'imoveis', 'gestao', 'conta'])
    expect(ids({ ...ninguem, veTudo: true })).toContain('financeiro')
    expect(ids({ ...ninguem, veTudo: true })).not.toContain('admin')
    expect(ids({ ...ninguem, admin: true })).toEqual(expect.arrayContaining(['financeiro', 'admin']))
    expect(ids({ ...ninguem, admin: true })).not.toContain('instituto')
    expect(ids({ veTudo: true, admin: true, instituto: true, sede: true })).toHaveLength(gruposMenu.length)
    expect(podeVerNivel('instituto', { ...ninguem, admin: true })).toBe(false)
    // Escritório de fora da casa principal não tem imóveis, fornecedores, alertas nem a tela do Instituto.
    const fora = gruposVisiveis({ veTudo: true, admin: true, instituto: false, sede: false }).flatMap(g => g.itens.map(i => i.href))
    for (const h of ['/imoveis', '/fornecedores', '/alertas', '/instituto']) expect(fora).not.toContain(h)
    expect(fora).toContain('/administracao')
  })

  it('o menu simples respeita a escolha e a ordem da pessoa, sem repetir e sem mostrar o que ela não pode ver', () => {
    expect(atalhosDoMenu(undefined, ninguem).map(a => a.href)).toEqual(ATALHOS_PADRAO)
    expect(atalhosDoMenu([], ninguem).map(a => a.href)).toEqual(ATALHOS_PADRAO)
    const meus = atalhosDoMenu(['/equipe', '/assistente', '/assistente', '/meu-dia', '/x'], ninguem)
    expect(meus.map(a => `${a.bloco}:${a.label}`)).toEqual(['Escrever peças:Assistente', 'Todo dia:Meu dia'])
    expect(atalhosDoMenu(['/equipe', '/assistente'], { ...ninguem, admin: true }).map(a => a.href)).toEqual(['/equipe', '/assistente'])
  })
})
