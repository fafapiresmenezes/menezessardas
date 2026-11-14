import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { VERTENTES } from '@/data/vertentes'
import { useTexto, type Chave } from '@/lib/i18n'
import { lembrarUltimaFrente } from '@/lib/destino'

/**
 * "Qual área você quer entrar" — pedido de M em 14/11/2026 07h26: a tela que abre depois do login
 * (/inicio) só mostra áreas de direito, e passa a impressão de que o Instituto é só a parte
 * jurídica. Esta tela aparece DENTRO da plataforma (já logado) e deixa trocar de área a qualquer
 * momento, sem mexer no /inicio em si — a Dra. Fátima continua caindo direto no dela todo dia.
 */
const ESTADO_ROTULO: Record<string, string> = {
  'no-ar': 'No ar',
  'em-teste': 'Em teste',
  'em-desenvolvimento': 'Em desenvolvimento',
  'em-estudo': 'Em estudo',
}

export default function AreasPage() {
  const t = useTexto()
  return (
    <Layout title="Qual área você quer entrar">
      <p className="text-sm text-grafite-claro mb-6 max-w-2xl">
        O Instituto THEYE tem várias áreas, cada uma na sua própria tela. Escolha para onde ir — você
        pode trocar de área quantas vezes quiser, a qualquer hora, pelo menu "Mais opções".
      </p>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="lista-areas">
        {VERTENTES.map(v => {
          const nome = t(`vertente.${v.id}.nome` as Chave)
          const resumo = t(`vertente.${v.id}.resumo` as Chave)
          return (
            <li key={v.id}>
              <Link
                to={v.rota}
                onClick={() => lembrarUltimaFrente(v.rota)}
                title={`Entrar na área ${nome}`}
                data-testid={`area-${v.id}`}
                className="group flex h-full flex-col border border-navy/20 bg-pergaminho p-4 no-underline transition hover:border-navy hover:bg-white"
              >
                <span className="self-start px-2 py-0.5 text-xs font-medium uppercase tracking-wider border border-navy/30 text-grafite">
                  {ESTADO_ROTULO[v.estado]}
                </span>
                <span className="mt-2 font-serif text-lg text-navy">{nome}</span>
                <span className="mt-1 text-sm text-grafite-claro">{resumo}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </Layout>
  )
}
