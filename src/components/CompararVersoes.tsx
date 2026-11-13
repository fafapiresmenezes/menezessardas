import { useState } from 'react'
import { GitCompare, Download } from 'lucide-react'
import { diffPalavras, diffCampos, resumoRedline, pdfRedline, type Segmento } from '@/lib/redline'
import { baixarArquivo } from '@/lib/ancoragem'
import { urlAssinada } from '@/lib/arquivos'
import { mensagemAmigavel } from '@/lib/erros'
import type { Contrato } from '@/lib/repositorio'

// Passo D17 (Diamante): comparação de versões (redline) entre o contrato e cada aditivo ou subcontrato.
// Texto: usa o texto já extraído do PDF; se faltar, baixa o PDF anexado e extrai na hora. Campos: sempre.
async function textoDoContrato(c: Contrato): Promise<string> {
  if (c.textoExtraido?.trim()) return c.textoExtraido
  const caminho = c.arquivo?.caminhoStorage ?? c.documentos.find(d => d.tipo === 'contrato' && d.caminhoStorage)?.caminhoStorage
  if (!caminho) return ''
  const r = await fetch(await urlAssinada(caminho))
  if (!r.ok) throw new Error('Não foi possível baixar o PDF para comparar.')
  const { extrairTextoPdf } = await import('@/lib/pdf')
  return extrairTextoPdf(new File([await r.blob()], 'contrato.pdf', { type: 'application/pdf' }))
}

export default function CompararVersoes({ contrato, vinculados, obterTexto = textoDoContrato }: { contrato: Contrato; vinculados: Contrato[]; obterTexto?: (c: Contrato) => Promise<string> }) {
  const [escolhido, setEscolhido] = useState(vinculados[0]?.id ?? '')
  const [segs, setSegs] = useState<Segmento[] | null>(null)
  const [semTexto, setSemTexto] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')
  const outro = vinculados.find(v => v.id === escolhido)
  if (!vinculados.length) return null
  const comparar = async () => {
    if (!outro) return
    setOcupado(true); setErro(''); setSemTexto(''); setSegs(null)
    try {
      const [a, b] = await Promise.all([obterTexto(contrato), obterTexto(outro)])
      if (!a.trim() || !b.trim()) { setSemTexto(!a.trim() && !b.trim() ? 'Nenhuma das versões tem PDF anexado: a comparação abaixo usa só os campos do cadastro.' : `Falta o PDF ${!a.trim() ? 'do contrato' : 'do aditivo'}: a comparação de texto fica incompleta.`) }
      setSegs(diffPalavras(a, b))
    } catch (e) { setErro(mensagemAmigavel(e, 'Não foi possível comparar as versões.')) } finally { setOcupado(false) }
  }
  const campos = outro ? diffCampos(contrato, outro) : []
  const resumo = segs ? resumoRedline(segs) : null
  const baixar = () => { if (!outro) return; baixarArquivo(`comparacao-${contrato.parte.replace(/\W+/g, '-').toLowerCase()}.pdf`, pdfRedline(`Comparação de versões · ${contrato.parte}`, campos, segs ?? [], `Contrato de ${contrato.dataInicio.slice(0, 10).split('-').reverse().join('/')} × ${outro.natureza === 'subcontrato' ? 'subcontrato' : 'aditivo'} de ${outro.dataInicio.slice(0, 10).split('-').reverse().join('/')}`), 'application/pdf') }
  return (
    <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-comparar" data-testid="comparar-versoes">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
        <h3 id="titulo-comparar" className="text-lg flex items-center gap-2"><GitCompare size={18} className="text-dourado" aria-hidden="true" /> Comparar versões (redline)</h3>
        <div className="flex flex-wrap gap-2 items-center">
          <select aria-label="Versão para comparar" value={escolhido} onChange={e => { setEscolhido(e.target.value); setSegs(null) }} className="border px-2 py-2 min-h-[44px] text-sm" data-testid="comparar-versao">
            {vinculados.map(v => <option key={v.id} value={v.id}>{v.natureza === 'subcontrato' ? 'Subcontrato' : 'Aditivo'} · {v.parte} · {v.dataInicio.slice(0, 10).split('-').reverse().join('/')}</option>)}
          </select>
          <button title="Mostra, palavra por palavra, o que mudou entre as duas versões" type="button" onClick={comparar} disabled={ocupado} className="min-h-[44px] px-4 bg-navy text-white text-sm uppercase tracking-wider disabled:opacity-50" data-testid="comparar-executar">{ocupado ? 'Comparando…' : 'Comparar'}</button>
          {segs && <button title="Baixa a comparação em PDF, com o que saiu e o que entrou marcado" type="button" onClick={baixar} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2" data-testid="comparar-pdf"><Download size={14} aria-hidden="true" /> Baixar PDF</button>}
        </div>
      </div>
      <p className="text-xs text-grafite-claro mb-3">Vermelho riscado saiu da versão anterior; verde entrou na nova. Compara os campos do cadastro e o texto dos PDFs anexados, palavra por palavra.</p>
      {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
      {outro && (
        <table className="w-full text-sm mb-4" data-testid="comparar-campos">
          <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite border-b"><th className="py-1">Campo</th><th>Contrato</th><th>{outro.natureza === 'subcontrato' ? 'Subcontrato' : 'Aditivo'}</th></tr></thead>
          <tbody>{campos.map(c => <tr key={c.campo} className={`border-b border-navy/5 ${c.mudou ? 'font-medium' : 'text-grafite-claro'}`} data-testid={c.mudou ? 'campo-mudou' : 'campo-igual'}><td className="py-1 pr-2">{c.campo}</td><td className={c.mudou ? 'line-through text-critico' : ''}>{c.antes}</td><td className={c.mudou ? 'text-emerald-800' : ''}>{c.depois}</td></tr>)}</tbody>
        </table>
      )}
      {semTexto && <p role="status" className="text-sm text-dourado-escuro mb-2" data-testid="comparar-aviso">{semTexto}</p>}
      {resumo && segs && segs.length > 0 && (
        <>
          <p className="text-sm mb-2" data-testid="comparar-resumo"><strong>{resumo.trechosAlterados}</strong> trecho(s) alterado(s) · {resumo.removidas} palavra(s) saíram · {resumo.inseridas} entraram · {resumo.pctAlterado}% do texto mudou</p>
          <div className="text-sm leading-7 max-h-[28rem] overflow-y-auto border p-3 bg-pergaminho/30" data-testid="comparar-redline">
            {segs.map((s, i) => s.tipo === 'igual' ? <span key={i}>{s.texto} </span>
              : s.tipo === 'removido' ? <del key={i} className="bg-red-100 text-critico px-0.5" data-testid="seg-removido">{s.texto} </del>
              : <ins key={i} className="bg-emerald-100 text-emerald-900 no-underline px-0.5" data-testid="seg-inserido">{s.texto} </ins>)}
          </div>
        </>
      )}
    </section>
  )
}
