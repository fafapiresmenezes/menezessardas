import { Link, useLocation } from 'react-router-dom'
import catalogo from '../data/stokasticos-biblioteca.json'

// Stokasticos — homenagem à Arcanorum College de Peter J. Carroll, no estilo do Specularium.
// Pedido de M (13/11/2026): rota oculta, só pelo símbolo ☉→∞+. Tem Biblioteca, Blog mensal do M,
// Escola de Ciência e Escola de Magia. Sem comércio. Direitos preservados: a Biblioteca só
// indexa e aponta; nada de reproduzir obras da Mandrake ou do Specularium.

type Secao = 'raiz' | 'biblioteca' | 'blog' | 'ciencia' | 'magia'

export default function StokasticosPage() {
  const loc = useLocation()
  const trecho = loc.pathname.replace(/^\/stokasticos\/?/, '') || ''
  const secao: Secao = ['biblioteca','blog','ciencia','magia'].includes(trecho) ? (trecho as Secao) : 'raiz'

  return (
    <div className="min-h-screen bg-black text-white font-serif">
      <header className="border-b border-white/15 px-6 py-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link to="/stokasticos" className="block no-underline text-white hover:text-white">
            <p className="text-[11px] tracking-[0.3em] text-white/50 uppercase">Stokasticos</p>
            <h1 className="text-xl mt-1">Escola de magia do caos</h1>
            <p className="text-xs text-white/50 mt-1">homenagem a Peter J. Carroll</p>
          </Link>
          <nav className="flex gap-4 text-xs">
            <Link to="/stokasticos/biblioteca" className={aba(secao==='biblioteca')} title="Catálogo aberto de referências de magia">Biblioteca</Link>
            <Link to="/stokasticos/blog" className={aba(secao==='blog')} title="Blog mensal do M">Blog</Link>
            <Link to="/stokasticos/ciencia" className={aba(secao==='ciencia')} title="Escola de ciência">Ciência</Link>
            <Link to="/stokasticos/magia" className={aba(secao==='magia')} title="Escola de magia">Magia</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {secao === 'raiz' && <Raiz />}
        {secao === 'biblioteca' && <Biblioteca />}
        {secao === 'blog' && <Blog />}
        {secao === 'ciencia' && <EscolaCiencia />}
        {secao === 'magia' && <EscolaMagia />}
      </main>

      <footer className="max-w-5xl mx-auto px-6 pb-10 pt-6 border-t border-white/10 text-xs text-white/40">
        Sem venda, sem publicidade. Direitos das obras indexadas permanecem com seus autores e editores.
        Se alguém pedir a retirada de uma referência, ela sai no mesmo dia.
      </footer>
    </div>
  )
}

function aba(ativa: boolean) {
  return `uppercase tracking-widest no-underline ${ativa ? 'text-white border-b border-white' : 'text-white/50 hover:text-white'}`
}

function Raiz() {
  return (
    <div className="space-y-8">
      <p className="text-white/70 leading-relaxed max-w-3xl">
        Espaço de estudo. Nada à venda. A Biblioteca cataloga referências de magia e de ciência que você
        pode consultar livremente nas fontes originais. O Blog traz textos mensais do M. As duas Escolas
        oferecem trilhas de estudo com leituras sugeridas.
      </p>
      <div className="grid sm:grid-cols-2 gap-6">
        <Cartao numero="01" titulo="Biblioteca" descricao="Repositório de referências com link para a fonte original." destino="/stokasticos/biblioteca"/>
        <Cartao numero="02" titulo="Blog" descricao="Textos mensais do M. Primeiro post em preparação." destino="/stokasticos/blog"/>
        <Cartao numero="03" titulo="Escola de ciência" descricao="Física, cosmologia, matemática, lógica — com bibliografia." destino="/stokasticos/ciencia"/>
        <Cartao numero="04" titulo="Escola de magia" descricao="Magia do caos: paradigmas, sigilos, gnose, ética — com bibliografia." destino="/stokasticos/magia"/>
      </div>
    </div>
  )
}

function Cartao({ numero, titulo, descricao, destino }: { numero: string; titulo: string; descricao: string; destino: string }) {
  return (
    <Link to={destino} className="block no-underline text-white border border-white/20 hover:border-white p-6 transition">
      <div className="text-xs tracking-widest uppercase text-white/50">{numero}</div>
      <div className="text-xl mt-2">{titulo}</div>
      <div className="text-sm text-white/60 mt-2">{descricao}</div>
    </Link>
  )
}

