// Theye Suporte Jurídico — juntar PDFs e extrair/girar páginas no navegador (pdf-lib). Nada é enviado a servidor.
import { useState } from 'react'
import { ArrowUp, ArrowDown, X, Download } from 'lucide-react'
import type { Ferramenta } from '@/lib/ferramentas/catalogo'
import { contarPaginas, extrairPaginas, juntarPdfs, tamanhoLegivel } from '@/lib/ferramentas/pdf'

type Arq = { nome: string; bytes: Uint8Array; paginas: number }
const entrada = 'w-full border border-navy/20 px-3 py-2 min-h-[44px] bg-white text-grafite'

function bytesDe(f: File): Promise<ArrayBuffer> {
  if (typeof f.arrayBuffer === 'function') return f.arrayBuffer()
  return new Promise((ok, falha) => { const r = new FileReader(); r.onload = () => ok(r.result as ArrayBuffer); r.onerror = () => falha(r.error); r.readAsArrayBuffer(f) })
}
async function lerArquivo(f: File): Promise<Arq> {
  let bytes: Uint8Array
  try { bytes = new Uint8Array(await bytesDe(f)) } catch { throw new Error(`Não foi possível ler "${f.name}".`) }
  try { return { nome: f.name, bytes, paginas: await contarPaginas(bytes) } } catch { throw new Error(`"${f.name}" não é um PDF válido ou está protegido por senha.`) }
}

export default function PdfFerramenta({ ferramenta }: { ferramenta: Ferramenta }) {
  const juntar = ferramenta.componente === 'pdf-juntar'
  const [arqs, setArqs] = useState<Arq[]>([])
  const [paginas, setPaginas] = useState('1')
  const [giro, setGiro] = useState('0')
  const [erro, setErro] = useState('')
  const [pronto, setPronto] = useState<{ url: string; nome: string; tamanho: number; paginas: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const escolher = async (lista: FileList | null) => {
    setErro(''); setPronto(null)
    if (!lista?.length) return
    try {
      const novos = await Promise.all([...lista].map(lerArquivo))
      setArqs(a => juntar ? [...a, ...novos] : novos.slice(0, 1))
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível ler o arquivo.') }
  }
  const mover = (i: number, d: number) => setArqs(a => { const b = [...a]; const j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b })
  const gerar = async () => {
    setErro(''); setPronto(null); setOcupado(true)
    try {
      if (!arqs.length) throw new Error(juntar ? 'Escolha ao menos um PDF.' : 'Escolha o PDF.')
      const r = juntar ? { pdf: await juntarPdfs(arqs.map(a => a.bytes)), paginas: arqs.reduce((s, a) => s + a.paginas, 0) } : await extrairPaginas(arqs[0].bytes, paginas, Number(giro))
      const url = URL.createObjectURL(new Blob([r.pdf as BlobPart], { type: 'application/pdf' }))
      setPronto({ url, nome: juntar ? 'documentos-unidos.pdf' : `${arqs[0].nome.replace(/\.pdf$/i, '')}-paginas.pdf`, tamanho: r.pdf.byteLength, paginas: r.paginas })
    } catch (e) { setErro(e instanceof Error ? e.message : 'Não foi possível gerar o PDF.') } finally { setOcupado(false) }
  }

  return (
    <section className="bg-white p-5 shadow-sm" data-testid={`ferramenta-${ferramenta.id}`} aria-labelledby={`titulo-${ferramenta.id}`}>
      <h2 id={`titulo-${ferramenta.id}`} className="text-lg text-navy">{ferramenta.nome}</h2>
      <p className="text-sm text-grafite-claro mt-1">{ferramenta.descricao}</p>
      <div className="mt-4 space-y-3">
        <label htmlFor={`${ferramenta.id}-arquivos`} className="block text-sm font-medium text-navy">{juntar ? 'PDFs (pode escolher vários)' : 'PDF'}</label>
        <input id={`${ferramenta.id}-arquivos`} data-testid="pdf-arquivos" type="file" accept="application/pdf,.pdf" multiple={juntar} onChange={e => { void escolher(e.target.files); e.target.value = '' }} className="block text-sm" />
        {!!arqs.length && (
          <ol className="divide-y divide-navy/10 border border-navy/10" data-testid="pdf-lista">
            {arqs.map((a, i) => (
              <li key={`${a.nome}-${i}`} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1 break-all">{i + 1}. {a.nome} <span className="text-grafite-claro">({a.paginas} pág., {tamanhoLegivel(a.bytes.byteLength)})</span></span>
                {juntar && <>
                  <button type="button" aria-label={`Subir ${a.nome}`} title={`Sobe "${a.nome}" uma posição na ordem em que os PDFs serão juntados`} onClick={() => mover(i, -1)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center"><ArrowUp size={16} /></button>
                  <button type="button" aria-label={`Descer ${a.nome}`} title={`Desce "${a.nome}" uma posição na ordem em que os PDFs serão juntados`} onClick={() => mover(i, 1)} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center"><ArrowDown size={16} /></button>
                </>}
                <button type="button" aria-label={`Remover ${a.nome}`} title={`Tira "${a.nome}" desta lista; o arquivo original no computador não é apagado`} onClick={() => setArqs(x => x.filter((_, k) => k !== i))} className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center"><X size={16} /></button>
              </li>
            ))}
          </ol>
        )}
        {!juntar && (
          <div className="grid gap-3 md:grid-cols-2">
            <div><label htmlFor="pdf-intervalo" className="block text-sm font-medium text-navy mb-1">Páginas (ex.: 1-3, 7)</label><input id="pdf-intervalo" className={entrada} value={paginas} onChange={e => setPaginas(e.target.value)} /></div>
            <div><label htmlFor="pdf-giro" className="block text-sm font-medium text-navy mb-1">Girar</label><select id="pdf-giro" className={entrada} value={giro} onChange={e => setGiro(e.target.value)}><option value="0">Não girar</option><option value="90">90° à direita</option><option value="180">180°</option><option value="270">90° à esquerda</option></select></div>
          </div>
        )}
        <button type="button" onClick={() => void gerar()} disabled={ocupado} title={juntar ? 'Junta todos os PDFs da lista em um único arquivo, na ordem mostrada' : 'Gera um novo PDF com as páginas e o giro escolhidos'} className="bg-navy text-white min-h-[44px] px-6 uppercase tracking-wider text-sm disabled:opacity-60">{ocupado ? 'Gerando…' : juntar ? 'Juntar' : 'Gerar PDF'}</button>
      </div>
      <div aria-live="polite">
        {erro && <p role="alert" data-testid="ferramenta-erro" className="mt-4 border-l-4 border-red-600 bg-red-50 p-3 text-sm text-red-800">{erro}</p>}
        {pronto && (
          <div data-testid="ferramenta-resultado" className="mt-4 border-t border-navy/10 pt-4 text-sm">
            <p>Pronto: {pronto.paginas} página(s), {tamanhoLegivel(pronto.tamanho)}.</p>
            <a href={pronto.url} download={pronto.nome} className="mt-2 inline-flex items-center gap-2 bg-dourado text-navy min-h-[44px] px-4"><Download size={16} aria-hidden="true" /> Baixar {pronto.nome}</a>
            <p className="text-xs text-grafite-claro mt-2">Confira o limite de tamanho por arquivo do sistema do tribunal antes de juntar.</p>
          </div>
        )}
      </div>
    </section>
  )
}
