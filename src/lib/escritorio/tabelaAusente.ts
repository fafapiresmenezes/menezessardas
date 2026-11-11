// Funil e lançamentos dependem de tabelas novas; enquanto não existirem no banco, a tela explica em vez de quebrar.
export function tabelaAusente(e: { code?: string; message?: string } | null | undefined): boolean {
  if (!e) return false
  return e.code === '42P01' || e.code === 'PGRST205' || /does not exist|could not find the table|schema cache/i.test(e.message ?? '')
}
