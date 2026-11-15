/**
 * Hierarquia (pedido do M, 13/11/2026: "a hierarquia deverá ter uma aba específica para definir").
 * A administração do escritório é a primeira a entrar na plataforma, e a primeira coisa que precisa fazer
 * é dizer quem é sócio, quem é gestor, quem é pleno e quem é júnior — porque é o cargo que decide
 * o que cada pessoa ENXERGA. Antes isto era um campo escondido dentro da Área do administrador;
 * agora é uma tela só disto.
 *
 * Fonte única dos cargos: src/lib/hierarquia.ts (configuracoes.cargos). Esta tela só lê e grava por lá.
 * Nenhum cargo é atribuído por padrão: quem define é o escritório, nunca a plataforma.
 */
import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import { Crown, Users, FolderOpen, Database } from 'lucide-react'
import { mensagemAmigavel } from '@/lib/erros'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { listarPessoas, perfilAtual, type Funcao, type Pessoa } from '@/lib/equipe'
import {
  CARGOS,
  definirCargo,
  descricaoCargo,
  lerCargos,
  meuAlcance,
  rotuloCargo,
  ALCANCE_FECHADO,
  type Cargo,
  type MapaCargos,
} from '@/lib/hierarquia'

const OPCOES: (Cargo | 'nenhum')[] = [...CARGOS, 'nenhum']

