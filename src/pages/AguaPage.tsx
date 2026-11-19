import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import {
  GRANDEZAS, SEM_COLETA, atrasoMedio, caminho, coordenadas, dataBr, diasSemDado,
  lerPainel, lerReservatorios, lerSerie, numeroBr, revisadas, riscoHidrico, variacao,
} from '@/lib/predicao/agua'
import type { PainelPonto, Ponto, Reservatorio, Risco, Subtipo } from '@/lib/predicao/agua'

const hoje = () => new Date().toISOString().slice(0, 10)
const diasAtras = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

const LARGURA = 720
const ALTURA = 200

/** Passo C3: a série diária de um reservatório da ANA, como ela está no grafo do Instituto. */
export default function AguaPage() {
  const [reservatorios, setReservatorios] = useState<Reservatorio[] | null>(null)
  const [codigo, setCodigo] = useState('')
  const [subtipo, setSubtipo] = useState<Subtipo>('volume_util')
  const [de, setDe] = useState(diasAtras(90))
  const [ate, setAte] = useState(hoje())
  const [serie, setSerie] = useState<Ponto[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [aba, setAba] = useState<'serie' | 'painel'>('serie')
  const [painel, setPainel] = useState<PainelPonto[] | null>(null)
  const [painelErro, setPainelErro] = useState<string | null>(null)
  const [painelCarregando, setPainelCarregando] = useState(false)

  useEffect(() => {
    lerReservatorios()
      .then(l => { setReservatorios(l); setCodigo(l[0]?.chave_natural ?? ''); setCarregando(false) })
      .catch(e => { setErro((e as Error).message); setCarregando(false) })
  }, [])

  useEffect(() => {
    if (aba !== 'painel' || painel !== null) return
    setPainelCarregando(true)
    lerPainel()
      .then(l => { setPainel(l); setPainelErro(null); setPainelCarregando(false) })
      .catch(e => { setPainelErro((e as Error).message); setPainelCarregando(false) })
  }, [aba, painel])

  useEffect(() => {
    if (!codigo) { setSerie(null); return }
    setCarregando(true)
    lerSerie(codigo, subtipo, de, ate)
      .then(r => { setSerie(r.serie ?? []); setErro(null); setCarregando(false) })
      .catch(e => { setErro((e as Error).message); setCarregando(false) })
  }, [codigo, subtipo, de, ate])

  const grandeza = GRANDEZAS.find(g => g.subtipo === subtipo)!
  const pontos = useMemo(() => coordenadas(serie ?? [], LARGURA, ALTURA), [serie])
  const falta = serie ? diasSemDado(serie, de, ate) : 0
  const v = serie ? variacao(serie) : null
  const escolhido = reservatorios?.find(r => r.chave_natural === codigo)

  const corRisco: Record<Risco, string> = {
    critico: 'bg-critico text-white',
    atencao: 'bg-atencao text-white',
    normal: 'bg-green-600 text-white',
    sem_dado: 'bg-grafite-claro text-grafite',
  }
  const labelRisco: Record<Risco, string> = {
    critico: 'Crítico',
    atencao: 'Atenção',
    normal: 'Normal',
    sem_dado: 'Sem dado',
  }

  return (
    <Layout title="Água dos reservatórios (ANA)">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-2">
          <h2 className="font-serif text-xl">Medição diária, como a ANA publica</h2>
          <p className="text-sm text-grafite">
            Os números são da própria Agência Nacional de Águas, do Sistema de Acompanhamento de
            Reservatórios. Nada aqui é estimativa nossa: a plataforma só traz, guarda e desenha o que
            a ANA publicou, com o dia da medição e o dia em que o número chegou até nós separados.
            Serve para hidrovia, irrigação e energia.
          </p>
          <p className="text-sm text-grafite">
            Fonte:{' '}
            <a
              href="https://sar.ana.gov.br"
              target="_blank"
              rel="noreferrer"
              title="Abre o Sistema de Acompanhamento de Reservatórios da ANA, de onde vem cada número desta tela"
              className="underline"
            >
              sar.ana.gov.br
            </a>
            . Dado aberto do governo federal, uso livre com citação da fonte.
          </p>
        </section>

        <div className="flex gap-2">
          <button
            onClick={() => setAba('serie')}
            title="Ver a série histórica de medições do reservatório selecionado"
            className={`px-4 py-2 text-sm border ${aba === 'serie' ? 'bg-preto text-white border-preto' : 'border-grafite-claro text-grafite'}`}
          >
            Série histórica
          </button>
          <button
            onClick={() => setAba('painel')}
            title="Ver o painel de risco hídrico com todos os reservatórios"
            className={`px-4 py-2 text-sm border ${aba === 'painel' ? 'bg-preto text-white border-preto' : 'border-grafite-claro text-grafite'}`}
          >
            Painel de risco
          </button>
        </div>

        {aba === 'painel' && (
          <section className="bg-white shadow-sm p-6 space-y-4">
            <div>
              <h2 className="font-serif text-xl">Risco hídrico — todos os reservatórios</h2>
              <p className="text-sm text-grafite">Volume útil mais recente. Crítico: abaixo de 30%. Atenção: 30 a 50%. Normal: acima de 50%.</p>
            </div>
            {painelErro && <p className="text-sm text-critico">{painelErro}</p>}
            {painelCarregando && <p className="text-sm text-grafite">Carregando painel…</p>}
            {painel && !painel.length && (
              <p className="text-sm text-atencao bg-atencaoFundo p-3">Nenhum reservatório com medição de volume útil coletada ainda.</p>
            )}
            {painel && painel.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {painel.map(r => {
                  const risco = riscoHidrico(r.valor)
                  return (
                    <div key={r.chave_natural} className="border border-grafite-claro p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-medium leading-tight">{r.nome}</span>
                        <span className={`text-xs px-1.5 py-0.5 shrink-0 ${corRisco[risco]}`}>{labelRisco[risco]}</span>
                      </div>
                      <p className="text-xs text-grafite">{(r.atributos as { uf?: string | null })?.uf ?? '—'}</p>
                      <p className="text-lg">
                        {r.valor !== null ? `${numeroBr(r.valor)} %` : '—'}
                      </p>
                      {r.ocorrido_em && <p className="text-xs text-grafite">{dataBr(r.ocorrido_em)}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

        <section className={`bg-white shadow-sm p-6 grid gap-4 md:grid-cols-4 ${aba === 'painel' ? 'hidden' : ''}`}>
          <label className="block text-sm">
            <span className="block mb-1 text-grafite">Reservatório</span>
            <select
              value={codigo}
              onChange={e => setCodigo(e.target.value)}
              title="Escolha de qual reservatório você quer ver a série"
              className="w-full border border-grafite-claro p-2"
            >
              {(reservatorios ?? []).map(r => (
                <option key={r.chave_natural} value={r.chave_natural}>
                  {r.nome}{r.atributos?.uf ? ` — ${r.atributos.uf}` : ''}
                </option>
              ))}
              {!reservatorios?.length && <option value="">Nenhum reservatório coletado ainda</option>}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block mb-1 text-grafite">O que medir</span>
            <select
              value={subtipo}
              onChange={e => setSubtipo(e.target.value as Subtipo)}
              title="Escolha a grandeza: volume útil, nível da água, água entrando ou água saindo"
              className="w-full border border-grafite-claro p-2"
            >
              {GRANDEZAS.map(g => <option key={g.subtipo} value={g.subtipo}>{g.nome}</option>)}
            </select>
          </label>

          <label className="block text-sm">
            <span className="block mb-1 text-grafite">De</span>
            <input
              type="date"
              value={de}
              onChange={e => setDe(e.target.value)}
              title="Primeiro dia do período que você quer ver"
              className="w-full border border-grafite-claro p-2"
            />
          </label>

          <label className="block text-sm">
            <span className="block mb-1 text-grafite">Até</span>
            <input
              type="date"
              value={ate}
              onChange={e => setAte(e.target.value)}
              title="Último dia do período que você quer ver"
              className="w-full border border-grafite-claro p-2"
            />
          </label>
        </section>

        {aba === 'serie' && <section className="bg-white shadow-sm p-6 space-y-4">
          <div>
            <h2 className="font-serif text-xl">
              {escolhido?.nome ?? 'Reservatório'} · {grandeza.nome}
            </h2>
            <p className="text-sm text-grafite">{grandeza.oque}</p>
          </div>

          {erro && <p className="text-sm text-critico" data-testid="erro">{erro}</p>}
          {carregando && !serie && <p className="text-sm text-grafite">Carregando…</p>}

          {serie && !serie.length && (
            <p className="text-sm text-atencao bg-atencaoFundo p-3" data-testid="sem-coleta">{SEM_COLETA}</p>
          )}

          {serie && serie.length > 0 && (
            <>
              <svg viewBox={`0 0 ${LARGURA} ${ALTURA}`} className="w-full h-auto" role="img" aria-label={`Série de ${grandeza.nome} do reservatório ${escolhido?.nome ?? ''}, de ${dataBr(de)} a ${dataBr(ate)}. Os mesmos números estão na tabela abaixo.`}>
                <path d={caminho(serie, LARGURA, ALTURA)} fill="none" stroke="#0B0B0C" strokeWidth={2} />
                {pontos.length <= 60 && pontos.map(c => <circle key={c.p.dia} cx={c.x} cy={c.y} r={2.5} fill="#0B0B0C" />)}
              </svg>

              <dl className="grid gap-4 sm:grid-cols-4 text-sm">
                <div>
                  <dt className="text-grafite">Último valor</dt>
                  <dd className="text-lg">{numeroBr(serie[serie.length - 1].valor)} {serie[serie.length - 1].unidade}</dd>
                </div>
                <div>
                  <dt className="text-grafite">Do início ao fim</dt>
                  <dd className="text-lg">{v ? `${v.delta > 0 ? '+' : ''}${numeroBr(v.delta)} ${v.unidade}` : '—'}</dd>
                </div>
                <div>
                  <dt className="text-grafite" title="Horas entre o dia da medição e o dia em que o número chegou até nós">Atraso da informação</dt>
                  <dd className="text-lg">{atrasoMedio(serie)} h</dd>
                </div>
                <div>
                  <dt className="text-grafite" title="Dias em que a ANA publicou um número e depois corrigiu">Dias revisados pela ANA</dt>
                  <dd className="text-lg">{revisadas(serie)}</dd>
                </div>
              </dl>

              {falta > 0 && (
                <p className="text-sm text-atencao" data-testid="faltam">
                  {falta} {falta === 1 ? 'dia do período não tem medição coletada' : 'dias do período não têm medição coletada'}.
                  A linha liga os dias que existem; ela não inventa o que falta.
                </p>
              )}

              <table className="w-full text-sm">
                <caption className="text-left text-grafite pb-2">Os mesmos números da linha, dia por dia</caption>
                <thead>
                  <tr className="text-left border-b border-grafite-claro">
                    <th className="py-1">Dia</th>
                    <th className="py-1">{grandeza.nome}</th>
                    <th className="py-1">Chegou até nós</th>
                    <th className="py-1">Revisões</th>
                  </tr>
                </thead>
                <tbody>
                  {serie.slice(-30).reverse().map(p => (
                    <tr key={p.dia} className="border-b border-pergaminho">
                      <td className="py-1">{dataBr(p.dia)}</td>
                      <td className="py-1">{numeroBr(p.valor)} {p.unidade}</td>
                      <td className="py-1">{dataBr(p.observado_em)}</td>
                      <td className="py-1">{p.revisoes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {serie.length > 30 && <p className="text-xs text-grafite">A tabela mostra os 30 dias mais recentes; a linha mostra o período inteiro.</p>}
            </>
          )}

          {/* A tendência de 30 dias (nowcasting30) saiu da tela em 19/11/2026: regra do Instituto, nada de
              previsão na tela sem calibração provada. A função continua em src/lib/predicao/agua.ts para a
              calibração; volta para cá só com a régua de erro aprovada. */}
          <p className="mt-6 pt-4 border-t border-grafite-claro text-xs text-grafite" data-testid="agua-sem-previsao">
            Previsão desligada até a calibração ser provada. Esta tela mostra só o que a ANA mediu.
          </p>
        </section>}
      </div>
    </Layout>
  )
}
