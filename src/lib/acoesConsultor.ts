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

export interface Secao { titulo: string; corpo: string }
export interface DetalheAcao { rotulo: string; texto: string }

const tituloDe = (linha: string): string | null => {
  const t = linha.trim()
  const m = t.match(/^\*\*([^*]+)\*\*:?$/) ?? t.match(/^#{1,4}\s+(.+?)\s*#*$/)
  return m ? m[1].replace(/\*\*/g, '').replace(/[.:]\s*$/, '').trim() : null
}
const EH_ACOES = /a[çc][õo]es/i

/** Divide o diagnóstico nas suas seções (título em negrito sozinho na linha, ou título com #). */
export function secoesDoDiagnostico(md: string): { secoes: Secao[]; fontes: string } {
  const secoes: Secao[] = []
  let fontes = ''
  let atual: Secao = { titulo: '', corpo: '' }
  for (const linha of (md || '').split('\n')) {
    const f = linha.trim().match(/^fontes consultadas:\s*(.+)$/i)
    if (f) { fontes = f[1].trim(); continue }
    const titulo = tituloDe(linha)
    if (titulo !== null) {
      if (atual.titulo || atual.corpo.trim()) secoes.push(atual)
      atual = { titulo, corpo: '' }
    } else atual.corpo += linha + '\n'
  }
  if (atual.titulo || atual.corpo.trim()) secoes.push(atual)
  return { secoes: secoes.map(s => ({ titulo: s.titulo, corpo: s.corpo.trim() })), fontes }
}

export const ehSecaoDeAcoes = (titulo: string) => EH_ACOES.test(titulo)

// Nomes que o advogado entende, no lugar dos rótulos de consultoria.
const ROTULO_CLARO: Record<string, string> = { dono: 'Quem faz', indicador: 'Como saber que deu certo', fundamento: 'Base legal', risco: 'Cuidado' }
const rotuloClaro = (r: string) => ROTULO_CLARO[r.trim().toLowerCase()] ?? r.trim()
const celulas = (linha: string) => linha.trim().replace(/^\||\|$/g, '').split('|').map(c => c.trim())

/** Detalhes de cada ação (quem faz, como medir, base legal, cuidado), na mesma ordem de extrairAcoes. */
export function detalhesDasAcoes(md: string): DetalheAcao[][] {
  const { secoes } = secoesDoDiagnostico(md)
  const secao = secoes.find(s => ehSecaoDeAcoes(s.titulo))
  const linhas = (secao ? secao.corpo : md || '').split('\n')
  const acoes: DetalheAcao[][] = []
  let cabecalho: string[] = []
  for (const l of linhas) {
    const t = l.trim()
    if (/^\|\s*\d+\s*\|/.test(t)) {
      const c = celulas(t)
      acoes.push(c.slice(2).map((texto, i) => ({ rotulo: rotuloClaro(cabecalho[i + 2] ?? ''), texto: limparDetalhe(texto) })).filter(d => d.rotulo && d.texto))
    } else if (/^\|/.test(t)) {
      if (!/^\|[\s:|-]+\|?$/.test(t)) cabecalho = celulas(t)
    } else if (/^\d+[.)]\s+/.test(t)) {
      acoes.push([])
    } else if (acoes.length) {
      const d = t.match(/^[-*•]\s+([^:]{2,40}):\s+(.+)$/)
      if (d) acoes[acoes.length - 1].push({ rotulo: rotuloClaro(d[1].replace(/\*\*/g, '')), texto: limparDetalhe(d[2]) })
    }
  }
  return acoes.slice(0, 8)
}
const limparDetalhe = (s: string) => s.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim()
