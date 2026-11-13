import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

// Stokasticos — homenagem à Arcanorum College de Peter J. Carroll, no estilo do Specularium.
// Pedido de M (13/11/2026): rota oculta, só pelo símbolo ☉→∞+. Tem Biblioteca, Blog mensal do M,
// Escola de Ciência e Escola de Magia. Sem comércio. Direitos preservados: a Biblioteca só
// indexa e aponta; nada de reproduzir obras da Mandrake ou do Specularium.
//
// Tranca (pedido de M, 13/11/2026): nada do conteúdo aparece antes da senha. Quem não tem senha
// pede acesso por e-mail e motivação. A conferência da senha e o acervo vêm da função
// `stokasticos-acesso`; o catálogo nunca viaja dentro do pacote público do site.

type Secao = 'raiz' | 'biblioteca' | 'blog' | 'ciencia' | 'magia'

const CHAVE_SESSAO = 'stokasticos-entrou'

export default function StokasticosPage() {
  const loc = useLocation()
  const trecho = loc.pathname.replace(/^\/stokasticos\/?/, '') || ''
  const secao: Secao = ['biblioteca','blog','ciencia','magia'].includes(trecho) ? (trecho as Secao) : 'raiz'
  // Só a marca de entrada fica na sessão: nunca a senha, nunca o acervo.
  const [dentro, setDentro] = useState(() => { try { return sessionStorage.getItem(CHAVE_SESSAO) === '1' } catch { return false } })
  const [acervo, setAcervo] = useState<Acervo | null>(null)

  const entrou = (recebido: Acervo | null) => {
    setAcervo(recebido)
    setDentro(true)
    try { sessionStorage.setItem(CHAVE_SESSAO, '1') } catch { /* sem memória de sessão, pede a senha de novo */ }
  }

  return (
    <div className="min-h-screen bg-black text-white font-serif">
      <header className="border-b border-white/15 px-4 sm:px-6 py-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <Link to="/stokasticos" className="block no-underline text-white hover:text-white">
            <p className="text-[11px] tracking-[0.3em] text-white/50 uppercase">Stokasticos</p>
            <h1 className="text-xl mt-1">Escola de magia do caos</h1>
            <p className="text-xs text-white/50 mt-1">homenagem a Peter J. Carroll</p>
          </Link>
          {dentro && (
            <nav className="flex flex-wrap gap-4 text-xs">
              <Link to="/stokasticos/biblioteca" className={aba(secao==='biblioteca')} title="Catálogo aberto de referências de magia">Biblioteca</Link>
              <Link to="/stokasticos/blog" className={aba(secao==='blog')} title="Blog mensal do M">Blog</Link>
              <Link to="/stokasticos/ciencia" className={aba(secao==='ciencia')} title="Escola de ciência">Ciência</Link>
              <Link to="/stokasticos/magia" className={aba(secao==='magia')} title="Escola de magia">Magia</Link>
            </nav>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {!dentro && <Portao aoEntrar={entrou} />}
        {dentro && secao === 'raiz' && <Raiz />}
        {dentro && secao === 'biblioteca' && <Biblioteca acervo={acervo} />}
        {dentro && secao === 'blog' && <Blog />}
        {dentro && secao === 'ciencia' && <EscolaCiencia />}
        {dentro && secao === 'magia' && <EscolaMagia />}
      </main>

      <footer className="max-w-5xl mx-auto px-4 sm:px-6 pb-10 pt-6 border-t border-white/10 text-xs text-white/40">
        Sem venda, sem publicidade. Direitos das obras indexadas permanecem com seus autores e editores.
        Se alguém pedir a retirada de uma referência, ela sai no mesmo dia.
      </footer>
    </div>
  )
}

function aba(ativa: boolean) {
  return `uppercase tracking-widest no-underline ${ativa ? 'text-white border-b border-white' : 'text-white/50 hover:text-white'}`
}

const ROTULO = 'block text-[11px] uppercase tracking-[0.2em] text-white/50 mb-2'
const CAMPO = 'w-full bg-transparent border border-white/25 focus:border-white px-3 py-2.5 text-white placeholder-white/30 outline-none'
const BOTAO = 'min-h-[44px] px-5 border border-white/40 hover:border-white text-xs uppercase tracking-[0.2em] disabled:opacity-40'

/** Pede a senha ao servidor; o navegador nunca decide se a porta abre. */
async function chamar(corpo: Record<string, unknown>): Promise<{ erro?: string; ok?: boolean; acervo?: Acervo | null; avisado?: boolean }> {
  const { data, error } = await supabase.functions.invoke('stokasticos-acesso', { body: corpo })
  // Respostas de erro (400, 401, 403…) chegam em error.context; mostramos a mensagem do servidor.
  const resposta = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
  if (error && !resposta?.erro) return { erro: 'A entrada não respondeu agora. Tente de novo em instantes.' }
  return resposta ?? {}
}

function Portao({ aoEntrar }: { aoEntrar: (acervo: Acervo | null) => void }) {
  const [senha, setSenha] = useState('')
  const [erroSenha, setErroSenha] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [pedindoAcesso, setPedindoAcesso] = useState(false)
  const [email, setEmail] = useState('')
  const [motivacao, setMotivacao] = useState('')
  const [erroPedido, setErroPedido] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [pedidoFeito, setPedidoFeito] = useState<{ avisado: boolean } | null>(null)

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroSenha('')
    setEntrando(true)
    const r = await chamar({ acao: 'entrar', senha })
    setEntrando(false)
    if (r.erro) return setErroSenha(r.erro)
    aoEntrar(r.acervo ?? null)
  }

  const pedir = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroPedido('')
    setEnviando(true)
    const r = await chamar({ acao: 'pedir', email, motivacao })
    setEnviando(false)
    if (r.erro) return setErroPedido(r.erro)
    setPedidoFeito({ avisado: r.avisado === true })
  }

  return (
    <div className="max-w-md mx-auto border border-white/15 p-6 sm:p-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Entrada</p>
      <p className="text-white/70 text-sm mt-3 leading-relaxed">
        Esta escola é fechada. Para entrar, use a senha que você recebeu. Se ainda não tem senha, peça abaixo:
        o M lê cada pedido e responde por e-mail.
      </p>

      <form onSubmit={entrar} className="mt-6 space-y-3">
        <div>
          <label htmlFor="stok-senha" className={ROTULO}>Senha</label>
          <input id="stok-senha" type="password" autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)}
            title="Digite a senha que você recebeu para entrar no Stokasticos" className={CAMPO} />
        </div>
        {erroSenha && <p role="alert" className="text-sm text-white border-l border-white/40 pl-3">{erroSenha}</p>}
        <button type="submit" disabled={!senha.trim() || entrando} title="Confere a senha e abre a escola" className={BOTAO}>
          {entrando ? 'Conferindo…' : 'Entrar'}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-white/15">
        {!pedindoAcesso && !pedidoFeito && (
          <button type="button" onClick={() => setPedindoAcesso(true)} title="Abre o formulário para pedir uma senha de acesso"
            className="text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white underline underline-offset-4 min-h-[44px]">
            Não tenho senha
          </button>
        )}

        {pedidoFeito && (
          <div className="space-y-2" role="status">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Pedido registrado</p>
            <p className="text-white/70 text-sm leading-relaxed">
              Seu pedido ficou guardado. A resposta chega pelo e-mail que você escreveu — sem pressa, sem cobrança.
            </p>
            {!pedidoFeito.avisado && (
              <p className="text-white/50 text-sm leading-relaxed">
                O aviso por e-mail não pôde ser enviado agora, mas o pedido está salvo e será lido.
              </p>
            )}
          </div>
        )}

        {pedindoAcesso && !pedidoFeito && (
          <form onSubmit={pedir} className="space-y-3">
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/50">Pedir acesso</p>
            <div>
              <label htmlFor="stok-email" className={ROTULO}>Seu e-mail</label>
              <input id="stok-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)}
                title="E-mail onde você quer receber a resposta" className={CAMPO} />
            </div>
            <div>
              <label htmlFor="stok-motivacao" className={ROTULO}>Por que você quer entrar</label>
              <textarea id="stok-motivacao" rows={5} value={motivacao} onChange={e => setMotivacao(e.target.value)}
                title="Conte em algumas linhas por que quer estudar aqui" className={CAMPO} />
            </div>
            {erroPedido && <p role="alert" className="text-sm text-white border-l border-white/40 pl-3">{erroPedido}</p>}
            <button type="submit" disabled={enviando} title="Envia seu pedido de acesso ao M" className={BOTAO}>
              {enviando ? 'Enviando…' : 'Pedir acesso'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
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

function Biblioteca({ acervo }: { acervo: Acervo | null }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Biblioteca</h2>
      <p className="text-white/70 max-w-3xl">
        Catálogo aberto. Cada entrada traz autor, obra, assunto e link para o original. Não hospedamos o
        texto das obras; para ler, siga o link ou procure a edição em livraria ou biblioteca.
      </p>
      {acervo && (
        <p className="text-xs text-white/40 max-w-3xl">
          {acervo.aviso} Atualizado em {acervo.atualizado_em}.
        </p>
      )}
      <div className="space-y-10">
        {acervo?.prateleiras?.length
          ? acervo.prateleiras.map((prateleira) => <Prateleira key={prateleira.id} prateleira={prateleira} />)
          : <p className="text-sm text-white/50 border border-white/15 p-6">Acervo ainda não carregado. Entre com a senha outra vez para o servidor enviar o catálogo.</p>}
      </div>
    </div>
  )
}

type Acervo = {
  atualizado_em?: string
  aviso?: string
  prateleiras?: PrateleiraCatalogo[]
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
