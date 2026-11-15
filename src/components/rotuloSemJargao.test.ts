// A plataforma esta vendida a um escritorio de verdade, e M pediu em 12/11/2026 que a interface
// fosse autoexplicativa. A regra que este teste tranca e' estreita e de proposito:
//
//   um ROTULO CURTO (ate 40 caracteres: titulo de tela, cabecalho de tabela, texto de botao)
//   nao pode trazer um termo tecnico solto. O termo pode aparecer, mas entre parenteses e
//   depois de pelo menos duas palavras em portugues que digam o que aquilo e'.
//
// Ou seja "Checagem cadastral (KYC)" passa e "KYC" nao; "Prova de data (.ots)" passa e
// "prova .ots" nao. A ideia e' que um advogado leia o rotulo e saiba o que o botao faz, sem
// ninguem ao lado explicando, e que o auditor continue achando o nome tecnico exato.
//
// O que este teste NAO julga, e e' bom dizer em voz alta:
// - frase longa: ela tem espaco para explicar o termo, e varias explicam. Verificar se a
//   explicacao e' boa exige ler, nao contar caracteres;
// - se a palavra escolhida e' a melhor em portugues juridico. "Checagem cadastral" pode nao ser
//   o termo que o escritorio usa; quem decide isso e' o escritorio;
// - texto dentro de <code>, que e' nome de campo de arquivo e nao rotulo (a tela /lastro ensina
//   a conferir a corrente a mao e precisa dizer "hash" com essas letras);
// - texto marcado com lang="en", que cita de proposito o menu em ingles de outro site (o Brevo).
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const PASTAS = ['src/pages', 'src/components']

// M pediu de novo em 13/11/2026, 22h22: "sempre use linguagem para dummies em tudo". Por isso a
// lista cresceu (segunda metade) e a rede passou a olhar tambem o texto das DICAS que aparecem ao
// passar o cursor (title=) e do rotulo lido em voz alta (aria-label=) — dica escrita em jargao nao
// explica nada a quem parou o cursor justamente por nao ter entendido o botao.
const TERMOS = [
  'OKRs?', 'KPIs?', 'B2B', 'KYC', 'SLOs?', 'endpoint', 'webhook', 'payload', 'upsert', 'RLS',
  'schema', 'UUID', 'slug', 'deploy', 'rollback', 'cache', 'backlog', 'dashboard', 'pipeline',
  'JSON', 'base64', 'OAuth', 'JWT', 'CORS', 'hash', 'SHA-256', 'OpenTimestamps', '\\.ots',
  'API', '\\.jsonl',
  'token', 'cron', 'SQL', 'CSP', 'HSTS', 'DNS', 'URLs?', 'query', 'bucket', 'timestamp',
  'commit', 'branch', 'merge', 'build', 'bug', 'sprint', 'CRUD', 'parser', 'array', 'boolean',
  'request', 'response', 'middleware', 'cookies?', 'client-side', 'server-side', 'front-?end',
  'back-?end', 'storage', 'patch', 'mock', 'regex', 'CLI', 'SDK',
]
// Fronteira ciente de acento: com `\\w` (so ASCII), 'cron' casaria dentro de 'cronometro'.
const BORDA = '[\\p{L}\\p{N}_-]'
const JARGAO = new RegExp(`(?<!${BORDA})(${TERMOS.join('|')})(?!${BORDA})`, 'u')

const arquivos = () =>
  PASTAS.flatMap(d =>
    readdirSync(d).filter(f => f.endsWith('.tsx') && !f.includes('.test.')).map(f => join(d, f)),
  )

/** Tira do texto o que este teste nao julga: <code>…</code>, lang="en" e data-citacao. */
// data-citacao marca palavra copiada da tela de OUTRA empresa, que o passo a passo manda o usuario
// achar e clicar. Traduzir essa palavra atrapalha: a pessoa procura na tela do Escavador um botao
// que lá nao se chama assim. A explicacao vai na frase em volta, nao no nome do botao alheio.
const semIsentos = (s: string) =>
  s.replace(/<code[\s>][\s\S]*?<\/code>/g, '<code/>')
    .replace(/<(\w+)[^>]*lang="en"[^>]*>[\s\S]*?<\/\1>/g, '<x/>')
    .replace(/<(\w+)[^>]*data-citacao="[^"]*"[^>]*>[\s\S]*?<\/\1>/g, '<x/>')

/** Rotulos curtos: nos de texto JSX que nao sao codigo, mais as dicas de title= e aria-label=. */
function rotulos(s: string): { linha: number; texto: string }[] {
  const fora: { linha: number; texto: string }[] = []
  const limpo = semIsentos(s)
  for (const m of limpo.matchAll(/>\s*([^<>{}\n][^<>{}]*?)\s*</g)) {
    const texto = m[1].replace(/\s+/g, ' ').trim()
    if (texto.length < 3 || texto.length > 40) continue
    if (/(useState|Promise|Date\.|=>|const |function |import )/.test(texto)) continue
    fora.push({ linha: limpo.slice(0, m.index).split('\n').length, texto })
  }
  // A dica ao passar o cursor e o rotulo lido em voz alta valem como rotulo, e nao tem limite de 40
  // caracteres: a dica existe para explicar, e uma dica longa ainda precisa ser em portugues claro.
  for (const m of limpo.matchAll(/(?:title|aria-label)="([^"{}]{3,200})"/g)) {
    const texto = m[1].replace(/\s+/g, ' ').trim()
    fora.push({ linha: limpo.slice(0, m.index).split('\n').length, texto })
  }
  return fora
}

/** O termo esta explicado quando vem entre parenteses depois de >= 2 palavras. */
function explicado(texto: string): boolean {
  const m = texto.match(JARGAO)
  if (!m) return true
  const antes = texto.slice(0, m.index)
  const dentroDeParenteses = /\([^)]*$/.test(antes)
  const palavras = antes.replace(/[(].*$/, '').trim().split(/\s+/).filter(p => /\p{L}{2,}/u.test(p))
  return dentroDeParenteses && palavras.length >= 2
}

describe('rotulo curto nao fala em jargao sem explicar', () => {
  it('nenhum titulo, cabecalho ou botao traz termo tecnico solto', () => {
    const ruins: string[] = []
    for (const p of arquivos())
      for (const { linha, texto } of rotulos(readFileSync(p, 'utf8')))
        if (!explicado(texto)) ruins.push(`${p}:${linha} ${JSON.stringify(texto)}`)
    expect(ruins, `Escreva o que e' em portugues e deixe o termo entre parenteses:\n${ruins.join('\n')}`).toEqual([])
  })

  it('a rede pega de verdade um rotulo solto, e aceita o mesmo termo explicado', () => {
    expect(explicado('KYC')).toBe(false)
    expect(explicado('prova .ots')).toBe(false)
    expect(explicado('Checagem cadastral (KYC)')).toBe(true)
    expect(explicado('Prova de data (.ots)')).toBe(true)
    expect(explicado('Prazos de hoje')).toBe(true)
  })

  it('ainda ha rotulos curtos para julgar (a rede nao esta vazia)', () => {
    const total = arquivos().reduce((n, p) => n + rotulos(readFileSync(p, 'utf8')).length, 0)
    expect(total).toBeGreaterThan(300)
  })
})
