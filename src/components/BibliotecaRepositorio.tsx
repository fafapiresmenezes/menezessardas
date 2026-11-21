import { REPOSITORIOS_TESES, CURSOS_ABERTOS } from '@/data/bibliotecaDemo'

export default function BibliotecaRepositorio() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-serif text-lg text-navy">Repositórios de teses abertas</h3>
        <p className="mt-1 text-sm text-grafite-claro">
          {REPOSITORIOS_TESES.length} repositórios de universidades top-500 e redes internacionais,
          todos com protocolo OAI-PMH ou API abertos para colheita automática.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {REPOSITORIOS_TESES.map((repo) => (
          <div key={repo.id} className="border border-navy/10 p-3">
            <a
              href={repo.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-dourado hover:text-dourado/80"
            >
              {repo.nome}
            </a>
            <p className="mt-1 text-xs text-grafite-claro">{repo.oQueDa}</p>
            <p className="mt-2 text-xs text-navy/60">
              Protocolo: <span className="font-mono">{repo.protocolo}</span> · Licença:{' '}
              <span className="font-mono">{repo.licenca}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-navy/10 pt-6">
        <h3 className="font-serif text-lg text-navy">Cursos abertos de referência</h3>
        <p className="mt-1 text-sm text-grafite-claro">
          {CURSOS_ABERTOS.length} cursos das escolas top com material educacional sob CC.
        </p>
      </div>

      <div className="space-y-2">
        {CURSOS_ABERTOS.map((curso) => (
          <div key={curso.id} className="border border-navy/10 p-3">
            <a
              href={curso.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-dourado hover:text-dourado/80"
            >
              {curso.nome}
            </a>
            <p className="mt-1 text-xs text-grafite-claro">{curso.escola}</p>
            <p className="text-xs text-navy/60">
              Licença: <span className="font-mono">{curso.licenca}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
