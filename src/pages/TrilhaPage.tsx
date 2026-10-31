import { useEffect, useState } from 'react'
import { mensagemAmigavel } from '@/lib/erros'
import Layout from '@/components/Layout'
import {
  listarTrilha,
  verificarTrilha,
  type EventoTrilha,
  type ResultadoVerificacao,
  type TipoEvento,
} from '@/lib/trilha'
import {
  ancorarAgora,
  baixarArquivo,
  listarAncoragens,
  montarOts,
  textoDoSelo,
  verificarLastro,
  type Ancoragem,
  type Lastro,
} from '@/lib/ancoragem'
import { Printer, ShieldCheck, ShieldAlert, Link2, Anchor, Download, FileDown } from 'lucide-react'
import { exportarTrilhaPeriodo } from '@/lib/exportarTrilha'

const rotuloTipo: Record<TipoEvento, string> = {
  imovel_criado: 'Imóvel cadastrado',
  contrato_criado: 'Contrato registrado',
  documento_anexado: 'Documento anexado',
  documento_removido: 'Documento removido',
  contrato_analisado: 'Contrato analisado',
  fornecedor_atualizado: 'Fornecedor atualizado',
  trilha_ancorada: 'Selo ancorado',
  legislacao_acompanhada: 'Legislação acompanhada',
  contrato_editado: 'Contrato editado',
  contrato_encerrado: 'Contrato encerrado',
  configuracao_alterada: 'Configuração alterada',
  acesso_alterado: 'Acesso alterado',
}

const corTipo: Record<TipoEvento, string> = {
  imovel_criado: 'bg-navy/10 text-navy',
  contrato_criado: 'bg-dourado/15 text-dourado-escuro',
  documento_anexado: 'bg-regularFundo text-grafite',
  documento_removido: 'bg-criticoFundo text-critico',
  contrato_analisado: 'bg-atencaoFundo text-grafite',
  fornecedor_atualizado: 'bg-navy/10 text-navy',
  trilha_ancorada: 'bg-dourado/15 text-dourado-escuro',
  legislacao_acompanhada: 'bg-navy/10 text-navy',
  contrato_editado: 'bg-atencaoFundo text-grafite',
  contrato_encerrado: 'bg-criticoFundo text-critico',
  configuracao_alterada: 'bg-navy/10 text-navy',
  acesso_alterado: 'bg-dourado/15 text-dourado-escuro',
}

const dataHora = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

