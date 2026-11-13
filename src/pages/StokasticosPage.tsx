import { Link } from 'react-router-dom'

// Stokasticos — homenagem à Arcanorum College de Peter J. Carroll, no estilo do Specularium.
// Pedido de M (13/11/2026): Biblioteca (índice com link para a fonte original), Blog mensal
// (textos do M), Escola de Ciência e Escola de Magia. Sem comércio. Direitos do Peter e da
// Mandrake preservados: nada de reproduzir obras; só catalogar, resumir e apontar.
export default function StokasticosPage() {
  return (
    <div className="min-h-screen bg-black text-white font-serif">
      <header className="border-b border-white/15 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-[11px] tracking-[0.3em] text-white/50 uppercase">Stokasticos</p>
            <h1 className="text-2xl mt-1">Escola de magia do caos</h1>
            <p className="text-sm text-white/60 mt-1">em homenagem a Peter J. Carroll e à Arcanorum College</p>
          </div>
          <Link to="/" title="Voltar à plataforma THEYE" className="text-xs underline text-white/50 hover:text-white">↩ THEYE</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        <section>
          <p className="text-white/70 leading-relaxed max-w-3xl">
            Espaço de estudo e repositório aberto. Nada à venda aqui. Os textos de Peter J. Carroll e os livros
            da Mandrake Books permanecem com seus autores e editores: a Biblioteca indexa e aponta para a fonte;
            quem quiser ler o original vai ao livro ou ao blog de origem (<a className="underline" href="https://specularium.org" target="_blank" rel="noreferrer">specularium.org</a>).
          </p>
        </section>

        <section className="grid sm:grid-cols-2 gap-6">
          <Link to="/stokasticos/biblioteca" title="Catálogo aberto de textos e livros, com link para a fonte original" className="block border border-white/20 hover:border-white p-6 transition">
            <div className="text-xs tracking-widest uppercase text-white/50">01</div>
            <div className="text-xl mt-2">Biblioteca</div>
            <div className="text-sm text-white/60 mt-2">Repositório aberto de referências — índice do Specularium, bibliografia de Peter J. Carroll e catálogo da Mandrake.</div>
          </Link>
          <Link to="/stokasticos/blog" title="Blog mensal escrito por M" className="block border border-white/20 hover:border-white p-6 transition">
            <div className="text-xs tracking-widest uppercase text-white/50">02</div>
            <div className="text-xl mt-2">Blog</div>
            <div className="text-sm text-white/60 mt-2">Textos mensais do M sobre magia, ciência, direito e o que o mês trouxer.</div>
          </Link>
          <Link to="/stokasticos/ciencia" title="Trilhas de estudo de ciência" className="block border border-white/20 hover:border-white p-6 transition">
            <div className="text-xs tracking-widest uppercase text-white/50">03</div>
            <div className="text-xl mt-2">Escola de ciência</div>
            <div className="text-sm text-white/60 mt-2">Trilhas de física, cosmologia, matemática e lógica, com leituras recomendadas.</div>
          </Link>
          <Link to="/stokasticos/magia" title="Trilhas de estudo de magia do caos" className="block border border-white/20 hover:border-white p-6 transition">
            <div className="text-xs tracking-widest uppercase text-white/50">04</div>
            <div className="text-xl mt-2">Escola de magia</div>
            <div className="text-sm text-white/60 mt-2">Trilhas de magia do caos: paradigmas, sigilos, gnose, ética — com leituras recomendadas.</div>
          </Link>
        </section>

        <footer className="pt-10 border-t border-white/10 text-xs text-white/40">
          Sem venda, sem publicidade. Links levam ao original. Em caso de pedido de retirada de qualquer
          referência por parte do autor ou da editora, basta avisar e ela sai no mesmo dia.
        </footer>
      </main>
    </div>
  )
}
