// Gera supabase/functions/_compartilhado/juridico.js: as regras de prazo (códigos de cada ramo, feriados,
// leitura das intimações) e a formatação das peças, as MESMAS usadas nas telas, num arquivo só para as Edge Functions.
// Assim o robô do servidor e a tela calculam o prazo exatamente do mesmo jeito.
// Rodar depois de mexer em src/lib/prazos*, src/lib/escritorio/lerIntimacao.ts, estiloPecas.ts ou formatarPeca.ts:
//   node scripts/gerar-juridico-funcoes.mjs
// O teste src/lib/escritorio/juridicoFuncoes.test.ts falha se o arquivo estiver desatualizado.
import { build } from 'esbuild'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const DESTINO = path.join(raiz, 'supabase/functions/_compartilhado/juridico.js')

const aliasArroba = {
  name: 'arroba',
  setup(b) {
    b.onResolve({ filter: /^@\// }, a => {
      const base = path.join(raiz, 'src', a.path.slice(2))
      for (const c of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), base]) if (fs.existsSync(c) && fs.statSync(c).isFile()) return { path: c }
      return { errors: [{ text: `não achei ${a.path}` }] }
    })
  },
}

export async function gerar() {
  const r = await build({
    stdin: {
      contents: [
        "export * from '@/lib/escritorio/lerIntimacao'",
        "export { ATOS_POR_CODIGO, CODIGOS, calcularPrazoPorCodigo, rotuloPrazo } from '@/lib/prazos/codigos'",
        "export { pecaEmHtml, formatacaoFinal, FORMATOS, sortearFormato } from '@/lib/formatarPeca'",
        "export { sortearPerfil, instrucoesDoPerfil, instrucoesDeRedacao, amostrasDoAutor, hash32, medirTexto, aderencia, BANCA, escolherRedator, instrucoesDoRedator, chaveArea } from '@/lib/estiloPecas'",
        "export { br, somarDias, diasEntre } from '@/lib/ferramentas/base'",
      ].join('\n'),
      resolveDir: raiz, loader: 'ts', sourcefile: 'juridico-entrada.ts',
    },
    bundle: true, format: 'esm', platform: 'neutral', target: 'es2022', write: false, plugins: [aliasArroba], legalComments: 'none', charset: 'utf8',
  })
  const cabecalho = '// ARQUIVO GERADO por scripts/gerar-juridico-funcoes.mjs a partir de src/lib. Não edite à mão.\n// @ts-nocheck\n'
  return cabecalho + r.outputFiles[0].text
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  fs.writeFileSync(DESTINO, await gerar())
  console.log('gerado', path.relative(raiz, DESTINO), fs.statSync(DESTINO).size, 'bytes')
}
