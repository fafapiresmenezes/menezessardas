// Dublê do supabase-js para as Edge Functions nos testes: tabelas em memória, encadeável, com registro das escritas.
export interface Tabelas { [tabela: string]: Record<string, unknown>[] }
export const estado: { tabelas: Tabelas; inseridos: { tabela: string; linha: unknown }[]; upserts: { tabela: string; linha: unknown }[]; atualizados: { tabela: string; valores: unknown; filtros: [string, string, unknown][] }[]; rpcs: { nome: string; args: unknown }[]; rpcResposta: Record<string, unknown>; usuario: { id: string; email?: string } | null; rpcErro: Record<string, string>; sequencia: number; arquivos: Record<string, string>; authAdmin: { criados: unknown[]; atualizados: { id: string; attrs: unknown }[]; erro: string | null } } = {
  tabelas: {}, inseridos: [], upserts: [], atualizados: [], rpcs: [], rpcResposta: {}, usuario: null, rpcErro: {}, sequencia: 0, arquivos: {}, authAdmin: { criados: [], atualizados: [], erro: null },
}
export function zerar(tabelas: Tabelas = {}) {
  estado.tabelas = tabelas; estado.inseridos = []; estado.upserts = []; estado.atualizados = []; estado.rpcs = []; estado.rpcResposta = {}; estado.usuario = null; estado.rpcErro = {}; estado.sequencia = 0; estado.arquivos = {}; estado.authAdmin = { criados: [], atualizados: [], erro: null }
}

const pega = (r: Record<string, unknown>, c: string) => r[c]
function consulta(tabela: string) {
  const filtros: ((r: Record<string, unknown>) => boolean)[] = []
  const filtrosDesc: [string, string, unknown][] = []
  let limite: number | null = null
  let salto = 0
  let ordem: { col: string; asc: boolean } | null = null
  let cabeca = false
  let modoUm: 'single' | 'maybe' | null = null
  let escrita: { tipo: 'update'; valores: unknown } | null = null
  const linhas = () => {
    let l = (estado.tabelas[tabela] ?? []).filter(r => filtros.every(f => f(r)))
    if (ordem) { const { col, asc } = ordem; l = [...l].sort((a, b) => (String(pega(a, col)) < String(pega(b, col)) ? -1 : 1) * (asc ? 1 : -1)) }
    if (salto) l = l.slice(salto)
    if (limite != null) l = l.slice(0, limite)
    return l
  }
  const q = {
    select() { return q },
    eq(c: string, v: unknown) { filtros.push(r => pega(r, c) === v); filtrosDesc.push([c, 'eq', v]); return q },
    neq(c: string, v: unknown) { filtros.push(r => pega(r, c) !== v); return q },
    in(c: string, vs: unknown[]) { filtros.push(r => vs.includes(pega(r, c))); return q },
    ilike(c: string, padrao: string) { const p = padrao.replace(/%/g, '').toLowerCase(); filtros.push(r => String(pega(r, c) ?? '').toLowerCase().includes(p)); return q },
    is(c: string, v: unknown) { filtros.push(r => (pega(r, c) ?? null) === v); return q },
    not(c: string, op: string, v: unknown) { if (op === 'is') filtros.push(r => (pega(r, c) ?? null) !== v); return q },
    gte(c: string, v: unknown) { filtros.push(r => String(pega(r, c)) >= String(v)); return q },
    lt(c: string, v: unknown) { filtros.push(r => String(pega(r, c)) < String(v)); return q },
    lte(c: string, v: unknown) { filtros.push(r => String(pega(r, c)) <= String(v)); return q },
    order(c: string, o?: { ascending?: boolean }) { ordem = { col: c, asc: o?.ascending !== false }; return q },
    limit(n: number) { limite = n; return q },
    range(de: number, ate: number) { salto = de; limite = ate - de + 1; return q },
    single() { modoUm = 'single'; return q },
    maybeSingle() { modoUm = 'maybe'; return q },
    insert(linha: unknown) {
      const lista = (Array.isArray(linha) ? linha : [linha]) as Record<string, unknown>[]
      for (const l of lista) { if (l.id === undefined) l.id = `novo-${++estado.sequencia}`; estado.inseridos.push({ tabela, linha: l }); (estado.tabelas[tabela] ??= []).push(l) }
      const r = { data: null as unknown, error: null }
      const sel = { select: () => sel, single: async () => ({ data: lista[0] ?? null, error: null }), maybeSingle: async () => ({ data: lista[0] ?? null, error: null }), then: (res: (v: unknown) => void) => res({ data: lista, error: null }) }
      return Object.assign(sel, r)
    },
    upsert(linha: unknown) {
      const lista = (Array.isArray(linha) ? linha : [linha]) as Record<string, unknown>[]
      for (const l of lista) { if (l.id === undefined) l.id = `novo-${++estado.sequencia}`; estado.upserts.push({ tabela, linha: l }) }
      const sel = { select: () => sel, single: async () => ({ data: lista[0] ?? null, error: null }), maybeSingle: async () => ({ data: lista[0] ?? null, error: null }), then: (res: (v: unknown) => void) => res({ data: null, error: null, count: lista.length }) }
      return sel
    },
    update(valores: unknown) { escrita = { tipo: 'update', valores }; return q },
    delete() { return q },
    then(res: (v: unknown) => void) {
      if (escrita) { estado.atualizados.push({ tabela, valores: escrita.valores, filtros: filtrosDesc }); for (const r of linhas()) Object.assign(r, escrita.valores as object); return res({ data: null, error: null }) }
      const l = linhas()
      if (cabeca) return res({ data: null, count: l.length, error: null })
      if (modoUm) return res({ data: l[0] ?? null, error: modoUm === 'single' && !l[0] ? { message: 'sem linha' } : null })
      return res({ data: l, count: l.length, error: null })
    },
  }
  const selectOrig = q.select
  q.select = ((_c?: string, o?: { head?: boolean; count?: string }) => { if (o?.head) cabeca = true; return selectOrig() }) as typeof q.select
  return q
}

export function createClient() {
  return {
    from: (tabela: string) => consulta(tabela),
    // Arquivos guardados: estado.arquivos[caminho] = conteúdo (texto); download devolve um Blob ou data null.
    storage: { from: (_balde: string) => ({ download: async (caminho: string) => { const c = estado.arquivos[caminho]; return c == null ? { data: null, error: { message: 'não encontrado' } } : { data: new Blob([c]), error: null } } }) },
    rpc: async (nome: string, args?: unknown) => { estado.rpcs.push({ nome, args }); return estado.rpcErro[nome] ? { data: null, error: { message: estado.rpcErro[nome] } } : { data: estado.rpcResposta[nome] ?? null, error: null } },
    auth: {
      getUser: async () => ({ data: { user: estado.usuario } }),
      admin: {
        createUser: async (attrs: Record<string, unknown>) => { if (estado.authAdmin.erro) return { data: null, error: { message: estado.authAdmin.erro } }; estado.authAdmin.criados.push(attrs); return { data: { user: { id: `auth-${estado.authAdmin.criados.length}`, email: attrs.email } }, error: null } },
        updateUserById: async (id: string, attrs: unknown) => { if (estado.authAdmin.erro) return { data: null, error: { message: estado.authAdmin.erro } }; estado.authAdmin.atualizados.push({ id, attrs }); return { data: null, error: null } },
      },
    },
  }
}
