/**
 * Painel da administração da sede: os pedidos de entrada que chegam pela porta (gente que ainda
 * não é membro). Lê pela função `pedidos_entrada_publico_listar` (só admin da sede passa) e deixa
 * marcar cada pedido como lido, respondido ou arquivado.
 */
import { useEffect, useState } from 'react'
import { Inbox } from 'lucide-react'
import { mensagemAmigavel } from '@/lib/erros'
import { formatarData } from '@/lib/datas'
import {
  listarPedidosEntrada, marcarPedidoEntrada,
  type PedidoEntradaPublico, type EstadoPedido,
} from '@/lib/admissao'

const MOTIVO: Record<string, string> = {
  entrada: 'Entrar no Instituto', proposta: 'Pedir proposta', aviso: 'Ser avisado', apoio: 'Apoiar',
}
const ESTADO: Record<EstadoPedido, string> = {
  novo: 'Novo', lido: 'Lido', respondido: 'Respondido', arquivado: 'Arquivado',
}
const PROXIMO: { de: EstadoPedido; para: EstadoPedido; rotulo: string }[] = [
  { de: 'novo', para: 'lido', rotulo: 'Marcar como lido' },
  { de: 'lido', para: 'respondido', rotulo: 'Marcar como respondido' },
]

export default function PedidosEntradaAdmin() {
  const [pedidos, setPedidos] = useState<PedidoEntradaPublico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState('')

  async function carregar() {
    setCarregando(true); setErro('')
    try { setPedidos(await listarPedidosEntrada()) }
    catch (e) { setErro(mensagemAmigavel(e)) }
    finally { setCarregando(false) }
  }
  useEffect(() => { carregar() }, [])

  async function mudar(id: string, estado: EstadoPedido) {
    setOcupado(id)
    try { await marcarPedidoEntrada(id, estado); await carregar() }
    catch (e) { setErro(mensagemAmigavel(e)) }
    finally { setOcupado('') }
  }

  const abertos = pedidos.filter(p => p.estado !== 'arquivado')

  return (
    <section className="space-y-4" data-testid="pedidos-entrada-admin">
      <h2 className="text-lg flex items-center gap-2">
        <Inbox size={18} aria-hidden="true" /> Pedidos de entrada
        {abertos.length > 0 && <span className="text-xs bg-navy text-white rounded-full px-2 py-0.5" title="Pedidos ainda não arquivados">{abertos.length}</span>}
      </h2>
      <p className="text-sm text-grafite">Quem não é membro deixa aqui o pedido pela porta. Uma pessoa lê e responde pelo contato informado.</p>

      {erro && <p role="alert" className="text-sm text-critico border border-critico/40 p-3">{erro}</p>}
      {carregando ? (
        <p className="text-sm text-grafite-claro">Carregando os pedidos…</p>
      ) : pedidos.length === 0 ? (
        <p className="text-sm text-grafite-claro">Nenhum pedido até agora.</p>
      ) : (
        <ul className="space-y-3">
          {pedidos.map(p => (
            <li key={p.id} className={`border p-4 ${p.estado === 'arquivado' ? 'border-navy/10 opacity-60' : 'border-navy/20'}`} data-testid={`pedido-${p.id}`}>
              <div className="flex justify-between gap-3 flex-wrap items-baseline">
                <span className="font-medium">{p.nome}{p.escritorio ? ` · ${p.escritorio}` : ''}</span>
                <span className="text-xs text-grafite-claro" title={`Protocolo ${p.protocolo}, recebido em ${formatarData(p.criado_em.slice(0, 10))}`}>{p.protocolo} · {formatarData(p.criado_em.slice(0, 10))}</span>
              </div>
              <p className="text-sm text-grafite mt-1">
                <span className="uppercase text-[11px] tracking-wider text-grafite-claro mr-2">{MOTIVO[p.motivo] ?? p.motivo}{p.frente ? ` · ${p.frente}` : ''}</span>
                <span className="text-xs bg-pergaminho border border-navy/10 px-2 py-0.5">{ESTADO[p.estado]}</span>
              </p>
              <p className="text-sm mt-2">
                <a href={`mailto:${p.email}`} className="underline decoration-navy/30 hover:text-navy" title="Abre o seu e-mail para responder">{p.email}</a>
                {p.telefone && <span className="text-grafite"> · {p.telefone}</span>}
              </p>
              {p.mensagem && <p className="text-sm text-grafite mt-2 whitespace-pre-wrap border-l-2 border-navy/15 pl-3">{p.mensagem}</p>}
              <div className="flex gap-2 flex-wrap mt-3">
                {PROXIMO.filter(x => x.de === p.estado).map(x => (
                  <button key={x.para} onClick={() => mudar(p.id, x.para)} disabled={ocupado === p.id} title={x.rotulo} className="min-h-[36px] px-3 border border-navy/30 text-navy hover:bg-pergaminho disabled:opacity-50 text-sm">{x.rotulo}</button>
                ))}
                {p.estado !== 'arquivado'
                  ? <button onClick={() => mudar(p.id, 'arquivado')} disabled={ocupado === p.id} title="Tira o pedido da lista de abertos (dá para reabrir)" className="min-h-[36px] px-3 border border-navy/20 text-grafite-claro hover:bg-pergaminho disabled:opacity-50 text-sm">Arquivar</button>
                  : <button onClick={() => mudar(p.id, 'lido')} disabled={ocupado === p.id} title="Traz o pedido de volta para a lista de abertos" className="min-h-[36px] px-3 border border-navy/20 text-grafite-claro hover:bg-pergaminho disabled:opacity-50 text-sm">Reabrir</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
