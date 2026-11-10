import { useEffect, useRef, useState } from 'react'
import { PenLine, Trash2, Upload } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabase'
import { extrairTextoPdf } from '../lib/pdf'
import { ESCOLAS, REFERENCIAS, FORMATACAO } from '../lib/estiloPecas'
import { lerDocx } from '../lib/docx'
import { formatacaoFinal, type Formatacao } from '../lib/formatarPeca'
import { carregarFormatacao, salvarFormatacao, apagarFormatacao } from '../lib/formatacaoUsuario'
import { mensagemAmigavel } from '@/lib/erros'

interface Peca { id: string; titulo: string; texto: string; criado_em: string }
const LIMITE = 10

// Estilo de escrita próprio: cada usuário envia até 10 peças suas; o Assistente redige imitando a forma (pedido de M, 30/10/2026).
export default function EstiloEscrita() {
  const [pecas, setPecas] = useState<Peca[]>([])
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [msg, setMsg] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const arquivo = useRef<HTMLInputElement>(null)
  const [formatacao, setFormatacao] = useState<Partial<Formatacao> | null>(null)
  useEffect(() => { carregarFormatacao().then(setFormatacao).catch(() => undefined) }, [])

  const carregar = async () => {
    if (!supabaseConfigurado) return
    const { data } = await supabase.from('estilos_escrita').select('id, titulo, texto, criado_em').order('criado_em')
    setPecas((data ?? []) as Peca[])
  }
  useEffect(() => { carregar() }, [])

  const lerArquivo = async (f: File) => {
    setMsg('')
    try {
      const nome = f.name.toLowerCase()
      let t: string
      if (nome.endsWith('.docx')) {
        // Word: além do texto, lê a formatação (fonte, tamanho, margens, entrelinhas, recuo).
        const d = await lerDocx(f)
        t = d.texto
        if (Object.keys(d.formatacao).length) {
          await salvarFormatacao(d.formatacao, f.name)
          setFormatacao(d.formatacao)
        }
      } else t = f.type === 'application/pdf' || nome.endsWith('.pdf') ? await extrairTextoPdf(f) : await f.text()
      setTexto(t.trim().slice(0, 60000))
      if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, '').slice(0, 120))
    } catch { setMsg('Não consegui ler o arquivo. Cole o texto no campo ou envie em Word, PDF ou TXT.') }
  }

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (texto.trim().length < 200) { setMsg('A peça precisa ter pelo menos 200 caracteres.'); return }
    setOcupado(true); setMsg('')
    const { error } = await supabase.from('estilos_escrita').insert({ titulo: titulo.trim() || 'Peça sem título', texto: texto.trim() })
    setOcupado(false)
    if (error) { setMsg(mensagemAmigavel(error)); return }
    setTitulo(''); setTexto(''); if (arquivo.current) arquivo.current.value = ''
    setMsg('Peça guardada. O Assistente já usa o seu estilo ao redigir.')
    carregar()
  }

  const apagar = async (id: string) => {
    if (!window.confirm('Apagar esta peça do seu estilo de escrita?')) return
    const { error } = await supabase.from('estilos_escrita').delete().eq('id', id)
    if (error) setMsg(mensagemAmigavel(error))
    carregar()
  }

  if (!supabaseConfigurado) return null
  return (
    <section className="bg-white dark:bg-grafite p-6 shadow-sm mt-6" aria-labelledby="t-estilo" data-testid="secao-estilo">
      <h2 id="t-estilo" className="text-lg mb-1 flex items-center gap-2"><PenLine size={18} aria-hidden="true" /> Meu estilo de escrita</h2>
      <p className="text-sm text-grafite-claro mb-4">Envie até {LIMITE} peças suas (petições, pareceres, contratos, e-mails formais). Todos os robôs e agentes do Assistente passam a escrever com o seu vocabulário, ritmo e forma de citar a lei, em perguntas, peças e caminhos. Envie em Word para a plataforma copiar também a sua formatação. Só você vê as suas peças.</p>
      <ul className="divide-y divide-navy/10 mb-4" aria-label="Peças enviadas">
        {pecas.length === 0 && <li className="py-2 text-sm text-grafite-claro">Nenhuma peça ainda.</li>}
        {pecas.map(p => (
          <li key={p.id} className="py-2 flex items-center justify-between gap-3 text-sm">
            <span><strong>{p.titulo}</strong> <span className="text-grafite-claro">· {p.texto.length.toLocaleString('pt-BR')} caracteres · {new Date(p.criado_em).toLocaleDateString('pt-BR')}</span></span>
            <button type="button" onClick={() => apagar(p.id)} className="min-h-[44px] px-3 text-grafite-claro hover:text-critico flex items-center gap-1" aria-label={`Apagar ${p.titulo}`}><Trash2 size={16} aria-hidden="true" /> Apagar</button>
          </li>
        ))}
      </ul>
      {pecas.length < LIMITE ? (
        <form onSubmit={enviar} className="space-y-3">
          <div>
            <label htmlFor="estilo-titulo" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Título da peça</label>
            <input id="estilo-titulo" value={titulo} onChange={e => setTitulo(e.target.value)} maxLength={120} className="w-full border border-navy/15 p-2 text-sm" placeholder="Ex.: Contestação em ação de despejo (2025)" />
          </div>
          <div>
            <label htmlFor="estilo-arquivo" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Arquivo (Word, PDF ou TXT) ou cole o texto abaixo</label>
            <input id="estilo-arquivo" ref={arquivo} type="file" accept=".docx,.pdf,.txt,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={e => { const f = e.target.files?.[0]; if (f) lerArquivo(f) }} className="text-sm" />
          </div>
          <div>
            <label htmlFor="estilo-texto" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Texto da peça</label>
            <textarea id="estilo-texto" value={texto} onChange={e => setTexto(e.target.value.slice(0, 60000))} rows={6} className="w-full border border-navy/15 p-2 text-sm" placeholder="Cole aqui o texto integral da peça (mínimo 200 caracteres)." />
            <p className="text-xs text-grafite-claro mt-1">{texto.length.toLocaleString('pt-BR')} / 60.000 caracteres · {pecas.length} de {LIMITE} peças</p>
          </div>
          <button type="submit" disabled={ocupado} data-testid="salvar-estilo" className="min-h-[44px] px-4 bg-navy text-white text-sm flex items-center gap-2 disabled:opacity-50"><Upload size={16} aria-hidden="true" /> Guardar peça</button>
        </form>
      ) : <p className="text-sm text-grafite-claro">Limite de {LIMITE} peças atingido. Apague uma para enviar outra.</p>}
      {msg && <p role="status" className="text-sm mt-3">{msg}</p>}
      <div className="mt-6 border-t border-navy/10 pt-4" data-testid="minha-formatacao">
        <h3 className="text-sm font-semibold">Minha formatação</h3>
        {(() => {
          const f = formatacaoFinal(formatacao)
          return (
            <p className="text-sm text-grafite-claro mt-1">
              {formatacao ? 'Lida do seu Word: ' : 'Padrão de grandes escritórios (envie uma peça em Word para usar a sua): '}
              {f.fonte} {String(f.corpo).replace('.', ',')}, entrelinhas {String(f.entrelinhas).replace('.', ',')}, recuo {String(f.recuoPrimeiraLinha).replace('.', ',')} cm, margens {f.margens.superior}/{f.margens.direita}/{f.margens.inferior}/{f.margens.esquerda} cm. Vale para toda peça e todo parecer baixados em Word.
            </p>
          )
        })()}
        {formatacao && (
          <button type="button" onClick={() => apagarFormatacao().then(() => setFormatacao(null))} data-testid="voltar-padrao" className="mt-2 min-h-[44px] px-3 border border-navy/20 text-sm">Voltar ao padrão de grandes escritórios</button>
        )}
      </div>
      <details className="mt-6 border-t border-navy/10 pt-4" data-testid="padrao-escrita">
        <summary className="cursor-pointer text-sm font-semibold min-h-[44px] flex items-center">Padrão de escrita das peças e rotação de estilo</summary>
        <p className="text-sm text-grafite-claro mt-2">Cada peça redigida sorteia uma mistura de {ESCOLAS.length} escolas de escrita jurídica brasileira, com ritmo de frases, conectivos, abertura e numeração diferentes das últimas peças. Se você enviou peças suas acima, o seu estilo prevalece e a rotação só varia o ritmo e os conectivos. O advogado sempre revisa e assina.</p>
        <ul className="mt-3 space-y-2 text-sm">
          {ESCOLAS.map(e => (
            <li key={e.id}><strong>{e.nome}.</strong> {e.descricao} <span className="text-grafite-claro">Referências: {REFERENCIAS.filter(r => r.escola === e.id).map(r => r.nome).join(', ')}.</span></li>
          ))}
        </ul>
        <p className="text-xs text-grafite-claro mt-3">{REFERENCIAS.length} juristas de referência, usados só para nomear as escolas; nenhuma frase deles é copiada.</p>
        <p className="text-sm mt-3"><strong>Formatação ao baixar em Word:</strong> {FORMATACAO.fonte} {FORMATACAO.corpo}, entrelinhas {String(FORMATACAO.entrelinhas).replace('.', ',')}, margens {FORMATACAO.margens.superior}/{FORMATACAO.margens.direita}/{FORMATACAO.margens.inferior}/{FORMATACAO.margens.esquerda} cm, citações longas recuadas {FORMATACAO.recuoCitacao} cm.</p>
      </details>
    </section>
  )
}