export default function TrilhaPage() {
  const [eventos, setEventos] = useState<EventoTrilha[]>([])
  const [verificacao, setVerificacao] = useState<ResultadoVerificacao | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [ancoragens, setAncoragens] = useState<Ancoragem[]>([])
  const [lastros, setLastros] = useState<Lastro[] | null>(null)
  const [ancorando, setAncorando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  // Exportação por período (Passo 17): PDF + SHA-256 + selo .ots.
  const hojeIso = new Date().toISOString().slice(0, 10)
  const [periodo, setPeriodo] = useState({ de: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10), ate: hojeIso })
  const [exportando, setExportando] = useState(false)
  // Passo 73: filtros da lista (tipo de ação, texto e dia); a verificação da cadeia continua sobre todos os registros.
  const [filtro, setFiltro] = useState({ tipo: '', texto: '', dia: '' })
  const [exportacao, setExportacao] = useState<{ sha256: string; total: number; calendario: string | null } | null>(null)
  const exportarPeriodo = async () => {
    setExportando(true); setMsg(null); setExportacao(null)
    try {
      const r = await exportarTrilhaPeriodo(periodo.de, periodo.ate)
      baixarArquivo(`${r.nomeBase}.pdf`, r.pdf, 'application/pdf')
      if (r.ots) setTimeout(() => baixarArquivo(`${r.nomeBase}.pdf.ots`, r.ots!), 400)
      setExportacao({ sha256: r.sha256, total: r.total, calendario: r.calendario })
      await carregar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    } finally { setExportando(false) }
  }

  const carregar = async () => {
    const [lista, v, ancs] = await Promise.all([listarTrilha(), verificarTrilha(), listarAncoragens()])
    setEventos([...lista].reverse()) // mais recentes no topo
    setVerificacao(v)
    setAncoragens([...ancs].reverse())
    setCarregando(false)
  }

  useEffect(() => {
    carregar()
  }, [])

  const ancorar = async () => {
    setAncorando(true)
    setMsg(null)
    try {
      const a = await ancorarAgora()
      setMsg({ tipo: 'ok', texto: `Selo do registro nº ${a.seq} enviado. A confirmação no Bitcoin leva algumas horas.` })
      setLastros(null)
      await carregar()
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    } finally {
      setAncorando(false)
    }
  }

  const verificar = async () => {
    setLastros(await verificarLastro())
  }

  const filtrados = eventos.filter(e => (!filtro.tipo || e.tipo === filtro.tipo) && (!filtro.texto || e.resumo.toLowerCase().includes(filtro.texto.toLowerCase())) && (!filtro.dia || e.em.slice(0, 10) === filtro.dia))
  return (
    <Layout title="Trilha de auditoria">
      <div className="max-w-4xl mx-auto space-y-6">
        <p className="text-sm text-grafite-claro">
          Cada ação na plataforma vira um registro imutável, encadeado por hash ao registro anterior.
          Qualquer alteração ou remoção de um registro antigo quebra a cadeia e é apontada abaixo.
        </p>

        {verificacao && (
          <section
            className={`p-6 shadow-sm border-l-4 ${
              verificacao.integra ? 'bg-regularFundo border-regular' : 'bg-criticoFundo border-critico'
            }`}
            aria-live="polite"
          >
            <div className="flex items-start gap-3">
              {verificacao.integra ? (
                <ShieldCheck className="text-regular flex-shrink-0 mt-0.5" size={24} />
              ) : (
                <ShieldAlert className="text-critico flex-shrink-0 mt-0.5" size={24} />
              )}
              <div className="min-w-0">
                <p className="font-medium">
                  {verificacao.integra
                    ? `Cadeia íntegra — ${verificacao.total} registro(s) verificado(s).`
                    : `Cadeia comprometida a partir do registro nº ${verificacao.quebraEm}.`}
                </p>
                <p className="text-xs text-grafite-claro mt-2 flex items-center gap-1 break-all">
                  <Link2 size={13} className="flex-shrink-0" />
                  <span className="font-mono">Selo atual: {verificacao.selo}</span>
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 print:hidden" aria-labelledby="t-exportar" data-testid="exportar-periodo">
          <h2 id="t-exportar" className="text-lg flex items-center gap-2"><FileDown size={18} className="text-dourado" aria-hidden="true" />Exportar período para auditoria externa</h2>
          <p className="text-sm text-grafite-claro mt-1">Gera um PDF com todos os registros do período (hash e elo de cada um), calcula o SHA-256 do arquivo e baixa junto o selo OpenTimestamps (.ots), que prova no Bitcoin a data do documento. Entregue os dois arquivos ao auditor.</p>
          <div className="flex flex-wrap items-end gap-3 mt-3 text-sm">
            <label>De<input type="date" value={periodo.de} max={periodo.ate} onChange={e => setPeriodo({ ...periodo, de: e.target.value })} className="block border px-3 py-2 mt-1" data-testid="exportar-de" /></label>
            <label>Até<input type="date" value={periodo.ate} min={periodo.de} max={hojeIso} onChange={e => setPeriodo({ ...periodo, ate: e.target.value })} className="block border px-3 py-2 mt-1" data-testid="exportar-ate" /></label>
            <button type="button" onClick={exportarPeriodo} disabled={exportando || !periodo.de || !periodo.ate} data-testid="exportar-pdf-selo" className="min-h-[44px] px-4 bg-navy text-white disabled:opacity-60 inline-flex items-center gap-2"><Download size={16} aria-hidden="true" />{exportando ? 'Gerando e selando…' : 'Baixar PDF + selo'}</button>
          </div>
          {exportacao && (
            <p className="text-xs mt-3 break-all" role="status" data-testid="msg-exportacao">
              {exportacao.total} registro(s) exportado(s). SHA-256 do PDF: <span className="font-mono">{exportacao.sha256}</span>. {exportacao.calendario ? `Selo enviado a ${exportacao.calendario.replace('https://', '')}; a confirmação no Bitcoin leva algumas horas.` : 'Selo não obtido agora (calendários fora do ar); o PDF e o hash valem, tente selar de novo mais tarde.'}
            </p>
          )}
        </section>

        <div className="flex justify-end print:hidden">
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 min-h-[44px] bg-navy text-white text-sm rounded hover:bg-navy/90"
          >
            <Printer size={16} /> Exportar em PDF
          </button>
        </div>

        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 print:hidden" aria-labelledby="ancoragem">
          <h2 id="ancoragem" className="text-lg flex items-center gap-2">
            <Anchor size={18} aria-hidden="true" /> Ancoragem pública (Bitcoin)
          </h2>
          <p className="text-sm text-grafite-claro mt-1 max-w-2xl">
            Envia só o selo (um código, nunca dados de clientes) a um registro público de datas. Depois disso,
            ninguém consegue provar que a trilha foi reescrita depois daquele momento.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={ancorar}
              disabled={ancorando || !verificacao?.integra || verificacao.total === 0}
              className="min-h-[44px] inline-flex items-center gap-2 bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 text-white px-5 rounded-sm text-sm uppercase tracking-wider"
            >
              <Anchor size={16} aria-hidden="true" /> {ancorando ? 'Enviando…' : 'Ancorar selo agora'}
            </button>
            <button
              onClick={verificar}
              disabled={ancoragens.length === 0}
              className="min-h-[44px] px-5 border border-navy text-navy hover:bg-pergaminho disabled:opacity-50 text-sm"
            >
              Verificar lastro
            </button>
          </div>
          {msg && (
            <p
              role={msg.tipo === 'erro' ? 'alert' : 'status'}
              className={`mt-3 px-4 py-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
            >
              {msg.texto}
            </p>
          )}
          {ancoragens.length > 0 && (
            <ul className="divide-y divide-navy/5 mt-4">
              {ancoragens.map(a => {
                const l = lastros?.find(x => x.ancoragemId === a.id)
                return (
                  <li key={a.id} className="py-3 flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm">Registro nº {a.seq} — {dataHora(a.em)}</p>
                      <p className="font-mono text-[11px] text-grafite-claro break-all">selo: {a.selo.slice(0, 24)}…</p>
                      {l && (
                        <p className={`text-xs mt-1 ${l.coerente ? 'text-regular' : 'text-critico'}`}>
                          {l.coerente ? 'Lastro coerente: o registro não foi alterado desde a ancoragem.' : `Lastro quebrado: ${l.motivo}`}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => baixarArquivo(`selo-${a.seq}.txt`, textoDoSelo(a.seq, a.selo), 'text/plain')}
                        className="min-h-[44px] inline-flex items-center gap-1 px-3 border border-navy/30 text-sm hover:bg-pergaminho"
                      >
                        <Download size={14} aria-hidden="true" /> Selo (.txt)
                      </button>
                      <button
                        onClick={() => baixarArquivo(`selo-${a.seq}.txt.ots`, montarOts(a) as BlobPart)}
                        className="min-h-[44px] inline-flex items-center gap-1 px-3 border border-navy/30 text-sm hover:bg-pergaminho"
                      >
                        <Download size={14} aria-hidden="true" /> Prova (.ots)
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
          {ancoragens.length > 0 && (
            <p className="text-xs text-grafite-claro mt-3">
              Para conferir no Bitcoin: baixe os dois arquivos e solte-os em opentimestamps.org. A confirmação aparece
              algumas horas depois do envio.
            </p>
          )}
        </section>

        {eventos.length > 0 && (
          <section className="bg-white shadow-sm p-4 flex flex-wrap items-end gap-3 text-sm print:hidden" aria-label="Filtrar registros" data-testid="filtros-trilha">
            <label>Ação<select value={filtro.tipo} onChange={e => setFiltro({ ...filtro, tipo: e.target.value })} className="block border px-2 py-2 mt-1 min-h-[44px]" data-testid="filtro-tipo"><option value="">Todas</option>{Object.entries(rotuloTipo).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
            <label>Contém<input value={filtro.texto} onChange={e => setFiltro({ ...filtro, texto: e.target.value })} placeholder="nome, endereço, parte…" className="block border px-3 py-2 mt-1 min-h-[44px]" data-testid="filtro-texto" /></label>
            <label>Dia<input type="date" value={filtro.dia} onChange={e => setFiltro({ ...filtro, dia: e.target.value })} className="block border px-3 py-2 mt-1 min-h-[44px]" data-testid="filtro-dia" /></label>
            {(filtro.tipo || filtro.texto || filtro.dia) && <button type="button" onClick={() => setFiltro({ tipo: '', texto: '', dia: '' })} className="min-h-[44px] px-3 border">Limpar</button>}
            <p className="text-grafite-claro" data-testid="contagem-trilha">{filtrados.length} de {eventos.length} registros</p>
          </section>
        )}
        <section className="bg-white shadow-sm" aria-label="Registros da trilha">
          {carregando ? (
            <p className="p-6 text-sm text-grafite-claro">Verificando a cadeia…</p>
          ) : eventos.length === 0 ? (
            <p className="p-6 text-sm text-grafite-claro">
              Nenhum registro ainda. Cadastre um imóvel ou contrato para iniciar a trilha.
            </p>
          ) : (
            <ol className="divide-y divide-navy/5">
              {filtrados.map(e => (
                <li key={e.id} className="p-4 md:p-5 flex items-start gap-4">
                  <span className="font-mono text-xs text-grafite-claro mt-1 w-10 flex-shrink-0 text-right">
                    nº {e.seq}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${corTipo[e.tipo]}`}>
                        {rotuloTipo[e.tipo]}
                      </span>
                      <span className="text-xs text-grafite-claro">{dataHora(e.em)}</span>
                    </div>
                    <p className="text-sm mt-1">{e.resumo}</p>
                    <p className="font-mono text-[11px] text-grafite-claro mt-1 break-all">
                      hash: {e.hash.slice(0, 24)}…
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </Layout>
  )
}