function Biblioteca() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Biblioteca</h2>
      <p className="text-white/70 max-w-3xl">
        Catálogo aberto. Cada entrada traz autor, obra, assunto e link para o original. Não hospedamos o
        texto das obras; para ler, siga o link ou procure a edição em livraria ou biblioteca.
      </p>
      <p className="text-xs text-white/40 max-w-3xl">
        {catalogo.aviso} Atualizado em {catalogo.atualizado_em}.
      </p>
      <div className="space-y-10">
        {catalogo.prateleiras.map((prateleira) => (
          <Prateleira key={prateleira.id} prateleira={prateleira} />
        ))}
      </div>
    </div>
  )
}

type ItemCatalogo = {
  titulo: string
  autor: string
  ano: string
  tipo: string
  editora: string
  assunto: string
  nota: string
  url: string
  acesso: string
}

type PrateleiraCatalogo = {
  id: string
  titulo: string
  descricao: string
  itens: ItemCatalogo[]
}

function Prateleira({ prateleira }: { prateleira: PrateleiraCatalogo }) {
  return (
    <section className="border-t border-white/15 pt-6">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="text-sm uppercase tracking-[0.2em]">{prateleira.titulo}</h3>
        <span className="text-[11px] uppercase tracking-widest text-white/40">
          {prateleira.itens.length} {prateleira.itens.length === 1 ? 'entrada' : 'entradas'}
        </span>
      </div>
      <p className="text-xs text-white/50 mt-2 max-w-3xl">{prateleira.descricao}</p>
      <ul className="mt-5 space-y-0 list-none p-0">
        {prateleira.itens.map((item) => (
          <ItemPrateleira key={`${prateleira.id}-${item.url}-${item.titulo}`} item={item} />
        ))}
      </ul>
    </section>
  )
}

function ItemPrateleira({ item }: { item: ItemCatalogo }) {
  const ficha = [item.autor, item.ano, item.tipo, item.editora].filter(Boolean).join(' · ')
  return (
    <li className="border-b border-white/15 py-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          title={`Abrir a fonte original de ${item.titulo} (${item.url})`}
          className="text-base text-white underline decoration-white/30 hover:decoration-white break-words"
        >
          {item.titulo}
        </a>
        <span className="text-[10px] uppercase tracking-widest text-white/50 border border-white/25 px-2 py-0.5 shrink-0">
          {item.acesso}
        </span>
      </div>
      <div className="text-xs text-white/50 mt-1 break-words">{ficha}</div>
      {item.assunto && (
        <div className="text-[11px] uppercase tracking-wider text-white/40 mt-1 break-words">{item.assunto}</div>
      )}
      {item.nota && <p className="text-sm text-white/70 mt-2 max-w-3xl">{item.nota}</p>}
    </li>
  )
}

function Blog() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Blog</h2>
      <p className="text-white/70 max-w-3xl">
        Textos mensais do M. O primeiro post está em preparação e aparece aqui assim que ele publicar.
      </p>
      <div className="border border-white/20 p-6 text-white/50 text-sm">Nenhuma postagem ainda.</div>
    </div>
  )
}

function EscolaCiencia() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Escola de ciência</h2>
      <p className="text-white/70 max-w-3xl">
        Trilhas de estudo abertas, com cursos públicos (MIT OCW, Stanford Online, Coursera aberto) e livros
        clássicos indicados — em preparação.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Secao titulo="Física" nota="Mecânica, eletromagnetismo, relatividade, mecânica quântica, cosmologia."/>
        <Secao titulo="Matemática" nota="Cálculo, álgebra linear, probabilidade, análise."/>
        <Secao titulo="Lógica e filosofia da ciência" nota="Lógica clássica, Popper, Kuhn, Feyerabend."/>
        <Secao titulo="Ciência da complexidade" nota="Sistemas, caos, redes, estocástica."/>
      </div>
    </div>
  )
}

function EscolaMagia() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Escola de magia</h2>
      <p className="text-white/70 max-w-3xl">
        Trilhas de estudo em magia do caos, com leitura recomendada — em preparação. A trilha inteira é
        pedagógica e aberta; nada é vendido aqui.
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        <Secao titulo="Paradigmas" nota="Teoria dos paradigmas mágicos, escolhendo o modelo que serve ao experimento."/>
        <Secao titulo="Sigilos e gnose" nota="Técnicas de sigilização, estados de consciência, exercícios."/>
        <Secao titulo="Egregors e correntes" nota="Entidades construídas, campos, correntes mágicas contemporâneas."/>
        <Secao titulo="Ética e segurança" nota="Consentimento, limites, higiene mental, relações entre magia e ciência."/>
      </div>
    </div>
  )
}

function Secao({ titulo, nota }: { titulo: string; nota: string }) {
  return (
    <div className="border border-white/15 p-5">
      <div className="text-sm uppercase tracking-wider">{titulo}</div>
      <div className="text-xs text-white/50 mt-2">{nota}</div>
    </div>
  )
}
