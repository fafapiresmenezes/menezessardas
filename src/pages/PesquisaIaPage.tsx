import Layout from '@/components/Layout'
import { LINHAS, NAO_AFIRMAMOS, POLITICA, SEMINARIO, proximoSeminario } from '@/lib/ia/agenda'

const NOME_ESTADO: Record<string, string> = { em_andamento: 'Em andamento', planejada: 'Planejada', parada: 'Parada' }
const dataBr = (iso: string) => { const [a, m, d] = iso.split('-'); return `${d}/${m}/${a}` }

/** Passo D5: a agenda de pesquisa da frente de IA do Instituto, publicada como ela é. */
export default function PesquisaIaPage() {
  const proximo = proximoSeminario(new Date().toISOString())
  return (
    <Layout title="Agenda de pesquisa em IA">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <h2 className="font-serif text-xl">O que estamos tentando descobrir, e o que nos faria desistir</h2>
          <p className="text-sm text-grafite">
            Cada linha abaixo tem uma hipótese que pode estar errada, a medida com número e período, e
            o resultado que faria abandonar a hipótese. Linha de pesquisa sem isso não é pesquisa.
          </p>
          <div>
            <h3 className="text-sm font-semibold">O que não afirmamos</h3>
            <ul className="text-sm text-grafite list-disc pl-5" data-testid="nao-afirmamos">
              {NAO_AFIRMAMOS.map(x => <li key={x}>{x}</li>)}
            </ul>
          </div>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-4">
          <h2 className="font-serif text-xl">Linhas de pesquisa</h2>
          {LINHAS.map(l => (
            <article key={l.id} className="border border-grafite-claro p-4 space-y-1">
              <div className="flex justify-between gap-3 items-start">
                <h3 className="font-semibold">{l.titulo}</h3>
                <span className="text-xs text-grafite whitespace-nowrap" title="Situação desta linha de pesquisa hoje">{NOME_ESTADO[l.estado]}</span>
              </div>
              <p className="text-sm"><span className="text-grafite">Hipótese: </span>{l.hipotese}</p>
              <p className="text-sm"><span className="text-grafite">Como se mede: </span>{l.medida}</p>
              <p className="text-sm"><span className="text-grafite">O que invalidaria: </span>{l.invalidaria}</p>
              <p className="text-sm text-grafite">Chega primeiro em: {l.chegaPrimeiroEm}</p>
            </article>
          ))}
        </section>

        <section className="bg-white shadow-sm p-6 space-y-3">
          <h2 className="font-serif text-xl">Como a frente se comporta</h2>
          <ul className="text-sm text-grafite list-disc pl-5" data-testid="politica">
            {POLITICA.map(p => <li key={p.regra}>{p.regra}</li>)}
          </ul>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-2">
          <h2 className="font-serif text-xl">Seminário interno, de três em três meses</h2>
          <p className="text-sm text-grafite">
            Próximo: {proximo ? dataBr(proximo) : 'a marcar'}. Datas: {SEMINARIO.proximos.map(dataBr).join(' · ')}.
          </p>
          <ul className="text-sm text-grafite list-disc pl-5">
            {SEMINARIO.pautaMinima.map(x => <li key={x}>{x}</li>)}
          </ul>
        </section>
      </div>
    </Layout>
  )
}
