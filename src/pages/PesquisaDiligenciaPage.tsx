import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { ExternalLink, Search, ClipboardCheck, Copy } from 'lucide-react'
import BuscaFontesOficiais from '@/components/BuscaFontesOficiais'
import { COBERTURA, DILIGENCIAS, acoesPara, detectar, textoDiligencia, type TipoBusca } from '@/lib/pesquisa/pesquisa'

// Central de pesquisa e due diligence: uma caixa só para número de processo, CPF, CNPJ, OAB ou nome.
// Reconhece o que foi digitado, abre cada fonte já com a busca feita e guarda a lista de diligências do assunto.
const CHAVE = 'lsm-diligencia-v1'
const NOME_TIPO: Record<TipoBusca, string> = { vazio: '', cnj: 'Número de processo (CNJ)', cpf: 'CPF', cnpj: 'CNPJ', oab: 'Inscrição na OAB', nome: 'Nome' }
const ASSUNTO_DO_TIPO: Partial<Record<TipoBusca, string>> = { cnj: 'processo', cnpj: 'empresa', cpf: 'pessoa', nome: 'pessoa' }
type Salvo = Record<string, Record<string, boolean>>
const ler = (): Salvo => { try { return JSON.parse(localStorage.getItem(CHAVE) || '{}') } catch { return {} } }

