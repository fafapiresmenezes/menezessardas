// A14 + A41 do plano mestre THEYE: nenhuma função do servidor pode escrever o endereço antigo do
// site (gmenezes-advogados.vercel.app) nem a marca antiga "Value Pas" no corpo de um e-mail.
// Este teste varre todas as funções e falha se o nome velho voltar a aparecer. Exceção consciente:
// os identificadores de evento de calendário (UID ...@gmenezes-advogados / @gmenezes-contratos /
// @menezes-sardas) são opacos e nunca aparecem para ninguém; trocá-los duplicaria compromissos já
// no Outlook das pessoas, então ficam como estão.
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'

const RAIZ = 'supabase/functions'
const PROIBIDO_URL = /gmenezes-advogados\.vercel\.app/
const PROIBIDO_MARCA = /Value ?Pas/

function fontes(): { arquivo: string; texto: string }[] {
  const out: { arquivo: string; texto: string }[] = []
  for (const dir of readdirSync(RAIZ)) {
    if (dir.startsWith('_')) continue
    const caminho = `${RAIZ}/${dir}/index.ts`
    try { if (statSync(caminho).isFile()) out.push({ arquivo: caminho, texto: readFileSync(caminho, 'utf8') }) } catch { /* função sem index.ts */ }
  }
  return out
}

describe('endereço e marca antigos nas funções', () => {
  it('nenhuma função escreve o endereço antigo do site', () => {
    const culpadas = fontes().filter(f => PROIBIDO_URL.test(f.texto)).map(f => f.arquivo)
    expect(culpadas).toEqual([])
  })
  it('nenhuma função escreve a marca antiga "Value Pas"', () => {
    const culpadas = fontes().filter(f => PROIBIDO_MARCA.test(f.texto)).map(f => f.arquivo)
    expect(culpadas).toEqual([])
  })
})
