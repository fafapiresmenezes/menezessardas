import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'
import Layout from '@/components/Layout'
import { gruposVisiveis, atalhosDoMenu, ATALHOS_PADRAO, MAX_ATALHOS, DICAS, ROTULO_NIVEL, type Visao } from '@/components/menuTelas'
import { minhaVisao } from '@/lib/visao'
import { lerMeuJeito, carregarMeuJeito, gravarMeuJeito, LETRAS, type MeuJeito, type Letra } from '@/lib/meuJeito'
import { minhaPreferencia, definirMinhaPreferencia } from '@/lib/preferencias'
import { ESPECIALIDADES } from '@/lib/assistente'

const MATERIAS = ESPECIALIDADES.filter(e => !/^nivel_/.test(e.valor) && e.valor !== 'pesquisa' && e.valor !== 'geral')
const MAX_MATERIAS = 12
const caixa = 'bg-white border border-navy/10 p-5 mb-5'

/** Meu jeito de trabalhar: cada pessoa ajusta a plataforma ao seu modo de operar, sem depender de ninguém. */
export default function MeuJeitoPage() {
  const [visao, setVisao] = useState<Visao>({ veTudo: false, admin: false, instituto: false, sede: true })
  const [jeito, setJeito] = useState<MeuJeito>(lerMeuJeito)
  const [tela, setTela] = useState('')
  const [aviso, setAviso] = useState('')
  useEffect(() => {
    minhaVisao().then(setVisao).catch(() => undefined)
    // Só aplica o que vem da conta se a pessoa ainda não mexeu em nada nesta visita.
    carregarMeuJeito().then(daConta => { if (!tocou.current) { atual.current = daConta; setJeito(daConta) } }).catch(() => undefined)
    minhaPreferencia().then(p => setTela(p.telaInicial ?? '')).catch(() => undefined)
  }, [])

  const grupos = gruposVisiveis(visao)
  const escolhidos = atalhosDoMenu(jeito.atalhos, visao)
  const hrefs = escolhidos.map(a => a.href)
  // O ref guarda o jeito mais recente, mesmo entre dois cliques seguidos antes de o React fechar o estado.
  const atual = useRef(jeito)
  const tocou = useRef(false)
  const salvar = async (receita: (anterior: MeuJeito) => MeuJeito) => {
    const novo = receita(atual.current)
    atual.current = novo
    tocou.current = true
    setJeito(novo)
    const onde = await gravarMeuJeito(novo)
    setAviso(onde === 'conta' ? 'Salvo na sua conta: vale em qualquer aparelho em que você entrar.' : 'Salvo neste aparelho.')
  }
  const comAtalhos = (muda: (anterior: string[]) => string[]) => salvar(a => ({ ...a, atalhos: muda(atalhosDoMenu(a.atalhos, visao).map(t => t.href)) }))
  const mover = (i: number, passo: number) => comAtalhos(lista => { const l = [...lista]; const j = i + passo; if (j < 0 || j >= l.length) return lista; [l[i], l[j]] = [l[j], l[i]]; return l })
  const materias = jeito.materias ?? []
  const alternarMateria = (m: string) => salvar(a => {
    const atuais = a.materias ?? []
    if (atuais.includes(m)) return { ...a, materias: atuais.filter(x => x !== m) }
    if (atuais.length >= MAX_MATERIAS) { setAviso(`No máximo ${MAX_MATERIAS} matérias. Tire uma para colocar outra.`); return a }
    return { ...a, materias: [...atuais, m] }
  })
  const salvarTela = async (t: string) => {
    setTela(t)
    try { await definirMinhaPreferencia({ telaInicial: t || undefined }); setAviso(t ? 'A plataforma vai abrir nessa tela.' : 'A plataforma volta a abrir na tela padrão do seu cargo.') }
    catch (e) { setAviso(e instanceof Error ? e.message : 'Não foi possível salvar a tela de abertura.') }
  }
  const voltarAoPadrao = async () => { await salvar(() => ({})); await salvarTela(''); setAviso('Tudo voltou ao padrão.') }

  return (
    <Layout title="Meu jeito de trabalhar">
      <div className="max-w-4xl">
        <p className="text-grafite mb-5">Aqui você arruma a plataforma do seu jeito. O que você mudar vale <strong>só para você</strong>: cada colega tem o seu. Nada aqui apaga dados; é só o que aparece e em que ordem.</p>
        <p role="status" aria-live="polite" data-testid="jeito-aviso" className={`text-sm mb-4 ${aviso ? 'p-3 bg-navy/5 border border-navy/15 text-navy' : 'sr-only'}`}>{aviso}</p>

        <div className={caixa} role="group" aria-labelledby="j-menu">
          <h2 id="j-menu" className="font-serif text-xl text-navy">1. O meu menu</h2>
          <p className="text-sm text-grafite mt-1 mb-3">Estas são as telas que aparecem no seu menu simples, de cima para baixo. Use as setas para mudar a ordem e o X para tirar. Você pode ter até {MAX_ATALHOS}.</p>
          <ol className="space-y-2" data-testid="jeito-escolhidos">
            {escolhidos.map((a, i) => (
              <li key={a.href} className="flex items-center gap-2 border border-navy/10 px-3 min-h-[48px]">
                <a.icon size={18} className="text-grafite-claro flex-shrink-0" aria-hidden />
                <span className="flex-1 min-w-0"><span className="text-navy">{a.label}</span> <span className="text-xs text-grafite-claro">· {a.bloco}</span></span>
                <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir ${a.label}`} title="Sobe esta tela uma posição no seu menu" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center border border-navy/15 disabled:opacity-30"><ArrowUp size={16} aria-hidden /></button>
                <button type="button" onClick={() => mover(i, 1)} disabled={i === escolhidos.length - 1} aria-label={`Descer ${a.label}`} title="Desce esta tela uma posição no seu menu" className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center border border-navy/15 disabled:opacity-30"><ArrowDown size={16} aria-hidden /></button>
                <button type="button" onClick={() => comAtalhos(lista => lista.filter(h => h !== a.href))} disabled={escolhidos.length <= 1} aria-label={`Tirar ${a.label} do meu menu`} title="Tira esta tela do seu menu simples. Ela continua existindo em “Ver todas as telas”." className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center border border-navy/15 disabled:opacity-30"><X size={16} aria-hidden /></button>
              </li>
            ))}
          </ol>
          <h3 className="text-sm uppercase tracking-wider text-grafite-claro mt-5 mb-2">Colocar outra tela no meu menu</h3>
          <div className="space-y-3" data-testid="jeito-catalogo">
            {grupos.map(g => {
              const fora = g.itens.filter(i => !hrefs.includes(i.href))
              if (!fora.length) return null
              return (
                <div key={g.id}>
                  <p className="text-sm text-navy font-medium">{g.titulo}{g.nivel !== 'todos' && <span className="text-xs text-grafite-claro font-normal"> · {ROTULO_NIVEL[g.nivel]}</span>}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {fora.map(i => (
                      <button key={i.href} type="button" disabled={hrefs.length >= MAX_ATALHOS} onClick={() => comAtalhos(lista => [...lista, i.href])} data-testid={`jeito-por-${i.href.slice(1)}`} title={`Coloca “${i.label}” no seu menu. ${DICAS[i.href] ?? ''}`} className="min-h-[40px] px-3 border border-navy/20 text-sm text-navy inline-flex items-center gap-1 hover:bg-navy/5 disabled:opacity-40">
                        <Plus size={14} aria-hidden />{i.label}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={caixa} role="group" aria-labelledby="j-abre">
          <h2 id="j-abre" className="font-serif text-xl text-navy">2. Onde a plataforma abre</h2>
          <p className="text-sm text-grafite mt-1 mb-3">A primeira tela que aparece quando você entra.</p>
          <select aria-label="Tela em que a plataforma abre" data-testid="jeito-tela" value={tela} onChange={e => salvarTela(e.target.value)} title="Escolha a primeira tela que abre quando você entra na plataforma" className="border border-navy/20 px-3 min-h-[44px] text-sm w-full max-w-md bg-white">
            <option value="">Padrão do meu cargo</option>
            {grupos.map(g => <optgroup key={g.id} label={g.titulo}>{g.itens.map(i => <option key={i.href} value={i.href}>{i.label}</option>)}</optgroup>)}
          </select>
        </div>

        <div className={caixa} role="group" aria-labelledby="j-materias">
          <h2 id="j-materias" className="font-serif text-xl text-navy">3. As matérias que eu uso</h2>
          <p className="text-sm text-grafite mt-1 mb-3">Marque as matérias do direito em que você trabalha. Elas passam a aparecer primeiro na tela de entrada, com o seu nome em cima. Até {MAX_MATERIAS}.</p>
          <div className="flex flex-wrap gap-2" data-testid="jeito-materias">
            {MATERIAS.map(m => {
              const marcada = materias.includes(m.valor)
              return (
                <button key={m.valor} type="button" aria-pressed={marcada} onClick={() => alternarMateria(m.valor)} data-testid={`jeito-materia-${m.valor}`} title={`${m.rotulo}: ${m.descricao}`} className={`min-h-[40px] px-3 text-sm border ${marcada ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy hover:bg-navy/5'}`}>
                  {marcada ? '✓ ' : ''}{m.rotulo}
                </button>
              )
            })}
          </div>
        </div>

        <div className={caixa} role="group" aria-labelledby="j-letra">
          <h2 id="j-letra" className="font-serif text-xl text-navy">4. Tamanho da letra</h2>
          <p className="text-sm text-grafite mt-1 mb-3">Vale para todas as telas.</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tamanho da letra">
            {LETRAS.map(l => {
              const atual = (jeito.letra ?? 'normal') === l.valor
              return <button key={l.valor} type="button" role="radio" aria-checked={atual} onClick={() => salvar(a => ({ ...a, letra: l.valor as Letra }))} data-testid={`jeito-letra-${l.valor}`} title={l.dica} className={`min-h-[44px] px-4 border ${atual ? 'bg-navy text-white border-navy' : 'border-navy/20 text-navy hover:bg-navy/5'}`}>{l.rotulo}</button>
            })}
          </div>
        </div>

        <button type="button" onClick={voltarAoPadrao} data-testid="jeito-padrao" title={`Desfaz as suas escolhas: o menu volta a ter ${ATALHOS_PADRAO.length} telas, a letra volta ao normal e a plataforma abre na tela do seu cargo`} className="min-h-[44px] px-4 border border-navy text-navy text-sm">Voltar tudo ao padrão</button>
      </div>
    </Layout>
  )
}
