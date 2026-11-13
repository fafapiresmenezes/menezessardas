import { Link } from 'react-router-dom'
import { Upload, UserPlus, FolderInput } from 'lucide-react'

// Pedido do M (12/11/2026): "a aba de processos antigos tem de ser mais organizada".
// O que estava desorganizado não era cada tela, era haver TRÊS portas para o mesmo trabalho — trazer
// o que o escritório já tinha — com nomes que não se pareciam e sem uma dizer onde estavam as outras.
// Uma delas, "Importar processos anteriores", não aparecia nem no menu: só se chegava nela por um
// botão dentro da carteira.
//
// Esta faixa é a mesma nas três telas. Mostra as três de uma vez, diz em uma linha quando usar cada
// uma e marca onde a pessoa está. Nenhuma das três mudou de endereço nem de nome: quem já sabia o
// caminho continua chegando pelo mesmo lugar.
export const CAMINHOS_PROCESSOS_ANTIGOS = [
  { href: '/processos/importar', icone: Upload, nome: 'Importar processos anteriores',
    quando: 'Tenho a planilha, a lista de números ou quero buscar por nome e CPF/CNPJ.' },
  { href: '/processos-antigos', icone: UserPlus, nome: 'Inserir processos antigos',
    quando: 'Quero tudo o que está na OAB de um advogado, inclusive de quem saiu, com os prazos já calculados.' },
  { href: '/migracao', icone: FolderInput, nome: 'Trazer do sistema antigo',
    quando: 'Vou trazer o sistema antigo inteiro de uma vez: processos, clientes, prazos e financeiro.' },
] as const

/** `aqui` é o endereço da tela que está aberta, para marcá-la na faixa. */
export default function AbasProcessosAntigos({ aqui }: { aqui: string }) {
  return (
    <nav aria-label="Três maneiras de trazer os processos que o escritório já tinha" data-testid="abas-processos-antigos"
      className="bg-white shadow-sm p-4">
      <p className="text-[11px] uppercase tracking-wider text-grafite-claro">Trazer o que o escritório já tinha · três maneiras</p>
      <ul className="grid gap-2 md:grid-cols-3 mt-2">
        {CAMINHOS_PROCESSOS_ANTIGOS.map(c => {
          const atual = c.href === aqui
          const Icone = c.icone
          return (
            <li key={c.href}>
              {atual ? (
                <span aria-current="page" data-testid={`aba-atual-${c.href}`}
                  className="h-full flex flex-col gap-1 border-l-2 border-navy bg-navy/5 p-3 text-sm">
                  <span className="inline-flex items-center gap-2 font-medium text-navy"><Icone size={16} aria-hidden /> {c.nome}</span>
                  <span className="text-xs text-grafite-claro">Você está aqui. {c.quando}</span>
                </span>
              ) : (
                <Link to={c.href} title={c.quando} data-testid={`aba-${c.href}`}
                  className="h-full flex flex-col gap-1 border-l-2 border-navy/15 p-3 text-sm hover:bg-navy/5">
                  <span className="inline-flex items-center gap-2 text-navy underline"><Icone size={16} aria-hidden /> {c.nome}</span>
                  <span className="text-xs text-grafite-claro">{c.quando}</span>
                </Link>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
