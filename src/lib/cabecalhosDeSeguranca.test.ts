import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

/**
 * Pedido de M em 13/11/2026 21:38 UTC: "Proteja o site e todas as páginas e a plataforma com a
 * maior segurança do mundo", "blinde", "impossibilite scraping", "deixe completamente seguro".
 *
 * O furo que este teste existe para não voltar: o deploy/vercel.json estava no repositório desde
 * sempre, mas NÃO ia no envio para a Vercel. A implantação em produção
 * (dpl_HUsuJzedrSx3TMNgHarkfVu4Tz6X) tinha cinco arquivos — index.html, manifest, robots, sitemap
 * e sw.js — e nenhum cabeçalho de segurança chegava ao navegador de ninguém. Arquivo de
 * configuração que não é enviado é decoração.
 *
 * Então aqui se prende as duas pontas: o conteúdo dos cabeçalhos E o fato de o publicar.sh copiar
 * o arquivo para a pasta que vai à Vercel.
 */
const vercel = JSON.parse(readFileSync('deploy/vercel.json', 'utf-8')) as {
  headers: { source: string; headers: { key: string; value: string }[] }[]
}
const doSiteTodo = vercel.headers.find(h => h.source === '/(.*)')!
const valor = (k: string) => doSiteTodo.headers.find(h => h.key.toLowerCase() === k.toLowerCase())?.value ?? ''
const publicar = readFileSync('scripts/publicar.sh', 'utf-8')
const robots = readFileSync('public/robots.txt', 'utf-8')

describe('cabeçalhos de segurança do site', () => {
  it('o publicar.sh envia o vercel.json junto, senão nada disso vale', () => {
    expect(publicar).toMatch(/cp deploy\/vercel\.json "\$PASTA\/"/)
  })

  it('vale para todas as páginas, não só para a inicial', () => {
    expect(doSiteTodo).toBeTruthy()
    expect(doSiteTodo.source).toBe('/(.*)')
  })

  it('ninguém pode colocar o site dentro de uma moldura', () => {
    expect(valor('X-Frame-Options')).toBe('DENY')
    expect(valor('Content-Security-Policy')).toContain("frame-ancestors 'none'")
  })

  it('só carrega código do próprio domínio e do CDN que serve o build', () => {
    const csp = valor('Content-Security-Policy')
    expect(csp).toContain("default-src 'self'")
    expect(csp).toContain("script-src 'self' https://cdn.jsdelivr.net")
    expect(csp).toContain("object-src 'none'")
    expect(csp).toContain("base-uri 'self'")
    expect(csp).toContain("form-action 'self'")
    // script-src sem 'unsafe-inline' e sem 'unsafe-eval': é o que impede injeção de script.
    expect(csp.match(/script-src[^;]*/)![0]).not.toContain('unsafe')
  })

  it('só conversa com o nosso banco, e sempre por HTTPS', () => {
    const csp = valor('Content-Security-Policy')
    expect(csp).toContain('connect-src')
    expect(csp).toContain('https://hlraekzvgxdpiiigdxdo.supabase.co')
    expect(csp).toContain('upgrade-insecure-requests')
    expect(csp.match(/connect-src[^;]*/)![0]).not.toMatch(/\shttp:/)
  })

  it('exige HTTPS por dois anos, com subdomínios', () => {
    const hsts = valor('Strict-Transport-Security')
    expect(hsts).toMatch(/max-age=(\d+)/)
    expect(Number(hsts.match(/max-age=(\d+)/)![1])).toBeGreaterThanOrEqual(31536000)
    expect(hsts).toContain('includeSubDomains')
  })

  it('não adivinha tipo de arquivo, não vaza endereço e desliga o que não se usa', () => {
    expect(valor('X-Content-Type-Options')).toBe('nosniff')
    expect(valor('Referrer-Policy')).toBe('strict-origin-when-cross-origin')
    const pp = valor('Permissions-Policy')
    expect(pp).toContain('camera=()')
    expect(pp).toContain('microphone=()')
    expect(pp).toContain('payment=()')
    // a tela de geolocalização precisa do próprio domínio, e só dele
    expect(pp).toContain('geolocation=(self)')
  })

  it('o script de tema que vive dentro do index.html continua liberado pelo seu hash', () => {
    // script-src sem 'unsafe-inline' bloqueia TODO script escrito na página. O que libera este, e
    // só este, é o hash do seu conteúdo. Se alguém mexer no script e esquecer o hash, o tema
    // escuro para de carregar antes da tela — e o navegador reclama no console. Daí este teste
    // recalcular o hash do arquivo em vez de confiar no que está escrito no vercel.json.
    const html = readFileSync('index.html', 'utf-8')
    const inline = [...html.matchAll(/<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1])
    expect(inline.length).toBe(1)
    const hash = createHash('sha256').update(inline[0]).digest('base64')
    expect(valor('Content-Security-Policy')).toContain(`'sha256-${hash}'`)
  })

  it('as fontes do Google continuam permitidas, senão a tela abre sem a letra certa', () => {
    const csp = valor('Content-Security-Policy')
    expect(csp.match(/style-src[^;]*/)![0]).toContain('https://fonts.googleapis.com')
    expect(csp.match(/font-src[^;]*/)![0]).toContain('https://fonts.gstatic.com')
  })

  it('a página inicial nunca fica guardada em cache do navegador', () => {
    const indice = vercel.headers.find(h => h.source === '/index.html')!
    expect(indice.headers[0].value).toContain('no-store')
  })
})

describe('raspagem', () => {
  it('robots.txt fecha tudo menos a porta de entrada', () => {
    expect(robots).toMatch(/User-agent: \*/)
    expect(robots).toMatch(/Disallow: \//)
  })

  it('nomeia os raspadores que se identificam, inclusive os de IA', () => {
    for (const bot of ['GPTBot', 'ClaudeBot', 'CCBot', 'PerplexityBot', 'Bytespider', 'AhrefsBot']) {
      expect(robots, bot).toContain(bot)
    }
  })

  it('diz na cara que robots.txt não é tranca', () => {
    expect(robots).toMatch(/[ée] pedido, n[ãa]o tranca/i)
  })
})
