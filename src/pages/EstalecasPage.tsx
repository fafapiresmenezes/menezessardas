import { useCallback, useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import {
  PERGUNTAS_EXEMPLO, PONTOS_INICIAIS, PONTOS_MAXIMO_POR_PALPITE, RECARGA_MENSAL,
  aberta, acertoDoGrupo, chancesDoGrupo, poteDaPergunta, saldoDePontos, validarPalpite, validarPergunta,
  type Palpite, type Pergunta,
} from '@/lib/pesquisasPreditivas'

/**
 * Jogo de moedas do olho da frente de Predição (pedido de M, 20/11/2026 00h26: "não é aposta, é estaleca").
 *
 * Nesta fase é uma pesquisa de opinião com cara de mercado de previsões, só com ESTALECAS (moeda de brincadeira):
 * sem depósito, sem saque, sem token negociável, sem carteira. As moedas do olho não valem dinheiro.
 * A parte com dinheiro foi parada por M; o mapa jurídico ficou guardado no plano.
 *
 * Antes do SQL 155 ser colado, a tela abre em demonstração com perguntas de exemplo e nada é gravado.
 */

type Aba = 'perguntas' | 'ranking' | 'dados' | 'regras'
const ABAS: { id: Aba; nome: string; dica: string }[] = [
  { id: 'perguntas', nome: 'Perguntas', dica: 'As perguntas abertas e a chance que o grupo vê em cada resposta' },
  { id: 'ranking', nome: 'Ranking', dica: 'Quem tem mais moedas do olho (só o primeiro nome)' },
  { id: 'dados', nome: 'Dados da pesquisa', dica: 'O quanto o grupo acertou nas perguntas já resolvidas' },
  { id: 'regras', nome: 'Regras', dica: 'Como o jogo funciona' },
]

type PainelLinha = { pergunta_id: number; opcao: number; pontos: number; pessoas: number }
type Ranking = { nome: string; saldo: number; palpites: number }

const fmtData = (s: string) => new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

export default function EstalecasPage() {
  const [aba, setAba] = useState<Aba>('perguntas')
  const [demo, setDemo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [perguntas, setPerguntas] = useState<Pergunta[]>([])
  const [todos, setTodos] = useState<Palpite[]>([])
  const [pessoas, setPessoas] = useState<Record<number, number>>({})
  const [meus, setMeus] = useState<Palpite[]>([])
  const [saldoBanco, setSaldoBanco] = useState<number | null>(null)
  const [ranking, setRanking] = useState<Ranking[]>([])
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>({})

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const q = await supabase.from('previsoes_perguntas')
        .select('id,titulo,detalhe,categoria,opcoes,criterio,fecha_em,resultado,resolvida_em')
        .order('fecha_em', { ascending: true }).limit(200)
      if (q.error) throw q.error
      const [painel, mine, saldo, rank] = await Promise.all([
        supabase.rpc('previsoes_painel'),
        supabase.from('previsoes_palpites').select('pergunta_id,opcao,pontos'),
        supabase.rpc('previsoes_meu_saldo'),
        supabase.rpc('previsoes_ranking'),
      ])
      const linhas = (painel.data ?? []) as PainelLinha[]
      // O painel traz somas por resposta; viram "palpites agregados" para as mesmas contas da tela.
      setTodos(linhas.map(l => ({ pergunta_id: Number(l.pergunta_id), opcao: Number(l.opcao), pontos: Number(l.pontos) })))
      const pp: Record<number, number> = {}
      for (const l of linhas) pp[Number(l.pergunta_id)] = (pp[Number(l.pergunta_id)] ?? 0) + Number(l.pessoas)
      setPessoas(pp)
      setPerguntas((q.data ?? []) as Pergunta[])
      setMeus(((mine.data ?? []) as Palpite[]).map(m => ({ ...m, pergunta_id: Number(m.pergunta_id) })))
      setSaldoBanco(typeof saldo.data === 'number' ? saldo.data : null)
      setRanking(((rank.data ?? []) as Ranking[]).map(r => ({ ...r, palpites: Number(r.palpites) })))
      setDemo(false)
    } catch {
      // Tabela ainda não existe (SQL 155 não colado) ou sem conexão: demonstração, nada gravado.
      setDemo(true)
      setPerguntas(PERGUNTAS_EXEMPLO)
    } finally {
      setCarregando(false)
    }
  }, [])
  useEffect(() => { void carregar() }, [carregar])

  const saldo = saldoBanco ?? saldoDePontos(perguntas, todos, meus)
  const abertas = perguntas.filter(p => aberta(p))
  const fechadas = perguntas.filter(p => !aberta(p))

  const palpitar = async (p: Pergunta, opcao: number, pontos: number) => {
    setMsg({})
    const erro = validarPalpite(p, opcao, pontos, saldo)
    if (erro) { setMsg({ erro }); return }
    if (demo) {
      // Em demonstração o palpite vale só nesta tela, até recarregar a página.
      const novo = { pergunta_id: p.id, opcao, pontos }
      setMeus(m => [...m, novo]); setTodos(t => [...t, novo])
      setMsg({ ok: `Palpite de demonstração: ${pontos} moedas do olho em "${p.opcoes[opcao]}". Nada foi gravado.` })
      return
    }
    const r = await supabase.rpc('previsoes_palpitar', { p_pergunta: p.id, p_opcao: opcao, p_pontos: pontos })
    if (r.error) { setMsg({ erro: r.error.message || 'Não deu para gravar agora. Tente de novo.' }); return }
    setMsg({ ok: `Palpite gravado: ${pontos} moedas do olho em "${p.opcoes[opcao]}".` })
    await carregar()
  }

  return (
    <Layout title="Jogo da Moeda do Olho">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3" data-testid="ptp-abertura">
          <h2 className="font-serif text-xl">Previsões de brincadeira, com a Moeda do Olho</h2>
          <p className="text-sm text-grafite">
            Aqui os membros do Instituto dizem o que acham que vai acontecer, usando a <strong>Moeda do Olho</strong>, um crédito interno só para jogar.
            A soma das moedas do olho mostra a chance que o grupo vê em cada resposta. Quando a pergunta se resolve pela fonte
            pública combinada, quem acertou recebe as moedas do olho da rodada. As respostas viram dado para o estudo de calibragem da frente de Predição. Não é aposta.
          </p>
          <p className="text-sm bg-grafite/5 border border-grafite-claro p-3" data-testid="ptp-sem-dinheiro">
            As moedas do olho <strong>não valem dinheiro</strong>: não se compram, não se vendem, não se trocam e não saem da
            plataforma. Não há depósito, saque, token nem carteira. Cada pessoa começa com {PONTOS_INICIAIS} moedas do olho e ganha mais {RECARGA_MENSAL.toLocaleString('pt-BR')} de graça todo dia 1 do mês, para ninguém jogar sem limite.
          </p>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <span data-testid="ptp-saldo">Suas moedas do olho: <strong>{saldo.toLocaleString('pt-BR')}</strong></span>
            <span>{abertas.length} pergunta(s) aberta(s)</span>
          </div>
          {demo && !carregando && (
            <p className="text-sm border border-dourado p-3" data-testid="ptp-demo">
              Modo de demonstração: as perguntas abaixo são exemplos e nada é gravado. Para gravar de verdade, falta
              colar no Supabase o arquivo COLE-ISTO-155.
            </p>
          )}
        </section>

        <nav className="flex flex-wrap gap-2" aria-label="Partes do quadrado">
          {ABAS.map(a => (
            <button
              key={a.id}
              type="button"
              title={a.dica}
              onClick={() => setAba(a.id)}
              className={`min-h-[44px] px-4 text-sm ${aba === a.id ? 'bg-grafite text-white' : 'bg-white border border-grafite-claro'}`}
              data-testid={`ptp-aba-${a.id}`}
            >
              {a.nome}
            </button>
          ))}
        </nav>

        {msg.ok && <p className="text-sm text-green-700" role="status">{msg.ok}</p>}
        {msg.erro && <p className="text-sm text-red-700" role="alert">{msg.erro}</p>}

        {carregando && <p className="text-sm text-grafite-claro">Carregando…</p>}

        {!carregando && aba === 'perguntas' && (
          <>
            <ul className="grid gap-4 md:grid-cols-2" data-testid="ptp-abertas">
              {abertas.map(p => (
                <CartaoPergunta key={p.id} p={p} pote={poteDaPergunta(p, todos)} pessoas={pessoas[p.id] ?? 0}
                  meus={meus.filter(m => m.pergunta_id === p.id)} onPalpitar={palpitar} />
              ))}
              {abertas.length === 0 && <li className="text-sm text-grafite">Nenhuma pergunta aberta agora.</li>}
            </ul>
            {fechadas.length > 0 && (
              <section className="bg-white shadow-sm p-6" data-testid="ptp-fechadas">
                <h2 className="font-serif text-xl mb-3">Perguntas fechadas</h2>
                <ul className="divide-y divide-grafite-claro">
                  {fechadas.map(p => (
                    <LinhaFechada key={p.id} p={p} pote={poteDaPergunta(p, todos)} demo={demo} onResolvida={carregar} setMsg={setMsg} />
                  ))}
                </ul>
              </section>
            )}
            <NovaPergunta demo={demo} onCriada={carregar} setMsg={setMsg} />
          </>
        )}

        {!carregando && aba === 'ranking' && (
          <section className="bg-white shadow-sm p-6" data-testid="ptp-ranking">
            <h2 className="font-serif text-xl mb-3">Ranking da Moeda do Olho</h2>
            {ranking.length === 0 ? (
              <p className="text-sm text-grafite">Ainda não há palpites gravados.</p>
            ) : (
              <ol className="divide-y divide-grafite-claro">
                {ranking.map((r, i) => (
                  <li key={`${r.nome}-${i}`} className="py-2 flex justify-between text-sm">
                    <span>{i + 1}. {r.nome}</span>
                    <span>{r.saldo.toLocaleString('pt-BR')} moedas do olho · {r.palpites} palpite(s)</span>
                  </li>
                ))}
              </ol>
            )}
            <p className="text-xs text-grafite mt-3">Só aparece o primeiro nome. Ninguém vê o palpite de outra pessoa.</p>
          </section>
        )}

        {!carregando && aba === 'dados' && <DadosDaPesquisa perguntas={perguntas} todos={todos} />}

        {aba === 'regras' && <RegrasELei />}
      </div>
    </Layout>
  )
}

