import { useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { repositorio } from '@/lib/repositorio'
import { analisarCsv, MODELO_CSV, type Linha } from '@/lib/importarImoveis'
import { rotulosTipoImovel, rotulosUso } from '@/lib/rotulos'
import { Download, Upload, CheckCircle2, AlertTriangle } from 'lucide-react'

// Passo 31: importação de imóveis por planilha CSV com modelo, validação por linha e relatório de erros.
export default function ImportarImoveisPage() {
  const [texto, setTexto] = useState('')
  const [nomeArquivo, setNomeArquivo] = useState('')
  const [resultado, setResultado] = useState<ReturnType<typeof analisarCsv> | null>(null)
  const [importando, setImportando] = useState(false)
  const [relatorio, setRelatorio] = useState<{ gravadas: number; falhas: { numero: number; erro: string }[] } | null>(null)

  const baixarModelo = () => {
    const url = URL.createObjectURL(new Blob(['﻿' + MODELO_CSV], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'modelo-imoveis.csv'; a.click(); URL.revokeObjectURL(url)
  }
  const analisar = (t: string) => { setTexto(t); setRelatorio(null); setResultado(t.trim() ? analisarCsv(t) : null) }
  const lerArquivo = (f: File | undefined) => { if (!f) return; setNomeArquivo(f.name); f.text().then(analisar) }
  const importar = async (soValidas: boolean) => {
    if (!resultado) return
    const linhas = soValidas ? resultado.validas : resultado.linhas
    if (!soValidas && resultado.erros) return
    setImportando(true)
    const falhas: { numero: number; erro: string }[] = []; let gravadas = 0
    for (const l of linhas) {
      if (!l.dados) continue
      try { await repositorio.criarImovel(l.dados); gravadas++ } catch (e) { falhas.push({ numero: l.numero, erro: e instanceof Error ? e.message : String(e) }) }
    }
    setImportando(false); setRelatorio({ gravadas, falhas })
  }
  const Tabela = ({ linhas }: { linhas: Linha[] }) => (
    <table className="w-full text-sm mt-3">
      <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1">Linha</th><th>Endereço</th><th>Cidade/UF</th><th>Tipo · Uso</th><th>Proprietário</th><th>Situação</th></tr></thead>
      <tbody className="divide-y divide-navy/10">
        {linhas.map(l => (
          <tr key={l.numero} data-testid={l.erros.length ? 'linha-erro' : 'linha-ok'} className={l.erros.length ? 'bg-criticoFundo' : ''}>
            <td className="py-1">{l.numero}</td><td>{l.bruto.endereco}</td><td>{l.bruto.cidade}/{l.bruto.uf}</td>
            <td>{l.dados ? `${rotulosTipoImovel[l.dados.tipo]} · ${rotulosUso[l.dados.uso]}` : `${l.bruto.tipo} · ${l.bruto.uso}`}</td><td>{l.bruto.proprietario}</td>
            <td>{l.erros.length ? <span className="text-critico">{l.erros.join('; ')}</span> : <span className="text-regular">pronta</span>}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
  return (
    <Layout title="Importar imóveis por planilha">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <p className="text-sm">Baixe o modelo, preencha uma linha por imóvel (Excel ou Google Planilhas, salvar como CSV) e envie aqui. Cada linha é conferida antes de gravar: tipo, uso e UF precisam ser os da plataforma, e endereço, cidade e proprietário são obrigatórios.</p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button type="button" onClick={baixarModelo} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2" data-testid="baixar-modelo"><Download size={16} aria-hidden /> Baixar modelo CSV</button>
            <label className="min-h-[44px] px-4 bg-navy text-white text-sm inline-flex items-center gap-2 cursor-pointer"><Upload size={16} aria-hidden /> Enviar planilha<input type="file" accept=".csv,text/csv" className="sr-only" onChange={e => lerArquivo(e.target.files?.[0])} data-testid="arquivo-csv" /></label>
            {nomeArquivo && <span className="text-sm self-center">{nomeArquivo}</span>}
          </div>
          <details className="mt-3 text-sm"><summary className="cursor-pointer">Ou cole o conteúdo do CSV</summary>
            <textarea value={texto} onChange={e => analisar(e.target.value)} rows={6} className="w-full border px-3 py-2 mt-2 font-mono text-xs" aria-label="Conteúdo CSV" data-testid="csv-texto" /></details>
        </section>
        {resultado && !resultado.cabecalhoOk && <p role="alert" className="p-3 border-l-4 border-critico bg-criticoFundo text-sm" data-testid="cabecalho-erro">O cabeçalho precisa ter pelo menos: endereco, cidade, uf, tipo, uso, proprietario. Baixe o modelo para ver o formato.</p>}
        {resultado?.cabecalhoOk && (
          <section className="bg-white shadow-sm p-6" aria-live="polite">
            <p className="text-sm" data-testid="resumo-csv"><strong>{resultado.linhas.length}</strong> linha(s): <strong className="text-regular">{resultado.validas.length} prontas</strong>{resultado.erros > 0 && <>, <strong className="text-critico">{resultado.erros} com erro</strong></>}.</p>
            <Tabela linhas={resultado.linhas} />
            <div className="flex flex-wrap gap-3 mt-4">
              <button type="button" onClick={() => importar(false)} disabled={importando || !!resultado.erros || !resultado.validas.length} className="min-h-[44px] px-4 bg-navy text-white text-sm disabled:opacity-50" data-testid="importar-tudo">{importando ? 'Importando…' : `Importar ${resultado.validas.length} imóveis`}</button>
              {resultado.erros > 0 && resultado.validas.length > 0 && <button type="button" onClick={() => importar(true)} disabled={importando} className="min-h-[44px] px-4 border text-sm" data-testid="importar-validas">Importar só as {resultado.validas.length} válidas</button>}
            </div>
            {resultado.erros > 0 && <p className="text-xs text-atencao mt-2 flex items-center gap-1"><AlertTriangle size={14} aria-hidden /> Corrija as linhas em vermelho na planilha e envie de novo, ou importe só as válidas.</p>}
          </section>
        )}
        {relatorio && (
          <section className="bg-white shadow-sm border-l-4 border-regular p-6" role="status" data-testid="relatorio-importacao">
            <p className="text-sm flex items-center gap-2"><CheckCircle2 size={16} className="text-regular" aria-hidden /> <strong data-testid="gravadas">{relatorio.gravadas}</strong> imóvel(is) gravado(s){relatorio.falhas.length > 0 && <>, <strong className="text-critico">{relatorio.falhas.length}</strong> falha(s) ao gravar</>}.</p>
            {relatorio.falhas.length > 0 && <ul className="text-xs text-critico mt-2 list-disc pl-5">{relatorio.falhas.map(f => <li key={f.numero}>Linha {f.numero}: {f.erro}</li>)}</ul>}
            <Link to="/imoveis" className="underline text-navy text-sm mt-2 inline-block">Ver a carteira de imóveis</Link>
          </section>
        )}
      </div>
    </Layout>
  )
}
