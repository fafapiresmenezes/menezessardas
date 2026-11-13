import { Link, useLocation } from 'react-router-dom'

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
      <div className="grid sm:grid-cols-2 gap-4">
        <Secao titulo="Por autor" nota="Peter J. Carroll, Phil Hine, Ramsey Dukes, Austin Osman Spare, Gordon White e outros — em preparação."/>
        <Secao titulo="Por tema" nota="Sigilos, gnose, egregors, paradigma, cibermagia, magia do caos, teoria da magia — em preparação."/>
        <Secao titulo="Specularium" nota="Índice dos posts do blog de Peter J. Carroll (specularium.org), com título, data e link para o original."/>
        <Secao titulo="Mandrake Books" nota="Catálogo da editora (temas e dados bibliográficos). Quem quiser comprar o livro vai ao site da Mandrake."/>
        <Secao titulo="Teses e artigos" nota="Trabalhos acadêmicos abertos (DOAJ, SciELO, BDTD, PhilPapers) sobre os temas das obras — em preparação."/>
        <Secao titulo="Cursos abertos" nota="Cursos de universidades abertas sobre ciência da religião, antropologia da magia, história das ideias — em preparação."/>
      </div>
    </div>
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
