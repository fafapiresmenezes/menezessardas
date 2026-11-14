import Layout from '@/components/Layout'
import {
  NAO_E_PROMESSA,
  PERCENTUAL_INSTITUTO,
  brl,
  comPreco,
  ordemDeAtaque,
  pisoDe90Dias,
  receita90,
  semPreco,
} from '@/lib/predicao/receita'

const COMO_COBRA: Record<string, string> = {
  'assinatura-mensal': 'assinatura por mês',
  'por-usuario-mes': 'por usuário, por mês',
  'uma-vez': 'uma vez',
  'por-estudo': 'por estudo',
}

/**
 * Passo C17: o mapa de receita, com a ordem de ataque.
 *
 * A tela separa, à vista, o que já pode ser vendido do que depende de uma decisão de preço. Soma só
 * o primeiro grupo e chama o resultado de piso, porque é o que ele é.
 */
export default function MapaDeReceitaPage() {
  const ordem = ordemDeAtaque()
  const piso = pisoDe90Dias()
  const prontos = comPreco()
  const faltando = semPreco()

  return (
    <Layout title="Mapa de receita">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <h2 className="font-serif text-xl">O que dá para cobrar nos próximos 90 dias</h2>
          <p className="text-3xl font-serif" data-testid="piso">{brl(piso)}</p>
          <p className="text-sm text-grafite">
            Piso de 90 dias, somando só os {prontos.length} produtos com preço já decidido. Os outros{' '}
            {faltando.length} estão na lista mais abaixo com o que falta para terem preço, e ficam fora
            desta soma de propósito.
          </p>
          <ul className="text-sm text-grafite list-disc pl-5" data-testid="nao-e-promessa">
            {NAO_E_PROMESSA.map(x => <li key={x}>{x}</li>)}
          </ul>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-4">
          <h2 className="font-serif text-xl">Ordem de ataque</h2>
          <p className="text-sm text-grafite">
            Primeiro o que já pode ser vendido; depois o que destrava com menos trabalho. Os{' '}
            {Math.round(PERCENTUAL_INSTITUTO * 100)}% do Instituto incidem em tudo que não é trabalho de
            processo, e a coluna diz em quais.
          </p>
          <div className="space-y-3" data-testid="ordem">
            {ordem.map((p, i) => (
              <article
                key={p.id}
                className={`border p-4 space-y-1 ${p.preco === null ? 'border-grafite-claro' : 'border-dourado/60'}`}
              >
                <div className="flex justify-between gap-3 items-start">
                  <h3 className="font-semibold">{i + 1}. {p.nome}</h3>
                  <span className="text-xs whitespace-nowrap text-grafite" title="Preço decidido pelo dono, ou aviso de que falta decidir">
                    {p.preco === null ? 'preço a definir' : `${brl(p.preco)} ${COMO_COBRA[p.cobranca]}`}
                  </span>
                </div>
                <p className="text-sm"><span className="text-grafite">Quem compra: </span>{p.quemCompra}</p>
                <p className="text-sm"><span className="text-grafite">Custa atender: </span>{p.custoDeAtender}</p>
                <p className="text-sm"><span className="text-grafite">Falta: </span>{p.oQueFalta}</p>
                <p className="text-sm text-grafite">
                  Meta de {p.meta90} nos 90 dias ·{' '}
                  {p.preco === null
                    ? 'fora da soma, porque o preço é decisão do dono'
                    : `entra no piso com ${brl(receita90(p))}`}{' '}
                  · {p.pagaRoyalty ? `paga ${Math.round(PERCENTUAL_INSTITUTO * 100)}% ao Instituto` : 'trabalho de processo, não paga os 5%'}
                </p>
                <p className="text-xs text-grafite">{p.precoVemDe}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </Layout>
  )
}
