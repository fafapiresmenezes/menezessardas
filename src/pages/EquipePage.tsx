import { useEffect, useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import { mensagemAmigavel } from '@/lib/erros'
import Layout from '@/components/Layout'
import TesteGeral from '@/components/TesteGeral'
import TesteTelas from '@/components/TesteTelas'
import EscritoriosParceiros from '@/components/EscritoriosParceiros'
import { Users, UserPlus, KeyRound } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import {
  definirFuncao,
  definirSenhaProvisoria,
  descricaoFuncao,
  listarPessoas,
  perfilAtual,
  ehSede,
  rotuloFuncao,
  type Funcao,
  type Pessoa,
} from '@/lib/equipe'

const OPCOES: (Funcao | 'nenhuma')[] = ['admin', 'operador', 'leitor', 'nenhuma']

const dataPt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—'

export default function EquipePage() {
  const [perfil, setPerfil] = useState<Funcao | null | 'carregando'>('carregando')
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  // Passo 102: lista de pessoas em texto para o controle de acessos.
  const [copiadoLista, setCopiadoLista] = useState(false)
  const [sede, setSede] = useState(false)
  const [busca, setBusca] = useState(() => { try { return localStorage.getItem('lsm-equipe-busca') ?? '' } catch { return '' } }) // Passo 197
  // Passo 134: filtrar a lista por função (ou só quem espera liberação).
  // Passo 163: o filtro por função é lembrado neste navegador.
  const [filtroFuncao, setFiltroFuncao] = useState(() => { try { return localStorage.getItem('lsm-equipe-funcao') || '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem('lsm-equipe-funcao', filtroFuncao) } catch { /* sem armazenamento */ } }, [filtroFuncao])
  const [ocupado, setOcupado] = useState<string>('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  // Passo 09: aceite de termos de uso e LGPD por pessoa (data, versão e hash).
  const [aceites, setAceites] = useState<Record<string, { versao: string; hash: string; aceito_em: string }>>({})
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 284
  const [baixado, marcarBaixado] = useBaixado() // Passo 387

  const carregar = async () => {
    try {
      const p = await perfilAtual()
      setPerfil(p)
      if (p === 'admin') {
        setPessoas(await listarPessoas()); setSede(await ehSede())
        const { data } = await supabase.rpc('aceites_equipe')
        setAceites(Object.fromEntries(((data ?? []) as { usuario_id: string; versao: string; hash: string; aceito_em: string }[]).map(a => [a.usuario_id, a])))
      }
    } catch (e) {
      setPerfil(null)
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    }
  }

  useEffect(() => {
    carregar()
  }, [])

  const senhaProvisoria = async (pessoa: Pessoa) => {
    if (!window.confirm(`Definir uma senha provisória para ${pessoa.nome}? A senha atual dela deixa de valer.`)) return
    setOcupado(pessoa.id)
    setMsg(null)
    try {
      const senha = await definirSenhaProvisoria(pessoa)
      setMsg({ tipo: 'ok', texto: `Senha provisória de ${pessoa.nome}: ${senha} — copie e entregue a ela; ela troca em Configurações → Senha. Esta senha não aparece de novo.` })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    } finally {
      setOcupado('')
    }
  }

  const alterar = async (pessoa: Pessoa, valor: string) => {
    const funcao = valor === 'nenhuma' ? null : (valor as Funcao)
    if (funcao === pessoa.funcao) return
    setOcupado(pessoa.id)
    setMsg(null)
    try {
      await definirFuncao(pessoa, funcao)
      setMsg({ tipo: 'ok', texto: `${pessoa.nome}: ${rotuloFuncao[funcao ?? 'nenhuma']}.` })
      setPessoas(await listarPessoas())
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    } finally {
      setOcupado('')
    }
  }

  return (
    <Layout title="Área do administrador">
      <div className="max-w-4xl space-y-6">
        {perfil === 'admin' && <><TesteGeral /><TesteTelas /></>}
        {perfil === 'carregando' ? (
          <p className="text-sm text-grafite-claro">Carregando…</p>
        ) : perfil !== 'admin' ? (
          <section className="bg-white p-6 shadow-sm border-t-2 border-dourado">
            <p className="text-sm">Somente administradores gerenciam a equipe. Peça a um administrador do escritório para ajustar seu acesso.</p>
            {msg && <p role="alert" className="mt-3 text-sm text-critico">{msg.texto}</p>}
          </section>
        ) : (
          <>
            <section className="bg-white p-6 shadow-sm border-t-2 border-dourado" aria-labelledby="como-adicionar">
              <h2 id="como-adicionar" className="text-lg flex items-center gap-2">
                <UserPlus size={18} className="text-dourado" aria-hidden="true" />
                Como adicionar alguém
              </h2>
              <ol className="list-decimal pl-5 text-sm text-grafite mt-3 space-y-1">
                <li>Envie um convite pelo e-mail da pessoa (a administração da sede faz isso em Escritórios parceiros).</li>
                <li>Ao aceitar o convite, ela entra <strong>no seu escritório</strong>, com a função do convite. Quem cria conta sem convite ganha um escritório próprio e vazio, separado do seu.</li>
                <li>Na lista abaixo você muda a função dela para operador ou administrador, ou retira o acesso escolhendo <strong>Sem acesso</strong>.</li>
              </ol>
              <p className="text-sm text-grafite mt-3">
                Alguém esqueceu a senha? Use <strong>Senha provisória</strong> na linha da pessoa, entregue a senha gerada e peça para ela trocar em Configurações → Senha.
              </p>
              {!supabaseConfigurado && (
                <p className="text-xs text-grafite-claro mt-3">Nesta demonstração a equipe é fictícia e as mudanças valem só nesta tela.</p>
              )}
            </section>

            {msg && (
              <p
                role={msg.tipo === 'erro' ? 'alert' : 'status'}
                className={`p-3 text-sm border-l-2 select-all ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
              >
                {msg.texto}
              </p>
            )}

            <section className="bg-white shadow-sm" aria-labelledby="pessoas">
              <h2 id="pessoas" className="text-lg flex items-center gap-2 p-6 pb-3">
                <Users size={18} className="text-dourado" aria-hidden="true" />
                Pessoas com acesso ({pessoas.length})
              </h2>
              <div className="px-6 pb-3 flex flex-wrap items-center gap-3">
                <button type="button" onClick={async () => { const rot = (f: string | null) => f === 'admin' ? 'administrador' : f === 'operador' ? 'operador' : f === 'leitor' ? 'leitor' : 'esperando liberação'; const t = [`Equipe com acesso — ${new Date().toLocaleDateString('pt-BR')}`, ...pessoas.map(p => `• ${p.nome || p.email} <${p.email}> — ${rot(p.funcao)}`), 'Instituto THEYE'].join('\n'); try { await navigator.clipboard.writeText(t); setCopiadoLista(true); setTimeout(() => setCopiadoLista(false), 2500) } catch { /* sem área de transferência */ } }} data-testid="copiar-equipe" className="min-h-[44px] px-3 border border-navy text-navy text-xs">{copiadoLista ? 'Lista copiada' : 'Copiar lista'}</button>
                <button type="button" onClick={() => window.print()} data-testid="imprimir-equipe" className="min-h-[44px] px-3 border border-navy/20 text-navy text-xs ml-2 print:hidden">Imprimir</button>{/* Passo 222 */}
                <button type="button" data-testid="copiar-link-equipe" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="min-h-[44px] px-3 border border-navy/20 text-navy text-xs ml-2 print:hidden">{linkCopiado ? 'Link copiado' : 'Copiar link'}</button>{/* Passo 256 */}
                {pessoas.length > 0 && <button type="button" data-testid="baixar-equipe" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['nome;e-mail;função;confirmado;último acesso', ...pessoas.map(p => `${p.nome};${p.email};${p.funcao ?? ''};${p.confirmado ? 'sim' : 'não'};${p.ultimoAcesso ?? ''}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'equipe.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 underline text-navy text-sm print:hidden">{baixado ? 'baixado' : 'baixar CSV'}</button>}{/* Passo 320 */}
                <input type="search" value={busca} onChange={e => { setBusca(e.target.value); try { localStorage.setItem('lsm-equipe-busca', e.target.value) } catch { /* sem memória local */ } }} placeholder="Buscar por nome ou e-mail" aria-label="Buscar pessoa por nome ou e-mail" className="border px-3 py-2 text-sm w-64" data-testid="busca-equipe" />
                <select value={filtroFuncao} onChange={e => setFiltroFuncao(e.target.value)} aria-label="Filtrar por função" data-testid="filtro-funcao" className="border px-2 py-2 text-sm min-h-[44px]">
                  <option value="">Todas as funções</option>
                  <option value="pendente">Esperando liberação</option>
                  <option value="admin">Administradores</option>
                  <option value="operador">Operadores</option>
                  <option value="leitor">Leitores</option>
                </select>
                <p className="text-xs text-grafite flex flex-wrap gap-3" data-testid="resumo-funcoes">
                  <span><strong>{pessoas.filter(p => !p.funcao).length}</strong> esperando liberação</span>
                  <span><strong>{pessoas.filter(p => p.funcao === 'admin').length}</strong> admin</span>
                  <span><strong>{pessoas.filter(p => p.funcao === 'operador').length}</strong> operador(es)</span>
                  <span><strong>{pessoas.filter(p => p.funcao === 'leitor').length}</strong> leitor(es)</span>
                </p>
              </div>
              <ul className="divide-y divide-navy/5">
                {pessoas
                  .filter(p => !busca.trim() || `${p.nome} ${p.email}`.toLowerCase().includes(busca.trim().toLowerCase()))
                  .filter(p => !filtroFuncao || (filtroFuncao === 'pendente' ? !p.funcao : p.funcao === filtroFuncao))
                  // quem ainda espera liberação aparece primeiro
                  .sort((a, b) => Number(Boolean(a.funcao)) - Number(Boolean(b.funcao)))
                  .map(p => {
                  const atual = p.funcao ?? 'nenhuma'
                  return (
                    <li key={p.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.nome}</p>
                        <p className="text-xs text-grafite-claro truncate">{p.email}</p>
                        <p className="text-xs text-grafite-claro mt-1">
                          {p.confirmado ? 'E-mail confirmado' : 'Aguardando confirmação do e-mail'} · Último acesso: {dataPt(p.ultimoAcesso)}
                        </p>
                        <p className="text-xs mt-1" data-testid={`aceite-${p.id}`}>
                          {aceites[p.id]
                            ? <span className="text-regular" title={`SHA-256 ${aceites[p.id].hash}`}>Termos e LGPD aceitos em {dataPt(aceites[p.id].aceito_em)} (v{aceites[p.id].versao}) · hash {(aceites[p.id].hash ?? '').slice(0, 12)}…</span>
                            : <span className="text-atencao">Termos e LGPD ainda não aceitos (aparecem no próximo acesso)</span>}
                        </p>
                      </div>
                      <div className="md:w-72">
                        <label htmlFor={`funcao-${p.id}`} className="block text-xs uppercase tracking-wider text-grafite mb-1">
                          Função
                        </label>
                        <select
                          id={`funcao-${p.id}`}
                          value={atual}
                          disabled={ocupado !== ''}
                          onChange={e => alterar(p, e.target.value)}
                          aria-describedby={`desc-${p.id}`}
                          className="w-full min-h-[44px] px-3 py-2 border border-grafite-claro/40 rounded-sm bg-white focus:border-dourado text-sm"
                        >
                          {OPCOES.map(o => (
                            <option key={o} value={o}>{rotuloFuncao[o]}</option>
                          ))}
                        </select>
                        <p id={`desc-${p.id}`} className="text-xs text-grafite-claro mt-1">
                          {ocupado === p.id ? 'Salvando…' : descricaoFuncao[atual]}
                        </p>
                        <button
                          type="button"
                          onClick={() => senhaProvisoria(p)}
                          disabled={ocupado !== ''}
                          className="mt-2 min-h-[44px] inline-flex items-center gap-2 px-3 border border-navy/30 text-navy hover:bg-pergaminho disabled:opacity-50 text-sm"
                        >
                          <KeyRound size={14} aria-hidden="true" /> Senha provisória
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
            {sede && <EscritoriosParceiros pessoas={pessoas} aoMudar={carregar} />}
          </>
        )}
      </div>
    </Layout>
  )
}
