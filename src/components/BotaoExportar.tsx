import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download } from 'lucide-react'
import { lerTabela, paraCsv, paraPdf, nomeArquivo, type Grade } from '@/lib/exportarTabela'

// Passo 61: em qualquer tela com tabela, "Exportar" baixa a tabela em CSV (Excel) ou PDF.
function baixar(dados: BlobPart, tipo: string, nome: string) {
  const url = URL.createObjectURL(new Blob([dados], { type: tipo }))
  const a = document.createElement('a'); a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export default function BotaoExportar() {
  const { pathname } = useLocation()
  const [tabelas, setTabelas] = useState<Grade[]>([])
  const [aberto, setAberto] = useState(false)
  const caixa = useRef<HTMLDivElement>(null)

  const tela = () => (document.querySelector('header h1')?.textContent ?? 'Tela').trim()
  const ler = () => [...document.querySelectorAll<HTMLTableElement>('main table')].map((t, i) => lerTabela(t, `Tabela ${i + 1}`)).filter(g => g.linhas.length > 0)

  useEffect(() => {
    setAberto(false)
    const atualizar = () => setTabelas(ler())
    const t = setTimeout(atualizar, 1200)
    const obs = new MutationObserver(() => { clearTimeout((obs as unknown as { t?: number }).t); (obs as unknown as { t?: number }).t = window.setTimeout(atualizar, 600) })
    const main = document.querySelector('main'); if (main) obs.observe(main, { childList: true, subtree: true })
    return () => { clearTimeout(t); obs.disconnect() }
  }, [pathname])
  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => { if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fora); document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('mousedown', fora); document.removeEventListener('keydown', esc) }
  }, [aberto])

  if (!tabelas.length) return null
  const exportar = (i: number, formato: 'csv' | 'pdf') => {
    const g = ler()[i] ?? tabelas[i]; const nome = tela()
    if (formato === 'csv') baixar(paraCsv(g), 'text/csv;charset=utf-8', nomeArquivo(nome, g.titulo, 'csv'))
    else baixar(paraPdf(g, nome), 'application/pdf', nomeArquivo(nome, g.titulo, 'pdf'))
    setAberto(false)
  }
  return (
    <div className="relative" ref={caixa}>
      <button type="button" onClick={() => setAberto(a => !a)} data-testid="exportar" aria-haspopup="menu" aria-expanded={aberto}
        aria-label={`Exportar ${tabelas.length === 1 ? 'a tabela' : `as ${tabelas.length} tabelas`} desta tela`} title="Exportar tabela (CSV ou PDF)"
        className="flex items-center gap-2 min-h-[44px] min-w-[44px] px-3 border border-navy/20 text-navy text-sm hover:border-dourado transition">
        <Download size={18} aria-hidden="true" /><span className="hidden xl:inline">Exportar</span>
      </button>
      {aberto && (
        <div role="menu" data-testid="exportar-menu" className="absolute right-0 mt-2 w-[min(92vw,340px)] bg-white shadow-2xl border-t-2 border-dourado z-50 py-2">
          {tabelas.map((g, i) => (
            <div key={i} className="px-4 py-2 border-b border-navy/10 last:border-0">
              <p className="text-sm text-navy">{g.titulo} <span className="text-xs text-grafite-claro">· {g.linhas.length} linha(s)</span></p>
              <div className="flex gap-2 mt-1">
                <button role="menuitem" type="button" onClick={() => exportar(i, 'csv')} data-testid="exportar-csv" className="min-h-[44px] px-3 border border-navy/20 text-sm hover:border-dourado">Excel (CSV)</button>
                <button role="menuitem" type="button" onClick={() => exportar(i, 'pdf')} data-testid="exportar-pdf" className="min-h-[44px] px-3 border border-navy/20 text-sm hover:border-dourado">PDF</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
