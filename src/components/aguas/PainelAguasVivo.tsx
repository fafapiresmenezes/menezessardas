import { useEffect, useState } from 'react'
import { dataBr, lerAguas, numeroBr, total, type LeituraAguas } from '@/lib/aguasLeitura'

/**
 * Os números medidos de Águas (fase 3): rios, outorgas e barragens, cada bloco com a data do
 * retrato e a fonte. Quando a leitura falha, a tela diz isso em vez de mostrar zero.
 */
export default function PainelAguasVivo() {
  const [d, setD] = useState<LeituraAguas | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [mostrarRios, setMostrarRios] = useState(12)

  useEffect(() => { lerAguas().then(setD).catch(e => setErro((e as Error).message)) }, [])

  if (erro) return <section className="bg-white shadow-sm p-6" data-testid="aguas-vivo-erro"><p className="text-sm">{erro} As leis, casos e fontes abaixo continuam valendo.</p></section>
  if (!d) return <section className="bg-white shadow-sm p-6"><p className="text-sm text-grafite">Buscando os números medidos…</p></section>

  const altoAlto = d.barragens?.porClasse.find(c => c.risco === 'Alto' && c.dano === 'Alto')?.n ?? 0
  const semClasse = total(d.barragens?.porClasse.filter(c => c.risco === 'Não Classificado' && c.dano === 'Não Classificado') ?? [])
  return (
    <>
      <section className="bg-white shadow-sm p-6" data-testid="aguas-rios">
        <h2 className="font-serif text-xl">Rios agora</h2>
        <p className="text-sm text-grafite mb-3">
          Resumo do último dia fechado em {d.rios.estacoes} estações da rede da ANA (chuva somada no dia; nível e vazão em média; nas estações de barragem o nível é a cota do reservatório, por isso aparece em centenas de metros). As estações entram em rodízio, um lote por dia.
        </p>
        {d.rios.linhas.length === 0 ? <p className="text-sm">Ainda sem estação coletada.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-grafite"><th className="py-1 pr-2">Estação</th><th className="pr-2">Local</th><th className="pr-2">Dia</th><th className="pr-2 text-right">Chuva (mm)</th><th className="pr-2 text-right" title="Altura da água na régua da estação. Nas barragens é a cota do reservatório (altitude).">Nível (m)</th><th className="text-right">Vazão (m³/s)</th></tr></thead>
              <tbody>
                {d.rios.linhas.slice(0, mostrarRios).map(r => (
                  <tr key={r.estacao} className="border-t border-grafite-claro">
                    <td className="py-1 pr-2">{r.nome}</td>
                    <td className="pr-2">{[r.municipio, r.uf].filter(Boolean).join(' - ')}</td>
                    <td className="pr-2">{dataBr(r.dia)}</td>
                    <td className="pr-2 text-right">{numeroBr(r.chuva_mm, 1)}</td>
                    <td className="pr-2 text-right">{numeroBr(r.nivel_cm === null ? null : r.nivel_cm / 100, 2)}</td>
                    <td className="text-right">{numeroBr(r.vazao_m3s, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {d.rios.linhas.length > mostrarRios && (
          <button type="button" onClick={() => setMostrarRios(n => n + 30)} title="Mostra mais estações da lista" className="mt-3 min-h-[44px] underline text-sm">Ver mais estações</button>
        )}
        <p className="text-xs text-grafite mt-2">Fonte: {d.rios.fonte}</p>
      </section>

      {d.outorgas && (
        <section className="bg-white shadow-sm p-6" data-testid="aguas-outorgas">
          <h2 className="font-serif text-xl">Outorgas federais em vigor</h2>
          <p className="text-sm text-grafite mb-3">
            {numeroBr(total(d.outorgas.porFinalidade))} autorizações da ANA para usar água de rio federal, em vigor em {dataBr(d.outorgas.dia)}. Cobrança e outorga estadual ficam com cada estado.
          </p>
          <ul className="grid gap-2 md:grid-cols-2">
            {d.outorgas.porFinalidade.slice(0, 10).map(f => (
              <li key={f.finalidade} className="border border-grafite-claro p-3 text-sm flex justify-between gap-2">
                <span>{f.finalidade}</span><span className="font-medium">{numeroBr(f.n)}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm mt-3"><span className="text-grafite">Estados com mais outorgas:</span> {d.outorgas.porUf.slice(0, 6).map(u => `${u.uf ?? 'sem UF'} (${numeroBr(u.n)})`).join(', ')}</p>
          <p className="text-xs text-grafite mt-2">Fonte: {d.outorgas.fonte}. Sem nome de quem pediu.</p>
        </section>
      )}

      {d.barragens && (
        <section className="bg-white shadow-sm p-6" data-testid="aguas-barragens">
          <h2 className="font-serif text-xl">Barragens</h2>
          <p className="text-sm text-grafite mb-3">
            {numeroBr(total(d.barragens.porClasse))} barragens no cadastro nacional em {dataBr(d.barragens.dia)}. {numeroBr(altoAlto)} delas têm risco alto e dano potencial alto ao mesmo tempo, que é o grupo que a Lei 12.334/2010 mais cobra.
            {semClasse > 0 && <> Outras {numeroBr(semClasse)} ainda não foram classificadas pelo fiscal, nem em risco nem em dano, então o retrato é parcial.</>}
          </p>
          <ul className="grid gap-2 md:grid-cols-3">
            {d.barragens.porUf.slice(0, 9).map(u => (
              <li key={u.uf ?? 'x'} className="border border-grafite-claro p-3 text-sm">
                <span className="font-medium">{u.uf ?? 'Sem UF'}</span>: {numeroBr(u.n)} barragens{u.alto_alto ? `, ${numeroBr(u.alto_alto)} com risco e dano altos` : ''}
              </li>
            ))}
          </ul>
          <p className="text-xs text-grafite mt-2">Fonte: {d.barragens.fonte}. Sem nome de empreendedor.</p>
        </section>
      )}
    </>
  )
}
