import { useEffect, useState } from 'react'
import { mensagemAmigavel } from '@/lib/erros'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import Marca from '@/components/Marca'
import { NOME_PLATAFORMA } from '@/lib/plataforma'
import { marcaPorDominio, esquecerMarca, type MarcaEscritorio } from '@/lib/marca'
import { esquecerEscritorio, ehInstituto } from '@/lib/equipe'
import { SimboloOuro } from '@/components/EntradaMembros'
import { useTexto } from '@/lib/i18n'
import SeletorIdioma from '@/components/SeletorIdioma'
import Vertentes from '@/components/Vertentes'
import Produtos from '@/components/Produtos'
import Doacoes from '@/components/Doacoes'
import { destinoSeguro, DESTINO_PADRAO, DESTINOS_PERMITIDOS, lembrarUltimaFrente, ehEntradaAdmin } from '@/lib/destino'
import AberturaInstituto from '@/components/AberturaInstituto'
import { VERTENTES } from '@/data/vertentes'
import type { Chave } from '@/lib/i18n'
import { acessoEmail } from '@/lib/acessoEmail'
import { problemaDaSenha } from '@/lib/senha'
import { captchaLigado } from '@/lib/captcha'
import CaptchaRobo from '@/components/CaptchaRobo'

// Lista de casa dos escritórios clientes: vale enquanto o banco não devolve o registro.
const ESCRITORIOS_DA_CASA = ['SARDAS E MENEZES']
const OUTRO = '__outro__'

