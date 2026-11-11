import { it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { xlsxParaTexto } from './lerXlsx'
import { analisarPlanilha } from './importarProcessos'

const b64 = fs.readFileSync(path.resolve(__dirname, '../../test/fixtures/planilha-caio.xlsx.b64'), 'utf8')
const buf = Uint8Array.from(Buffer.from(b64, 'base64')).buffer

it('lê a primeira aba do Excel como texto em colunas e o importador entende', async () => {
  const t = await xlsxParaTexto(buf)
  const linhas = t.split('\n')
  expect(linhas).toHaveLength(3)
  expect(linhas[1].split('\t')).toEqual(['0036229-32.2016.8.19.0021', 'Maria & Filhos <Ltda>', 'Banco X', 'Despejo', '5ª Vara Cível', 'Resumo com Tab', 'CAIO BARROS'])
  const r = analisarPlanilha(t)
  expect(r.linhas).toHaveLength(2)
  expect(r.linhas[0].dados.cliente).toBe('Maria & Filhos <Ltda>')
})

it('recusa arquivo que não é planilha', async () => {
  await expect(xlsxParaTexto(new TextEncoder().encode('não sou zip').buffer)).rejects.toThrow(/não parece ser uma planilha/)
})
