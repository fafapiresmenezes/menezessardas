import { useEffect, useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import { supabase } from '@/lib/supabase'
import { formatarData } from '@/lib/datas'
import { PenLine, Trash2 } from 'lucide-react'
import { mensagemAmigavel } from '@/lib/erros'

// Assinatura eletrônica simples (Lei 14.063/2020, art. 4º, I): o escritório escreve o documento (contrato de honorários,
// procuração, termo), o cliente assina pelo link do portal com nome e CPF/CNPJ; fica o hash e a hora.
type Assinatura = { id: string; titulo: string; hash_texto: string; assinante_nome: string | null; assinante_documento: string | null; assinado_em: string | null; hash_assinatura: string | null; criado_em: string; selo_id: number | null; selos_blockchain?: { situacao: string; altura_bitcoin: number | null; data_bloco: string | null; criado_em: string } | null }
const MODELO = (cliente: string | null) => `CONTRATO DE HONORÁRIOS ADVOCATÍCIOS

Contratante: ${cliente ?? '[nome do cliente]'}.
Contratada: THEYE Institute, Lagoa, Rio de Janeiro.

1. Objeto: [descrever o serviço].
2. Honorários: R$ [valor], pagos [forma e prazo].
3. Despesas processuais correm por conta do contratante.
4. Foro: Comarca da Capital do Rio de Janeiro.

Ao assinar, o contratante declara ter lido e aceito estas condições.`

export default function AssinaturasCaso({ tarefaId, cliente }: { tarefaId: string; cliente: string | null }) {
  const [lista, setLista] = useState<Assinatura[]>([])
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState('Contrato de honorários')
  const [texto, setTexto] = useState(() => MODELO(cliente))
  const [erro, setErro] = useState('')
  const [compCopiados, setCompCopiados] = useState(false) // Passo 217
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 282
  const [baixado, marcarBaixado] = useBaixado() // Passo 406
  const carregar = async () => {
    const { data, error } = await supabase.from('assinaturas_eletronicas').select('id,titulo,hash_texto,assinante_nome,assinante_documento,assinado_em,hash_assinatura,criado_em,selo_id,selos_blockchain(situacao,altura_bitcoin,data_bloco,criado_em)').eq('tarefa_id', tarefaId).order('criado_em')
    if (error) setErro(mensagemAmigavel(error)); else setLista((data ?? []) as unknown as Assinatura[])
  }
  useEffect(() => { carregar() }, [tarefaId])
  const pedir = async () => {
    setErro('')
    const { error } = await supabase.from('assinaturas_eletronicas').insert({ tarefa_id: tarefaId, titulo: titulo.trim(), texto })
    if (error) return setErro(mensagemAmigavel(error))
    setAberto(false); carregar()
  }
  const apagar = async (id: string) => {
    if (!window.confirm('Apagar este pedido de assinatura?')) return
    const { error } = await supabase.from('assinaturas_eletronicas').delete().eq('id', id)
    if (error) setErro(mensagemAmigavel(error)); else carregar()
  }
  return (
    <section aria-labelledby="t-assin" className="bg-white shadow-sm p-5" data-testid="assinaturas-caso">
      <h2 id="t-assin" className="text-lg mb-1 flex items-center gap-2"><PenLine size={18} className="text-dourado" aria-hidden="true" /> Assinatura eletrônica</h2>
      <p className="text-xs text-grafite-claro mb-3">O cliente assina pelo mesmo link do portal, informando nome e CPF/CNPJ. A plataforma guarda o hash do texto, do aceite e a hora (assinatura eletrônica simples, Lei 14.063/2020). O selo diário em blockchain cobre o registro.</p>
      {erro && <p role="alert" className="text-sm text-critico mb-2">{erro}</p>}
      <ul className="divide-y divide-navy/5 text-sm mb-3">
        {lista.map(a => (
          <li key={a.id} className="py-2 flex items-start justify-between gap-3">
            <span><span className="text-navy font-medium">{a.titulo}</span>
              <span className="block text-xs text-grafite-claro">{a.assinado_em ? `Assinado por ${a.assinante_nome} (${a.assinante_documento}) em ${formatarData(a.assinado_em.slice(0, 10))} · hash ${a.hash_assinatura?.slice(0, 16)}…` : `Aguardando assinatura · pedido em ${formatarData(a.criado_em.slice(0, 10))}`}</span></span>
            {a.assinado_em ? <span className="text-xs uppercase tracking-wider text-regular whitespace-nowrap text-right" data-testid="assinado">Assinado{a.selo_id ? <span className="block normal-case tracking-normal text-grafite-claro" data-testid="ancorado">{a.selos_blockchain?.situacao === 'confirmado' && a.selos_blockchain.altura_bitcoin ? `Ancorado no Bitcoin (bloco ${a.selos_blockchain.altura_bitcoin})` : `Ancorado no selo de ${a.selos_blockchain?.criado_em ? formatarData(a.selos_blockchain.criado_em.slice(0, 10)) : 'hoje'} (aguardando bloco)`}</span> : <span className="block normal-case tracking-normal text-grafite-claro" data-testid="aguardando-selo">Entra no selo blockchain do dia</span>}</span>
              : <button onClick={() => apagar(a.id)} aria-label={`Cancelar pedido ${a.titulo}`} title={`Apaga o pedido de assinatura "${a.titulo}" (pede confirmação); use se o pedido foi feito por engano`} className="min-h-[36px] px-2 text-grafite-claro hover:text-critico"><Trash2 size={14} /></button>}
          </li>
        ))}
        {!lista.length && <li className="py-2 text-grafite-claro">Nenhum documento para assinar ainda.</li>}
        {/* Passo 149: comprovantes copiáveis (título, assinante, data, hashes) para o processo. */}
        {lista.length > 0 && <li className="py-2"><button type="button" onClick={() => navigator.clipboard?.writeText(['Assinaturas eletrônicas — THEYE Institute', ...lista.map(a => `${a.titulo} · hash do texto ${a.hash_texto} · ${a.assinado_em ? `assinado por ${a.assinante_nome} (${a.assinante_documento}) em ${formatarData(a.assinado_em.slice(0, 10))} · hash da assinatura ${a.hash_assinatura}` : 'aguardando assinatura'}`)].join('\n')).then(() => setCompCopiados(true)).catch(() => undefined)} data-testid="copiar-assinaturas" title="Copia os comprovantes de assinatura (título, assinante, hashes e data) em texto para juntar ao processo" className="underline text-navy text-xs">{compCopiados ? 'comprovantes copiados' : 'copiar comprovantes'}</button></li>}
        {lista.length > 0 && <li className="py-2 print:hidden"><button type="button" onClick={() => window.print()} data-testid="imprimir-assinaturas" title="Abre a janela de impressão do navegador para imprimir os comprovantes de assinatura" className="underline text-navy text-xs">imprimir comprovantes</button></li>}{/* Passo 183 */}
        {lista.length > 0 && <li className="py-2 print:hidden"><button type="button" data-testid="copiar-link-assinaturas" title="Copia o endereço desta página para compartilhar com a equipe" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="underline text-navy text-xs">{linkCopiado ? 'link copiado' : 'copiar link'}</button></li>}{/* Passo 251 */}
        {lista.length > 0 && <li><button type="button" data-testid="baixar-assinaturas" aria-live="polite" title="Baixa a planilha CSV com as assinaturas (título, assinante, data e hashes)" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['título;assinante;assinado em;hash do texto;hash da assinatura', ...lista.map(s => `${s.titulo.replace(/;/g, ',')};${s.assinante_nome ?? ''};${s.assinado_em ?? ''};${s.hash_texto};${s.hash_assinatura ?? ''}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'assinaturas.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="underline text-navy text-sm print:hidden">{baixado ? 'baixado' : 'baixar CSV'}</button></li>}{/* Passo 317 */}
      </ul>
      {!aberto ? <button onClick={() => setAberto(true)} title="Abre o formulário para escrever o documento (contrato, procuração, termo) e enviar ao cliente para assinatura eletrônica" className="min-h-[44px] px-4 border border-dourado text-navy text-sm uppercase tracking-wider" data-testid="pedir-assinatura">Pedir assinatura</button> : (
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-wider text-grafite">Título<input value={titulo} onChange={e => setTitulo(e.target.value)} className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal" data-testid="assin-titulo" /></label>
          <label className="block text-xs uppercase tracking-wider text-grafite">Texto do documento<textarea value={texto} onChange={e => setTexto(e.target.value)} rows={10} className="block w-full border px-3 py-2 mt-1 normal-case tracking-normal text-sm" data-testid="assin-texto" /></label>
          <div className="flex gap-3">
            <button onClick={pedir} disabled={!titulo.trim() || texto.trim().length < 20} title="Registra o documento para assinatura: o cliente assina pelo link do portal informando nome e CPF/CNPJ" className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider disabled:bg-grafite-claro/40" data-testid="enviar-assinatura">Enviar para assinatura</button>
            <button onClick={() => setAberto(false)} title="Fecha o formulário sem enviar o documento para assinatura" className="min-h-[44px] px-4 border border-navy/20 text-sm">Cancelar</button>
          </div>
          <p className="text-xs text-grafite-claro">Depois, toque em "Link para o cliente" e envie o link: o documento aparece no portal para assinar.</p>
        </div>
      )}
    </section>
  )
}