export default function HierarquiaPage() {
  const [perfil, setPerfil] = useState<Funcao | null | 'carregando'>('carregando')
  const [pessoas, setPessoas] = useState<Pessoa[]>([])
  const [cargos, setCargos] = useState<MapaCargos>({})
  const [eu, setEu] = useState(ALCANCE_FECHADO.id)
  // Quantos processos ainda não têm advogado responsável: enquanto não tiverem, aparecem para todo mundo.
  const [processos, setProcessos] = useState<{ total: number; semDono: number } | null>(null)
  const [ocupado, setOcupado] = useState('')
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const p = await perfilAtual()
        setPerfil(p)
        if (p !== 'admin') return
        setPessoas(await listarPessoas())
        lerCargos().then(setCargos).catch(() => undefined)
        meuAlcance().then(a => setEu(a.id)).catch(() => undefined)
        if (supabaseConfigurado) {
          const { data } = await supabase.from('tarefas').select('responsavel_id').eq('nivel', 'projeto')
          const linhas = (data ?? []) as { responsavel_id: string | null }[]
          setProcessos({ total: linhas.length, semDono: linhas.filter(l => !l.responsavel_id).length })
        }
      } catch (e) {
        setPerfil(null)
        setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
      }
    })()
  }, [])

  const alterarCargo = async (pessoa: Pessoa, valor: string) => {
    setOcupado(pessoa.id); setMsg(null)
    try {
      setCargos(await definirCargo(pessoa.id, valor === 'nenhum' ? null : (valor as Cargo)))
      setMsg({ tipo: 'ok', texto: `${pessoa.nome}: ${rotuloCargo[valor as Cargo | 'nenhum'] ?? valor}. Salvo.` })
    } catch (e) {
      setMsg({ tipo: 'erro', texto: mensagemAmigavel(e) })
    } finally { setOcupado('') }
  }

  const comAcesso = pessoas.filter(p => p.funcao)
  const semCargo = comAcesso.filter(p => !cargos[p.id]).length

  return (
    <Layout title="Hierarquia">
      <div className="max-w-4xl space-y-6">
        {perfil === 'carregando' ? (
          <p className="text-sm text-grafite-claro">Carregando…</p>
        ) : perfil !== 'admin' ? (
          <section className="bg-white p-6 shadow-sm border-t-2 border-dourado" data-testid="sem-permissao">
            <p className="text-sm">Somente quem administra o escritório define a hierarquia. Peça a um administrador do escritório para ajustar o seu cargo.</p>
            {msg && <p role="alert" className="mt-3 text-sm text-critico">{msg.texto}</p>}
          </section>
        ) : (
          <>
            <section className="bg-dourado/10 p-6 shadow-sm border-l-4 border-dourado" aria-labelledby="o-que-e">
              <h2 id="o-que-e" className="text-lg font-serif font-semibold flex items-center gap-2">
                <Crown size={18} className="text-dourado" aria-hidden="true" />
                Fátima: defina aqui o cargo de cada pessoa
              </h2>
              <p className="text-sm text-grafite mt-2">
                O cargo decide o que cada pessoa <strong>enxerga</strong> na plataforma. A função (administração, operação, leitura),
                na <strong>Área do administrador</strong>, continua decidindo o que cada pessoa pode <strong>fazer</strong>.
              </p>
              <dl className="mt-4 text-sm divide-y divide-navy/10" data-testid="o-que-cada-cargo-ve">
                {OPCOES.map(c => (
                  <div key={c} className="py-2 flex flex-col sm:flex-row sm:gap-3">
                    <dt className="font-medium sm:w-56 shrink-0">{rotuloCargo[c]}</dt>
                    <dd className="text-grafite">{descricaoCargo[c]}</dd>
                  </div>
                ))}
              </dl>
              <p className="text-sm text-grafite mt-4 flex items-start gap-2">
                <Database size={16} className="text-navy mt-0.5 shrink-0" aria-hidden="true" />
                <span title="A regra de privacidade por advogado já está aplicada no banco de dados do escritório.">
                  Isto não é só aparência: o próprio <strong>banco de dados</strong> já obedece a este cargo — sócio(a), gestor(a)
                  e a administração leem tudo; quem tem outro cargo, ou nenhum, só alcança o que é seu.
                </span>
              </p>
            </section>

            {msg && (
              <p
                role={msg.tipo === 'erro' ? 'alert' : 'status'}
                className={`p-3 text-sm border-l-2 ${msg.tipo === 'ok' ? 'bg-regularFundo border-regular text-regular' : 'bg-criticoFundo border-critico text-critico'}`}
              >
                {msg.texto}
              </p>
            )}

            <section className="bg-white shadow-sm" aria-labelledby="pessoas-hierarquia">
              <h2 id="pessoas-hierarquia" className="text-lg font-serif flex items-center gap-2 p-6 pb-2">
                <Users size={18} className="text-dourado" aria-hidden="true" />
                Pessoas com acesso ({comAcesso.length})
              </h2>
              <p className="px-6 pb-3 text-sm font-medium text-navy" data-testid="sem-cargo">
                {comAcesso.length === 0
                  ? 'Ninguém com acesso ainda: libere as pessoas na Área do administrador e volte aqui.'
                  : semCargo > 0
                    ? `Falta definir o cargo de ${semCargo} ${semCargo === 1 ? 'pessoa' : 'pessoas'} — até lá, ${semCargo === 1 ? 'ela vê' : 'elas veem'} só o próprio trabalho.`
                    : 'Todas as pessoas com acesso já têm cargo definido.'}
              </p>
              <ul className="divide-y divide-navy/5">
                {comAcesso.map(p => (
                  <li key={p.id} className="p-4 md:px-6 flex flex-col md:flex-row md:items-center gap-3 md:gap-6" data-testid={`pessoa-${p.id}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {p.nome}{p.id === eu && eu ? <span className="text-grafite-claro font-normal"> (você)</span> : null}
                      </p>
                      <p className="text-xs text-grafite-claro mt-1">{descricaoCargo[cargos[p.id] ?? 'nenhum']}</p>
                    </div>
                    <div className="md:w-72">
                      <label htmlFor={`cargo-${p.id}`} className="block text-xs uppercase tracking-wider text-grafite mb-1" title="O cargo define o que a pessoa VÊ: sócios e o gestor veem todos os processos; pleno e júnior veem só os seus.">
                        Cargo na hierarquia
                      </label>
                      <select
                        id={`cargo-${p.id}`}
                        data-testid={`cargo-${p.id}`}
                        value={cargos[p.id] ?? 'nenhum'}
                        disabled={ocupado !== ''}
                        onChange={e => alterarCargo(p, e.target.value)}
                        title={descricaoCargo[cargos[p.id] ?? 'nenhum']}
                        className="w-full min-h-[44px] px-3 py-2 border border-grafite-claro/40 rounded-sm bg-white focus:border-dourado text-sm"
                      >
                        {OPCOES.map(c => (
                          <option key={c} value={c}>{rotuloCargo[c]}</option>
                        ))}
                      </select>
                      <p className="text-xs text-grafite-claro mt-1">{ocupado === p.id ? 'Salvando…' : 'Salvo na hora; pode trocar quando quiser.'}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {!supabaseConfigurado && (
                <p className="px-6 pb-6 text-xs text-grafite-claro">Nesta demonstração a equipe é fictícia e as mudanças valem só nesta tela.</p>
              )}
            </section>

            <section className="bg-white p-6 shadow-sm border-t-2 border-navy" aria-labelledby="falta-decidir" data-testid="processos-sem-responsavel">
              <h2 id="falta-decidir" className="text-lg font-serif flex items-center gap-2">
                <FolderOpen size={18} className="text-navy" aria-hidden="true" />
                O que ainda falta decidir
              </h2>
              {processos === null ? (
                <p className="text-sm text-grafite mt-2">Contando os processos…</p>
              ) : (
                <p className="text-sm text-grafite mt-2">
                  {processos.semDono === 0
                    ? `Todos os ${processos.total} processos do escritório já têm advogado responsável.`
                    : <>
                        <strong>{processos.semDono}</strong> {processos.semDono === 1 ? 'processo' : 'processos'} de {processos.total} ainda
                        {processos.semDono === 1 ? ' não tem' : ' não têm'} advogado responsável. Enquanto não
                        {processos.semDono === 1 ? ' tiver' : ' tiverem'}, {processos.semDono === 1 ? 'aparece' : 'aparecem'} para
                        todas as pessoas do escritório — alguém precisa assumi-los.
                      </>}
                </p>
              )}
              <p className="text-sm text-grafite mt-2" title="Quem responde por cada processo é decisão do escritório; a plataforma não escolhe por você.">
                Quem responde por cada processo é decisão do escritório, não da plataforma: por isso não há aqui nenhum botão
                que distribua tudo de uma vez. A responsabilidade se define processo por processo, na
                <strong> Carteira de processos</strong>.
              </p>
            </section>
          </>
        )}
      </div>
    </Layout>
  )
}
