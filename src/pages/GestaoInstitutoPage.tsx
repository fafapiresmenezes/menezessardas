/**
 * Painel de gestão do Instituto THEYE inteiro (M, 21/11/2026): "a parte do símbolo é a área
 * administrativa… tem que ser igualzinho à plataforma de direito, só que a plataforma de gestão do
 * instituto inteiro". É a primeira tela depois da entrada administrativa: mesma moldura (Layout)
 * da plataforma jurídica, com o menu da Plataforma do Instituto, e aqui o estado de todas as frentes,
 * as ferramentas de administração e o que ainda depende de M.
 *
 * Só administradores do Instituto chegam aqui (SoInstituto na rota e eh_admin_instituto no banco).
 */
import { Link, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { SimboloOuro } from '@/components/EntradaMembros'
import { PORTAIS_INSTITUTO, ROTULO_ESTADO, type EstadoPortal } from '@/data/portais-instituto'
import { TELAS_DO_INSTITUTO } from '@/components/menuTelas'
import { ROTA_ADMIN } from '@/lib/destino'
import AgentesAdministracao from '@/components/AgentesAdministracao'

type Aba = 'visao' | 'agentes'

const ORDEM: EstadoPortal[] = ['piloto', 'prototipo', 'estudo']
const COR: Record<EstadoPortal, string> = {
  piloto: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  prototipo: 'bg-amber-50 text-amber-800 border-amber-200',
  estudo: 'bg-slate-50 text-slate-700 border-slate-200',
}

// O que só M resolve (registrado na memória do projeto em 21/11/2026). Atualizar aqui quando mudar.
const PENDENCIAS_DE_M: { texto: string; onde?: string }[] = [
  { texto: 'Dar merge nos PRs de segurança abertos no GitHub', onde: 'https://github.com/fafapiresmenezes/menezessardas/pulls' },
  { texto: 'Tornar o repositório privado (Settings → Danger Zone)', onde: 'https://github.com/fafapiresmenezes/menezessardas/settings' },
  { texto: 'Ligar o firewall gerenciado (OWASP) na Vercel', onde: 'https://vercel.com/still12/instituto-theye/firewall' },
  { texto: 'Ligar o backup automático (PITR) do Supabase' },
  { texto: 'Cobrança do plano Membro, domínio theye.club e hospedagem comercial' },
]

export default function GestaoInstitutoPage() {
  // A aba vive no endereço (?aba=agentes), para se poder ligar directamente a ela de fora.
  const [params, setParams] = useSearchParams()
  const aba: Aba = params.get('aba') === 'agentes' ? 'agentes' : 'visao'
  const irPara = (a: Aba) => setParams(a === 'visao' ? {} : { aba: a }, { replace: true })
  const contagem = ORDEM.map(e => ({ estado: e, n: PORTAIS_INSTITUTO.filter(p => p.estado === e).length }))
  const ferramentas = TELAS_DO_INSTITUTO().filter(t => t.href !== ROTA_ADMIN)
  return (
    <Layout title="Gestão do Instituto">
      <div className="space-y-8" data-testid="gestao-instituto">
        <section className="flex flex-col items-start gap-5 bg-[#0B0B0C] p-8 text-white shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#C9A24A]">Área administrativa</p>
            <h2 className="mt-2 font-serif text-3xl text-white">Instituto THEYE, todas as frentes</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-neutral-300">
              Daqui se administra o Instituto inteiro: cada frente, as ferramentas da casa e o que falta decidir.
            </p>
          </div>
          <SimboloOuro largura={140} className="shrink-0" />
        </section>

        <nav aria-label="Seções da administração" className="flex gap-2 border-b border-navy/10">
          {([['visao', 'Visão geral'], ['agentes', 'Agentes']] as [Aba, string][]).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              onClick={() => irPara(id)}
              aria-current={aba === id ? 'page' : undefined}
              className={`-mb-px border-b-2 px-3 py-2 text-sm ${
                aba === id ? 'border-dourado font-medium text-navy' : 'border-transparent text-grafite-claro hover:text-navy'
              }`}
            >
              {rotulo}
            </button>
          ))}
        </nav>

        {aba === 'agentes' && <AgentesAdministracao />}

        {aba === 'visao' && (<>
        <section aria-labelledby="numeros" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <h2 id="numeros" className="sr-only">Números do Instituto</h2>
          <div className="bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-wider text-grafite-claro">Frentes</p>
            <p className="mt-1 font-serif text-4xl text-navy" data-testid="total-frentes">{PORTAIS_INSTITUTO.length}</p>
          </div>
          {contagem.map(c => (
            <div key={c.estado} className="bg-white p-5 shadow-sm">
              <p className="text-xs uppercase tracking-wider text-grafite-claro">{ROTULO_ESTADO[c.estado]}</p>
              <p className="mt-1 font-serif text-4xl text-navy">{c.n}</p>
            </div>
          ))}
        </section>

        <section className="bg-white p-6 shadow-sm">
          <h2 className="text-lg mb-1">Ferramentas da administração</h2>
          <p className="text-sm text-grafite-claro mb-4">As telas que só a administração do Instituto vê.</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ferramentas.map(({ href, label, icon: Icone }) => (
              <Link key={href} to={href} title={`Abre ${label}`} className="flex items-center gap-3 border border-navy/10 p-4 text-navy no-underline transition hover:border-dourado hover:bg-dourado/5">
                <Icone size={18} aria-hidden="true" /> <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="bg-white p-6 shadow-sm">
          <h2 className="text-lg mb-1">Estado de cada frente</h2>
          <p className="text-sm text-grafite-claro mb-4">Dito com honestidade, inclusive quando nada foi construído ainda. Clique para abrir a frente.</p>
          {ORDEM.map(estado => (
            <div key={estado} className="mb-6 last:mb-0">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-grafite">{ROTULO_ESTADO[estado]}</h3>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {PORTAIS_INSTITUTO.filter(p => p.estado === estado).map(p => (
                  <li key={p.rota}>
                    <Link to={p.rota} title={p.comoEsta} className="block h-full border border-navy/10 p-4 no-underline transition hover:border-dourado">
                      <span className={`inline-block border px-2 py-0.5 text-[11px] uppercase tracking-wider ${COR[estado]}`}>{ROTULO_ESTADO[estado]}</span>
                      <span className="mt-2 block font-medium text-navy">{p.nome}</span>
                      <span className="mt-1 block text-xs leading-relaxed text-grafite-claro">{p.resumo}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section className="bg-white p-6 shadow-sm" data-testid="pendencias-de-m">
          <h2 className="text-lg mb-1">O que depende de você</h2>
          <p className="text-sm text-grafite-claro mb-4">Passos que só a administração consegue dar.</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            {PENDENCIAS_DE_M.map(p => (
              <li key={p.texto}>
                {p.onde ? <a href={p.onde} target="_blank" rel="noreferrer" title="Abre em nova aba a página onde este passo é feito" className="text-navy underline decoration-dourado">{p.texto}</a> : p.texto}
              </li>
            ))}
          </ol>
        </section>
        </>)}
      </div>
    </Layout>
  )
}
