/**
 * Banco falso em memória para as jornadas de ponta a ponta (Frente 1.6, passo A03).
 * No modo demonstração o app aponta para https://placeholder.supabase.co; aqui a
 * rede para esse endereço é interceptada e respondida como um PostgREST simples
 * (filtros eq/in/is, select, insert, update, delete, rpc e Edge Functions), para
 * que gravações (casos, tarefas, horas, checagens) possam ser testadas sem rede.
 * Dados 100% fictícios; nada sai do navegador de teste.
 */
import type { Page, Route } from '@playwright/test'

type Linha = Record<string, unknown>
export type BancoFalso = { tabelas: Record<string, Linha[]>; chamadas: string[] }

let seq = 0
const uuid = () => `00000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

function filtrar(linhas: Linha[], params: URLSearchParams): Linha[] {
  let r = linhas
  for (const [col, expr] of params) {
    if (['select', 'order', 'limit', 'offset', 'on_conflict', 'columns'].includes(col)) continue
    const m = /^(not\.)?(eq|neq|in|is|gte|lte|gt|lt|ilike|like)\.(.*)$/.exec(expr)
    if (!m) continue
    const [, neg, op, valor] = m
    const teste = (v: unknown) => {
      const s = v == null ? null : String(v)
      switch (op) {
        case 'eq': return s === valor
        case 'neq': return s !== valor
        case 'in': return valor.replace(/^\(|\)$/g, '').split(',').map(x => x.replace(/^"|"$/g, '')).includes(String(s))
        case 'is': return valor === 'null' ? v == null : String(v) === valor
        case 'gte': return s != null && s >= valor
        case 'lte': return s != null && s <= valor
        case 'gt': return s != null && s > valor
        case 'lt': return s != null && s < valor
        default: return s != null && new RegExp(valor.replace(/\*/g, '.*').replace(/%/g, '.*'), 'i').test(s)
      }
    }
    r = r.filter(l => (neg ? !teste(l[col]) : teste(l[col])))
  }
  const limite = params.get('limit')
  return limite ? r.slice(0, Number(limite)) : r
}

export async function instalarBancoFalso(page: Page, inicial: Record<string, Linha[]> = {}): Promise<BancoFalso> {
  const banco: BancoFalso = { tabelas: JSON.parse(JSON.stringify(inicial)), chamadas: [] }
  await page.route('https://placeholder.supabase.co/**', async (route: Route) => {
    const req = route.request()
    const url = new URL(req.url())
    const metodo = req.method()
    const caminho = url.pathname
    banco.chamadas.push(`${metodo} ${caminho}`)
    const json = (corpo: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'content-range': '0-0/*' }, body: JSON.stringify(corpo) })
    if (metodo === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    if (caminho.startsWith('/functions/v1/')) return json({ ok: true, demo: true })
    if (caminho.startsWith('/auth/v1/')) return json({})
    if (caminho.startsWith('/storage/v1/')) return json({ Key: 'teste/arquivo', path: 'teste/arquivo' })
    if (caminho.startsWith('/rest/v1/rpc/')) return json(null)
    const tabela = caminho.replace('/rest/v1/', '')
    const linhas = (banco.tabelas[tabela] ??= [])
    const umSo = (req.headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const devolver = (r: Linha[]) => (umSo ? json(r[0] ?? null, r[0] ? 200 : 406) : json(r))
    if (metodo === 'GET' || metodo === 'HEAD') return devolver(filtrar(linhas, url.searchParams))
    if (metodo === 'POST') {
      const corpo = req.postDataJSON() as Linha | Linha[]
      const novas = (Array.isArray(corpo) ? corpo : [corpo]).map(l => ({ id: uuid(), created_at: new Date().toISOString(), criado_em: new Date().toISOString(), ...l }))
      linhas.push(...novas)
      return devolver(novas)
    }
    if (metodo === 'PATCH') {
      const alvo = filtrar(linhas, url.searchParams)
      Object.assign(alvo[0] ?? {}, ...[req.postDataJSON() as Linha])
      for (const l of alvo.slice(1)) Object.assign(l, req.postDataJSON() as Linha)
      return devolver(alvo)
    }
    if (metodo === 'DELETE') {
      const alvo = new Set(filtrar(linhas, url.searchParams))
      banco.tabelas[tabela] = linhas.filter(l => !alvo.has(l))
      return devolver([...alvo])
    }
    return json({})
  })
  return banco
}