export default function PesquisaDiligenciaPage() {
  const [termo, setTermo] = useState(() => { try { return localStorage.getItem('lsm-pesquisa-termo') ?? '' } catch { return '' } })
  const [assunto, setAssunto] = useState('empresa')
  const [salvo, setSalvo] = useState<Salvo>(ler)
  const [copiado, setCopiado] = useState(false)
  const d = detectar(termo)
  const acoes = useMemo(() => acoesPara(d), [termo]) // eslint-disable-line react-hooks/exhaustive-deps
  const lista = DILIGENCIAS.find(x => x.id === assunto)!
  const sujeito = (d.formatado || 'sem identificação').toLowerCase()
  const chave = `${assunto}|${sujeito}`
  const feitos = salvo[chave] ?? {}
  const feitosN = lista.itens.filter(i => feitos[i.id]).length

  useEffect(() => { try { localStorage.setItem('lsm-pesquisa-termo', termo) } catch { /* sem memória local */ } }, [termo])
  // Ao digitar um tipo conhecido, a lista de diligência acompanha (empresa para CNPJ, pessoa para CPF e nome, processo para número).
  useEffect(() => { const a = ASSUNTO_DO_TIPO[d.tipo]; if (a) setAssunto(a) }, [d.tipo])
  const marcar = (id: string) => {
    const proximo = { ...salvo, [chave]: { ...feitos, [id]: !feitos[id] } }
    setSalvo(proximo)
    try { localStorage.setItem(CHAVE, JSON.stringify(proximo)) } catch { /* sem memória local */ }
  }
  const copiar = async () => { try { await navigator.clipboard.writeText(textoDiligencia(lista, feitos, d.formatado)); setCopiado(true); setTimeout(() => setCopiado(false), 2500) } catch { /* sem área de transferência */ } }

  return (
    <Layout title="Pesquisa e due diligence">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6">
          <label htmlFor="termo" className="block font-medium mb-2">O que você quer pesquisar?</label>
          <div className="flex flex-wrap items-center gap-2">
            <input id="termo" value={termo} onChange={e => setTermo(e.target.value)} placeholder="Número do processo, CPF, CNPJ, OAB (123456/RJ) ou nome" className="flex-1 min-w-[240px] border px-3 py-2 min-h-[44px]" autoComplete="off" />
            <Search className="w-5 h-5 text-dourado" aria-hidden />
          </div>
          <p className="text-sm text-grafite-claro mt-2">Cole qualquer um deles: a plataforma reconhece o tipo, confere o dígito e mostra onde procurar, com a busca já preenchida.</p>
          {d.tipo !== 'vazio' && (
            <p className={`mt-3 p-3 text-sm border-l-4 ${d.valido ? 'border-dourado bg-navy/5' : 'border-atencao bg-atencaoFundo'}`} role="status" data-testid="reconhecido">
              <strong>{NOME_TIPO[d.tipo]}</strong>: {d.formatado}{d.detalhe ? ` · ${d.detalhe}` : ''}.{' '}
              {d.valido ? (d.tipo === 'nome' ? '' : 'Número conferido.') : (d.aviso ?? '')}
              {!d.valido && d.tipo !== 'nome' && ' Você ainda pode pesquisar, mas confira o número.'}
            </p>
          )}
        </section>

        {acoes.length > 0 && (
          <section className="bg-white shadow-sm p-6" aria-label="Onde procurar">
            <h2 className="font-serif text-xl">Onde procurar</h2>
            <ul className="grid md:grid-cols-2 gap-3 mt-3">
              {acoes.map(a => (
                <li key={a.id} className="border p-3">
                  <p className="font-medium">{a.titulo}</p>
                  <p className="text-sm text-grafite-claro">{a.texto}</p>
                  <p className="text-xs text-grafite-claro mt-1">Fonte: {a.fonte}</p>
                  {a.externo
                    ? <a href={a.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 min-h-[44px] mt-1 text-navy underline" data-testid={`acao-${a.id}`}>Abrir <ExternalLink className="w-4 h-4" aria-hidden /><span className="sr-only"> em nova aba</span></a>
                    : <Link to={a.href} className="inline-flex items-center min-h-[44px] mt-1 text-navy underline" data-testid={`acao-${a.id}`}>Abrir na plataforma</Link>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {d.tipo !== 'vazio' && <BuscaFontesOficiais key={`${d.tipo}|${d.formatado}`} d={d} />}

        <section className="bg-white shadow-sm p-6" aria-label="Lista de due diligence">
          <h2 className="font-serif text-xl flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-dourado" aria-hidden />Due diligence: lista de conferência</h2>
          <p className="text-sm text-grafite-claro mt-1">Escolha o assunto. Marque o que já foi conferido; a lista fica guardada neste aparelho para o mesmo {d.formatado ? 'termo pesquisado' : 'assunto'}.</p>
          <div role="tablist" aria-label="Assunto da diligência" className="flex flex-wrap gap-2 mt-3">
            {DILIGENCIAS.map(x => (
              <button key={x.id} role="tab" aria-selected={assunto === x.id} onClick={() => setAssunto(x.id)} data-testid={`assunto-${x.id}`}
                className={`min-h-[44px] px-4 text-sm border ${assunto === x.id ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy'}`}>{x.titulo}</button>
            ))}
          </div>
          <p className="text-sm mt-3">{lista.para}</p>
          <p className="text-sm font-medium mt-2" data-testid="progresso" aria-live="polite">{feitosN} de {lista.itens.length} itens conferidos</p>
          <ul className="mt-2 divide-y divide-navy/10">
            {lista.itens.map(i => (
              <li key={i.id} className="py-2 flex gap-3">
                <input id={`dd-${i.id}`} type="checkbox" checked={!!feitos[i.id]} onChange={() => marcar(i.id)} className="mt-1 w-5 h-5" data-testid={`dd-${i.id}`} />
                <label htmlFor={`dd-${i.id}`} className="flex-1 text-sm">
                  <span className="font-medium">{i.item}</span>
                  <span className="block text-grafite-claro">Fonte: {i.fonte}{i.validade ? ` · validade: ${i.validade}` : ''}</span>
                  <span className="block text-grafite-claro">O que prova: {i.prova}</span>
                </label>
                <span className="flex flex-col items-end text-sm">
                  {i.link && <a href={i.link} target="_blank" rel="noopener noreferrer" className="min-h-[44px] inline-flex items-center gap-1 text-navy underline">Site <ExternalLink className="w-4 h-4" aria-hidden /><span className="sr-only"> (abre em nova aba)</span></a>}
                  {i.interno && <Link to={i.interno} className="min-h-[44px] inline-flex items-center text-navy underline">Na plataforma</Link>}
                </span>
              </li>
            ))}
          </ul>
          <button type="button" onClick={copiar} className="min-h-[44px] px-4 border border-navy text-navy text-sm inline-flex items-center gap-2 mt-3" data-testid="copiar-diligencia"><Copy className="w-4 h-4" aria-hidden />{copiado ? 'Lista copiada' : 'Copiar lista para o parecer'}</button>
          <p className="text-xs text-grafite-claro mt-3">As validades são as usuais; vale a que estiver impressa na certidão. Certidões são emitidas no site do órgão (algumas exigem confirmação humana) e devem ser anexadas ao caso.</p>
        </section>

        <section className="bg-white shadow-sm p-6" aria-label="Cobertura das fontes">
          <h2 className="font-serif text-xl">O que cada fonte alcança (e o que não alcança)</h2>
          <p className="text-sm text-grafite-claro mt-1">Para não faltar informação: veja o histórico de cada fonte e onde buscar o que ela não traz.</p>
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-sm" data-testid="cobertura">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-grafite-claro"><th className="py-1 pr-3">Fonte</th><th className="pr-3">O que traz</th><th className="pr-3">Histórico</th><th className="pr-3">Limite</th><th>Onde, aqui</th></tr></thead>
              <tbody className="divide-y divide-navy/10 align-top">
                {COBERTURA.map(c => (
                  <tr key={c.fonte}><td className="py-2 pr-3 font-medium">{c.fonte}<span className="block text-xs font-normal text-grafite-claro">{c.gratis ? 'gratuita' : 'paga por uso'}</span></td><td className="pr-3">{c.o_que_traz}</td><td className="pr-3">{c.historico}</td><td className="pr-3">{c.limite}</td><td>{c.onde}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </Layout>
  )
}
