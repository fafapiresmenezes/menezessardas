import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { Save, User, Bell, Sparkles, Eye, EyeOff } from 'lucide-react'
import { supabaseConfigurado } from '@/lib/supabase'
import { estadoChaveIA, removerChaveIA, salvarChaveIA, testarChaveIA, type EstadoChaveIA } from '@/lib/ia'

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
      <form onSubmit={salvar} className="max-w-2xl space-y-6" noValidate>
        {aviso && (
          <p role="status" className="p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">
            {aviso}
          </p>
        )}
        {erro && (
          <p role="alert" className="p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">
            {erro}
          </p>
        )}

        <fieldset className="bg-white p-6 shadow-sm border-t-2 border-dourado">
          <legend className="sr-only">Perfil</legend>
          <h2 className="text-lg mb-5 flex items-center gap-2">
            <User size={18} className="text-dourado" aria-hidden="true" />
            Perfil
          </h2>
          <div className="space-y-5">
            <div>
              <label htmlFor="nome" className={rotulo}>Nome completo</label>
              <input
                id="nome"
                type="text"
                autoComplete="name"
                value={prefs.nomeCompleto}
                onChange={e => setPrefs({ ...prefs, nomeCompleto: e.target.value })}
                className={campo}
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
                className={campo}
              />
            </div>
            <div>
              <span className={rotulo}>Perfil de acesso</span>
              <p className="px-3 py-2.5 bg-pergaminho border border-grafite-claro/30 rounded-sm text-grafite text-sm">
                Administrador
              </p>
            </div>
          </div>
        </fieldset>

        <fieldset className="bg-white p-6 shadow-sm border-t-2 border-dourado">
          <legend className="sr-only">Notificações</legend>
          <h2 className="text-lg mb-5 flex items-center gap-2">
            <Bell size={18} className="text-dourado" aria-hidden="true" />
            Notificações
          </h2>
          <div className="space-y-4">
            <label className="flex items-center gap-3 text-sm text-grafite">
              <input
                type="checkbox"
                checked={prefs.notificacoes}
                onChange={e => setPrefs({ ...prefs, notificacoes: e.target.checked })}
                className="h-4 w-4 accent-navy"
              />
              Receber notificações na plataforma
            </label>
            <label className="flex items-center gap-3 text-sm text-grafite">
              <input
                type="checkbox"
                checked={prefs.alertasEmail}
                onChange={e => setPrefs({ ...prefs, alertasEmail: e.target.checked })}
                className="h-4 w-4 accent-navy"
              />
              Receber alertas também por e-mail
            </label>
            <div className="pt-4 border-t border-navy/10">
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
                className="w-28 px-3 py-2.5 border border-grafite-claro/40 rounded-sm focus:border-dourado"
              />
              <p id="ajuda-antecedencia" className="text-xs text-grafite-claro mt-2">
                Você será avisada com esta antecedência antes de cada vencimento. Entre 1 e 180 dias.
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

      <SecaoChaveIA />
    </Layout>
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
