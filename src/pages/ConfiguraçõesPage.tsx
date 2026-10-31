import { useEffect, useState } from 'react'
import DoisFatores from '../components/DoisFatores'
import EstiloEscrita from '../components/EstiloEscrita'
import AvaliacaoSUS from '../components/AvaliacaoSUS'
import Layout from '@/components/Layout'
import { Save, User, Bell, Sparkles, Eye, EyeOff, KeyRound, Mail } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { estadoChaveIA, removerChaveIA, salvarChaveIA, testarChaveIA, type EstadoChaveIA } from '@/lib/ia'
import { perfilAtual, rotuloFuncao, type Funcao } from '@/lib/equipe'
import SecaoPix from '@/components/SecaoPix'

const CHAVE = 'preferencias-usuario'

interface Preferencias {
  nomeCompleto: string
  email: string
  notificacoes: boolean
  alertasEmail: boolean
  diasAntecedencia: number
}

const padrao: Preferencias = {
  nomeCompleto: 'Leticia Sardas',
  email: 'leticia@sardasmenezes.adv.br',
  notificacoes: true,
  alertasEmail: true,
  diasAntecedencia: 30,
}

function carregar(): Preferencias {
  try {
    const salvo = localStorage.getItem(CHAVE)
    return salvo ? { ...padrao, ...JSON.parse(salvo) } : padrao
  } catch {
    return padrao
  }
}

