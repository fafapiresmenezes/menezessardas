import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gravarAreaAtual, ESPECIALIDADES } from '@/lib/assistente'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { meuAlcance, rotuloCargo, type Cargo } from '@/lib/hierarquia'
import { minhaPreferencia, telaPorCargo } from '@/lib/preferencias'
import { meuEscritorio, esquecerEscritorio, type MeuEscritorio } from '@/lib/equipe'
import { lerMeuJeito, carregarMeuJeito, esquecerMeuJeito, EVENTO_JEITO } from '@/lib/meuJeito'
import { esquecerMarca } from '@/lib/marca'
import { Building2, Users, Briefcase, Landmark, Factory, ShoppingCart, HeartPulse, Gavel, FileSignature, ShieldCheck, Scale, type LucideIcon } from 'lucide-react'
import AceiteTermos from '@/components/AceiteTermos'
import { BLOCOS_INICIO } from '@/components/menuTelas'

// Tela de entrada: o escritório escolhe a área de trabalho antes de entrar na plataforma.
const agente = (a: string) => `?agente=${a}#/assistente`
// A plataforma atende todas as áreas do direito brasileiro; o imobiliário é só mais uma delas (deixou de abrir a lista).
const AREAS_PRINCIPAIS = [
  { chave: 'civel', titulo: 'Cível e contratos', texto: 'Contratos, cobranças e responsabilidade civil.', icone: FileSignature, destino: agente('civel') },
  { chave: 'trabalhista', titulo: 'Trabalhista', texto: 'Contratação, rescisão, verbas, FGTS e reclamações.', icone: Briefcase, destino: agente('trabalhista') },
  { chave: 'familia', titulo: 'Família e sucessões', texto: 'Divórcio, partilha, alimentos, guarda e inventário.', icone: Users, destino: agente('familia') },
  { chave: 'tributario', titulo: 'Tributário', texto: 'Impostos, reforma tributária, defesas e planejamento.', icone: Landmark, destino: agente('tributario') },
  { chave: 'empresarial', titulo: 'Empresarial', texto: 'Sociedades, contratos empresariais e recuperação judicial.', icone: Factory, destino: agente('empresarial') },
  { chave: 'consumidor', titulo: 'Consumidor', texto: 'Relações de consumo, cláusulas abusivas e indenizações.', icone: ShoppingCart, destino: agente('consumidor') },
  { chave: 'previdenciario', titulo: 'Previdenciário', texto: 'Aposentadorias, benefícios do INSS e revisões.', icone: HeartPulse, destino: agente('previdenciario') },
  { chave: 'penal', titulo: 'Penal', texto: 'Defesa, inquérito, crimes e execução penal.', icone: Gavel, destino: agente('penal') },
  { chave: 'compliance', titulo: 'Compliance e LGPD', texto: 'Integridade, proteção de dados, ESG e due diligence.', icone: ShieldCheck, destino: '/compliance' },
  { chave: 'imobiliario', titulo: 'Imobiliário', texto: 'Imóveis, contratos de locação, prazos, reajustes e fornecedores.', icone: Building2, destino: '/imoveis' },
]
// Todas as outras matérias do direito: cada uma abre o assistente já preparado para ela. A lista vem do próprio assistente.
const JA_NA_LISTA = new Set(AREAS_PRINCIPAIS.map(a => a.chave))
const AREAS: { chave: string; titulo: string; texto: string; icone: LucideIcon; destino: string }[] = [
  ...AREAS_PRINCIPAIS,
  ...ESPECIALIDADES.filter(e => !/^nivel_/.test(e.valor) && !JA_NA_LISTA.has(e.valor) && e.valor !== 'pesquisa' && e.valor !== 'geral')
    .map(e => ({ chave: e.valor as string, titulo: e.rotulo, texto: `${e.descricao}.`, icone: Scale, destino: agente(e.valor) })),
]

// Passo A27: a entrada tem os MESMOS quatro blocos do menu, com os MESMOS nomes de tela. Blocos, nomes e atalhos
// vêm do mapa das telas (src/components/menuTelas.ts): assim a mesma tela não ganha um nome aqui e outro no menu.
const BLOCOS = BLOCOS_INICIO

