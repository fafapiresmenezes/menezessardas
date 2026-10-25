import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { Users, UserPlus } from 'lucide-react'
import { supabaseConfigurado } from '@/lib/supabase'
import {
  definirFuncao,
  descricaoFuncao,
  listarPessoas,
  perfilAtual,
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
  const [ocupado, setOcupado] = useState<string>('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  const carregar = async () => {
    try {
      const p = await perfilAtual()
      setPerfil(p)
      if (p === 'admin') setPessoas(await listarPessoas())
    } catch (e) {
      setPerfil(null)
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível carregar a equipe.' })
    }
  }

  useEffect(() => {
    carregar()
  }, [])

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
      setMsg({ tipo: 'erro', texto: e instanceof Error ? e.message : 'Não foi possível alterar o acesso.' })
    } finally {
      setOcupado('')
    }
  }

  return (
    <Layout title="Equipe">
      <div className="max-w-4xl space-y-6">
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
                <li>A pessoa abre o link da plataforma e clica em <strong>Primeiro acesso</strong>, com o e-mail dela e uma senha.</li>
                <li>Ela aparece aqui como <strong>Sem acesso</strong>.</li>
                <li>Você escolhe a função dela na lista abaixo. Pronto: ela já consegue entrar.</li>
              </ol>
              {!supabaseConfigurado && (
                <p className="text-xs text-grafite-claro mt-3">Nesta demonstração a equipe é fictícia e as mudanças valem só nesta tela.</p>
              )}
            </section>

            {msg && (
              <p
                role={msg.tipo === 'erro' ? 'alert' : 'status'}
                className={`p-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
              >
                {msg.texto}
              </p>
            )}

            <section className="bg-white shadow-sm" aria-labelledby="pessoas">
              <h2 id="pessoas" className="text-lg flex items-center gap-2 p-6 pb-3">
                <Users size={18} className="text-dourado" aria-hidden="true" />
                Pessoas com acesso ({pessoas.length})
              </h2>
              <ul className="divide-y divide-navy/5">
                {pessoas.map(p => {
                  const atual = p.funcao ?? 'nenhuma'
                  return (
                    <li key={p.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{p.nome}</p>
                        <p className="text-xs text-grafite-claro truncate">{p.email}</p>
                        <p className="text-xs text-grafite-claro mt-1">
                          {p.confirmado ? 'E-mail confirmado' : 'Aguardando confirmação do e-mail'} · Último acesso: {dataPt(p.ultimoAcesso)}
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
                      </div>
                    </li>
                  )
                })}
              </ul>
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
