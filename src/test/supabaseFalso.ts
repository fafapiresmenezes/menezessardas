// Supabase em memória para testes de tela: guarda as linhas por tabela e entende o básico do PostgREST
// (select, eq, neq, not is null, order, insert, upsert, update, delete, single). Erros podem ser forçados por tabela.
type Linha = Record<string, unknown>
type Erro = { code?: string; message: string }
// Valores padrão das colunas, como no banco.
const PADROES: Record<string, () => Linha> = {
  leads: () => ({ etapa: 'novo', etapa_desde: new Date().toISOString(), valor_estimado: 0, origem: 'indicacao', caso_id: null, motivo_perda: null }),
  monitoramentos: () => ({ novidades: [], ultimo_estado: null, verificado_em: null }),
  tarefas: () => ({ situacao: 'a_fazer', prioridade: 'media', nivel: 'tarefa', horas: 0, honorario_previsto: 0, honorario_recebido: 0 }),
}

export function criarSupabaseFalso(inicial: Record<string, Linha[]> = {}, padroes: Record<string, () => Linha> = PADROES) {
  const tabelas: Record<string, Linha[]> = Object.fromEntries(Object.entries(inicial).map(([k, v]) => [k, v.map(x => ({ ...x }))]))
  const erros: Record<string, Erro | undefined> = {}
  const chamadas: { tabela: string; op: string; dados?: unknown }[] = []
  const invocacoes: { nome: string; body: unknown }[] = []
  const rpcs: { nome: string; args: unknown }[] = []
  let respostaFuncao: (nome: string, body: Record<string, unknown>) => { data?: unknown; error: Erro | null } = () => ({ data: null, error: null })
  let seq = 1

  function consulta(tabela: string, op: 'select' | 'insert' | 'upsert' | 'update' | 'delete', dados?: Linha | Linha[], opcoes?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    const filtros: ((l: Linha) => boolean)[] = []
    let ordem: { col: string; asc: boolean } | null = null
    let unico = false
    const executar = () => {
      chamadas.push({ tabela, op, dados })
      if (erros[tabela]) return { data: null, error: erros[tabela]! }
      const lista = (tabelas[tabela] ??= [])
      let out: Linha[] = []
      if (op === 'insert' || op === 'upsert') {
        const novas: Linha[] = (Array.isArray(dados) ? dados : [dados!]).map(d => ({ id: `id-${seq++}`, criado_em: new Date().toISOString(), ...(padroes[tabela]?.() ?? {}), ...d }))
        for (const n of novas) {
          if (op === 'upsert' && opcoes?.onConflict) { const cols = opcoes.onConflict.split(','); if (lista.some(l => cols.every(c => l[c] === n[c]))) continue }
          lista.push(n); out.push(n)
        }
      } else {
        out = lista.filter(l => filtros.every(f => f(l)))
        if (op === 'update') out.forEach(l => Object.assign(l, dados))
        if (op === 'delete') tabelas[tabela] = lista.filter(l => !out.includes(l))
      }
      if (ordem) { const { col, asc } = ordem; out = [...out].sort((a, b) => (String(a[col] ?? '') < String(b[col] ?? '') ? -1 : 1) * (asc ? 1 : -1)) }
      return { data: unico ? out[0] ?? null : out.map(x => ({ ...x })), error: null }
    }
    const q = {
      select: () => q, eq: (c: string, v: unknown) => { filtros.push(l => l[c] === v); return q }, neq: (c: string, v: unknown) => { filtros.push(l => l[c] !== v); return q },
      not: (c: string, _o: string, _v: unknown) => { filtros.push(l => l[c] !== null && l[c] !== undefined); return q }, in: (c: string, vs: unknown[]) => { filtros.push(l => vs.includes(l[c])); return q },
      order: (c: string, o?: { ascending?: boolean }) => { ordem = { col: c, asc: o?.ascending !== false }; return q }, limit: () => q,
      single: () => { unico = true; return q }, maybeSingle: () => { unico = true; return q },
      then: (ok: (r: ReturnType<typeof executar>) => unknown, falha?: (e: unknown) => unknown) => Promise.resolve().then(executar).then(ok, falha),
    }
    return q
  }
  const supabase = {
    from: (t: string) => ({
      select: (_c?: string) => consulta(t, 'select'),
      insert: (d: Linha | Linha[]) => consulta(t, 'insert', d),
      upsert: (d: Linha | Linha[], o?: { onConflict?: string; ignoreDuplicates?: boolean }) => consulta(t, 'upsert', d, o),
      update: (d: Linha) => consulta(t, 'update', d),
      delete: () => consulta(t, 'delete'),
    }),
    functions: { invoke: async (nome: string, o: { body: Record<string, unknown> }) => { invocacoes.push({ nome, body: o.body }); return respostaFuncao(nome, o.body) } },
    rpc: async (nome: string, args?: unknown) => { rpcs.push({ nome, args }); return { data: null, error: null } },
    auth: { getUser: async () => ({ data: { user: null } }) },
  }
  return {
    supabase, tabelas, chamadas, invocacoes, rpcs,
    falhar: (t: string, e: Erro | undefined) => { erros[t] = e },
    responderFuncao: (f: typeof respostaFuncao) => { respostaFuncao = f },
  }
}
