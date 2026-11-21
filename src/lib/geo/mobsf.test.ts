// Prova sobre o AVALIADOR do boletim do MobSF (scripts/geo/avaliar-mobsf.mjs).
//
// POR QUE ESTA PROVA EXISTE: aquele script decide se a obra para ou segue, e até agora não
// tinha prova nenhuma em cima dele. Uma lista de achados "esperados" ou "julgados" é
// exatamente o tipo de código que, escrito largo demais, passa a engolir achado novo sem
// ninguém notar — e aí a obra fica verde porque o juiz ficou cego, não porque o pacote está bom.
//
// Os textos dos achados abaixo são COPIADOS das duas rodadas de verdade do MobSF sobre o APK
// (21/11/2026): a primeira, com minSdk=23, e a segunda, depois do conserto, com minSdk=24.
// Não são textos inventados.
import { describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const DEPURACAO = [
  { title: 'Application signed with debug certificate' },
  { title: 'Debug Enabled For App [android:debuggable=true]' },
]

const MINSDK = (v: 23 | 24) => ({
  title: `App can be installed on a vulnerable unpatched Android version ${v === 23 ? '6.0-6.0.1' : '7.0'}, [minSdk=${v}]`,
})

const AVISOS = [
  { title: 'App can read/write to External Storage. Any App can read data written to External Storage.' },
  { title: 'Files may contain hardcoded sensitive information like usernames, passwords, keys etc.' },
]

/** O que o execFileSync joga quando o processo sai com código diferente de zero. */
type Falha = { status?: number; stdout?: string; stderr?: string }
const falha = (e: unknown) => e as Falha

/** Roda o avaliador sobre um boletim e devolve o código de saída e o que ele escreveu. */
const avaliar = (boletim: unknown) => {
  const dir = mkdtempSync(join(tmpdir(), 'mobsf-'))
  const caminho = join(dir, 'boletim.json')
  writeFileSync(caminho, JSON.stringify(boletim))
  try {
    const saida = execFileSync('node', ['scripts/geo/avaliar-mobsf.mjs', caminho], {
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    return { codigo: 0, saida }
  } catch (e) {
    const f = falha(e)
    return { codigo: f.status ?? 1, saida: `${f.stdout ?? ''}${f.stderr ?? ''}` }
  }
}

describe('o avaliador do boletim do MobSF', () => {
  it('passa na rodada de verdade de hoje: os dois graves da depuração e o minSdk=24 julgado', () => {
    const r = avaliar({ security_score: 58, high: [...DEPURACAO, MINSDK(24)], warning: AVISOS })
    expect(r.codigo).toBe(0)
    expect(r.saida).toContain('nota de segurança 58')
    // o julgado precisa aparecer COM o motivo, e não desaparecer da leitura
    expect(r.saida).toContain('Graves JULGADOS')
    expect(r.saida).toContain('a promessa vale')
  })

  it('PARA se a versão mínima voltar para 23, mesmo sendo a mesma regra do MobSF', () => {
    // Este é o ponto da prova: o motivo escrito vale para o valor 24, não para a classe do
    // achado. Em 23 o android:networkSecurityConfig é ignorado e a nossa promessa de nenhuma
    // conexão em texto claro deixa de valer, então a obra tem de parar outra vez.
    const r = avaliar({ security_score: 57, high: [...DEPURACAO, MINSDK(23)], warning: AVISOS })
    expect(r.codigo).toBe(1)
    expect(r.saida).toContain('GRAVES NÃO PREVISTOS')
    expect(r.saida).toContain('minSdk=23')
  })

  it('para diante de um grave que ninguém julgou', () => {
    const r = avaliar({
      security_score: 40,
      high: [...DEPURACAO, { title: 'Clipboard listener detected, this app copies data' }],
    })
    expect(r.codigo).toBe(1)
    expect(r.saida).toContain('Clipboard listener')
  })

  it('não confunde um aviso com um grave: aviso não para a obra', () => {
    const r = avaliar({ security_score: 70, high: DEPURACAO, warning: AVISOS })
    expect(r.codigo).toBe(0)
    expect(r.saida).toContain('External Storage')
  })

  it('para se o boletim não existir ou não for JSON', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mobsf-'))
    const ruim = join(dir, 'boletim.json')
    writeFileSync(ruim, 'isto nao e json')
    let codigo = 0
    try {
      execFileSync('node', ['scripts/geo/avaliar-mobsf.mjs', ruim], { stdio: 'pipe' })
    } catch (e) {
      codigo = falha(e).status ?? 1
    }
    expect(codigo).toBe(1)

    let semArquivo = 0
    try {
      execFileSync('node', ['scripts/geo/avaliar-mobsf.mjs', join(dir, 'nao-existe.json')], { stdio: 'pipe' })
    } catch (e) {
      semArquivo = falha(e).status ?? 1
    }
    expect(semArquivo).toBe(1)
  })
})