/** Tira de um endereço colado o que serve para abrir a troca de senha: o código do link do e-mail ou a sessão que veio na página de erro. */
export function lerLinkDeSenha(texto: string): { token?: string; acesso?: string; renovacao?: string } {
  const t = texto.trim()
  const pega = (nome: string) => { const m = t.match(new RegExp(`[?&#]${nome}=([^&#\\s]+)`)); return m ? decodeURIComponent(m[1]) : undefined }
  return { token: pega('token') ?? pega('token_hash'), acesso: pega('access_token'), renovacao: pega('refresh_token') }
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  // Comprovante da caixinha "não sou robô": o servidor recusa a entrada com senha sem ele. Vale para um pedido só.
  const [comprovante, setComprovante] = useState('')
  const [rodadaRobo, setRodadaRobo] = useState(0)
  const [armadilha, setArmadilha] = useState('')
  const [abertoEm] = useState(() => Date.now())
  // Passo D22: em domínio próprio de parceiro, a tela de entrada mostra a marca dele.
  const [marca, setMarca] = useState<MarcaEscritorio | null>(null)
  useEffect(() => { esquecerMarca(); esquecerEscritorio(); marcaPorDominio().then(setMarca).catch(() => setMarca(null)) }, [])
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [avisoRecuperacao, setAvisoRecuperacao] = useState(false)
  const [emailRecuperar, setEmailRecuperar] = useState('')
  const [recuperacaoEnviada, setRecuperacaoEnviada] = useState(false)

  // Manda o link de criar ou trocar a senha para o e-mail. A resposta é sempre a mesma, para não revelar contas.
  const pedirLinkRecuperacao = async (e: React.FormEvent) => {
    e.preventDefault()
    setCarregando(true)
    try {
      // Primeiro o envio da casa (sem o limite de poucos e-mails por hora); o do Supabase fica de reserva.
      const r = await acessoEmail({ acao: 'recuperar', email: emailRecuperar.trim() })
      if (r.indisponivel) await supabase.auth.resetPasswordForEmail(emailRecuperar.trim(), { redirectTo: `${window.location.origin}/?redefinir=1` })
    } catch { /* mesma resposta de qualquer forma */ }
    setRecuperacaoEnviada(true)
    setCarregando(false)
  }
  // Saída para quando o link do e-mail não abre (por exemplo, volta para um endereço errado):
  // a pessoa cola o link aqui e a própria plataforma abre a tela de criar a senha (M, 19/11/2026).
  const [linkColado, setLinkColado] = useState('')
  const [erroLink, setErroLink] = useState('')
  const abrirPeloLinkColado = async (e: React.FormEvent) => {
    e.preventDefault()
    setErroLink(''); setCarregando(true)
    try {
      const partes = lerLinkDeSenha(linkColado)
      const { error } = partes.acesso && partes.renovacao
        ? await supabase.auth.setSession({ access_token: partes.acesso, refresh_token: partes.renovacao })
        : partes.token
          ? await supabase.auth.verifyOtp({ token_hash: partes.token, type: 'recovery' })
          : { error: new Error('sem token') }
      if (error) setErroLink('Este link não serve mais (cada link só vale uma vez e por pouco tempo). Peça um novo em "Esqueci minha senha" e cole aqui sem abrir.')
      else window.location.assign(`${window.location.origin}/?redefinir=1`)
    } catch {
      setErroLink('Não consegui ler este link. Copie o endereço inteiro e cole de novo.')
    } finally {
      setCarregando(false)
    }
  }
  const [primeiroAcesso, setPrimeiroAcesso] = useState(false)
  const [escritorio, setEscritorio] = useState('')
  // Registro dos escritórios clientes: a pessoa escolhe o dela numa lista (pedido de M, 19/11/2026).
  // A lista vem do banco; enquanto ele não responde, vale a lista de casa. Escolher um escritório
  // só cria um pedido de entrada: ninguém vê nada antes de o responsável liberar.
  const [listaEscritorios, setListaEscritorios] = useState<string[]>(ESCRITORIOS_DA_CASA)
  const [escolha, setEscolha] = useState('')
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
    : !pedidoValido ? '' : destino === '/caderno-de-produtos' ? t('produtos.titulo') : ehEntradaAdmin(destino) ? t('login.entradaAdministracao') : ''
  const doSegmento = !!nomeDestino
  useEffect(() => {
    if (!doSegmento) return
    window.scrollTo({ top: 0 })
    document.getElementById('email')?.focus({ preventScroll: true })
  }, [doSegmento, destino])
  // Pedido de M (19/11/2026): a entrada com e-mail e senha não fica na primeira tela. Ela só aparece
  // depois que a pessoa clica no quadradinho da frente dela (ou em domínio próprio de escritório).
  // Pedido de M (21/11/2026): tudo segmentado. Cada quadradinho (Projetos sociais, Engenharia…) e o
  // símbolo do ouro (administração do Instituto) abrem o SEU quadro de e-mail e senha, com o nome
  // daquela plataforma. Nenhum deles manda mais para a entrada da Plataforma jurídica.
  const mostrarCartao = doSegmento || !!marca || pedirCodigo
  // Pedido de M (21/11/2026 04h34): cada nicho tem a sua área de login e os SEUS clientes.
  // O quadradinho diz o segmento; a lista suspensa do Criar conta mostra só os clientes dele.
  const nichoDestino = destino === '/inicio' ? 'juridico' : (vertenteDestino?.id ?? '')
  useEffect(() => {
    let vivo = true
    ;(async () => {
      try {
        // A lista vem do banco, filtrada pelo segmento. Enquanto o banco não conhece o filtro
        // (COLE-ISTO-156), o jurídico cai na lista antiga e os outros segmentos ficam vazios.
        let r = await supabase.rpc('escritorios_para_cadastro', { p_nicho: nichoDestino || null })
        if (r.error && nichoDestino === 'juridico') r = await supabase.rpc('escritorios_para_cadastro')
        const nomes = r.error ? [] : ((r.data ?? []) as unknown[]).map(x => String(typeof x === 'string' ? x : (x as { nome?: string })?.nome ?? '').trim().toUpperCase()).filter(Boolean)
        if (!vivo) return
        if (nomes.length > 0) setListaEscritorios([...new Set(nomes)].sort((a, b) => a.localeCompare(b, 'pt')))
        else setListaEscritorios(nichoDestino === 'juridico' ? ESCRITORIOS_DA_CASA : [])
      } catch { if (vivo) setListaEscritorios(nichoDestino === 'juridico' ? ESCRITORIOS_DA_CASA : []) }
    })()
    return () => { vivo = false }
  }, [nichoDestino])
  // O cadastro pede o escritório da lista do segmento. A administração não tem Criar conta:
  // lá só entra quem já é administração do Instituto.
  const permiteCadastro = destino === '/inicio' || !!marca || (doSegmento && !!vertenteDestino)
  // Entrada geral: quem escolheu a língua e chegou sem segmento nem marca de escritório parceiro.
  const entradaGeral = !marca && !doSegmento && !mostrarCartao
  // Entrada administrativa (M, 21/11/2026): login e senha só da administração do Instituto. Quem
  // não está na lista de administradores (configuracoes.instituto_admins, conferida no banco por
  // eh_admin_instituto) é desconectado na hora e fica nesta tela, sem cair em outra plataforma.
  const entradaAdmin = pedidoValido && ehEntradaAdmin(destino) && !marca
  const seguir = async () => {
    if (entradaAdmin) {
      esquecerEscritorio()
      let ok = false
      try { ok = await ehInstituto() } catch { ok = false }
      if (!ok) {
        esquecerEscritorio()
        await supabase.auth.signOut()
        setPedirCodigo(false)
        setErro(t('login.soAdministracao'))
        return
      }
    }
    lembrarUltimaFrente(destino); navigate(destino)
  }

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
      else await seguir()
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
      // O campo invisível deixou de barrar aqui: o preenchimento automático do navegador às vezes o
      // preenche e pessoas de verdade eram recusadas. Ele segue para o servidor, que decide.
      if (Date.now() - abertoEm < 3000) {
        setErro(t('erro.robo'))
        setCarregando(false)
        return
      }
      const faltaNaSenha = problemaDaSenha(senha)
      if (faltaNaSenha) {
        setErro(faltaNaSenha)
        setCarregando(false)
        return
      }
      try {
        // O nome do escritório segue o padrão da casa: tudo em letras maiúsculas, sem espaços sobrando.
        const nomeEscritorio = (escolha === OUTRO ? escritorio : escolha).toUpperCase().replace(/\s+/g, ' ').trim()
        const r = await acessoEmail({ acao: 'cadastrar', email: email.trim(), senha, escritorio: nomeEscritorio })
        if (r.ok) { setAvisoCadastro(t('login.avisoContaCriada')); setPrimeiroAcesso(false); return }
        if (!r.indisponivel) { setErro(r.erro ?? t('erro.criarAcesso')); return }
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

    if (captchaLigado() && !comprovante) {
      setErro('Marque a caixinha "não sou robô" antes de entrar.')
      setCarregando(false)
      return
    }
    try {
      const { error } = await supabase.auth.signInWithPassword(captchaLigado() ? { email, password: senha, options: { captchaToken: comprovante } } : { email, password: senha })
      if (captchaLigado()) setRodadaRobo(n => n + 1)
      if (!error) { if (await precisaCodigo()) setPedirCodigo(true); else await seguir() }
      else if (/captcha/i.test(error.message ?? '')) setErro(mensagemAmigavel(error))
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
      {/* Entrada geral, sem segmento e sem marca de parceiro: a abertura do Instituto refeita em
          20/11/2026 (tela cheia, história, ontologia, frentes). Pedido de M nesta mesma tela. */}
      {entradaGeral && <div className="-mx-4 -mt-10 md:-mt-14"><AberturaInstituto /></div>}
      <div className="mx-auto w-full max-w-6xl">
      {/* Entrada administrativa: tela própria, centrada, com o símbolo do ouro em destaque (M, 21/11/2026:
          "tá no cantinho, melhora"). Nada de vitrine de frentes nem de plataforma jurídica aqui. */}
      {entradaAdmin && (
        <div className="porta mx-auto mb-10 flex max-w-xl flex-col items-center pt-6 text-center" data-testid="cabecalho-administracao">
          <SimboloOuro largura={180} className="drop-shadow-[0_0_24px_rgba(201,162,74,0.45)]" />
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.35em] text-[#C9A24A]">{t('login.areaAdministrativa')}</p>
          <h1 className="mt-4 font-serif text-4xl leading-tight tracking-[0.12em] md:text-5xl">INSTITUTO THEYE</h1>
          <p data-testid="resumo-administracao" className="mt-5 text-base leading-relaxed text-neutral-200">{t('login.entradaAdministracaoResumo')}</p>
        </div>
      )}
      <div className={entradaAdmin ? 'mx-auto grid w-full max-w-md' : mostrarCartao ? 'grid items-center gap-10 lg:grid-cols-[1fr_minmax(0,28rem)]' : 'grid items-center gap-8'}>
        {/* Lado de quem chega: o Instituto inteiro, não só o jurídico. Em domínio de escritório
            parceiro (marca própria) este lado mostra só a marca dele. */}
        {!entradaGeral && !entradaAdmin && (
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
        </div>
        )}

        <div>
        {mostrarCartao && (
        <div className="cartao-entrada rounded-sm p-8 md:p-10" data-testid="cartao-entrada">
          {!marca && (
            <p data-testid="so-membros" className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-grafite">{t('login.soMembros')}</p>
          )}
          <h1 className="font-serif text-2xl text-navy text-center" data-testid="titulo-do-cartao">
            {entradaAdmin ? t('login.areaAdministrativa') : doSegmento ? `${t('vertentes.entrarEm')} ${nomeDestino}` : NOME_PLATAFORMA}
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
              {!supabaseConfigurado && t('login.avisoRecuperacaoSemBanco')}
              {supabaseConfigurado && !recuperacaoEnviada && (
                <form onSubmit={pedirLinkRecuperacao} className="space-y-3" data-testid="form-recuperar">
                  <p>{t('login.avisoRecuperacao')}</p>
                  <input
                    type="email"
                    autoComplete="email"
                    required
                    aria-label="E-mail da conta"
                    value={emailRecuperar}
                    onChange={e => setEmailRecuperar(e.target.value)}
                    className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm bg-white text-grafite"
                  />
                  <button type="submit" disabled={carregando} title="Manda para o e-mail o link para criar ou trocar a senha" className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-60">
                    {carregando ? 'Enviando…' : 'Enviar link'}
                  </button>
                </form>
              )}
              {supabaseConfigurado && recuperacaoEnviada && (
                <div className="space-y-3">
                  <p>Se este e-mail estiver cadastrado, o link chega em alguns minutos. Confira também a caixa de spam.</p>
                  <form onSubmit={abrirPeloLinkColado} className="space-y-2" data-testid="form-link-colado">
                    <p>O link do e-mail não abriu? No e-mail, clique no link com o botão direito, escolha "Copiar endereço do link" e cole aqui. Também serve o endereço da página que deu erro.</p>
                    <input
                      type="text"
                      required
                      aria-label="Endereço do link que chegou no e-mail"
                      data-testid="campo-link-colado"
                      value={linkColado}
                      onChange={e => setLinkColado(e.target.value)}
                      className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm bg-white text-grafite"
                    />
                    <button type="submit" disabled={carregando} title="Abre a tela de criar a senha nova usando o link colado" className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-60">
                      {carregando ? 'Abrindo…' : 'Criar senha nova'}
                    </button>
                    {erroLink && <p role="alert" className="text-critico">{erroLink}</p>}
                  </form>
                </div>
              )}
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
                <label htmlFor="lista-escritorio" className="block text-xs uppercase tracking-wider text-grafite mb-2" title={t('login.qualEscritorioTitulo')}>
                  {t('login.qualEscritorio')}
                </label>
                <select
                  id="lista-escritorio"
                  name="lista-escritorio"
                  data-testid="lista-escritorio"
                  value={escolha}
                  onChange={(e) => setEscolha(e.target.value)}
                  required
                  title={t('login.qualEscritorioTitulo')}
                  className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white"
                >
                  <option value="">{t('login.escolhaEscritorio')}</option>
                  {listaEscritorios.map(n => <option key={n} value={n}>{n}</option>)}
                  <option value={OUTRO}>{t('login.escritorioForaDaLista')}</option>
                </select>
                <p className="text-xs text-grafite-claro mt-1">{t('login.qualEscritorioAjuda')}</p>
                {listaEscritorios.length === 0 && (
                  <p className="text-xs text-atencao mt-1" data-testid="sem-escritorios-do-segmento">{t('login.semEscritoriosDoSegmento')}</p>
                )}
                {escolha === OUTRO && (
                  <div className="mt-3">
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
                    <p className="text-xs text-grafite-claro mt-1">{t('login.escritorioForaAjuda')}</p>
                  </div>
                )}
              </div>
            )}

            {!primeiroAcesso && captchaLigado() && <CaptchaRobo aoMudar={setComprovante} rodada={rodadaRobo} />}

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
                if (!emailRecuperar) setEmailRecuperar(email)
                setAvisoRecuperacao(true)
              }}
              title={t('login.esqueciSenhaTitulo')}
              className="inline-flex items-center min-h-[44px] text-sm text-navy underline underline-offset-4 hover:text-dourado-escuro"
            >
              {t('login.esqueciSenha')}
            </button>
            {supabaseConfigurado && permiteCadastro && (
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

        )}

        {!doSegmento && !marca && (
          <p data-testid="outros-segmentos" className="mt-5 text-center text-base leading-relaxed text-neutral-100">
            {t('login.outrosSegmentos')}
          </p>
        )}

        {/* Fileira de idiomas: sempre visivel na primeira tela, troca a lingua na hora. */}
        {!entradaGeral && <SeletorIdioma />}
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
