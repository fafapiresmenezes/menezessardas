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

  // Pedido de M (21/11/2026): quem fica aguardando recebe um e-mail dizendo isso, e o
  // administrador recebe um e-mail com o link para liberar. A função só manda uma vez por dia.
  const avisar = async () => {
    try {
      if (sessionStorage.getItem('gm-aviso-pendente')) return
      sessionStorage.setItem('gm-aviso-pendente', '1')
    } catch { /* sem sessionStorage, o freio fica só no servidor */ }
    try {
      const { data } = await supabase.auth.getUser()
      const email = data?.user?.email
      if (email) await supabase.functions.invoke('acesso-email', { body: { acao: 'avisar-pendente', email } })
    } catch { /* o aviso é cortesia: se falhar, a tela continua certa e o servidor ainda freia repetições */ }
  }

  const conferir = async () => {
    setOcupado(true); setErro('')
    try {
      const p = await meuPedidoEntrada()
      if (p.estado === 'dentro') { aoEntrar(); return }
      setPedido(p)
      if (p.estado === 'pendente') avisar()
    } finally { setOcupado(false) }
  }
  useEffect(() => { conferir() }, [])

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault(); setErro('')
    if (nomeDeEscritorio(nome).length < 3) { setErro('Escreva o nome da organização com pelo menos 3 letras.'); return }
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
          {estado === 'pendente' ? 'Falta só a sua organização liberar' : estado === 'nenhum' ? 'De qual organização você é?' : 'Sua conta ainda não entrou em uma organização'}
        </h1>

        {!pedido && <p className="text-sm text-grafite-claro mt-4">Conferindo a sua situação…</p>}

        {estado === 'pendente' && (
          <div className="mt-4 text-sm text-grafite space-y-3" data-testid="pedido-pendente">
            <p>Você pediu para entrar na organização <strong>{pedido?.escritorio}</strong>{pedido?.desde ? <> em {dia(pedido.desde)}</> : null}. Por segurança, ninguém entra sem a liberação do administrador.</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>O administrador já recebeu um e-mail com o seu pedido e o link para liberar.</li>
              <li>Você também recebeu um e-mail confirmando que a sua conta aguarda liberação.</li>
              <li>Quando for liberado, volte aqui e toque em <strong>Já fui liberado, conferir</strong>.</li>
            </ol>
          </div>
        )}

        {estado === 'recusado' && (
          <p role="alert" className="mt-4 p-3 bg-atencaoFundo border-l-2 border-atencao text-atencao text-sm" data-testid="pedido-recusado">
            O pedido para entrar em <strong>{pedido?.escritorio}</strong> não foi aceito. Confira o nome com a sua organização e peça de novo abaixo.
          </p>
        )}

        {estado === 'convite' && (
          <p className="mt-4 text-sm text-grafite" data-testid="pedido-convite">
            Existe um convite esperando por você. Abra o e-mail do convite e toque no link: ele coloca você direto na organização certa.
          </p>
        )}

        {estado === 'suspenso' && (
          <p className="mt-4 text-sm text-grafite" data-testid="pedido-suspenso">
            O seu acesso está pausado. Fale com a pessoa que administra a sua organização: ela devolve o acesso na Área do administrador.
          </p>
        )}

        {estado === 'indisponivel' && (
          <p className="mt-4 text-sm text-grafite" data-testid="pedido-indisponivel">
            A sua conta ainda não foi liberada. Avise a pessoa que administra a sua organização e tente de novo em alguns minutos.
          </p>
        )}

        {mostrarFormulario && (
          <form onSubmit={enviar} className="mt-5 space-y-3" data-testid="form-escritorio">
            {estado === 'nenhum' && (
              <p className="text-sm text-grafite">
                Escreva o nome da sua organização igualzinho ao da lista do Criar conta. Só organizações já cadastradas pelo Instituto são aceitas; se a sua não estiver na lista, fale com o Instituto.
              </p>
            )}
            <label htmlFor="nome-escritorio" className="block text-xs uppercase tracking-wider text-grafite">Nome da organização (em letras maiúsculas)</label>
            <input
              id="nome-escritorio" data-testid="campo-nome-escritorio" value={nome} required
              onChange={e => setNome(e.target.value.toUpperCase())}
              placeholder="EX.: SARDAS E MENEZES"
              title="Escreva igualzinho aos seus colegas: tudo em letras maiúsculas. A tela já converte sozinha."
              className="w-full px-4 py-2.5 border border-grafite-claro/40 rounded-sm uppercase"
            />
            <button type="submit" disabled={ocupado} title="Envia o pedido para a organização com este nome" className="w-full bg-navy text-white py-3 rounded-sm uppercase tracking-wider text-sm disabled:bg-grafite-claro">
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
            <button type="button" onClick={() => setTrocando(true)} data-testid="trocar-escritorio" title="Use se você escreveu o nome da organização errado" className="min-h-[44px] underline text-navy">
              Escrevi o nome errado
            </button>
          )}
          <button type="button" onClick={sair} title="Sai desta conta e volta à tela de entrada" className="min-h-[44px] underline text-grafite">Sair</button>
        </div>
      </div>
    </main>
  )
}
