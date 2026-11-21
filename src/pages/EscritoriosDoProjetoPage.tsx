/**
 * Escritórios do projeto (pedido de M, 19/11/2026 21h17): o administrador do Instituto cadastra
 * aqui os escritórios que aparecem na lista suspensa "Qual é o seu escritório?" do Criar conta.
 * Assim ninguém escreve o nome à mão (cada um escreveria de um jeito) e a porta do banco sabe
 * quais finais de e-mail podem criar conta em cada escritório.
 *
 * A tela só grava pelo banco (funções escritorios_cadastro_listar / escritorio_cadastro_gravar /
 * escritorio_cadastro_criar, só para a administração do Instituto). Nada é apagado: "Tirar da
 * lista" só esconde o escritório do Criar conta; os dados dele ficam onde estão.
 */
import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { FRENTES } from '@/components/menuTelas'

interface Linha { id: string; nome: string; nome_cadastro: string | null; dominios_email: string[]; nichos?: string[] }

// Pedido de M (21/11/2026 04h34): cada nicho tem os seus clientes. Aqui o administrador marca de
// quais segmentos cada escritório é; a lista suspensa do Criar conta de cada quadradinho mostra só eles.
const SEGMENTOS: { id: string; nome: string }[] = [
  { id: 'juridico', nome: 'Plataforma jurídica' },
  ...FRENTES.filter(f => f.id !== 'instituto').map(f => ({ id: f.id, nome: f.nome })),
]

const dominiosValidos = (texto: string): string[] => [...new Set(
  texto.split(/[,;\s]+/).map(d => d.trim().toLowerCase().replace(/^@/, '')).filter(d => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)),
)]

