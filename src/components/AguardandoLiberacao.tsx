import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { mensagemAmigavel } from '@/lib/erros'
import { entrarEmEscritorio, meuPedidoEntrada, nomeDeEscritorio, type PedidoEntrada } from '@/lib/equipe'

const dia = (iso?: string) => (iso ? new Date(iso).toLocaleDateString('pt-BR') : '')

/**
 * Tela de quem entrou com e-mail e senha mas ainda não pertence a um escritório.
 * Nada da plataforma aparece enquanto a administração do escritório não liberar.
 */
export default function AguardandoLiberacao({ aoEntrar }: { aoEntrar: () => void }) {
  const [pedido, setPedido] = useState<PedidoEntrada | null>(null)
  const [nome, setNome] = useState('')
  const [trocando, setTrocando] = useState(false)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const conferir = async () => {
    setOcupado(true); setErro('')
    try {
      const p = await meuPedidoEntrada()
      if (p.estado === 'dentro') { aoEntrar(); return }
      setPedido(p)
    } finally { setOcupado(false) }
  }
  useEffect(() => { conferir() }, [])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('')
    if (nomeDeEscritorio(nome).length < 3) { setErro('Escreva o nome do escritório com pelo menos 3 letras.'); return }
    setOcupado(true)
    try {
      const p = await entrarEmEscritorio(nome)
      if (p.estado === 'dentro') { aoEntrar(); return }
      setPedido(p); setTrocando(false); setNome('')
    } catch (x) { setErro(mensagemAmigavel(x)) } finally { setOcupado(false) }
  }
  const sair = async () => { await supabase.auth.signOut(); window.location.hash = '#/login'; window.location.reload() }

  const estado = pedido?.estado
  const mostrarFormulario = estado === 'nenhum' || estado === 'recusado' || trocando

  return (
    <main className="min-h-screen bg-navy flex items-center justify-center p-4" data-testid="aguardando-liberacao">
      <div className="w-full max-w-lg bg-white rounded-sm shadow-xl p-8">
        <h1 className="font-serif text-2xl text-navy">
          {estado === 'pendente' ? 'Falta só o seu escritório liberar' : estado === 'nenhum' ? 'De qual escritório você é?' : 'Sua conta ainda não entrou em um escritório'}
        </h1>

        {!pedido && <p className="text-sm text-grafite-claro mt-4">Conferindo a sua situação…</p>}

        {estado === 'pendente' && (
          <div className="mt-4 text-sm text-grafite space-y-3" data-testid="pedido-pendente">
            <p>Você pediu para entrar no escritório <strong>{pedido?.escritorio}</strong>{pedido?.desde ? <> em {dia(pedido.desde)}</> : null}. Por segurança, ninguém entra em um escritório sem que alguém de lá confirme.</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Avise a pessoa que administra o escritório (sócio ou gestor).</li>
              <li>Ela abre o menu <strong>Área do administrador</strong> e toca em <strong>Liberar</strong> ao lado do seu nome.</li>
              <li>Volte aqui e toque em <strong>Já fui liberado, conferir</strong>.</li>
            </ol>
          </div>
        )}

        {estado === 'recusado' && (
          <p role="alert" className="mt-4 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm" data-testid="pedido-recusado">
            O pedido para entrar em <strong>{pedido?.escritorio}</strong> não foi aceito. Confira o nome com o seu escritório e peça de novo abaixo.
          </p>
        )}

        {estado === 'convite' && (
          <p className="mt-4 text-sm text-grafite" data-testid="pedido-convite">
            Existe um convite esperando por você. Abra o e-mail do convite e toque no link: ele coloca você direto no escritório certo.
          </p>
        )}

        {estado === 'suspenso' && (
          <p className="mt-4 text-sm text-grafite" data-testid="pedido-suspenso">
            O seu acesso está pausado. Fale com a pessoa que administra o seu escritório: ela devolve o acesso na Área do administrador.
          </p>
        )}

        {estado === 'indisponivel' && (
          <p className="mt-4 text-sm text-grafite" data-testid="pedido-indisponivel">
            A sua conta ainda não foi liberada. Avise a pessoa que administra o seu escritório e tente de novo em alguns minutos.
          </p>
        )}

        {mostrarFormulario && (
          <form onSubmit={enviar} className="mt-5 space-y-3" data-testid="form-escritorio">
            {estado === 'nenhum' && (
              <p className="text-sm text-grafite">
                Escreva o nome do seu escritório. Se ele já usa a plataforma, o pedido vai para quem administra lá. Se ainda não usa, ele é criado agora e você passa a administrá-lo.
              </p>
            )}
            <label htmlFor="nome-escritorio" className="block text-xs uppercase tracking-wider text-grafite">Nome do escritório (em letras maiúsculas)</label>
            <input
              id="nome-escritorio" data-testid="campo-nome-escritorio" value={nome} required
              onChange={e => setNome(e.target.value.toUpperCase())}
              placeholder="EX.: SARDAS E MENEZES"
              title="Escreva igualzinho aos seus colegas: tudo em letras maiúsculas. A tela já converte sozinha."
              className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm uppercase"
            />
            <button type="submit" disabled={ocupado} title="Envia o pedido para o escritório com este nome" className="w-full bg-navy text-white py-3 rounded-sm uppercase tracking-wider text-sm disabled:bg-grafite-claro">
              {ocupado ? 'Aguarde…' : 'Enviar pedido'}
            </button>
          </form>
        )}

        {erro && <p role="alert" className="mt-3 text-sm text-critico">{erro}</p>}

        <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          {pedido && estado !== 'nenhum' && (
            <button type="button" onClick={conferir} disabled={ocupado} data-testid="conferir-liberacao" title="Pergunta de novo ao sistema se o seu acesso já foi liberado" className="min-h-[44px] underline text-navy">
              Já fui liberado, conferir
            </button>
          )}
          {estado === 'pendente' && !trocando && (
            <button type="button" onClick={() => setTrocando(true)} data-testid="trocar-escritorio" title="Use se você escreveu o nome do escritório errado" className="min-h-[44px] underline text-navy">
              Escrevi o nome errado
            </button>
          )}
          <button type="button" onClick={sair} title="Sai desta conta e volta à tela de entrada" className="min-h-[44px] underline text-grafite">Sair</button>
        </div>
      </div>
    </main>
  )
}