export default function ConfiguraçõesPage() {
  const [prefs, setPrefs] = useState<Preferencias>(carregar)
  const [aviso, setAviso] = useState('')
  const [erro, setErro] = useState('')
  const [perfil, setPerfil] = useState<Funcao | null | 'carregando'>('carregando')

  useEffect(() => {
    perfilAtual().then(setPerfil).catch(() => setPerfil(null))
  }, [])

  const salvar = (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (prefs.diasAntecedencia < 1 || prefs.diasAntecedencia > 180) {
      setErro('A antecedência deve ficar entre 1 e 180 dias.')
      return
    }
    try {
      // TODO: gravar em supabase.from('preferencias') quando houver banco
      localStorage.setItem(CHAVE, JSON.stringify(prefs))
      setAviso('Preferências salvas.')
      setTimeout(() => setAviso(''), 4000)
    } catch {
      setErro('Não foi possível salvar neste navegador.')
    }
  }

  const campo = 'w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white'
  const rotulo = 'block text-xs uppercase tracking-wider text-grafite mb-2'

  return (
    <Layout title="Configurações">
      <p className="text-sm text-grafite-claro mb-6 max-w-2xl">
        Gerencie seu perfil, preferências de notificações e acesso à inteligência artificial para análise de contratos.
      </p>
      <form onSubmit={salvar} className="max-w-2xl space-y-6" noValidate>
        {aviso && (
          <p role="status" className="p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">
            ✓ {aviso}
          </p>
        )}
        {erro && (
          <p role="alert" className="p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
            ⚠ {erro}
          </p>
        )}

        <fieldset className="bg-white p-6 shadow-sm border-t-2 border-dourado">
          <legend className="sr-only">Perfil</legend>
          <h2 className="text-lg mb-1 flex items-center gap-2">
            <User size={18} className="text-dourado" aria-hidden="true" />
            Perfil
          </h2>
          <p className="text-sm text-grafite-claro mb-5">Informações pessoais e função na equipe.</p>
          <div className="space-y-5">
            <div>
              <label htmlFor="nome" className={rotulo}>Nome completo</label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                value={prefs.nomeCompleto}
                onChange={e => setPrefs({ ...prefs, nomeCompleto: e.target.value })}
                className={`${campo} focus:ring-1 focus:ring-dourado/30 transition`}
              />
            </div>
            <div>
              <label htmlFor="email" className={rotulo}>E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={prefs.email}
                onChange={e => setPrefs({ ...prefs, email: e.target.value })}
                className={`${campo} focus:ring-1 focus:ring-dourado/30 transition`}
              />
              <p className="text-xs text-grafite-claro mt-1.5">Usado para notificações e recuperação de acesso.</p>
            </div>
            <div>
              <span className={rotulo}>Perfil de acesso</span>
              <p className="px-3 py-2.5 bg-pergaminho border border-grafite-claro/30 rounded-sm text-grafite text-sm min-h-[44px] flex items-center">
                {perfil === 'carregando' ? 'Consultando…' : rotuloFuncao[perfil ?? 'nenhuma']}
              </p>
              <p className="text-xs text-grafite-claro mt-1.5">Definido pelo administrador. Controla quem pode fazer o quê na plataforma.</p>
            </div>
          </div>
        </fieldset>

        <fieldset className="bg-white p-6 shadow-sm border-t-2 border-dourado">
          <legend className="sr-only">Notificações</legend>
          <h2 className="text-lg mb-1 flex items-center gap-2">
            <Bell size={18} className="text-dourado" aria-hidden="true" />
            Notificações
          </h2>
          <p className="text-sm text-grafite-claro mb-5">Configure como você deseja ser notificada sobre vencimentos e eventos.</p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-grafite cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.notificacoes}
                onChange={e => setPrefs({ ...prefs, notificacoes: e.target.checked })}
                className="h-4 w-4 accent-navy cursor-pointer"
              />
              <span>Mostrar notificações dentro da plataforma</span>
            </label>
            <label className="flex items-center gap-3 text-sm text-grafite cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.alertasEmail}
                onChange={e => setPrefs({ ...prefs, alertasEmail: e.target.checked })}
                className="h-4 w-4 accent-navy cursor-pointer"
              />
              <span>Enviar alertas também por e-mail</span>
            </label>
            <div className="pt-5 border-t border-navy/10">
              <label htmlFor="antecedencia" className={rotulo}>
                Antecedência dos alertas (dias)
              </label>
              <input
                id="antecedencia"
                type="number"
                inputMode="numeric"
                min={1}
                max={180}
                value={prefs.diasAntecedencia}
                onChange={e => setPrefs({ ...prefs, diasAntecedencia: Number(e.target.value) })}
                aria-describedby="ajuda-antecedencia"
                className="w-28 px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado focus:ring-1 focus:ring-dourado/30 transition"
              />
              <p id="ajuda-antecedencia" className="text-xs text-grafite-claro mt-2">
                Você será avisada com antecedência de N dias antes de cada vencimento. Recomendado: 7–30 dias.
              </p>
            </div>
          </div>
        </fieldset>

        <button
          type="submit"
          className="w-full bg-navy hover:bg-navy-700 text-white py-3 rounded-sm uppercase tracking-wider text-sm flex items-center justify-center gap-2"
        >
          <Save size={18} aria-hidden="true" />
          Salvar preferências
        </button>
      </form>

      <SecaoSenha />
      <DoisFatores />
      <SecaoChaveIA />
      <EstiloEscrita />
      <SecaoEmail />
      <SecaoEscavador />
      <SecaoIcs />
      <SecaoPix />
      <AvaliacaoSUS />
    </Layout>
  )
}

