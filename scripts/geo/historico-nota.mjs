// R11: gera src/data/geo/nota-historico.json a partir do GIT, não da nossa memória.
// Cada registro é o estado real de src/data/geo/nota.ts no commit em que o elo foi entregue.
// Assim o gráfico de evolução do painel /geo/nota não pode mentir: se alguém mudar a história,
// basta rodar este script de novo e comparar.
// Uso: node scripts/geo/historico-nota.mjs [--conferir]
import { execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

// Os commits em que cada elo entregou sua mudança na régua. Um elo que não mexeu na régua
// (R7, R8) aparece igual ao anterior, e isso é a verdade: aquele elo não mudou nota nenhuma.
const ELOS = [
  ['R1', '1a832a2b'], ['R2', '68262008'], ['R3', '98f03d84'], ['R4', 'd49fe57c'], ['R5', 'cfa386a1'],
  ['R6', 'd1f95ed4'], ['R7', '0dcbb29f'], ['R8', '13a52f35'], ['R9', '538df38d'], ['R10', 'd0f0443a'],
  // R11 e R12 não mexeram em nota nenhuma (ligaram o CI e prepararam as lojas). R13 voltou a
  // medir a casa do geo, e não a porta do site: dim. 2 de 6 para 10, dim. 3 de 9 para 10.
  ['R13', '8e46490d'],
]
const ALVO = 'src/data/geo/nota-historico.json'

const git = (args) => execFileSync('git', args, { encoding: 'utf8' })

/** Lê as notas de um conteúdo de nota.ts. Devolve { "1": 7, ..., "8": null }. */
export function lerNotas(fonte) {
  const notas = {}
  for (const m of fonte.matchAll(/\{ n: (\d+),[\s\S]*?nota: (null|\d+)/g)) {
    notas[m[1]] = m[2] === 'null' ? null : Number(m[2])
  }
  return notas
}

const registros = ELOS.map(([elo, commit]) => ({
  elo,
  quando: git(['log', '-1', '--format=%ad', '--date=short', commit]).trim(),
  commit,
  notas: lerNotas(git(['show', `${commit}:src/data/geo/nota.ts`])),
}))

const saida = {
  _leia: 'Histórico real das notas da régua THEYE-GEO, extraído do git: cada linha é o estado de src/data/geo/nota.ts no commit do elo correspondente. Gerado por scripts/geo/historico-nota.mjs; nenhum número foi digitado à mão aqui.',
  registros,
}
const texto = JSON.stringify(saida, null, 2) + '\n'

if (process.argv.includes('--conferir')) {
  const atual = readFileSync(ALVO, 'utf8')
  if (atual !== texto) {
    console.error('nota-historico.json não corresponde ao git. Rode: node scripts/geo/historico-nota.mjs')
    process.exit(1)
  }
  console.log('histórico confere com o git:', registros.length, 'registros')
} else {
  writeFileSync(ALVO, texto)
  console.log('histórico gravado:', registros.length, 'registros')
}
