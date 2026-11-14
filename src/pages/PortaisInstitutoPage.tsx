import { Link } from 'react-router-dom'
import Marca from '@/components/Marca'
import { PORTAIS_INSTITUTO, ROTULO_ESTADO, EXPLICACAO_ESTADO } from '@/data/portais-instituto'

/**
 * Passo B7: a lista das portas do Instituto, para quem chega por um endereço e quer ver o resto.
 *
 * Esta lista NÃO é a grade da primeira tela. A tela anterior ao login (a escolha de idioma) está
 * pronta e, por decisão de M, fica como está; mexer nela aqui seria desfazer o que ele aprovou.
 * Quem quiser a grade na entrada depois pode apontá-la para cá, porque os endereços já existem.
 */
export default function PortaisInstitutoPage() {
  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-10"><Marca /></div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-300">Instituto THEYE</p>
        <h1 className="text-3xl font-serif text-white mt-2 mb-3">Portas em desenvolvimento</h1>
        <p className="text-base text-white/80">
          Cada porta abaixo diz o que vai fazer e em que pé está. Nenhuma promete data. A plataforma
          de direito, que já está no ar, entra pela{' '}
          <Link to="/login" title="Abre a entrada da plataforma de direito, que já está no ar" className="underline decoration-white/40">entrada</Link>.
        </p>
        <ul className="mt-10 space-y-6" data-testid="lista-portais">
          {PORTAIS_INSTITUTO.map(p => (
            <li key={p.rota} className="border-t border-white/10 pt-5">
              <Link to={p.rota} title={`Abre a página de ${p.nome}, com o escopo e o estado`} className="text-xl font-serif hover:text-white/70 no-underline">{p.nome}</Link>
              <p className="text-sm text-white/70 mt-1">{p.resumo}</p>
              <p className="text-xs uppercase tracking-wider text-neutral-300 mt-2" title={EXPLICACAO_ESTADO[p.estado]}>{ROTULO_ESTADO[p.estado]}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