function SecaoSenha() {
  const [nova, setNova] = useState('')
  const [confirma, setConfirma] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const salvar = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (nova.length < 8) {
      setMsg({ tipo: 'erro', texto: 'A nova senha precisa ter pelo menos 8 caracteres.' })
      return
    }
    if (nova !== confirma) {
      setMsg({ tipo: 'erro', texto: 'As duas senhas não são iguais.' })
      return
    }
    setOcupado(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: nova })
      if (error) throw new Error(error.message)
      setNova('')
      setConfirma('')
      setMsg({ tipo: 'ok', texto: 'Senha alterada. Use a nova senha no próximo acesso.' })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível alterar a senha.' })
    } finally {
      setOcupado(false)
    }
  }

  const campo = 'w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white'

  return (
    <section aria-labelledby="senha" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado">
      <h2 id="senha" className="text-lg mb-3 flex items-center gap-2">
        <KeyRound size={18} className="text-dourado" aria-hidden="true" />
        Senha
      </h2>
      {!supabaseConfigurado ? (
        <p className="text-sm text-grafite-claro">Na demonstração a senha é fixa. Na produção, cada pessoa troca a própria senha aqui.</p>
      ) : (
        <form onSubmit={salvar} noValidate className="space-y-4">
          {msg && (
            <p
              role={msg.tipo === 'erro' ? 'alert' : 'status'}
              className={`p-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
            >
              {msg.texto}
            </p>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="nova-senha" className="block text-xs uppercase tracking-wider text-grafite mb-2">Nova senha</label>
              <input
                id="nova-senha"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                value={nova}
                onChange={e => setNova(e.target.value)}
                aria-describedby="ajuda-senha"
                className={campo}
              />
            </div>
            <div>
              <label htmlFor="confirma-senha" className="block text-xs uppercase tracking-wider text-grafite mb-2">Repita a nova senha</label>
              <input
                id="confirma-senha"
                type={mostrar ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirma}
                onChange={e => setConfirma(e.target.value)}
                className={campo}
              />
            </div>
          </div>
          <p id="ajuda-senha" className="text-xs text-grafite-claro">Pelo menos 8 caracteres. Vale só para o seu acesso.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={ocupado || !nova || !confirma}
              className="min-h-[44px] bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 text-white px-5 rounded-sm text-sm uppercase tracking-wider"
            >
              {ocupado ? 'Alterando…' : 'Alterar senha'}
            </button>
            <button
              type="button"
              onClick={() => setMostrar(!mostrar)}
              aria-pressed={mostrar}
              className="min-h-[44px] px-4 border border-navy/30 text-navy hover:bg-pergaminho text-sm"
            >
              {mostrar ? 'Ocultar senhas' : 'Mostrar senhas'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}

/**
 * Chave da IA informada pelo administrador dentro da plataforma. O valor vai
 * direto ao servidor; o navegador só recebe o estado (definida, data, final).
 */
function SecaoChaveIA() {
  const [estado, setEstado] = useState<EstadoChaveIA | null>(null)
  const [chave, setChave] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [ocupado, setOcupado] = useState<'' | 'salvando' | 'testando' | 'removendo'>('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = async () => {
    try {
      setEstado(await estadoChaveIA())
    } catch (e) {
      setMsg({ tipo: 'erro', texto: 'Não foi possível consultar a chave: ' + (e instanceof Error ? e.message : 'erro desconhecido') })
    }
  }

  useEffect(() => {
    if (supabaseConfigurado) carregar()
  }, [])

  const salvar = async () => {
    setOcupado('salvando')
    setMsg(null)
    try {
      await salvarChaveIA(chave)
      setChave('')
      setMostrar(false)
      setMsg({ tipo: 'ok', texto: 'Chave salva no servidor. Clique em "Testar a IA" para confirmar que ela funciona.' })
      await carregar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível salvar a chave.' })
    } finally {
      setOcupado('')
    }
  }

  const testar = async () => {
    setOcupado('testando')
    setMsg(null)
    try {
      const r = await testarChaveIA()
      setMsg({ tipo: 'ok', texto: `A IA respondeu. Tudo certo para analisar contratos (modelo ${r.modelo}).` })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível testar a IA.' })
    } finally {
      setOcupado('')
    }
  }

  const remover = async () => {
    if (!window.confirm('Remover a chave da IA? A análise de contratos ficará indisponível até informar outra.')) return
    setOcupado('removendo')
    setMsg(null)
    try {
      await removerChaveIA()
      setMsg({ tipo: 'ok', texto: 'Chave removida.' })
      await carregar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível remover a chave.' })
    } finally {
      setOcupado('')
    }
  }

  const dataPt = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

  return (
    <section aria-labelledby="ia" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado">
      <h2 id="ia" className="text-lg mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-dourado" aria-hidden="true" />
        Inteligência artificial
      </h2>

      {!supabaseConfigurado ? (
        <p className="text-sm text-grafite-claro">
          Nesta versão de demonstração a análise de contratos usa exemplos. Na versão de produção, o administrador
          informa aqui a chave da IA.
        </p>
      ) : estado && !estado.permitido ? (
        <p className="text-sm text-grafite-claro">Somente administradores podem configurar a chave da IA.</p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm" aria-live="polite">
            {estado === null
              ? 'Consultando…'
              : estado.definida
                ? `Chave configurada — termina em ····${estado.sufixo ?? ''}${estado.atualizadoEm ? `, atualizada em ${dataPt(estado.atualizadoEm)}` : ''}.`
                : 'Nenhuma chave configurada. A análise de contratos por IA fica indisponível até você informar uma.'}
          </p>
          <p className="text-xs text-grafite-claro">
            A chave é criada no site da Anthropic (
            <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 text-navy">
              console.anthropic.com
            </a>
            {' '}→ API Keys → Create Key). Ela fica guardada só no servidor, nunca aparece de novo e nunca vai para o navegador.
          </p>

          {msg && (
            <p
              role={msg.tipo === 'erro' ? 'alert' : 'status'}
              className={`p-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
            >
              {msg.texto}
            </p>
          )}

          <div>
            <label htmlFor="chave-ia" className="block text-xs uppercase tracking-wider text-grafite mb-2">
              Chave da IA
            </label>
            <div className="flex gap-2">
              <input
                id="chave-ia"
                type={mostrar ? 'text' : 'password'}
                value={chave}
                onChange={e => setChave(e.target.value)}
                placeholder="sk-ant-…"
                autoComplete="off"
                spellCheck={false}
                className="flex-1 min-w-0 px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setMostrar(!mostrar)}
                aria-pressed={mostrar}
                aria-label={mostrar ? 'Ocultar chave' : 'Mostrar chave'}
                className="min-h-[44px] px-3 border border-navy/30 text-navy hover:bg-pergaminho"
              >
                {mostrar ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={salvar}
              disabled={!chave.trim() || ocupado !== ''}
              className="min-h-[44px] bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 text-white px-5 rounded-sm text-sm uppercase tracking-wider"
            >
              {ocupado === 'salvando' ? 'Salvando…' : 'Salvar chave'}
            </button>
            <button
              type="button"
              onClick={testar}
              disabled={!estado?.definida || ocupado !== ''}
              className="min-h-[44px] px-5 border border-navy text-navy hover:bg-pergaminho disabled:opacity-50 text-sm"
            >
              {ocupado === 'testando' ? 'Testando…' : 'Testar a IA'}
            </button>
            {estado?.definida && (
              <button
                type="button"
                onClick={remover}
                disabled={ocupado !== ''}
                className="min-h-[44px] px-5 border border-critico text-critico hover:bg-criticoFundo disabled:opacity-50 text-sm"
              >
                {ocupado === 'removendo' ? 'Removendo…' : 'Remover'}
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}

/** Avisos de prazo: no Outlook/Google Agenda de cada pessoa e, com o Brevo ligado, também por e-mail. */
function SecaoEmail() {
  const [estado, setEstado] = useState<{ chave: boolean; remetente: string | null } | null>(null)
  const [chave, setChave] = useState('')
  const [remetente, setRemetente] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = async () => {
    const ler = async (c: string) => {
      const { data } = await supabase.rpc('estado_configuracao', { p_chave: c })
      return (Array.isArray(data) ? data[0] : data) as { permitido: boolean; definida: boolean; sufixo: string | null } | undefined
    }
    const [k, r] = await Promise.all([ler('brevo_api_key'), ler('email_remetente')])
    setEstado(k?.permitido ? { chave: k.definida, remetente: r?.definida ? `…${r.sufixo ?? ''}` : null } : null)
  }
  useEffect(() => { if (supabaseConfigurado) carregar() }, [])
  if (!supabaseConfigurado) return null

  const salvar = async () => {
    setOcupado('salvando'); setMsg(null)
    for (const [c, v] of [['email_remetente', remetente], ['brevo_api_key', chave]] as const) {
      if (!v.trim()) continue
      const { error } = await supabase.rpc('definir_configuracao', { p_chave: c, p_valor: v })
      if (error) { setOcupado(''); return setMsg({ tipo: 'erro', texto: error.message }) }
    }
    setOcupado(''); setChave(''); setRemetente('')
    setMsg({ tipo: 'ok', texto: 'Salvo. Clique em "Enviar e-mail de teste".' }); carregar()
  }
  const testar = async () => {
    setOcupado('testando'); setMsg(null)
    const { data, error } = await supabase.functions.invoke('agendar-notificacoes', { body: { teste: true } })
    setOcupado('')
    if (error || !data?.enviado) return setMsg({ tipo: 'erro', texto: 'O e-mail não saiu: ' + (data?.detalhe?.corpo ?? data?.motivo ?? error?.message ?? 'erro desconhecido') })
    setMsg({ tipo: 'ok', texto: `E-mail de teste enviado para ${(data.para as string[]).join(', ')}.` })
  }
  const ativo = !!(estado?.chave && estado.remetente)

  return (
    <section aria-labelledby="notif" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado">
      <h2 id="notif" className="text-lg mb-3 flex items-center gap-2">
        <Mail size={18} className="text-dourado" aria-hidden="true" /> Avisos de prazo
      </h2>
      <div className="space-y-3 text-sm">
        <p>No calendário: na <a href="#/agenda" className="underline text-navy">Agenda</a>, cada pessoa clica uma vez em <strong>Conectar ao Outlook</strong> ou <strong>Conectar ao Google Agenda</strong>. Os avisos entram nos dias marcados em cada contrato.</p>
        {estado && (
          <>
            <p aria-live="polite"><strong>Por e-mail:</strong> {ativo ? 'ativo. Toda manhã, às 8h, cada pessoa da equipe recebe os avisos do dia no próprio e-mail.' : 'falta ligar o serviço de envio (uma vez só, gratuito).'}</p>
            <ol className="text-xs text-grafite-claro list-decimal pl-5 space-y-1">
              <li>Crie a conta grátis em <a href="https://www.brevo.com/" target="_blank" rel="noopener noreferrer" className="underline text-navy">brevo.com</a> com o e-mail do escritório que vai enviar os avisos.</li>
              <li>Confirme o e-mail que o Brevo mandar para essa caixa.</li>
              <li>No Brevo, abra o menu do seu nome → <strong>SMTP &amp; API</strong> → <strong>API Keys</strong>, clique em <strong>Generate a new API key</strong> e copie (começa com xkeysib-).</li>
              <li>Cole abaixo, junto com o e-mail do passo 1, e clique em Salvar.</li>
            </ol>
            {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`p-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}>{msg.texto}</p>}
            <label htmlFor="remetente" className="block text-xs uppercase tracking-wider text-grafite">E-mail que envia os avisos {estado.remetente && <span className="normal-case">(atual: {estado.remetente})</span>}</label>
            <input id="remetente" type="email" value={remetente} onChange={e => setRemetente(e.target.value)} placeholder="avisos@lsm.law"
              className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white text-sm" />
            <label htmlFor="chave-email" className="block text-xs uppercase tracking-wider text-grafite">Chave do Brevo {estado.chave && <span className="normal-case">(já salva)</span>}</label>
            <input id="chave-email" type="password" value={chave} onChange={e => setChave(e.target.value)} placeholder="xkeysib-…" autoComplete="off" spellCheck={false}
              className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white font-mono text-sm" />
            <div className="flex flex-wrap gap-3">
              <button type="button" onClick={salvar} disabled={(!chave.trim() && !remetente.trim()) || ocupado !== ''} className="min-h-[44px] bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 text-white px-5 rounded-sm text-sm uppercase tracking-wider">
                {ocupado === 'salvando' ? 'Salvando…' : 'Salvar'}
              </button>
              <button type="button" onClick={testar} disabled={!ativo || ocupado !== ''} className="min-h-[44px] px-5 border border-navy text-navy hover:bg-pergaminho disabled:opacity-50 text-sm">
                {ocupado === 'testando' ? 'Enviando…' : 'Enviar e-mail de teste'}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  )
}


/** Escavador: token da API paga do escritório; a busca aparece em Fontes do advogado. */
function SecaoEscavador() {
  const [definida, setDefinida] = useState<boolean | null>(null)
  const [chave, setChave] = useState('')
  const [ocupado, setOcupado] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const carregar = async () => {
    const { data } = await supabase.rpc('estado_configuracao', { p_chave: 'escavador_api_key' })
    const e = (Array.isArray(data) ? data[0] : data) as { permitido: boolean; definida: boolean } | undefined
    setDefinida(e?.permitido ? e.definida : null)
  }
  useEffect(() => { if (supabaseConfigurado) carregar() }, [])
  if (!supabaseConfigurado || definida === null) return null
  const testar = async () => {
    setOcupado('testando'); setMsg(null)
    const { data, error } = await supabase.functions.invoke('escavador', { body: { teste: true } })
    setOcupado('')
    const corpo = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (error || !corpo?.ok) return setMsg({ tipo: 'erro', texto: corpo?.erro ?? 'O Escavador não respondeu ao teste.' })
    setMsg({ tipo: 'ok', texto: 'Escavador ligado. A busca já funciona em Fontes do advogado.' })
  }
  const salvar = async () => {
    setOcupado('salvando'); setMsg(null)
    const { error } = await supabase.rpc('definir_configuracao', { p_chave: 'escavador_api_key', p_valor: chave })
    setOcupado('')
    if (error) return setMsg({ tipo: 'erro', texto: error.message })
    setChave(''); await carregar(); testar()
  }
  return (
    <section aria-labelledby="escavador" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado">
      <h2 id="escavador" className="text-lg mb-3">Escavador</h2>
      <div className="space-y-3 text-sm">
        <p><strong>Situação:</strong> {definida ? 'token salvo.' : 'ainda não ligado.'}</p>
        <ol className="text-xs text-grafite-claro list-decimal pl-5 space-y-1">
          <li>Entre em <a href="https://api.escavador.com/" target="_blank" rel="noopener noreferrer" className="underline text-navy">api.escavador.com</a>, crie a conta e compre um pacote de créditos.</li>
          <li>Abra <strong>Tokens de acesso</strong> → <strong>Gerar token</strong> e copie.</li>
          <li>Cole abaixo e clique em Salvar. Cada consulta aparece no painel Consumo.</li>
        </ol>
        {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`p-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}>{msg.texto}</p>}
        <label htmlFor="chave-escavador" className="block text-xs uppercase tracking-wider text-grafite">Token do Escavador {definida && <span className="normal-case">(já salvo)</span>}</label>
        <input id="chave-escavador" type="password" value={chave} onChange={e => setChave(e.target.value)} autoComplete="off" spellCheck={false}
          className="w-full px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado bg-white font-mono text-sm" />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={salvar} disabled={!chave.trim() || ocupado !== ''} className="min-h-[44px] bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 text-white px-5 rounded-sm text-sm uppercase tracking-wider">{ocupado === 'salvando' ? 'Salvando…' : 'Salvar'}</button>
          <button type="button" onClick={testar} disabled={!definida || ocupado !== ''} className="min-h-[44px] px-5 border border-navy text-navy hover:bg-pergaminho disabled:opacity-50 text-sm">{ocupado === 'testando' ? 'Testando…' : 'Testar ligação'}</button>
        </div>
      </div>
    </section>
  )
}

// Passo 41 (Onda D): convite .ics por e-mail a cada prazo/compromisso novo ou alterado (REQUEST, mesmo UID).
function SecaoIcs() {
  const [ligado, setLigado] = useState(false)
  const [msg, setMsg] = useState('')
  useEffect(() => { supabase.rpc('ics_por_email').then(({ data }) => setLigado(data === true)) }, [])
  const mudar = async (v: boolean) => {
    setLigado(v)
    const { error } = await supabase.rpc('definir_ics_por_email', { p_ligado: v })
    setMsg(error ? error.message : v ? 'Ligado: você recebe o convite .ics a cada prazo ou compromisso novo ou alterado.' : 'Desligado.')
  }
  return (
    <section aria-labelledby="ics" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado" data-testid="secao-ics">
      <h2 id="ics" className="text-lg mb-3">Convite .ics por e-mail</h2>
      <label className="flex items-center gap-3 text-sm">
        <input type="checkbox" checked={ligado} onChange={e => mudar(e.target.checked)} className="h-5 w-5" data-testid="ics-por-email" />
        Receber por e-mail um convite de calendário (.ics) a cada prazo ou compromisso novo ou alterado em que eu seja responsável. O Outlook e o Google Agenda atualizam o evento pelo mesmo código (sem duplicar).
      </label>
      {msg && <p role="status" className="text-sm mt-2" data-testid="ics-msg">{msg}</p>}
    </section>
  )
}
