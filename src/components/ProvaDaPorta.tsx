import { VERTENTES } from '@/data/vertentes'
import { PRODUTOS } from '@/data/produtos'
import { MATERIAS_ENGENHARIA, ESPECIALIDADES_SAUDE } from '@/data/prova'
import { useTexto } from '@/lib/i18n'

/**
 * Faixa de prova da porta (passo V13, pergunta de M em 13/11/2026 23:04 sobre psicologia de venda).
 *
 * Quem compra coisa cara procura prova antes de promessa. Aqui só entra número que a pessoa confere
 * nesta mesma página (as frentes e os produtos estão listados logo abaixo) ou dentro da frente.
 * Nada de "clientes atendidos" nem de porcentagem de satisfação: isso não existe medido, então não
 * aparece.
 */
export default function ProvaDaPorta({ centro = false }: { centro?: boolean }) {
  const t = useTexto()
  const itens = [
    { n: VERTENTES.length, rotulo: t('prova.frentes'), id: 'frentes' },
    { n: PRODUTOS.length, rotulo: t('prova.produtos'), id: 'produtos' },
    { n: MATERIAS_ENGENHARIA, rotulo: t('prova.materias'), id: 'materias' },
    { n: ESPECIALIDADES_SAUDE, rotulo: t('prova.especialidades'), id: 'especialidades' },
  ]
  return (
    <dl
      aria-label={t('prova.rotulo')}
      data-testid="prova-da-porta"
      className={`mt-10 grid grid-cols-2 gap-x-8 gap-y-6 border-t border-neutral-700 pt-8 sm:grid-cols-4 ${centro ? 'mx-auto max-w-3xl text-center' : ''}`}
    >
      {itens.map(i => (
        <div key={i.id} data-testid={`prova-${i.id}`}>
          <dd className="font-serif text-4xl leading-none text-[#fff] tabular-nums md:text-5xl">{i.n}</dd>
          <dt className="mt-2 text-sm leading-snug text-neutral-300">{i.rotulo}</dt>
        </div>
      ))}
    </dl>
  )
}