export default function InicioPage() {
  const navigate = useNavigate()
  // Separação por escritório: a primeira coisa que a tela diz é em qual escritório a pessoa está.
  const [escritorio, setEscritorio] = useState<MeuEscritorio | null>(null)
  useEffect(() => { meuEscritorio().then(setEscritorio).catch(() => setEscritorio(null)) }, [])
  const trocarDeConta = async () => {
    esquecerMarca(); esquecerEscritorio(); esquecerMeuJeito()
    try { await supabase.auth.signOut() } catch { /* já estava fora */ }
    navigate('/login')
  }
  // Passo 24: lembra a última área por usuário (preferencias_usuario.area) e permite fixar uma como padrão
  // (area_fixa): com área fixa, a entrada vai direto para ela após 4 s, a não ser que a pessoa escolha outra.
  const [ultima, setUltima] = useState<string | null>(() => { try { return localStorage.getItem('lsm-area') } catch { return null } })
  const [fixa, setFixa] = useState<string | null>(null)
  const [contagem, setContagem] = useState<number | null>(null)
  const [carregado, setCarregado] = useState(false)
  // Passo 98: busca rápida ("para onde quer ir?") filtra as matérias por título ou descrição; Enter abre a primeira.
  // Passo 170: a busca de área é lembrada neste navegador.
  const [buscaArea, setBuscaArea] = useState(() => { try { return localStorage.getItem('lsm-inicio-busca') || '' } catch { return '' } })
  useEffect(() => { try { localStorage.setItem('lsm-inicio-busca', buscaArea) } catch { /* sem armazenamento */ } }, [buscaArea])
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const areasVisiveis = AREAS.filter(a => !buscaArea || norm(a.titulo + ' ' + a.texto).includes(norm(buscaArea)))
  // Passo 128: mapa das 10 áreas em texto, para orientar quem entra na equipe.
  const [mapaCopiado, setMapaCopiado] = useState(false)
  // Hierarquia (pedido do M): a primeira tela já diz quem você é e o que você enxerga.
  const [alcance, setAlcance] = useState<{ cargo: Cargo | null; admin: boolean; veTudo: boolean } | null>(null)
  useEffect(() => { meuAlcance().then(setAlcance).catch(() => setAlcance(null)) }, [])
  // Passos 10 e 11 do plano: na primeira entrada da sessão, cada pessoa cai na SUA tela —
  // a escolhida nas Configurações ou, sem escolha, a do cargo (sócio/gestor: números; demais: Meu dia).
  // Voltar ao menu Início depois disso funciona normalmente.
  useEffect(() => {
    if (!supabaseConfigurado) return
    let entrou = false
    try { entrou = sessionStorage.getItem('lsm-entrada-cargo') === '1' } catch { return }
    if (entrou) return
    Promise.all([minhaPreferencia(), meuAlcance()]).then(([pref, alc]) => {
      const destino = pref.telaInicial || (alc.cargo ? telaPorCargo(alc.veTudo) : '')
      if (!destino || destino === '/inicio') return
      try { sessionStorage.setItem('lsm-entrada-cargo', '1') } catch { /* sem armazenamento */ }
      navigate(destino)
    }).catch(() => undefined)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 276
  const copiarMapa = async () => {
    const t = ['Áreas da plataforma — THEYE Institute', ...AREAS.map((a, i) => `${i + 1}. ${a.titulo}: ${a.texto}`)].join('\n')
    try { await navigator.clipboard.writeText(t); setMapaCopiado(true); setTimeout(() => setMapaCopiado(false), 2500) } catch { /* sem área de transferência */ }
  }
  useEffect(() => {
    if (!supabaseConfigurado) { setCarregado(true); return }
    supabase.from('preferencias_usuario').select('area,area_fixa').maybeSingle().then(r => {
      if (r.data?.area) setUltima(r.data.area)
      if (r.data?.area_fixa) { setFixa(r.data.area_fixa); if (!window.location.href.includes('escolher')) setContagem(4) }
      setCarregado(true)
    })
  }, [])
  useEffect(() => {
    if (contagem === null) return
    if (contagem <= 0) { const a = AREAS.find(x => x.chave === fixa); if (a) abrir(a.destino, a.chave); return }
    const t = setTimeout(() => setContagem(c => (c ?? 1) - 1), 1000); return () => clearTimeout(t)
  }, [contagem]) // eslint-disable-line react-hooks/exhaustive-deps
  const fixar = async (chave: string | null) => {
    setFixa(chave); setContagem(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('preferencias_usuario').upsert({ usuario_id: user.id, area_fixa: chave, atualizado_em: new Date().toISOString() })
  }
  const abrir = (destino: string, chave?: string) => {
    if (chave) gravarAreaAtual(chave).catch(() => undefined)
    if (destino.startsWith('?')) window.location.href = `${window.location.pathname}${destino}`
    else navigate(destino)
  }
  const areaUltima = AREAS.find(a => a.chave === ultima)
  // Meu jeito de trabalhar: as matérias que a pessoa marcou como suas aparecem primeiro, com o nome dela em cima.
  const [minhas, setMinhas] = useState<string[]>(() => lerMeuJeito().materias ?? [])
  useEffect(() => {
    const reler = () => setMinhas(lerMeuJeito().materias ?? [])
    window.addEventListener(EVENTO_JEITO, reler)
    carregarMeuJeito().catch(() => undefined)
    return () => window.removeEventListener(EVENTO_JEITO, reler)
  }, [])
  const minhasAreas = minhas.map(m => AREAS.find(a => a.chave === m)).filter((a): a is (typeof AREAS)[number] => !!a)
  const areaFixa = AREAS.find(a => a.chave === fixa)
  return (
    <main className="min-h-screen bg-navy flex flex-col items-center justify-center px-4 py-12">
      <AceiteTermos />
      <div className="text-center mb-10">
        <p className="font-serif text-dourado text-4xl tracking-widest">THEYE</p>
        <h1 className="font-serif text-white text-3xl mt-2">Theye.club</h1>
        <p className="text-white/60 text-xs uppercase tracking-[0.18em] mt-2">Suporte Jurídico</p>
      </div>
      {(escritorio || alcance) && (
        <section className="w-full max-w-6xl mb-6 bg-white text-navy p-5 flex flex-wrap items-center justify-between gap-4 shadow-lg" aria-label="Onde você está" data-testid="inicio-escritorio">
          <div className="min-w-0">
            {escritorio && (
              <>
                <p className="text-[11px] uppercase tracking-wider text-grafite-claro">Você está no escritório</p>
                <p className="font-serif text-2xl md:text-3xl break-words" data-testid="inicio-escritorio-nome" title="Tudo o que você vê e grava aqui pertence a este escritório. Pessoas de outros escritórios não enxergam.">{escritorio.nome}</p>
                <p className="text-sm text-grafite mt-1 break-words">{escritorio.pessoa}{escritorio.email && escritorio.email !== escritorio.pessoa ? ` · ${escritorio.email}` : ''}</p>
              </>
            )}
            {escritorio && alcance?.admin && (
              <p className="text-sm text-grafite mt-2" data-testid="inicio-administra" title="Quem administra libera as pessoas que pedem para entrar e define o cargo de cada uma, na Área do administrador.">
                {escritorio.instituto && escritorio.sede && supabaseConfigurado
                  ? <>Você administra o <strong>Instituto THEYE</strong>, que cuida da plataforma inteira{escritorio.advocacia ? <>, e também o escritório <strong>{escritorio.advocacia}</strong></> : null}.</>
                  : <>Você <strong>administra este escritório</strong>: libera quem pede para entrar e define o cargo de cada pessoa.</>}
              </p>
            )}
            {alcance && (
              <p className="text-sm text-grafite mt-2" data-testid="inicio-hierarquia" title="O cargo de cada pessoa é definido pela administração na Área do administrador.">
                {alcance.veTudo
                  ? <>Você entrou como <strong>{alcance.cargo ? rotuloCargo[alcance.cargo] : 'administração'}</strong>: enxerga todos os processos e números do escritório.</>
                  : <>Você entrou como <strong>{alcance.cargo ? rotuloCargo[alcance.cargo] : 'advogado(a)'}</strong>: cada um é dono dos seus processos, e você vê os seus. Sócios e o gestor veem o conjunto.</>}
              </p>
            )}
          </div>
          <button type="button" onClick={() => navigate('/meu-jeito')} data-testid="ir-meu-jeito" title="Escolha o que aparece no seu menu, as matérias que você usa, a tela em que a plataforma abre e o tamanho da letra. Vale só para você." className="min-h-[44px] px-4 bg-navy text-white text-sm">
            Deixar a plataforma do meu jeito
          </button>
          {escritorio && supabaseConfigurado && (
            <button type="button" onClick={trocarDeConta} data-testid="trocar-de-conta" title="Sai desta conta para você entrar com a conta do escritório certo" className="min-h-[44px] px-4 border border-navy text-navy text-sm">
              Não é o seu escritório? Sair e trocar de conta
            </button>
          )}
        </section>
      )}
      {/* Atalhos divididos por assunto: quem entra acha o que precisa sem abrir o menu. */}
      <div className="w-full max-w-6xl mb-8" aria-label="Por onde começar">
        <p className="text-white text-lg mb-3 text-center">O que você precisa agora?</p>
        <div className="grid gap-4 md:grid-cols-2">
          {BLOCOS.map((b, n) => {
            const itens = b.itens.filter(a => !a.so || (a.so === 'admin' ? alcance?.admin : alcance?.veTudo))
            return (
              <div key={b.titulo} role="group" className="border border-white/30 p-4" aria-label={b.titulo} data-testid={`bloco-${n + 1}`}>
                <h2 className="text-white font-serif text-xl flex flex-wrap items-baseline gap-x-3">
                  <span>{n + 1}. {b.titulo}</span>
                  <span className="text-white/60 text-xs font-sans uppercase tracking-wider">{b.dica}</span>
                </h2>
                <div className="mt-3 grid gap-2">
                  {itens.map(a => (
                    <button key={a.id} type="button" data-testid={a.id} onClick={() => navigate(a.destino)} title={`${a.titulo} — ${a.texto}`} className="bg-dourado text-navy text-left p-4 min-h-[64px] flex items-start gap-3 hover:-translate-y-0.5 transition focus:outline-none focus:ring-4 focus:ring-white/60">
                      <a.icone className="w-6 h-6 mt-0.5 shrink-0" aria-hidden />
                      <span className="min-w-0">
                        <span className="block font-serif text-lg leading-tight">{a.titulo}</span>
                        <span className="block text-sm">{a.texto}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {minhasAreas.length > 0 && (
        <div className="w-full max-w-6xl mb-8" role="group" aria-label="As matérias que você usa" data-testid="minhas-materias">
          <p className="text-white text-lg mb-1 text-center">As matérias que você usa</p>
          <p className="text-white/60 text-xs text-center mb-3">Você escolheu estas em “Deixar a plataforma do meu jeito”. Cada uma abre o assistente já preparado para ela.</p>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {minhasAreas.map(a => (
              <button key={a.chave} type="button" data-testid={`minha-area-${a.chave}`} onClick={() => abrir(a.destino, a.chave)} title={`${a.titulo} — ${a.texto}`} className="bg-white text-left p-4 min-h-[64px] flex items-start gap-3 border-t-4 border-dourado hover:-translate-y-0.5 transition focus:outline-none focus:ring-4 focus:ring-dourado/50">
                <a.icone className="w-6 h-6 text-dourado mt-0.5 shrink-0" aria-hidden />
                <span className="min-w-0"><span className="block font-serif text-lg text-navy leading-tight">{a.titulo}</span><span className="block text-sm text-gray-600">{a.texto}</span></span>
              </button>
            ))}
          </div>
        </div>
      )}
      {carregado && (areaFixa || areaUltima) && (
        <div className="w-full max-w-6xl mb-5 bg-white/10 border border-dourado/50 text-white p-4 flex flex-wrap items-center gap-3 text-sm" data-testid="area-lembrada">
          {areaFixa ? (
            <>
              <span>Sua área padrão é <strong data-testid="area-fixa-nome">{areaFixa.titulo}</strong>{contagem !== null && contagem > 0 ? ` · entrando em ${contagem} s` : ''}.</span>
              <button type="button" onClick={() => abrir(areaFixa.destino, areaFixa.chave)} title="Entra agora na sua área padrão, sem esperar a contagem" className="min-h-[44px] px-4 bg-dourado text-navy uppercase tracking-wider text-xs" data-testid="entrar-fixa">Entrar agora</button>
              <button type="button" onClick={() => setContagem(null)} title="Para a contagem para você escolher outra área nesta tela" className="min-h-[44px] px-4 border border-white/60 uppercase tracking-wider text-xs" data-testid="escolher-outra">Escolher outra área</button>
              <button type="button" onClick={() => fixar(null)} title="Remove a área padrão: a entrada volta a mostrar todas as áreas" className="min-h-[44px] px-4 underline text-xs" data-testid="desfixar">Deixar de ser padrão</button>
            </>
          ) : areaUltima && (
            <>
              <span>Da última vez você trabalhou em <strong data-testid="area-ultima-nome">{areaUltima.titulo}</strong>.</span>
              <button type="button" onClick={() => abrir(areaUltima.destino, areaUltima.chave)} title="Volta para a área em que você trabalhou da última vez" className="min-h-[44px] px-4 bg-dourado text-navy uppercase tracking-wider text-xs" data-testid="entrar-ultima">Continuar nela</button>
              <button type="button" onClick={() => fixar(areaUltima.chave)} title="Faz desta a sua área padrão: a entrada vai direto para ela" className="min-h-[44px] px-4 border border-white/60 uppercase tracking-wider text-xs" data-testid="fixar-padrao">Fixar como padrão</button>
            </>
          )}
        </div>
      )}
      {/* Só o que é preciso fica à vista: as três tarefas de cima. As áreas de trabalho abrem aqui, em um clique. */}
      <details className="w-full max-w-6xl" data-testid="todas-areas" open={!!buscaArea || undefined}>
        <summary className="cursor-pointer text-white/90 text-center min-h-[48px] flex items-center justify-center select-none underline" title={`Abre as ${AREAS.length} matérias do direito: cada uma leva ao assistente já preparado para aquele assunto`}>Ver todas as {AREAS.length} matérias do direito (cível, trabalhista, família, constitucional, administrativo…)</summary>
      <form className="w-full max-w-6xl mb-4 mt-3" onSubmit={e => { e.preventDefault(); const a = areasVisiveis[0]; if (a) abrir(a.destino, a.chave) }}>
        <label className="block text-white/80 text-sm">Para onde quer ir?
          <input value={buscaArea} onChange={e => setBuscaArea(e.target.value)} placeholder="Ex.: contrato, despejo, trabalhista, INSS…" data-testid="busca-area" className="mt-1 w-full max-w-md block border border-dourado/60 bg-white/95 text-navy px-3 min-h-[44px]" />
        </label>
        <details className="mt-1 text-white/80 text-xs" data-testid="mais-opcoes-inicio">
          <summary className="cursor-pointer min-h-[44px] inline-flex items-center underline select-none">Mais opções do mapa de áreas</summary>
          <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={copiarMapa} data-testid="copiar-mapa-areas" title="Copia a lista das áreas e do que cada uma faz, para orientar quem entra na equipe" className="mt-2 min-h-[44px] underline text-white/80 text-xs">{mapaCopiado ? 'mapa copiado' : 'copiar mapa das áreas'}</button>
          <button type="button" onClick={() => window.print()} data-testid="imprimir-mapa" title="Abre a janela de impressão do navegador com o mapa das áreas" className="mt-2 ml-3 min-h-[44px] underline text-white/80 text-xs print:hidden">imprimir</button>{/* Passo 204 */}
          <button type="button" data-testid="copiar-link-inicio" title="Copia o endereço desta tela de entrada" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="mt-2 ml-2 min-h-[44px] px-4 border border-navy/20 text-navy text-sm print:hidden">{linkCopiado ? 'Link copiado' : 'Copiar link'}</button>{/* Passo 238 */}
          <button type="button" data-testid="baixar-areas" title="Baixa a lista das áreas em planilha CSV" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['área;descrição', ...AREAS.map(a => `${a.titulo};${a.texto}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'areas.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 underline text-navy text-sm print:hidden">baixar lista</button>{/* Passo 315 */}
          </div>
        </details>
        {buscaArea && <p className="text-white/70 text-xs mt-1" data-testid="busca-area-resultado">{areasVisiveis.length ? `${areasVisiveis.length} área(s); Enter abre ${areasVisiveis[0].titulo}.` : 'Nenhuma área com esse termo. Tente "contrato" ou "cível".'}</p>}
      </form>
      <div className="grid gap-4 w-full max-w-6xl sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {areasVisiveis.map(a => (
          <button
            key={a.chave}
            data-testid={`area-${a.chave}`}
            onClick={() => abrir(a.destino, a.chave)}
            title={`${a.titulo} — ${a.texto}`}
            className="bg-white text-left p-5 shadow-lg border-t-4 border-dourado hover:-translate-y-1 hover:shadow-xl transition focus:outline-none focus:ring-4 focus:ring-dourado/50"
          >
            <a.icone className="w-8 h-8 text-dourado mb-3" aria-hidden />
            <span className="block font-serif text-xl text-navy mb-1">{a.titulo}</span>
            <span className="block text-sm text-gray-600">{a.texto}</span>
          </button>
        ))}
      </div>
      </details>
      <p className="text-white/50 text-xs mt-12">Desenvolvido pelo THEYE Institute</p>
    </main>
  )
}
