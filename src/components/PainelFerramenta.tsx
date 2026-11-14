// Theye Suporte Jurídico — painel genérico que desenha os campos de qualquer ferramenta do catálogo e mostra o resultado.
import { useState } from 'react'
import { Copy, Check, Download } from 'lucide-react'
import { rodar, valoresPadrao, type Ferramenta, type Valores } from '@/lib/ferramentas/catalogo'

const entrada = 'w-full border border-navy/20 px-3 py-2 min-h-[44px] bg-white text-grafite focus:outline-none focus:ring-2 focus:ring-dourado'

export default function PainelFerramenta({ ferramenta }: { ferramenta: Ferramenta }) {
  const [valores, setValores] = useState<Valores>(() => valoresPadrao(ferramenta))
  const [saida, setSaida] = useState<ReturnType<typeof rodar> | null>(null)
  const [copiado, setCopiado] = useState(false)
  const mudar = (k: string, x: Valores[string]) => setValores(v => ({ ...v, [k]: x }))
  const calcular = (e?: React.FormEvent) => { e?.preventDefault(); setSaida(rodar(ferramenta, valores)); setCopiado(false) }
  const textoSaida = saida?.ok ? (saida.resultado.texto ?? saida.resultado.linhas.map(([a, b]) => `${a}: ${b}`).join('\n')) : ''
  const copiar = async () => {
    try { await navigator.clipboard.writeText(textoSaida); setCopiado(true) } catch { setCopiado(false) }
  }
  const baixar = () => {
    const url = URL.createObjectURL(new Blob([`${ferramenta.nome}\n\n${textoSaida}\n\nTHEYE Institute — Suporte Jurídico\n`], { type: 'text/plain;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = `${ferramenta.id}.txt`; a.click(); URL.revokeObjectURL(url)
  }

  const baixarArquivo = () => {
    if (!saida?.ok || !saida.resultado.arquivo) return
    const { nome, conteudo, tipo } = saida.resultado.arquivo
    const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
    const a = document.createElement('a'); a.href = url; a.download = nome; a.click(); URL.revokeObjectURL(url)
  }

  return (
    <section className="bg-white p-5 shadow-sm" data-testid={`ferramenta-${ferramenta.id}`} aria-labelledby={`titulo-${ferramenta.id}`}>
      <h2 id={`titulo-${ferramenta.id}`} className="text-lg text-navy">{ferramenta.nome}</h2>
      <p className="text-sm text-grafite-claro mt-1">{ferramenta.descricao}</p>
      {ferramenta.base && <p className="text-xs text-grafite-claro mt-1">Base: {ferramenta.base}</p>}
      <form onSubmit={calcular} className="mt-4 grid gap-3 md:grid-cols-2">
        {ferramenta.campos.map(c => {
          const id = `${ferramenta.id}-${c.nome}`
          if (c.tipo === 'marcar') {
            const marcados = (valores[c.nome] as string[]) ?? []
            return (
              <fieldset key={c.nome} className="md:col-span-2">
                <legend className="text-sm font-medium text-navy mb-1">{c.rotulo}</legend>
                <div className="grid gap-1 md:grid-cols-2">
                  {c.opcoes.map(([valor, rotulo]) => (
                    <label key={valor} className="flex items-start gap-2 text-sm min-h-[44px] py-2">
                      <input type="checkbox" className="mt-1 h-4 w-4" checked={marcados.includes(valor)} onChange={e => mudar(c.nome, e.target.checked ? [...marcados, valor] : marcados.filter(m => m !== valor))} />
                      <span>{rotulo}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            )
          }
          if (c.tipo === 'sim') return (
            <label key={c.nome} htmlFor={id} className="flex items-center gap-2 text-sm min-h-[44px] md:col-span-2">
              <input id={id} type="checkbox" className="h-4 w-4" checked={valores[c.nome] === true} onChange={e => mudar(c.nome, e.target.checked)} /> {c.rotulo}
            </label>
          )
          return (
            <div key={c.nome} className={c.tipo === 'area' ? 'md:col-span-2' : ''}>
              <label htmlFor={id} className="block text-sm font-medium text-navy mb-1">{c.rotulo}</label>
              {c.tipo === 'selecao' ? (
                <select id={id} className={entrada} value={String(valores[c.nome] ?? '')} onChange={e => mudar(c.nome, e.target.value)}>
                  {c.opcoes.map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
                </select>
              ) : c.tipo === 'area' ? (
                <textarea id={id} rows={5} className={entrada} value={String(valores[c.nome] ?? '')} onChange={e => mudar(c.nome, e.target.value)} />
              ) : (
                <input id={id} className={entrada} type={c.tipo === 'data' ? 'date' : c.tipo === 'numero' ? 'number' : 'text'} step={c.tipo === 'numero' ? 'any' : undefined} inputMode={c.tipo === 'numero' ? 'decimal' : undefined} value={String(valores[c.nome] ?? '')} onChange={e => mudar(c.nome, e.target.value)} />
              )}
              {c.ajuda && <p className="text-xs text-grafite-claro mt-1">{c.ajuda}</p>}
            </div>
          )
        })}
        <div className="md:col-span-2">
          <button title="Faz a conta com o que você preencheu e mostra o resultado abaixo" type="submit" className="bg-navy text-white min-h-[44px] px-6 uppercase tracking-wider text-sm">{ferramenta.categoria === 'Modelos prontos' ? 'Gerar' : 'Calcular'}</button>
        </div>
      </form>

      <div aria-live="polite">
        {saida && !saida.ok && <p role="alert" className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800" data-testid="ferramenta-erro">{saida.erro}</p>}
        {saida?.ok && (
          <div className="mt-4 border-t border-navy/10 pt-4" data-testid="ferramenta-resultado">
            <dl className="grid gap-x-4 gap-y-1 text-sm md:grid-cols-[minmax(10rem,auto)_1fr]">
              {saida.resultado.linhas.map(([a, b], i) => (
                <div key={i} className="contents"><dt className="font-medium text-navy">{a}</dt><dd className="text-grafite mb-1 break-words">{b}</dd></div>
              ))}
            </dl>
            {!!saida.resultado.alertas?.length && (
              <ul className="mt-3 space-y-1 text-sm">{saida.resultado.alertas.map((a, i) => <li key={i} className="border-l-4 border-dourado bg-dourado/10 p-2">{a}</li>)}</ul>
            )}
            {!!saida.resultado.links?.length && (
              <ul className="mt-3 space-y-1 text-sm" data-testid="ferramenta-links">{saida.resultado.links.map(([rotulo, url]) => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="underline decoration-dourado text-navy break-all">{rotulo} ↗</a></li>)}</ul>
            )}
            {saida.resultado.texto && <pre className="mt-3 whitespace-pre-wrap bg-gray-50 border border-navy/10 p-3 text-sm font-sans" data-testid="ferramenta-texto">{saida.resultado.texto}</pre>}
            <div className="mt-3 flex flex-wrap gap-2">
              <button title="Copia o resultado, para colar na peça" type="button" onClick={copiar} className="inline-flex items-center gap-2 border border-navy/30 text-navy min-h-[44px] px-4 text-sm">{copiado ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />} {copiado ? 'Copiado' : 'Copiar'}</button>
              {saida.resultado.arquivo
                ? <button title="Baixa o resultado em arquivo, pronto para juntar ao processo" type="button" onClick={baixarArquivo} className="inline-flex items-center gap-2 bg-dourado text-navy min-h-[44px] px-4 text-sm"><Download size={16} aria-hidden="true" /> Baixar arquivo</button>
                : <button title="Baixa o resultado em texto simples" type="button" onClick={baixar} className="inline-flex items-center gap-2 border border-navy/30 text-navy min-h-[44px] px-4 text-sm"><Download size={16} aria-hidden="true" /> Baixar .txt</button>}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
