// R11: mede as dimensões que a máquina sabe medir e CONFERE contra a régua.
// Roda no CI (.github/workflows/geo-nota.yml). Se a régua declarar uma nota diferente da
// medição, este script sai com erro e a obra fica vermelha — é o que impede a régua de mentir.
//
// Mede:
//   dim. 3 — violações do axe-core, lidas do boletim que scripts/geo/auditar-r2.mjs escreve
//   dim. 9 — fração dos arquivos de lib do geo que têm teste ao lado
//
// Uso: node scripts/geo/medir-nota.mjs [caminho-do-boletim]
import { readFileSync, writeFileSync, globSync, existsSync } from 'node:fs'
import { notaAcessibilidade, notaManutencao } from '../../src/lib/geo/medicao.ts'

const BOLETIM = process.argv[2] || process.env.BOLETIM_GEO || '/mnt/project-files/geo-replano/boletim-nota-R2.json'
const SAIDA = 'src/data/geo/medicoes-ci.json'

// --- dim. 9: cobertura das libs do geo ---------------------------------------------------
const libs = globSync('src/lib/geo/*.ts').filter(f => !f.endsWith('.test.ts'))
const comTeste = libs.filter(f => existsSync(f.replace(/\.ts$/, '.test.ts')))
const semTeste = libs.filter(f => !comTeste.includes(f)).map(f => f.split('/').pop())
const nota9 = notaManutencao(comTeste.length, libs.length)

// --- dim. 3: violações do axe ------------------------------------------------------------
let nota3 = null, valor3 = 'boletim do axe não encontrado'
if (existsSync(BOLETIM)) {
  const b = JSON.parse(readFileSync(BOLETIM, 'utf8'))
  const viol = b?.acessibilidade?.total_violacoes
  const telas = b?.acessibilidade?.por_tela?.length ?? 0
  if (Number.isFinite(viol)) {
    nota3 = notaAcessibilidade(viol)
    valor3 = `${viol} violações em ${telas} telas`
  }
}

const medicao = {
  quando: new Date().toISOString(),
  dimensoes: {
    ...(nota3 != null ? { 3: { nota: nota3, valor: valor3, como: 'axe-core nas telas da casa /geo (scripts/geo/auditar-r2.mjs)' } } : {}),
    9: {
      nota: nota9,
      valor: `${comTeste.length} de ${libs.length} arquivos de lib com teste`,
      como: 'um arquivo de teste ao lado de cada src/lib/geo/*.ts',
      sem_teste: semTeste,
    },
  },
}
writeFileSync(SAIDA, JSON.stringify(medicao, null, 2) + '\n')

// --- conferência contra a régua ----------------------------------------------------------
const fonteRegua = readFileSync('src/data/geo/nota.ts', 'utf8')
const declarada = {}
for (const m of fonteRegua.matchAll(/\{ n: (\d+),[\s\S]*?nota: (null|\d+)/g)) {
  declarada[m[1]] = m[2] === 'null' ? null : Number(m[2])
}

const problemas = []
for (const [n, m] of Object.entries(medicao.dimensoes)) {
  console.log(`dim. ${n}: medição ${m.nota} · ${m.valor}`)
  if (declarada[n] !== m.nota) problemas.push(`dimensão ${n}: a régua diz ${declarada[n] ?? 'a medir'} e a medição deu ${m.nota} (${m.valor})`)
}
if (nota3 == null) console.log('dim. 3: sem boletim do axe nesta rodada — não medida, e por isso não conferida')

if (problemas.length) {
  console.error('\nA régua divergiu da medição:')
  for (const p of problemas) console.error(' -', p)
  console.error('\nCorrija src/data/geo/nota.ts para o número medido, ou conserte o que caiu.')
  process.exit(1)
}
console.log('\nrégua confere com a medição')