function CartaoPergunta({ p, pote, pessoas, meus, onPalpitar }: {
  p: Pergunta; pote: number[]; pessoas: number; meus: Palpite[]
  onPalpitar: (p: Pergunta, opcao: number, pontos: number) => Promise<void>
}) {
  const [opcao, setOpcao] = useState<number | null>(null)
  const [pontos, setPontos] = useState(10)
  const chances = chancesDoGrupo(pote)
  const total = pote.reduce((a, b) => a + b, 0)
  const meusPontos = meus.reduce((a, m) => a + m.pontos, 0)
  return (
    <li className="bg-white shadow-sm p-5 space-y-3" data-testid={`ptp-pergunta-${p.id}`}>
      <div className="flex items-center justify-between gap-2 text-xs text-grafite">
        <span className="border border-grafite-claro px-2 py-0.5">{p.categoria}</span>
        <span>Fecha em {fmtData(p.fecha_em)}</span>
      </div>
      <p className="font-medium">{p.titulo}</p>
      <ul className="space-y-2">
        {p.opcoes.map((o, i) => (
          <li key={o}>
            <button
              type="button"
              onClick={() => setOpcao(i)}
              title={`Escolher "${o}"`}
              className={`w-full min-h-[44px] text-left px-3 text-sm border relative overflow-hidden ${opcao === i ? 'border-grafite bg-grafite/5' : 'border-grafite-claro'}`}
            >
              <span className="absolute inset-y-0 left-0 bg-dourado/20" style={{ width: `${chances[i]}%` }} aria-hidden />
              <span className="relative flex justify-between">
                <span>{o}</span>
                <span>{total === 0 ? '—' : `${chances[i]}%`}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="text-xs text-grafite">
        {total === 0 ? 'Ainda sem palpites: o grupo não tem opinião nesta pergunta.' : `Chance que o grupo vê, com ${pessoas} pessoa(s) e ${total} moedas do olho. É opinião do grupo, não previsão do Instituto.`}
        {meusPontos > 0 && ` Você já colocou ${meusPontos} moedas do olho aqui.`}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm">
          Moedas{' '}
          <input
            type="number" min={1} max={PONTOS_MAXIMO_POR_PALPITE} value={pontos}
            onChange={e => setPontos(Math.trunc(Number(e.target.value)))}
            className="w-24 border border-grafite-claro px-2 min-h-[44px]"
            aria-label={`Moedas do olho para a pergunta ${p.titulo}`}
          />
        </label>
        <button
          type="button"
          disabled={opcao === null}
          onClick={() => opcao !== null && void onPalpitar(p, opcao, pontos)}
          title="Grava o seu palpite com as moedas do olho escolhidas"
          className="min-h-[44px] px-5 bg-grafite text-white text-sm disabled:opacity-40"
        >
          Palpitar
        </button>
      </div>
      <details className="text-xs text-grafite">
        <summary className="cursor-pointer">Como esta pergunta se resolve</summary>
        <p className="mt-1">{p.criterio}</p>
        {p.detalhe && <p className="mt-1">{p.detalhe}</p>}
      </details>
    </li>
  )
}

function LinhaFechada({ p, pote, demo, onResolvida, setMsg }: {
  p: Pergunta; pote: number[]; demo: boolean; onResolvida: () => Promise<void>; setMsg: (m: { ok?: string; erro?: string }) => void
}) {
  const [escolha, setEscolha] = useState('')
  const chances = chancesDoGrupo(pote)
  const resolver = async () => {
    if (demo || escolha === '') return
    const r = await supabase.rpc('previsoes_resolver', { p_pergunta: p.id, p_resultado: Number(escolha) })
    if (r.error) { setMsg({ erro: r.error.message }); return }
    setMsg({ ok: 'Pergunta resolvida. As moedas do olho já foram distribuídas.' })
    await onResolvida()
  }
  return (
    <li className="py-3 text-sm space-y-1">
      <p className="font-medium">{p.titulo}</p>
      <p className="text-grafite">
        {p.opcoes.map((o, i) => `${o}: ${chances[i]}%`).join(' · ')}
        {p.resultado === -1 && ' · Anulada (moedas do olho devolvidas)'}
        {p.resultado !== null && p.resultado >= 0 && ` · Aconteceu: ${p.opcoes[p.resultado]}`}
        {p.resultado === null && ' · Esperando o resultado oficial'}
      </p>
      {p.resultado === null && !demo && (
        <div className="flex flex-wrap items-center gap-2">
          <select value={escolha} onChange={e => setEscolha(e.target.value)} className="border border-grafite-claro min-h-[44px] px-2" aria-label="O que aconteceu">
            <option value="">O que aconteceu?</option>
            {p.opcoes.map((o, i) => <option key={o} value={i}>{o}</option>)}
            <option value="-1">Anular (devolve as moedas do olho)</option>
          </select>
          <button type="button" onClick={() => void resolver()} disabled={escolha === ''} className="min-h-[44px] px-4 border border-grafite text-sm disabled:opacity-40" title="Registra o resultado oficial e distribui as moedas do olho">
            Registrar resultado
          </button>
        </div>
      )}
    </li>
  )
}

function NovaPergunta({ demo, onCriada, setMsg }: { demo: boolean; onCriada: () => Promise<void>; setMsg: (m: { ok?: string; erro?: string }) => void }) {
  const [aberto, setAberto] = useState(false)
  const [n, setN] = useState({ titulo: '', categoria: 'Geral', criterio: '', detalhe: '', opcoes: 'Sim\nNão', fecha_em: '' })
  const criar = async () => {
    const opcoes = n.opcoes.split('\n').map(o => o.trim()).filter(Boolean)
    const fecha = n.fecha_em ? new Date(`${n.fecha_em}T23:59:00`).toISOString() : ''
    const erro = validarPergunta({ titulo: n.titulo, criterio: n.criterio, opcoes, fecha_em: fecha })
    if (erro) { setMsg({ erro }); return }
    if (demo) { setMsg({ erro: 'Em demonstração não dá para criar pergunta. Falta colar o COLE-ISTO-155.' }); return }
    const { data: u } = await supabase.auth.getUser()
    const r = await supabase.from('previsoes_perguntas').insert({
      titulo: n.titulo.trim(), categoria: n.categoria.trim() || 'Geral', criterio: n.criterio.trim(),
      detalhe: n.detalhe.trim(), opcoes, fecha_em: fecha, criado_por: u?.user?.id,
    })
    if (r.error) { setMsg({ erro: 'Não deu para criar a pergunta agora. Tente de novo.' }); return }
    setMsg({ ok: 'Pergunta criada.' })
    setN({ titulo: '', categoria: 'Geral', criterio: '', detalhe: '', opcoes: 'Sim\nNão', fecha_em: '' })
    setAberto(false)
    await onCriada()
  }
  if (!aberto) {
    return (
      <button type="button" onClick={() => setAberto(true)} className="min-h-[44px] px-5 border border-grafite text-sm" title="Abre o formulário para criar uma pergunta nova" data-testid="ptp-nova">
        Criar pergunta
      </button>
    )
  }
  const campo = 'w-full border border-grafite-claro px-2 py-2 text-sm'
  return (
    <section className="bg-white shadow-sm p-6 space-y-3" data-testid="ptp-form">
      <h2 className="font-serif text-xl">Nova pergunta</h2>
      <label className="block text-sm">Pergunta<input title="Escreva a pergunta inteira" className={campo} value={n.titulo} onChange={e => setN({ ...n, titulo: e.target.value })} /></label>
      <label className="block text-sm">Tema<input title="Tema da pergunta, por exemplo Economia ou Águas" className={campo} value={n.categoria} onChange={e => setN({ ...n, categoria: e.target.value })} /></label>
      <label className="block text-sm">Como e por qual fonte pública vai ser resolvida<textarea title="Fonte pública que vai dizer o resultado" className={campo} rows={2} value={n.criterio} onChange={e => setN({ ...n, criterio: e.target.value })} /></label>
      <label className="block text-sm">Respostas possíveis (uma por linha)<textarea title="Uma resposta por linha" className={campo} rows={3} value={n.opcoes} onChange={e => setN({ ...n, opcoes: e.target.value })} /></label>
      <label className="block text-sm">Detalhe (opcional)<textarea title="Explicação extra, se precisar" className={campo} rows={2} value={n.detalhe} onChange={e => setN({ ...n, detalhe: e.target.value })} /></label>
      <label className="block text-sm">Fecha em<input type="date" title="Último dia para palpitar" className={campo} value={n.fecha_em} onChange={e => setN({ ...n, fecha_em: e.target.value })} /></label>
      <p className="text-xs text-grafite">Evite perguntas sobre a vida de uma pessoa, sobre eleições ou sobre jogos esportivos: o Instituto pesquisa temas públicos de economia, ciência, clima e das suas frentes.</p>
      <div className="flex gap-2">
        <button type="button" title="Grava a pergunta nova" onClick={() => void criar()} className="min-h-[44px] px-5 bg-grafite text-white text-sm">Criar</button>
        <button type="button" title="Fecha o formulário sem gravar" onClick={() => setAberto(false)} className="min-h-[44px] px-5 border border-grafite-claro text-sm">Cancelar</button>
      </div>
    </section>
  )
}

function DadosDaPesquisa({ perguntas, todos }: { perguntas: Pergunta[]; todos: Palpite[] }) {
  const a = useMemo(() => acertoDoGrupo(perguntas, todos), [perguntas, todos])
  return (
    <section className="bg-white shadow-sm p-6 space-y-3" data-testid="ptp-dados">
      <h2 className="font-serif text-xl">O quanto o grupo acerta</h2>
      <p className="text-sm text-grafite">
        Para cada pergunta resolvida, comparamos a chance que o grupo dava com o que aconteceu (índice de Brier:
        0 é acerto perfeito; 0,25 é o mesmo que chutar meio a meio numa pergunta de Sim ou Não).
      </p>
      {a.brier === null ? (
        <p className="text-sm" data-testid="ptp-dados-pouco">
          Ainda há {a.n} pergunta(s) resolvida(s) com palpites. O número só aparece a partir de 5, para não confundir sorte com acerto.
        </p>
      ) : (
        <p className="text-sm" data-testid="ptp-dados-brier">
          Índice de Brier do grupo: <strong>{a.brier.toFixed(3).replace('.', ',')}</strong> em {a.n} perguntas. É uma medida do passado, não uma promessa de acerto futuro.
        </p>
      )}
    </section>
  )
}

function RegrasELei() {
  return (
    <section className="bg-white shadow-sm p-6 space-y-4 text-sm" data-testid="ptp-regras">
      <h2 className="font-serif text-xl">Como funciona</h2>
      <ul className="list-disc pl-5 space-y-1 text-grafite">
        <li>Cada membro do Instituto começa com {PONTOS_INICIAIS} moedas do olho e recebe mais {RECARGA_MENSAL.toLocaleString('pt-BR')} grátis todo dia 1 do mês. É o limite do jogo: quando acabam, é esperar a recarga ou acertar mais.</li>
        <li>Num palpite você escolhe uma resposta e coloca de 1 a {PONTOS_MAXIMO_POR_PALPITE} moedas do olho.</li>
        <li>Quando a pergunta se resolve, as moedas do olho de todos daquela pergunta são divididas entre quem acertou, na proporção do que cada um colocou. Pergunta anulada devolve as moedas do olho.</li>
        <li>Toda pergunta diz antes qual fonte pública vai resolvê-la.</li>
        <li>A Moeda do Olho é só crédito de jogo, não é cripto: não se compra, não se vende, não se troca por nada e não sai daqui. Não é aposta.</li>
        <li>Só membros do Instituto entram. O escritório cliente não vê nada disto.</li>
      </ul>
      <h2 className="font-serif text-xl">Para que serve</h2>
      <p className="text-grafite">
        O jogo junta a opinião do grupo e mede, pergunta por pergunta, o quanto ela acerta. Isso faz parte do estudo
        de calibragem da frente de Predição: entender quando uma chance dita, por pessoas ou por mercados, bate com o que
        acontece, antes de o Instituto mostrar qualquer previsão.
      </p>
    </section>
  )
}
