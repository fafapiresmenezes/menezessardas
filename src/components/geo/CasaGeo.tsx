// Concha própria da casa de geomapeamento (fase G). De propósito NÃO usa o Layout da
// plataforma de direito: sem menu do escritório, sem login jurídico, sem nada parecido.
// A porta desta casa é a senha do cofre, e os dados ficam só no aparelho do titular.
import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import MarcaOlho from '@/components/MarcaOlho'

export default function CasaGeo({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const anterior = document.title
    document.title = 'Geomapeamento · THEYE'
    return () => { document.title = anterior }
  }, [])
  return (
    <div className="casa-geo min-h-screen bg-pergaminho flex flex-col">
      <header className="bg-black text-white">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link to="/geomapeamento" className="flex items-center gap-2" title="Voltar à porta do geomapeamento no Instituto THEYE">
            <MarcaOlho tamanho={24} />
            <span className="text-sm tracking-[0.15em] uppercase">THEYE · Geomapeamento</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/geo/nota" className="text-xs text-white/70 hover:text-white underline decoration-white/30" title="A régua de nota do app: as 10 dimensões de qualidade, à vista">régua de nota</Link>
            <span className="text-xs text-white/60 hidden sm:inline" title="Os dados gravados ficam cifrados só neste aparelho; nenhum ponto vai para servidor">dados só neste aparelho</span>
          </div>
        </div>
      </header>
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-6">{children}</main>
      <footer className="border-t border-navy/10 py-4 text-center text-xs text-grafite-claro">
        Instituto THEYE · MVP de geomapeamento no próprio titular · <Link to="/portais" className="underline" title="Todas as portas do Instituto">todas as portas</Link>
      </footer>
    </div>
  )
}