export default function EscritoriosDoProjetoPage() {
  const [linhas, setLinhas] = useState<Linha[]>([])
  const [faltaBanco, setFaltaBanco] = useState(false)
  const [erro, setErro] = useState('')
  const [aviso, setAviso] = useState('')
  const [carregando, setCarregando] = useState(false)
  // Formulário: ou edita uma linha existente (id) ou cria um escritório novo (id vazio).
  const [editando, setEditando] = useState<string | null>(null)
  const [nomeLista, setNomeLista] = useState('')
  const [finais, setFinais] = useState('')
  const [nichosSel, setNichosSel] = useState<string[]>([])

  const carregar = async () => {
    if (!supabaseConfigurado) return
    const { data, error } = await supabase.rpc('escritorios_cadastro_listar')
    if (error) {
      // Função ainda não existe no banco: a tela explica em vez de quebrar.
      if (/function|schema cache|not find/i.test(error.message ?? '')) setFaltaBanco(true)
      else setErro(error.message)
      return
    }
    setFaltaBanco(false)
    setLinhas(((data ?? []) as Linha[]).map(l => ({ ...l, dominios_email: l.dominios_email ?? [] })))
  }
  useEffect(() => { carregar() }, [])

  const abrirEdicao = (l: Linha | null) => {
    setErro(''); setAviso('')
    setEditando(l ? l.id : '')
    setNomeLista(l ? (l.nome_cadastro ?? l.nome) : '')
    setFinais(l ? l.dominios_email.join(', ') : '')
    setNichosSel(l?.nichos ?? [])
  }

  const gravar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro(''); setAviso('')
    const nome = nomeLista.toUpperCase().replace(/\s+/g, ' ').trim()
    const doms = dominiosValidos(finais)
    if (nome.length < 3) { setErro('Escreva o nome do escritório como deve aparecer na lista.'); return }
    if (doms.length === 0) { setErro('Informe pelo menos um final de e-mail válido, por exemplo: escritorio.com.br'); return }
    setCarregando(true)
    try {
      let r = editando
        ? await supabase.rpc('escritorio_cadastro_gravar', { p_id: editando, p_nome_cadastro: nome, p_dominios: doms, p_nichos: nichosSel })
        : await supabase.rpc('escritorio_cadastro_criar', { p_nome: nome, p_dominios: doms, p_nichos: nichosSel })
      // Banco ainda sem os segmentos (COLE-ISTO-158): grava do jeito antigo e avisa.
      if (r.error && /function|schema cache|not find/i.test(r.error.message ?? '')) {
        r = editando
          ? await supabase.rpc('escritorio_cadastro_gravar', { p_id: editando, p_nome_cadastro: nome, p_dominios: doms })
          : await supabase.rpc('escritorio_cadastro_criar', { p_nome: nome, p_dominios: doms })
        if (!r.error) setAviso(`${nome} gravado, mas as frentes ainda não: falta colar o arquivo COLE-ISTO-158 no banco.`)
      } else if (!r.error) {
        setAviso(`Pronto: ${nome} está na lista do Criar conta${nichosSel.length > 0 ? ` (${nichosSel.length} frente${nichosSel.length > 1 ? 's' : ''})` : ''}, com os finais ${doms.join(', ')}.`)
      }
      if (r.error) { setErro(r.error.message); return }
      setEditando(null); setNomeLista(''); setFinais(''); setNichosSel([])
      await carregar()
    } finally { setCarregando(false) }
  }

  const tirarDaLista = async (l: Linha) => {
    setErro(''); setAviso('')
    const { error } = await supabase.rpc('escritorio_cadastro_gravar', { p_id: l.id, p_nome_cadastro: '', p_dominios: [] })
    if (error) { setErro(error.message); return }
    setAviso(`${l.nome_cadastro ?? l.nome} saiu da lista do Criar conta. Nada foi apagado.`)
    await carregar()
  }

  const naLista = linhas.filter(l => (l.nome_cadastro ?? '').trim() !== '')
  const foraDaLista = linhas.filter(l => (l.nome_cadastro ?? '').trim() === '')

  return (
    <Layout title="Escritórios do projeto">
      <div className="max-w-4xl">
        <h1 className="font-serif text-3xl text-navy">Escritórios do projeto</h1>
        <p className="mt-2 text-grafite">
          Quem está nesta lista aparece na caixa &quot;Qual é o seu escritório?&quot; do Criar conta.
          Só cria conta quem usa um e-mail com um dos finais cadastrados aqui, ou quem recebeu convite.
        </p>

        {faltaBanco && (
          <div role="alert" className="mt-6 p-4 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm">
            Falta um passo no banco de dados para esta tela gravar. O arquivo para colar já está com você na conversa.
          </div>
        )}
        {erro && <div role="alert" className="mt-6 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">{erro}</div>}
        {aviso && <div role="status" className="mt-6 p-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">{aviso}</div>}

        <div className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl text-navy">Na lista do Criar conta</h2>
            <button
              type="button"
              onClick={() => abrirEdicao(null)}
              title="Cadastra um escritório novo na lista do Criar conta"
              data-testid="novo-escritorio"
              className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider"
            >
              Cadastrar escritório
            </button>
          </div>
          {naLista.length === 0 && <p className="mt-4 text-sm text-grafite-claro">Nenhum escritório na lista ainda.</p>}
          <ul className="mt-4 divide-y divide-grafite-claro/20 border border-grafite-claro/20 rounded-sm" data-testid="lista-na-lista">
            {naLista.map(l => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <p className="font-semibold text-grafite">{l.nome_cadastro}</p>
                  <p className="text-sm text-grafite-claro">
                    {l.dominios_email.length > 0
                      ? `Pode criar conta quem tem e-mail terminando em: ${l.dominios_email.map(d => '@' + d).join(', ')}`
                      : 'Sem final de e-mail cadastrado: só entra por convite.'}
                  </p>
                  <p className="text-sm text-grafite-claro">
                    {(l.nichos ?? []).length > 0
                      ? `Frentes: ${(l.nichos ?? []).map(n => SEGMENTOS.find(sg => sg.id === n)?.nome ?? n).join(', ')}`
                      : 'Sem frente marcada: não aparece na lista de nenhum quadradinho.'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => abrirEdicao(l)} title="Muda o nome na lista ou os finais de e-mail" className="min-h-[44px] px-3 text-sm underline text-navy">Editar</button>
                  <button type="button" onClick={() => tirarDaLista(l)} title="Tira o escritório da lista do Criar conta; nada é apagado" className="min-h-[44px] px-3 text-sm underline text-critico">Tirar da lista</button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {editando !== null && (
          <form onSubmit={gravar} className="mt-8 border border-grafite-claro/30 rounded-sm p-6 space-y-5" data-testid="form-escritorio">
            <h2 className="font-serif text-xl text-navy">{editando ? 'Editar escritório' : 'Cadastrar escritório'}</h2>
            <div>
              <label htmlFor="nome-lista" className="block text-xs uppercase tracking-wider text-grafite mb-2">Nome como aparece na lista</label>
              <input
                id="nome-lista"
                type="text"
                value={nomeLista}
                onChange={e => setNomeLista(e.target.value.toUpperCase())}
                required
                placeholder="SARDAS E MENEZES"
                className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm uppercase"
              />
            </div>
            <div>
              <label htmlFor="finais" className="block text-xs uppercase tracking-wider text-grafite mb-2">Finais de e-mail do escritório</label>
              <input
                id="finais"
                type="text"
                value={finais}
                onChange={e => setFinais(e.target.value)}
                required
                placeholder="escritorio.com.br, escritorio.adv.br"
                className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm"
              />
              <p className="text-xs text-grafite-claro mt-1">Separe por vírgula. Pode ser com ou sem o @. Só cria conta sozinho quem usa e-mail com um destes finais.</p>
            </div>
            <fieldset data-testid="segmentos-do-escritorio">
              <legend className="block text-xs uppercase tracking-wider text-grafite mb-2">De quais frentes este escritório é cliente</legend>
              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                {SEGMENTOS.map(sg => (
                  <label key={sg.id} className="flex items-center gap-2 text-sm text-grafite min-h-[32px]">
                    <input
                      type="checkbox"
                      checked={nichosSel.includes(sg.id)}
                      onChange={e => setNichosSel(v => e.target.checked ? [...v, sg.id] : v.filter(x => x !== sg.id))}
                      title={`Marca o escritório como cliente de ${sg.nome}`}
                    />
                    {sg.nome}
                  </label>
                ))}
              </div>
              <p className="text-xs text-grafite-claro mt-1">O escritório aparece na lista suspensa do Criar conta só das frentes marcadas.</p>
            </fieldset>
            <div className="flex gap-3">
              <button type="submit" disabled={carregando || faltaBanco} title="Grava o escritório na lista do Criar conta" className="min-h-[44px] px-5 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-60">
                {carregando ? 'Gravando…' : 'Gravar'}
              </button>
              <button type="button" onClick={() => setEditando(null)} title="Fecha sem gravar" className="min-h-[44px] px-4 text-sm underline text-grafite">Cancelar</button>
            </div>
          </form>
        )}

        {foraDaLista.length > 0 && (
          <div className="mt-10">
            <h2 className="font-serif text-xl text-navy">Fora da lista</h2>
            <p className="mt-1 text-sm text-grafite-claro">Escritórios que existem no banco mas não aparecem no Criar conta. Para pôr um deles na lista, use Editar.</p>
            <ul className="mt-3 space-y-1" data-testid="lista-fora-da-lista">
              {foraDaLista.map(l => (
                <li key={l.id} className="flex items-center justify-between text-sm text-grafite">
                  <span>{l.nome}</span>
                  <button type="button" onClick={() => abrirEdicao(l)} title="Põe este escritório na lista do Criar conta" className="min-h-[44px] px-3 underline text-navy">Editar</button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Layout>
  )
}
