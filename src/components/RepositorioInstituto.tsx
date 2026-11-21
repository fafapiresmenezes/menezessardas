import { useState } from 'react'
import { Link } from 'react-router-dom'
import { BLOCOS_REPOSITORIO, ROTULO_BLOCO, type EstadoBloco } from '@/data/repositorioInstituto'
import BibliotecaRepositorio from './BibliotecaRepositorio'

/**
 * Fase F4 do plano v2: o Repositório da administração — as sete peças de conhecimento num lugar só.
 *
 * Cada bloco mostra o seu estado com honestidade: "No repositório" quando a peça existe e aponta
 * para a fonte, "A trazer" quando ainda falta importar, dizendo exatamente o quê. Nada aparece
 * como pronto vazio, e nenhuma fonte é inventada.
 *
 * Fica num componente solto de propósito: o passo F1-03 vai reescrever /gestao-instituto, e assim
 * a reescrita monta este componente em vez de apagar o trabalho.
 */

const COR: Record<EstadoBloco, string> = {
  'pronto': 'bg-emerald-50 text-emerald-800 border-emerald-200',
  'parcial': 'bg-amber-50 text-amber-800 border-amber-200',
  'a-trazer': 'bg-slate-50 text-slate-700 border-slate-200',
}

function BlocoCard({ b, expandido, onToggle }: { b: typeof BLOCOS_REPOSITORIO[0]; expandido: boolean; onToggle: () => void }) {
  return (
    <article key={b.chave} className="flex h-full flex-col border border-navy/10 bg-white p-4" data-testid={`bloco-${b.chave}`}>
      <button
        type="button"
        onClick={onToggle}
        title={`${expandido ? 'Fecha' : 'Abre'} ${b.titulo}`}
        className="text-left"
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-navy">{b.titulo}</h3>
          <span className={`shrink-0 border px-2 py-0.5 text-[11px] uppercase tracking-wider ${COR[b.estado]}`}>
            {ROTULO_BLOCO[b.estado]}
          </span>
        </div>
      </button>
      <p className="mt-1 text-sm text-grafite-claro">{b.resumo}</p>

      {typeof b.contagem === 'number' && (
        <p className="mt-2 text-sm text-navy">{b.contagem.toLocaleString('pt-BR')} peças</p>
      )}

      {b.oQueFalta && (
        <p className="mt-2 text-xs leading-relaxed text-grafite-claro">
          <span className="font-semibold">Falta:</span> {b.oQueFalta}
        </p>
      )}

      {expandido && b.chave === 'biblioteca' && (
        <div className="mt-4 border-t border-navy/10 pt-4">
          <BibliotecaRepositorio />
        </div>
      )}

      <div className="mt-auto pt-3">
        {b.rotaViva && (
          <Link to={b.rotaViva} title={`Abre ${b.titulo}`} className="text-sm text-navy underline decoration-dourado">
            Abrir {b.titulo}
          </Link>
        )}
        {b.fonte && (
          <p className="mt-2 text-[11px] leading-relaxed text-grafite-claro">{b.fonte}</p>
        )}
      </div>
    </article>
  )
}

export default function RepositorioInstituto() {
  const [expandido, setExpandido] = useState<string | null>(null)

  return (
    <section className="space-y-5" data-testid="repositorio-instituto">
      <div>
        <h2 className="font-serif text-xl text-navy">Repositório da administração</h2>
        <p className="mt-1 max-w-3xl text-sm text-grafite-claro">
          As sete peças de conhecimento do Instituto num lugar só: Atlas, biblioteca, agentes,
          white papers, benchmarks, universidades e bancos de dados. Cada peça entra com a licença
          à vista e o link para a fonte. O que ainda falta trazer está dito como "a trazer", com o
          que falta — nada aparece como pronto vazio.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {BLOCOS_REPOSITORIO.map(b => (
          <BlocoCard
            key={b.chave}
            b={b}
            expandido={expandido === b.chave}
            onToggle={() => setExpandido(expandido === b.chave ? null : b.chave)}
          />
        ))}
      </div>
    </section>
  )
}
