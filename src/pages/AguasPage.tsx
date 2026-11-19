import { Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import { AREAS_AGUAS, CASOS_AGUAS, FONTES_AGUAS, NORMAS_AGUAS } from '@/data/aguas'
import PainelAguasVivo from '@/components/aguas/PainelAguasVivo'
import BibliotecaAguas from '@/components/aguas/BibliotecaAguas'

/**
 * Casa de Águas: a porta da frente de Águas dentro da plataforma (19/11/2026).
 * Junta o que já funciona (tela de reservatórios da ANA) com as leis, casos e fontes conferidos.
 * Nada de previsão aqui: só dado medido e norma com link oficial.
 */
export default function AguasPage() {
  const brasil = NORMAS_AGUAS.filter(n => n.ambito === 'Brasil')
  const fora = NORMAS_AGUAS.filter(n => n.ambito === 'Internacional')
  return (
    <Layout title="Águas">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3" data-testid="aguas-abertura">
          <h2 className="font-serif text-xl">A casa de Águas do Instituto</h2>
          <p className="text-sm text-grafite">
            Reservatórios e rios medidos todo dia, outorgas e barragens toda semana, as leis de água e
            saneamento com o link oficial, os casos que mudaram as regras e a biblioteca de estudos. Nenhum
            número aqui é previsão.
          </p>
          <Link
            to="/agua"
            title="Abre a medição diária dos reservatórios publicada pela ANA"
            className="inline-block min-h-[44px] leading-[44px] px-5 bg-grafite text-white text-sm"
            data-testid="aguas-abrir-reservatorios"
          >
            Abrir reservatórios (ANA)
          </Link>
        </section>

        <PainelAguasVivo />

        <section className="bg-white shadow-sm p-6" data-testid="aguas-areas">
          <h2 className="font-serif text-xl mb-4">O que esta casa cobre</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {AREAS_AGUAS.map(a => (
              <li key={a.nome} className="border border-grafite-claro p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{a.nome}</span>
                  <span className={`text-xs px-2 py-0.5 ${a.pronta ? 'bg-green-600 text-white' : 'border border-grafite-claro text-grafite'}`}>
                    {a.pronta ? 'Funcionando' : 'Em construção'}
                  </span>
                </div>
                <p className="text-sm text-grafite mt-1">{a.descricao}</p>
              </li>
            ))}
          </ul>
        </section>

        {[{ titulo: 'Leis e normas do Brasil', lista: brasil, id: 'brasil' }, { titulo: 'Rios entre países e tratados', lista: fora, id: 'internacional' }].map(bloco => (
          <section key={bloco.id} className="bg-white shadow-sm p-6" data-testid={`aguas-normas-${bloco.id}`}>
            <h2 className="font-serif text-xl mb-4">{bloco.titulo}</h2>
            <ul className="divide-y divide-grafite-claro">
              {bloco.lista.map(n => (
                <li key={n.id} className="py-3">
                  <p className="text-sm">
                    <span className="font-medium">{n.codigo}</span> <span className="text-grafite">· {n.assunto}</span>
                  </p>
                  <p className="text-sm text-grafite mt-1">{n.paraQueServe}</p>
                  <a href={n.fonte} target="_blank" rel="noreferrer" title={`Abre a fonte oficial de ${n.codigo}`} className="text-xs underline text-grafite">
                    Fonte oficial
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="bg-white shadow-sm p-6" data-testid="aguas-casos">
          <h2 className="font-serif text-xl mb-4">Casos que mudaram as regras</h2>
          <ul className="grid gap-3 md:grid-cols-2">
            {CASOS_AGUAS.map(c => (
              <li key={c.id} className="border border-grafite-claro p-4">
                <p className="font-medium">{c.titulo}</p>
                <p className="text-xs text-grafite">{c.ano}</p>
                <p className="text-sm text-grafite mt-1">{c.licao}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white shadow-sm p-6" data-testid="aguas-fontes">
          <h2 className="font-serif text-xl mb-4">De onde vêm os números</h2>
          <ul className="divide-y divide-grafite-claro">
            {FONTES_AGUAS.map(f => (
              <li key={f.nome} className="py-3">
                <a href={f.link} target="_blank" rel="noreferrer" title={`Abre ${f.nome}`} className="text-sm font-medium underline">{f.nome}</a>
                <p className="text-sm text-grafite mt-1">{f.oQueTem}</p>
              </li>
            ))}
          </ul>
        </section>
        <BibliotecaAguas />
      </div>
    </Layout>
  )
}
