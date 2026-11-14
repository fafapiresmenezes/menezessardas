// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { render, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// Por que este teste existe: na noite de 12 para 13/11/2026 um defeito que trancava a porta da
// plataforma passou por 1373 testes sem ser visto. Ele só apareceu quando o pacote de produção foi
// aberto num navegador de verdade. O motivo é simples: quase todo teste daqui olha uma peça, uma
// conta ou um pedaço de tela, e nenhum montava a tela inteira do jeito que o App a monta.
//
// Este teste faz a coisa mais tosca e mais útil que existe: pega a lista de telas DO PRÓPRIO App.tsx
// e manda montar cada uma. Não confere o que a tela diz, nem se está bonita. Confere que ela sobe
// sem estourar e sem ficar em branco. É a rede que pega o erro de digitação, a propriedade lida de
// um objeto que ainda não chegou, o `item.nome` que não existe mais — a classe de defeito que não
// aparece no tsc nem num teste de unidade, e que na tela aparece como um retângulo vazio.
//
// O banco é falso: um objeto que responde a qualquer encadeamento (.from().select().eq()...) e, ao
// ser esperado, devolve lista vazia. Toda tela é, portanto, montada no pior caso: sem dado nenhum.
// Tela que só funciona quando o banco responde é tela que vai quebrar na primeira falha de rede.

function bancoFalso(): any {
  const alvo: any = function () { return bancoFalso() }
  return new Proxy(alvo, {
    get(_t, p) {
      if (p === 'then') return (ok: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(ok)
      if (p === Symbol.toPrimitive || p === Symbol.toStringTag) return () => ''
      return bancoFalso()
    },
    apply() { return bancoFalso() },
  })
}

vi.mock('@/lib/supabase', () => ({ supabaseConfigurado: true, supabase: bancoFalso() }))

/** As telas que o App abre, lidas do próprio App.tsx: ninguém precisa manter uma segunda lista. */
function telasDoApp(): string[] {
  const app = readFileSync('src/App.tsx', 'utf8')
  const nomes = new Set<string>()
  for (const m of app.matchAll(/import\('@\/pages\/([^']+)'\)/g)) nomes.add(m[1])
  for (const m of app.matchAll(/^import \w+ from '@\/pages\/([^']+)'/gm)) nomes.add(m[1])
  return [...nomes].sort()
}

const TELAS = telasDoApp()

describe('toda tela do App monta sem estourar e sem ficar em branco', () => {
  afterEach(() => cleanup())

  it('o App abre pelo menos cinquenta telas (se este número cair, alguém apagou rota sem querer)', () => {
    expect(TELAS.length).toBeGreaterThanOrEqual(50)
  })

  for (const tela of TELAS) {
    it(tela, async () => {
      // O React, quando uma tela estoura, não deixa o erro subir pelo `render`: ele o entrega à
      // janela. Sem escutar a janela, o teste passaria vendo a tela virar um retângulo vazio.
      const estouros: string[] = []
      const ouvinte = (e: ErrorEvent) => estouros.push(e.error?.message ?? e.message)
      window.addEventListener('error', ouvinte)
      try {
        const mod = await import(`@/pages/${tela}`)
        const Tela = mod.default as () => JSX.Element
        expect(typeof Tela, `${tela} não exporta uma tela como default`).toBe('function')
        const { container } = render(<MemoryRouter><Tela /></MemoryRouter>)
        // Espera o que a tela faz depois de montar: as buscas no banco voltando vazias.
        await new Promise(r => setTimeout(r, 0))
        expect(estouros, `${tela} estourou depois de montar`).toEqual([])
        expect(container.textContent?.trim().length ?? 0, `${tela} montou em branco`).toBeGreaterThan(0)
      } finally {
        window.removeEventListener('error', ouvinte)
      }
    })
  }
})
