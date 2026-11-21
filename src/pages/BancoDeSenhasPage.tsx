import { useEffect, useState } from 'react'
import { Eye, EyeOff, KeyRound, Lock, Trash2 } from 'lucide-react'
import Layout from '@/components/Layout'
import { mensagemAmigavel } from '@/lib/erros'
import { meuAlcance } from '@/lib/hierarquia'
import { abrirCofre, apagarDoCofre, guardarNoCofre, listarCofre, FRASE_MINIMA, type ItemAberto, type ItemCofre, type LinhaCofre } from '@/lib/cofre'

const VAZIO: ItemCofre = { nome: '', usuario: '', senha: '', observacao: '' }

/**
 * Banco de senhas do escritório (pedido de M, 19/11/2026).
 * As senhas são embaralhadas no navegador com a frase-mestra antes de irem para o banco. A frase não é
 * guardada em lugar nenhum: fica só na memória desta tela, e some ao fechar ou ao clicar em "Fechar o cofre".
 */
export default function BancoDeSenhasPage() {
  const [pode, setPode] = useState<boolean | null>(null)
  const [linhas, setLinhas] = useState<LinhaCofre[]>([])
  const [frase, setFrase] = useState('')
  const [aberta, setAberta] = useState<string | null>(null)
  const [itens, setItens] = useState<ItemAberto[]>([])
  const [fechadas, setFechadas] = useState(0)
  const [novo, setNovo] = useState<ItemCofre>(VAZIO)
  const [editando, setEditando] = useState<string | null>(null)
  const [visivel, setVisivel] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    meuAlcance().then(a => setPode(a.veTudo || a.admin)).catch(() => setPode(false))
    listarCofre().then(setLinhas).catch(e => setMsg({ tipo: 'erro', texto: mensagemAmigavel(e, 'O banco de senhas ainda não foi ligado. Avise a administração.') }))
  }, [])

  const recarregar = async (f: string) => {
    const l = await listarCofre(); setLinhas(l)
    const r = await abrirCofre(l, f); setItens(r.itens); setFechadas(r.fechadas)
    return r
  }

  const abrir = async () => {
    setMsg(null)
    if (frase.length < FRASE_MINIMA) { setMsg({ tipo: 'erro', texto: `A frase-mestra precisa ter pelo menos ${FRASE_MINIMA} letras.` }); return }
    setOcupado(true)
    try {
      const r = await recarregar(frase)
      if (linhas.length > 0 && r.itens.length === 0) { setMsg({ tipo: 'erro', texto: 'Esta frase não abre o cofre. Confira e tente de novo.' }); return }
      setAberta(frase); setFrase('')
    } catch (e) { setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) }) } finally { setOcupado(false) }
  }

  const fechar = () => { setAberta(null); setItens([]); setFechadas(0); setVisivel(null); setNovo(VAZIO); setEditando(null); setMsg(null) }

  const guardar = async () => {
    if (!aberta) return
    if (!novo.nome.trim() || !novo.senha) { setMsg({ tipo: 'erro', texto: 'Preencha pelo menos o nome e a senha.' }); return }
    setOcupado(true); setMsg(null)
    try {
      await guardarNoCofre({ ...novo, nome: novo.nome.trim() }, aberta, editando ?? undefined)
      await recarregar(aberta); setNovo(VAZIO); setEditando(null)
      setMsg({ tipo: 'ok', texto: 'Guardado no cofre.' })
    } catch (e) { setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) }) } finally { setOcupado(false) }
  }

  const apagar = async (i: ItemAberto) => {
    if (!aberta || !window.confirm(`Apagar a senha de "${i.nome}"? Não dá para desfazer.`)) return
    setOcupado(true); setMsg(null)
    try { await apagarDoCofre(i.id); await recarregar(aberta); setMsg({ tipo: 'ok', texto: 'Apagado.' }) }
    catch (e) { setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) }) } finally { setOcupado(false) }
  }

  const copiar = async (i: ItemAberto) => {
    try { await navigator.clipboard.writeText(i.senha); setMsg({ tipo: 'ok', texto: `Senha de ${i.nome} copiada.` }) }
    catch { setMsg({ tipo: 'erro', texto: 'Não foi possível copiar. Clique no olho e copie à mão.' }) }
  }

  const campo = 'w-full border border-navy/20 px-3 min-h-[44px] bg-white text-navy'

  return (
    <Layout title="Banco de senhas">
      <div className="space-y-6 max-w-4xl">
        <section className="bg-white p-6 shadow-sm border-t-2 border-navy">
          <h2 className="text-lg font-serif flex items-center gap-2"><KeyRound size={18} className="text-navy" aria-hidden="true" /> As senhas do escritório, num lugar só</h2>
          <p className="text-sm text-grafite mt-2">
            Guarde aqui as senhas de tribunais, sistemas e contas do escritório. Elas são embaralhadas neste computador, com a frase-mestra, antes de serem guardadas.
            A frase não fica guardada em lugar nenhum: quem não sabe a frase não lê as senhas, nem o Instituto. Se a frase for esquecida, as senhas guardadas com ela não podem ser recuperadas.
          </p>
        </section>

        {msg && <p role={msg.tipo === 'erro' ? 'alert' : 'status'} className={`text-sm ${msg.tipo === 'erro' ? 'text-critico' : 'text-regular'}`} data-testid="cofre-msg">{msg.texto}</p>}

        {pode === false && (
          <p className="bg-white p-6 shadow-sm text-sm text-grafite" data-testid="cofre-reservado">O banco de senhas é reservado ao chefe e ao gestor do escritório.</p>
        )}

        {pode && !aberta && (
          <section className="bg-white p-6 shadow-sm" aria-labelledby="abrir-cofre">
            <h2 id="abrir-cofre" className="text-lg font-serif flex items-center gap-2"><Lock size={18} className="text-navy" aria-hidden="true" /> {linhas.length === 0 ? 'Escolha a frase-mestra' : 'Abrir o cofre'}</h2>
            <p className="text-sm text-grafite mt-2">
              {linhas.length === 0
                ? `O cofre está vazio. Escolha uma frase longa, fácil de lembrar e difícil de adivinhar (pelo menos ${FRASE_MINIMA} letras). Ela será pedida toda vez.`
                : `Há ${linhas.length} ${linhas.length === 1 ? 'senha guardada' : 'senhas guardadas'}. Digite a frase-mestra para ver.`}
            </p>
            <label className="block text-sm mt-4" htmlFor="frase-mestra">Frase-mestra</label>
            <input id="frase-mestra" type="password" autoComplete="off" className={campo} value={frase} onChange={e => setFrase(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') abrir() }} data-testid="cofre-frase" />
            <button type="button" onClick={abrir} disabled={ocupado} title="Abre o cofre com a frase-mestra; a frase não é guardada" className="mt-4 min-h-[44px] px-5 bg-navy text-white disabled:opacity-50" data-testid="cofre-abrir">
              {ocupado ? 'Abrindo…' : 'Abrir o cofre'}
            </button>
          </section>
        )}

        {pode && aberta && (
          <>
            <section className="bg-white p-6 shadow-sm" aria-labelledby="lista-cofre">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 id="lista-cofre" className="text-lg font-serif">Senhas guardadas</h2>
                <button type="button" onClick={fechar} title="Fecha o cofre e esquece a frase-mestra nesta tela" className="min-h-[44px] px-4 border border-navy text-navy" data-testid="cofre-fechar">Fechar o cofre</button>
              </div>
              {fechadas > 0 && <p className="text-sm text-critico mt-2">{fechadas} {fechadas === 1 ? 'senha foi guardada' : 'senhas foram guardadas'} com outra frase e não {fechadas === 1 ? 'abre' : 'abrem'} com esta.</p>}
              {itens.length === 0
                ? <p className="text-sm text-grafite mt-4">Nenhuma senha guardada ainda. Use o formulário abaixo para guardar a primeira.</p>
                : (
                  <ul className="mt-4 divide-y divide-navy/10" data-testid="cofre-lista">
                    {itens.map(i => (
                      <li key={i.id} className="py-3 flex items-start justify-between gap-4 flex-wrap">
                        <div className="min-w-0">
                          <p className="font-medium text-navy">{i.nome}</p>
                          {i.usuario && <p className="text-sm text-grafite">Usuário: {i.usuario}</p>}
                          <p className="text-sm font-mono break-all" data-testid={`cofre-senha-${i.id}`}>{visivel === i.id ? i.senha : '••••••••••'}</p>
                          {i.observacao && <p className="text-xs text-grafite-claro mt-1">{i.observacao}</p>}
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          <button type="button" onClick={() => setVisivel(visivel === i.id ? null : i.id)} title={visivel === i.id ? 'Esconde a senha na tela' : 'Mostra a senha na tela'} className="min-h-[44px] px-3 border border-navy/30 text-navy flex items-center gap-1">
                            {visivel === i.id ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}{visivel === i.id ? 'Esconder' : 'Mostrar'}
                          </button>
                          <button type="button" onClick={() => copiar(i)} title="Copia a senha para colar em outro lugar" className="min-h-[44px] px-3 border border-navy/30 text-navy">Copiar</button>
                          <button type="button" onClick={() => { setEditando(i.id); setNovo({ nome: i.nome, usuario: i.usuario, senha: i.senha, observacao: i.observacao }) }} title="Traz esta senha para o formulário, para corrigir" className="min-h-[44px] px-3 border border-navy/30 text-navy">Alterar</button>
                          <button type="button" onClick={() => apagar(i)} disabled={ocupado} title="Apaga esta senha do cofre; pede confirmação" className="min-h-[44px] px-3 border border-critico text-critico flex items-center gap-1 disabled:opacity-50"><Trash2 size={16} aria-hidden="true" />Apagar</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
            </section>

            <section className="bg-white p-6 shadow-sm" aria-labelledby="nova-senha">
              <h2 id="nova-senha" className="text-lg font-serif">{editando ? 'Alterar senha' : 'Guardar uma senha'}</h2>
              <div className="grid gap-4 md:grid-cols-2 mt-4">
                <div><label className="block text-sm" htmlFor="cofre-nome">Nome (de onde é a senha)</label><input id="cofre-nome" className={campo} value={novo.nome} maxLength={120} onChange={e => setNovo({ ...novo, nome: e.target.value })} data-testid="cofre-nome" /></div>
                <div><label className="block text-sm" htmlFor="cofre-usuario">Usuário ou e-mail</label><input id="cofre-usuario" className={campo} value={novo.usuario} maxLength={200} autoComplete="off" onChange={e => setNovo({ ...novo, usuario: e.target.value })} /></div>
                <div><label className="block text-sm" htmlFor="cofre-senha">Senha</label><input id="cofre-senha" type="password" className={campo} value={novo.senha} maxLength={500} autoComplete="new-password" onChange={e => setNovo({ ...novo, senha: e.target.value })} data-testid="cofre-senha" /></div>
                <div><label className="block text-sm" htmlFor="cofre-obs">Observação</label><input id="cofre-obs" className={campo} value={novo.observacao} maxLength={500} onChange={e => setNovo({ ...novo, observacao: e.target.value })} /></div>
              </div>
              <div className="flex gap-3 mt-4 flex-wrap">
                <button type="button" onClick={guardar} disabled={ocupado} title="Embaralha com a frase-mestra e guarda no cofre" className="min-h-[44px] px-5 bg-navy text-white disabled:opacity-50" data-testid="cofre-guardar">{ocupado ? 'Guardando…' : editando ? 'Salvar alteração' : 'Guardar no cofre'}</button>
                {editando && <button type="button" onClick={() => { setEditando(null); setNovo(VAZIO) }} title="Desiste da alteração e limpa o formulário" className="min-h-[44px] px-4 border border-navy text-navy">Cancelar</button>}
              </div>
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
