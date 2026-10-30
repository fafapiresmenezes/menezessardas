// Passo 20: extrai as "ações da semana" do diagnóstico (markdown) do Consultor da semana.
// Aceita lista numerada ("1. **Título.** ...") ou tabela ("| 1 | Ação | Dono | ..."). Devolve até 8 ações.
export function extrairAcoes(md: string): string[] {
  if (!md) return []
  const idx = md.search(/a[çc][õo]es da semana/i)
  const trecho = idx >= 0 ? md.slice(idx) : md
  const linhas = trecho.split('\n')
  const acoes: string[] = []
  for (const l of linhas) {
    const t = l.trim()
    let m = t.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|/)
    if (m) { acoes.push(limpar(m[2])); continue }
    m = t.match(/^(\d+)[.)]\s+(.+)$/)
    if (m) { acoes.push(limpar(m[2])); continue }
    if (acoes.length && /^#{1,3}\s/.test(t) && !/a[çc][õo]es/i.test(t)) break
  }
  return acoes.slice(0, 8)
}
const limpar = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').replace(/[.:]\s*$/, '').trim().slice(0, 240)
