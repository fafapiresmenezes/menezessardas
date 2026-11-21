// Portão de privacidade da casa do geo (dimensão 5 da régua: LGPD + MASVS-PRIVACY).
//
// POR QUE ESTE ARQUIVO EXISTE: até aqui a privacidade era provada caso a caso — um teste para o
// cofre, um para a consulta de município, um para a câmera. Cada um prova o que o autor lembrou
// de provar. O que faltava era o contrário: uma prova NEGATIVA sobre a casa inteira, que acuse
// uma saída NOVA que ninguém pensou em testar.
//
// Então aqui a varredura é sobre todos os arquivos do geo que não são de teste, e o portão é:
// nenhuma saída de rede existe fora do registro abaixo. Saída nova faz este teste falhar, e só
// passa depois de alguém escrever no registro para onde ela vai, o que leva e por quê.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { buscarCenas, municipioDe } from './fontes'

afterEach(() => vi.restoreAllMocks())

/**
 * Os arquivos do geo que vão para o navegador do titular. Teste de fora.
 *
 * A varredura é feita com readdirSync e não com fs.globSync de propósito: o globSync só existe no
 * Node 22, e o fluxo que monta o APK roda no Node 20. Um portão que não roda em todo lugar onde a
 * obra roda não é um portão.
 */
function varrer(pasta: string): string[] {
  let achados: string[] = []
  for (const item of readdirSync(pasta, { withFileTypes: true })) {
    const caminho = `${pasta}/${item.name}`
    if (item.isDirectory()) achados = achados.concat(varrer(caminho))
    else if (/\.(ts|tsx)$/.test(item.name) && !item.name.endsWith('.d.ts')) achados.push(caminho)
  }
  return achados
}

const ARQUIVOS = [
  ...varrer('src/lib/geo'),
  ...varrer('src/components/geo'),
  ...varrer('src/pages/geo'),
  'src/pages/GeolocalizacaoPage.tsx',
].filter(a => !a.includes('.test.'))

/**
 * O registro das únicas saídas permitidas. Cada linha diz o endereço, o que a consulta leva e
 * por que isso não entrega o titular. Nada mais pode sair da casa do geo.
 */
const SAIDAS_PERMITIDAS = [
  { host: 'planetarycomputer.microsoft.com', leva: 'a célula de ~1 km em volta da posição arredondada, e o limite público do município', porque: 'catálogo aberto de satélite; a caixa encaixa numa grade, nunca é centrada no ponto exato' },
  { host: 'nominatim.openstreetmap.org', leva: 'a posição arredondada a 2 casas decimais (~1 km)', porque: 'só para saber em que município o titular está' },
  { host: 'servicodados.ibge.gov.br', leva: 'o código do município, que é público', porque: 'malha e população do município; nenhuma coordenada do titular vai nesta consulta' },
  { host: 'api.gdeltproject.org', leva: 'o nome do município', porque: 'notícias do município; nenhuma coordenada vai nesta consulta' },
  { host: 'localhost', leva: 'o texto da análise, sem coordenada nenhuma', porque: 'o Ollama roda na máquina do próprio titular (endereço configurável), e provar que nenhuma coordenada entra no texto é o que ollama.test.ts faz' },
]

const PRIMITIVAS = /\bfetch\s*\(|XMLHttpRequest|\baxios\b|sendBeacon|new WebSocket|new EventSource|navigator\.geolocation\.watchPosition\s*\([^)]*https?:/

describe('portão de privacidade: nada sai da casa do geo fora do registro', () => {
  it('a varredura acha os arquivos do geo (se achar zero, o portão não está guardando nada)', () => {
    expect(ARQUIVOS.length).toBeGreaterThan(14)
  })

  it('todo endereço de fora citado no código do geo está no registro de saídas', () => {
    const forasteiros: string[] = []
    for (const arquivo of ARQUIVOS) {
      const fonte = readFileSync(arquivo, 'utf-8')
      for (const m of fonte.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)) {
        const host = m[1].toLowerCase()
        // Um endereço no código não é, por si, uma saída. Três casos de propósito ficam fora:
        // identificador de norma (o xmlns do KML), link de citação que o titular CLICA (o doi
        // de cada obra da biblioteca — abre no navegador dele, não é consulta do app) e texto
        // de documentação. Só conta como saída se a linha tiver uma primitiva de rede, ou um
        // atributo que o próprio navegador busca sozinho.
        const linha = fonte.slice(fonte.lastIndexOf('\n', m.index) + 1, fonte.indexOf('\n', m.index))
        const eSaida = PRIMITIVAS.test(linha) || /\bsrc=|\btilejson|\bbaseUrl\b/.test(linha)
        if (!eSaida) continue
        if (SAIDAS_PERMITIDAS.some(s => host === s.host || host.endsWith(`.${s.host}`))) continue
        forasteiros.push(`${arquivo}: ${host}`)
      }
    }
    expect(forasteiros).toEqual([])
  })

  it('nenhum arquivo do geo fala com o banco do Instituto', () => {
    const falando = ARQUIVOS.filter(a => /from '[^']*supabase|supabase\.(from|rpc|auth|storage)\b/.test(readFileSync(a, 'utf-8')))
    expect(falando).toEqual([])
  })

  it('nenhum arquivo do geo manda coordenada para registro de erro ou de uso', () => {
    const suspeitos = ARQUIVOS.filter(a => /Sentry|datadog|gtag\(|analytics|posthog|mixpanel/i.test(readFileSync(a, 'utf-8')))
    expect(suspeitos).toEqual([])
  })
})

describe('o que sai leva a posição arredondada, provado sobre uma coordenada de precisão cheia', () => {
  const LAT = -22.78123456789
  const LON = -43.31987654321

  it('a consulta de município não leva a coordenada exata', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ address: {} }), text: async () => '{}' }))
    vi.stubGlobal('fetch', f)
    await municipioDe(LAT, LON).catch(() => {})
    const url = String(f.mock.calls[0][0])
    expect(url).not.toContain('22.78123')
    expect(url).not.toContain('43.31987')
    expect(url).toContain('lat=-22.78')
  })

  it('a busca de cena de satélite não leva a coordenada exata, nem pelo meio da caixa', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => ({ ok: true, status: 200, json: async () => ({ features: [] }), text: async () => '{}' }))
    vi.stubGlobal('fetch', f)
    await buscarCenas(LAT, LON)
    const corpo = String((f.mock.calls[0][1] as RequestInit | undefined)!.body)
    expect(corpo).not.toContain('22.78123')
    expect(corpo).not.toContain('43.31987')

    // E o ponto médio da caixa: é ele que entregaria a posição se a caixa fosse centrada no
    // ponto exato. Tem de cair na grade de 0,01 grau, não na coordenada do titular.
    const [oeste, sul, leste, norte] = JSON.parse(corpo).bbox as number[]
    const meioLon = (oeste + leste) / 2, meioLat = (sul + norte) / 2
    expect(Math.round(meioLat * 100) / 100).toBeCloseTo(meioLat, 9)
    expect(Math.round(meioLon * 100) / 100).toBeCloseTo(meioLon, 9)
    expect(Math.abs(meioLat - LAT)).toBeGreaterThan(0.0001)
  })
})
