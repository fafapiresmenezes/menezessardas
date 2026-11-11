// O robô do servidor usa as mesmas regras de prazo das telas: o arquivo gerado tem de estar em dia com src/lib.
import { it, expect } from 'vitest'
import fs from 'node:fs'
// @ts-expect-error script em JavaScript, sem tipos
import { gerar, DESTINO } from '../../../scripts/gerar-juridico-funcoes.mjs'

it('supabase/functions/_compartilhado/juridico.js está atualizado (rode node scripts/gerar-juridico-funcoes.mjs)', async () => {
  expect(fs.readFileSync(DESTINO, 'utf8')).toBe(await gerar())
})

it('o arquivo gerado calcula o mesmo prazo que a tela', async () => {
  // @ts-expect-error arquivo gerado em JavaScript, sem tipos
  const j = await import('../../../supabase/functions/_compartilhado/juridico.js')
  const tela = await import('./lerIntimacao')
  const pub = { id: '1', data: '2026-11-03', tribunal: 'TJRJ', orgao: '5ª Vara Cível', tipo: 'Intimação', documento: 'Despacho', classe: null, numero: '0036229-32.2016.8.19.0021', texto: 'Ao apelado para contrarrazões ao recurso de apelação.', link: null, partes: [], advogados: [] }
  expect(j.lerIntimacao(pub, '2026-11-11').vence).toBe(tela.lerIntimacao(pub, '2026-11-11').vence)
  expect(j.pecaEmHtml('I – DOS FATOS\n\nTexto.', 'Peça')).toContain('<h2>I – DOS FATOS</h2>')
})
