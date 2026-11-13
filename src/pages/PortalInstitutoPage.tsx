import { Link, useLocation } from 'react-router-dom'
import Marca from '@/components/Marca'
import { PORTAIS_INSTITUTO, ROTULO_ESTADO, EXPLICACAO_ESTADO } from '@/data/portais-instituto'

/**
 * Passo B7: uma página por porta do Instituto que ainda está em desenvolvimento.
 *
 * A mesma página serve as oito portas: ela descobre qual é pelo endereço, o que evita oito
 * arquivos quase iguais. O conteúdo de cada uma vive em src/data/portais-instituto.ts.
 *
 * Duas decisões ditas por escrito, para quem mexer depois:
 *  - Nenhuma página promete prazo, por decisão de M. Diz o escopo e o estado, e para aí.
 *  - O botão "Avise-me" ainda NÃO existe aqui. Ele depende do e-mail contato@theye.club, que é o
 *    passo A13 e espera três cliques de M na Squarespace. Em vez de um botão que não leva a lugar
 *    nenhum, a página diz onde falar com o Instituto hoje.
 */
export default function PortalInstitutoPage() {
  const { pathname } = useLocation()
  const portal = PORTAIS_INSTITUTO.find(p => p.rota === pathname.replace(/\/$/, ''))

  if (!portal) {
    return (
      <div className="min-h-screen bg-black text-white px-4 py-10">
        <div className="max-w-2xl mx-auto text-center">
          <div className="flex justify-center mb-8"><Marca /></div>
          <h1 className="text-2xl font-serif mb-3">Esta porta não existe</h1>
          <p className="text-sm text-white/70">
            Veja as portas do Instituto em <Link to="/portais" title="Lista de todas as portas do Instituto, com o estado de cada uma" className="underline decoration-white/40">Portais</Link>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-10"><Marca /></div>

        <p className="text-xs uppercase tracking-[0.2em] text-white/40">THEYE Institute</p>
        <h1 className="text-3xl font-serif mt-2 mb-3">{portal.nome}</h1>
        <p className="text-base text-white/80">{portal.resumo}</p>

        <p
          className="inline-flex items-center gap-2 mt-6 border border-white/30 px-3 py-1.5 text-xs uppercase tracking-wider"
          title={EXPLICACAO_ESTADO[portal.estado]}
          data-testid="estado-portal"
        >
          {ROTULO_ESTADO[portal.estado]}
        </p>
        <p className="text-sm text-white/60 mt-3">{portal.comoEsta}</p>

        <h2 className="text-lg font-serif mt-10 mb-3">O que esta porta vai fazer</h2>
        <ul className="space-y-3" data-testid="escopo-portal">
          {portal.escopo.map(item => (
            <li key={item} className="text-sm text-white/80 flex gap-3">
              <span aria-hidden="true" className="text-white/30">—</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* Sem prazo, de propósito: é regra do plano, e fica dito na própria página. */}
        <p className="text-xs text-white/40 mt-6">
          Esta página diz o escopo e o estado, e não promete data. Quando houver o que usar, ela deixa de ser esta página.
        </p>

        <h2 className="text-lg font-serif mt-10 mb-3">Quer acompanhar?</h2>
        <p className="text-sm text-white/70">
          O endereço de contato do Instituto está sendo ligado. Até ele responder, quem já usa a
          plataforma de direito fala pela própria plataforma, e quem ainda não usa pode começar pela{' '}
          <Link to="/login" title="Abre a entrada da plataforma de direito, que já está no ar" className="underline decoration-white/40">entrada</Link>.
        </p>

        <nav className="mt-12 pt-6 border-t border-white/10 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link to="/portais" title="Lista de todas as portas do Instituto, com o estado de cada uma" className="text-white/60 hover:text-white underline decoration-white/20">Todas as portas</Link>
          {PORTAIS_INSTITUTO.filter(p => p.rota !== portal.rota).map(p => (
            <Link key={p.rota} to={p.rota} title={p.resumo} className="text-white/60 hover:text-white underline decoration-white/20">{p.nome}</Link>
          ))}
        </nav>
      </div>
    </div>
  )
}
