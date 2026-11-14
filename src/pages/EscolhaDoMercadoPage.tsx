import Layout from '@/components/Layout'
import {
  CANDIDATOS,
  CRITERIOS,
  ESCOLHA_PENDENTE,
  NAO_E_RECOMENDACAO,
  NOTA_MAXIMA,
  finalistas,
  ranking,
} from '@/lib/predicao/mercados'

/**
 * Passo C16: a matriz de escolha do mercado, aberta para quem quiser discordar item por item.
 *
 * A tela mostra a régua de cada critério, a nota de cada candidato E o que derruba cada um. Matriz
 * que só mostra o lado bom de quem ganhou serve para justificar escolha já tomada; esta mostra o
 * contra de todos, inclusive dos finalistas.
 */
export default function EscolhaDoMercadoPage() {
  const tres = finalistas()
  const todos = ranking()
  const ehFinalista = (id: string) => tres.some(c => c.id === id)

  return (
    <Layout title="Escolha do mercado">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <h2 className="font-serif text-xl">Onde a previsão tem chance de acertar e de dar dinheiro</h2>
          <p className="text-sm text-grafite">
            Mercado grande já tem fundo grande com máquina dentro dele, e ali a nossa vantagem é zero.
            Procuramos o contrário: dado público brasileiro, pouca disputa, comprador com nome e
            orçamento, e preço que se move por chuva, água, logística, notícia e política pública —
            o contexto que a plataforma sabe juntar.
          </p>
          <ul className="text-sm text-grafite list-disc pl-5" data-testid="nao-e-recomendacao">
            {NAO_E_RECOMENDACAO.map(x => <li key={x}>{x}</li>)}
          </ul>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-3">
          <h2 className="font-serif text-xl">A régua, antes das notas</h2>
          <p className="text-sm text-grafite">
            Cada critério vale de 0 a 3 e tem peso. Nota máxima possível: {NOTA_MAXIMA}.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <caption className="sr-only">Critérios da matriz, com peso e régua de pontuação</caption>
              <thead>
                <tr className="text-left border-b border-grafite-claro">
                  <th scope="col" className="py-2 pr-3">Critério</th>
                  <th scope="col" className="py-2 pr-3">Peso</th>
                  <th scope="col" className="py-2">O que vale 3 e o que vale 0</th>
                </tr>
              </thead>
              <tbody data-testid="criterios">
                {CRITERIOS.map(c => (
                  <tr key={c.id} className="border-b border-grafite-claro/50 align-top">
                    <td className="py-2 pr-3">{c.pergunta}</td>
                    <td className="py-2 pr-3">{c.peso}</td>
                    <td className="py-2 text-grafite">{c.regua}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-3">
          <h2 className="font-serif text-xl">Proposta: começar por estes três</h2>
          <p className="text-sm text-grafite" data-testid="escolha-pendente">{ESCOLHA_PENDENTE}</p>
          <div className="space-y-3" data-testid="finalistas">
            {tres.map((c, i) => (
              <article key={c.id} className="border border-dourado/60 p-4 space-y-1">
                <div className="flex justify-between gap-3 items-start">
                  <h3 className="font-semibold">{i + 1}. {c.nome}</h3>
                  <span className="text-xs text-grafite whitespace-nowrap" title={`Soma dos critérios vezes o peso, de 0 a ${NOTA_MAXIMA}`}>
                    {c.nota} de {NOTA_MAXIMA}
                  </span>
                </div>
                <p className="text-sm"><span className="text-grafite">Quem paga: </span>{c.quemPaga}</p>
                <p className="text-sm">{c.porque}</p>
                <p className="text-sm"><span className="text-grafite">O que derruba: </span>{c.contra}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-3">
          <h2 className="font-serif text-xl">Todos os candidatos, do melhor ao pior colocado</h2>
          <div className="space-y-3" data-testid="todos">
            {todos.map(c => (
              <article key={c.id} className={`border p-4 space-y-1 ${ehFinalista(c.id) ? 'border-dourado/60' : 'border-grafite-claro'}`}>
                <div className="flex justify-between gap-3 items-start">
                  <h3 className="font-semibold text-sm">{c.nome}</h3>
                  <span className="text-xs text-grafite whitespace-nowrap">{c.nota} de {NOTA_MAXIMA}</span>
                </div>
                <p className="text-sm text-grafite">
                  Fonte do dado:{' '}
                  <a
                    href={c.fonteEndereco}
                    target="_blank"
                    rel="noreferrer"
                    title={`Abre a fonte do dado de ${c.nome} em outra aba`}
                    className="underline"
                  >
                    {c.fonte}
                  </a>
                </p>
                <p className="text-sm"><span className="text-grafite">O que derruba: </span>{c.contra}</p>
              </article>
            ))}
          </div>
          <p className="text-xs text-grafite">
            São {CANDIDATOS.length} candidatos. Discordar de uma nota muda a ordem: a lista sai da conta,
            não de opinião escrita por cima dela.
          </p>
        </section>
      </div>
    </Layout>
  )
}
