import { useEffect, useState } from 'react'
import { mensagemAmigavel } from '@/lib/erros'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import Marca from '@/components/Marca'
import { NOME_PLATAFORMA } from '@/lib/plataforma'
import { marcaPorDominio, esquecerMarca, type MarcaEscritorio } from '@/lib/marca'
import { esquecerEscritorio } from '@/lib/equipe'
import { useTexto } from '@/lib/i18n'
import SeletorIdioma from '@/components/SeletorIdioma'
import Vertentes from '@/components/Vertentes'
import Produtos from '@/components/Produtos'
import Doacoes from '@/components/Doacoes'
import { destinoSeguro, DESTINO_PADRAO, DESTINOS_PERMITIDOS, lembrarUltimaFrente } from '@/lib/destino'
import ProvaDaPorta from '@/components/ProvaDaPorta'
import { VERTENTES } from '@/data/vertentes'
import type { Chave } from '@/lib/i18n'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [armadilha, setArmadilha] = useState('')
  const [abertoEm] = useState(() => Date.now())
  // Passo D22: em domínio próprio de parceiro, a tela de entrada mostra a marca dele.
  const [marca, setMarca] = useState<MarcaEscritorio | null>(null)
  useEffect(() => { esquecerMarca(); esquecerEscritorio(); marcaPorDominio().then(setMarca).catch(() => setMarca(null)) }, [])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoRecuperacao, setAvisoRecuperacao] = useState(false)
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false)
  const [escritorio, setEscritorio] = useState('')
  const [avisoCadastro, setAvisoCadastro] = useState('')
  const [pedirCodigo, setPedirCodigo] = useState(false)
  const [codigo, setCodigo] = useState('')
  const navigate = useNavigate()
  // Entrada multilingue (pedido de M, 13/11/2026): a tela fala o idioma escolhido nas boas-vindas
  // e a fileira de idiomas no pe troca na hora. Padrao: portugues.
  const t = useTexto()
  // Pedido de M (13/11/2026 22:45): quem clicou num quadradinho entra direto na tela dele, e não
  // na plataforma jurídica. O destino vem no endereço e só vale se estiver na lista permitida.
  const [busca] = useSearchParams()
  const pedido = busca.get('ir')
  const pedidoValido = !!pedido && DESTINOS_PERMITIDOS.includes(pedido)
  const destino = pedidoValido ? destinoSeguro(pedido) : DESTINO_PADRAO
  // Entrada de UM segmento (M, 13/11/2026 23:11): quem clica num quadradinho vê a tela mudar para a
  // entrada daquele segmento, no topo, com o nome dele. Antes o clique caía na mesma tela, lá
  // embaixo, e parecia que o botão não funcionava.
  const vertenteDestino = pedidoValido ? VERTENTES.find(v => v.rota === destino) : undefined
  const nomeDestino = vertenteDestino ? t(`vertente.${vertenteDestino.id}.nome` as Chave)
    : !pedidoValido ? '' : destino === '/caderno-de-produtos' ? t('produtos.titulo') : destino === '/instituto' ? t('login.entradaApoio') : ''
  const doSegmento = !!nomeDestino
  useEffect(() => {
    if (!doSegmento) return
    window.scrollTo({ top: 0 })
    document.getElementById('email')?.focus({ preventScroll: true })
  }, [doSegmento, destino])
  const seguir = () => { lembrarUltimaFrente(destino); navigate(destino) }

  // Dois fatores: se a conta tem aplicativo autenticador, a sessão só vale depois do código (nível aal2).
  const precisaCodigo = async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    return data?.nextLevel === 'aal2' && data.currentLevel !== 'aal2'
  }
  useEffect(() => { if (supabaseConfigurado) precisaCodigo().then(p => { if (p) setPedirCodigo(true) }) }, [])
  const verificarCodigo = async (e: React.FormEvent) => {
    e.preventDefault(); setErro(''); setCarregando(true)
    try {
      const { data: f } = await supabase.auth.mfa.listFactors()
      const fator = f?.totp?.find(x => x.status === 'verified')
      if (!fator) { setErro(t('erro.semAutenticador')); return }
      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: fator.id, code: codigo.replace(/\s/g, '') })
      if (error) setErro(t('erro.codigoErrado'))
      else seguir()
    } finally { setCarregando(false) }
  }

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setAvisoRecuperacao(false)
    setCarregando(true)

    if (!supabaseConfigurado) {
      // Modo demonstração sem senha foi desligado (pedido de M, 13/11/2026). Em produção a plataforma exige Supabase.
      setErro(t('erro.naoConfigurada'))
      setCarregando(false)
      return
    }

    if (primeiroAcesso) {
      // Anti-robô simples: campo invisível preenchido ou formulário enviado em menos de 3 s = robô.
      if (armadilha || Date.now() - abertoEm < 3000) {
        setErro(t('erro.robo'))
        setCarregando(false)
        return
      }
      if (senha.length < 8) {
        setErro(t('erro.senhaCurta'))
        setCarregando(false)
        return
      }
      try {
        // O nome do escritório segue o padrão da casa: tudo em letras maiúsculas, sem espaços sobrando.
        const nomeEscritorio = escritorio.toUpperCase().replace(/\s+/g, ' ').trim()
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { escritorio: nomeEscritorio } } })
        if (error) setErro(/rate limit/i.test(error.message ?? '') ? t('erro.muitasContas') : t('erro.criarAcessoPrefixo') + mensagemAmigavel(error))
        else if (data?.session) seguir() // sem confirmação de e-mail: já entra; se o escritório existe, cai na tela de espera
        else {
          setAvisoCadastro(t('login.avisoContaCriada'))
          setPrimeiroAcesso(false)
        }
      } catch {
        setErro(t('erro.criarAcesso'))
      } finally {
        setCarregando(false)
      }
      return
    }

    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
      if (!error) { if (await precisaCodigo()) setPedirCodigo(true); else seguir() }
      else if (/not confirmed/i.test(error.message ?? '')) setErro(t('erro.emailNaoConfirmado'))
      else if (error.status === 400 || error.status === 401 || /invalid/i.test(mensagemAmigavel(error))) setErro(t('erro.credenciais'))
      else setErro(t('erro.servidorPrefixo') + mensagemAmigavel(error) + t('erro.servidorSufixo'))
    } catch {
      setErro(t('erro.servidor'))
    } finally {
      setCarregando(false)
    }
  }

  return (
    <main className="min-h-screen bg-navy px-4 py-10 md:py-14" style={marca ? { backgroundColor: marca.cor } : undefined}>
      <div className="mx-auto w-full max-w-6xl">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,28rem)]">
        {/* Lado de quem chega: o Instituto inteiro, não só o jurídico. Em domínio de escritório
            parceiro (marca própria) este lado mostra só a marca dele. */}
        <div className="porta text-center lg:text-left" data-testid="porta-instituto">
          <div className="flex justify-center lg:justify-start mb-6">
            <Marca tamanho="grande" marca={marca} tipo="instituto" subtitulo={t('marca.instituto')} />
          </div>
          {!marca && doSegmento && (
            <div data-testid="entrada-do-segmento">
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-300">{t('login.entradaDoSegmento')}</p>
              <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-6xl">{nomeDestino}</h1>
              {vertenteDestino && (
                <>
                  <p className="mt-6 text-lg leading-relaxed text-neutral-100">{t(`vertente.${vertenteDestino.id}.resumo` as Chave)}</p>
                  <ul className="mt-6 space-y-2 text-left">
                    {t(`vertente.${vertenteDestino.id}.dentro` as Chave).split(' | ').map(item => (
                      <li key={item} className="flex gap-3 text-base text-neutral-100">
                        <span aria-hidden="true" className="text-neutral-400">—</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <Link
                to="/login"
                title={t('login.voltarTodasDica')}
                data-testid="voltar-todos-segmentos"
                className="mt-8 inline-flex items-center py-3 text-base text-[#fff] underline decoration-neutral-400 underline-offset-4 hover:decoration-[#fff]"
              >
                <span aria-hidden="true">←&nbsp;</span>{t('login.voltarTodas')}
              </Link>
            </div>
          )}
          {!marca && !doSegmento && (
            <>
              <p className="text-sm font-medium uppercase tracking-[0.25em] text-neutral-300">{t('boasVindas.instituto')}</p>
              <h1 className="mt-4 font-serif text-5xl leading-[1.05] md:text-6xl">{t('porta.promessa')}</h1>
              <p className="mt-6 text-lg leading-relaxed text-neutral-100">{t('porta.chamada')}</p>
              <p className="mt-2 text-base text-neutral-300">{t('porta.apoio')}</p>
              <a
                href="#frentes"
                onClick={e => { e.preventDefault(); document.getElementById('frentes')?.scrollIntoView({ behavior: 'smooth' }) }}
                title={t('porta.verFrentesDica')}
                data-testid="porta-ver-frentes"
                className="mt-8 inline-block bg-[#fff] px-6 py-3 text-sm font-semibold uppercase tracking-wider text-[#000] no-underline transition hover:bg-neutral-200"
              >
                {t('porta.conhecer')} <span aria-hidden="true">↓</span>
              </a>
              <ProvaDaPorta />
            </>
          )}
        </div>

        <div>
        <div className="cartao-entrada rounded-sm p-8 md:p-10" data-testid="cartao-entrada">
          {!doSegmento && !marca && (
            <p data-testid="so-membros" className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-grafite">{t('login.soMembros')}</p>
          )}
          <h1 className="font-serif text-2xl text-navy text-center" data-testid="titulo-do-cartao">
            {doSegmento ? `${t('vertentes.entrarEm')} ${nomeDestino}` : NOME_PLATAFORMA}
          </h1>
          <p className="text-sm text-grafite-claro text-center mt-2 mb-7">
            {primeiroAcesso ? t('login.subtituloCadastro') : t('login.subtitulo')}
          </p>

          {erro && (
            <div role="alert" className="mb-5 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
              {erro}
            </div>
          )}

          {avisoCadastro && (
            <div role="status" className="mb-5 p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">
              {avisoCadastro}
            </div>
          )}

          {primeiroAcesso && (
            <div role="status" className="mb-5 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
              {t('login.avisoPrimeiroAcesso')}
            </div>
          )}

          {avisoRecuperacao && (
            <div role="status" className="mb-5 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
              {supabaseConfigurado ? t('login.avisoRecuperacao') : t('login.avisoRecuperacaoSemBanco')}
            </div>
          )}

          {pedirCodigo ? (
            <form onSubmit={verificarCodigo} className="space-y-5" data-testid="form-2fa">
              <p className="text-sm text-grafite">{t('login.codigoPedido')}</p>
              <input aria-label={t('login.codigoRotulo')} inputMode="numeric" autoFocus maxLength={7} value={codigo} onChange={e => setCodigo(e.target.value)} className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm tracking-widest" />
              {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
              <button type="submit" disabled={carregando} title={t('login.confirmarCodigoTitulo')} className="w-full bg-navy text-white py-3 rounded-sm uppercase tracking-wider text-sm">{t('login.confirmarCodigo')}</button>
              <button type="button" onClick={async () => { await supabase.auth.signOut(); setPedirCodigo(false); setCodigo('') }} title={t('login.outraContaTitulo')} className="w-full text-sm underline text-grafite">{t('login.outraConta')}</button>
            </form>
          ) : (
          <form onSubmit={entrar} className="space-y-5">
            <input type="text" name="site" tabIndex={-1} autoComplete="off" aria-hidden="true" value={armadilha} onChange={e => setArmadilha(e.target.value)} className="absolute opacity-0 h-0 w-0 pointer-events-none" />
            <div>
              <label htmlFor="email" className="block text-xs uppercase tracking-wider text-grafite mb-2">
                {t('login.email')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado"
              />
            </div>

            <div>
              <label htmlFor="senha" className="block text-xs uppercase tracking-wider text-grafite mb-2">
                {t('login.senha')}
              </label>
              <input
                id="senha"
                name="senha"
                type="password"
                autoComplete={primeiroAcesso ? 'new-password' : 'current-password'}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado"
              />
            </div>

            {primeiroAcesso && (
              <div>
                <label htmlFor="escritorio" className="block text-xs uppercase tracking-wider text-grafite mb-2" title={t('login.escritorioRotuloTitulo')}>
                  {t('login.escritorio')}
                </label>
                <input
                  id="escritorio"
                  name="escritorio"
                  type="text"
                  data-testid="campo-escritorio"
                  value={escritorio}
                  onChange={(e) => setEscritorio(e.target.value.toUpperCase())}
                  required
                  placeholder={t('login.escritorioExemplo')}
                  title={t('login.escritorioCampoTitulo')}
                  className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado uppercase"
                />
                <p className="text-xs text-grafite-claro mt-1">{t('login.escritorioAjuda')}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={carregando}
              title={primeiroAcesso ? t('login.criarAcessoTitulo') : t('login.entrarTitulo')}
              className="w-full bg-navy hover:bg-navy-700 disabled:bg-grafite-claro text-white tracking-wider uppercase text-sm py-3 rounded-sm transition"
            >
              {carregando ? t('login.aguarde') : primeiroAcesso ? t('login.criarAcesso') : t('login.entrar')}
            </button>
          </form>
          )}

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setErro('')
                setAvisoRecuperacao(true)
              }}
              title={t('login.esqueciSenhaTitulo')}
              className="inline-flex items-center min-h-[44px] text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
            >
              {t('login.esqueciSenha')}
            </button>
            {supabaseConfigurado && (
              <button
                type="button"
                onClick={() => {
                  setErro('')
                  setAvisoCadastro('')
                  setPrimeiroAcesso(v => !v)
                }}
                title={primeiroAcesso ? t('login.jaTenhoAcessoTitulo') : t('login.criarContaTitulo')}
                className="block mx-auto mt-3 min-h-[44px] text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
              >
                {primeiroAcesso ? t('login.jaTenhoAcesso') : t('login.criarConta')}
              </button>
            )}
          </div>
        </div>

        {!doSegmento && !marca && (
          <p data-testid="outros-segmentos" className="mt-5 text-center text-base leading-relaxed text-neutral-100">
            {t('login.outrosSegmentos')}
          </p>
        )}

        {/* Fileira de idiomas: sempre visivel na primeira tela, troca a lingua na hora. */}
        <SeletorIdioma />
        </div>
      </div>

        {/* Pedido de M (13/11/2026): depois de escolher a lingua, a pessoa tem de ver TODAS as
            vertentes do Instituto, nao so a juridica, mesmo as que estao em desenvolvimento.
            Nada aqui abre sem senha: cada quadradinho traz a pessoa de volta a esta entrada,
            lembrando para qual tela ela quer ir depois da senha.
            Ordem (passo V13): primeiro as frentes, que respondem "o que é isto", depois o caderno
            de produtos e o apoio. Em 21:35 M tinha pedido os produtos em cima; às 23:04 pediu a
            página na ordem de quem compra, e é esta. */}
        {!doSegmento && (
          <>
            <Vertentes />
            <Produtos />
            <Doacoes />
          </>
        )}
      </div>
    </main>
  )
}
