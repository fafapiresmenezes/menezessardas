import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Marca from '@/components/Marca'
import { avanco, conferirCorrente, lerElos, GENESE, type Avanco, type Conferencia } from '@/lib/trilho'
import {
  carimbarPlano, montarOtsPlano, baixarArquivo, ultimaAncoraPlano, type AncoraPlano,
} from '@/lib/ancoraPlano'

/**
 * Passo T2, tarefa 3: a tela "Conferir o lastro", escrita para leigo.
 *
 * Por que ela existe: o registro do que foi feito na plataforma é uma corrente de hashes, e uma
 * corrente só vale alguma coisa se qualquer pessoa puder conferir. Esta tela baixa o arquivo do
 * trilho e recalcula TODOS os hashes aqui, no navegador de quem está lendo. Nada é conferido no
 * nosso servidor: se o número bate, bate na máquina de quem duvida.
 *
 * Carimbo público (C13/T2): o dono autorizou em 14/11/2026 mandar o código do topo para um
 * registro de tempo público (OpenTimestamps → Bitcoin). O botão "Carimbar agora" roda na sessão
 * de quem está na administração e baixa a prova (.ots). Só um hash sai; nenhum dado de pessoa.
 * A lógica mora em src/lib/ancoraPlano.ts; o envio em si usa os calendários públicos, com a
 * função de servidor ancorar-hash como reserva quando o navegador não os alcança.
 */
const ONDE = [
  // 1) Ao lado do pacote publicado: é assim que funciona no gh-pages e na conferência local.
  './trilho-v4.jsonl',
  // 2 e 3) Reservas, porque em theye.club só vão os arquivos de texto do site. Pelo RAMO, e não
  // pelo sha, para esta tela não precisar saber qual é a versão publicada. O jsDelivr guarda o
  // ramo por até 12 horas, então a reserva pode mostrar uma versão um pouco atrás da última volta;
  // o número de registros e o último código, logo acima, dizem qual versão esta tela leu.
  'https://cdn.jsdelivr.net/gh/fafapiresmenezes/menezessardas@gh-pages/trilho-v4.jsonl',
  'https://fafapiresmenezes.github.io/menezessardas/trilho-v4.jsonl',
]

/** 13/11/2026 19:04 → "13/11/2026, 19h04". */
function dataHoraBr(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const dois = (n: number) => String(n).padStart(2, '0')
  return `${dois(d.getUTCDate())}/${dois(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}, ${dois(d.getUTCHours())}h${dois(d.getUTCMinutes())}`
}

export default function LastroPage() {
  const [conf, setConf] = useState<Conferencia | null>(null)
  const [av, setAv] = useState<Avanco | null>(null)
  const [erro, setErro] = useState('')
  const [ancora, setAncora] = useState<AncoraPlano | null>(ultimaAncoraPlano())
  const [carimbando, setCarimbando] = useState(false)
  const [erroCarimbo, setErroCarimbo] = useState('')

  async function carimbar() {
    if (!conf) return
    setCarimbando(true); setErroCarimbo('')
    try {
      const a = await carimbarPlano(conf.elos.length, conf.ultimoHash)
      setAncora(a)
    } catch (e) {
      setErroCarimbo(e instanceof Error ? e.message : String(e))
    } finally {
      setCarimbando(false)
    }
  }

  useEffect(() => {
    (async () => {
      for (const onde of ONDE) {
        try {
          const r = await fetch(onde)
          if (!r.ok) continue
          const elos = lerElos(await r.text())
          setAv(avanco(elos))
          setConf(await conferirCorrente(elos))
          return
        } catch { /* tenta o próximo */ }
      }
      setErro('Não deu para baixar o arquivo do trilho agora. O arquivo fica em cdn.jsdelivr.net/gh/fafapiresmenezes/menezessardas@gh-pages/trilho-v4.jsonl, e os quatro passos abaixo valem para conferir na mão.')
    })()
  }, [])

  const naoReproduzidos = conf?.elos.filter(e => !e.reproduzido) ?? []

  return (
    <div className="min-h-screen bg-black text-white px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex justify-center mb-10"><Marca /></div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-300">Instituto THEYE</p>
        <h1 className="text-3xl font-serif text-white mt-2 mb-4">Conferir o lastro</h1>

        <p className="text-base text-white/80">
          Cada volta de trabalho nesta plataforma vira um registro, e cada registro carrega o código
          do registro anterior. Mexer num registro antigo quebraria todos os de depois dele. Esta
          página recalcula os códigos <strong>no seu navegador</strong>, não no nosso servidor: se o
          número bate, bate na sua máquina.
        </p>

        {erro && <p role="alert" className="mt-8 border border-white/30 p-4 text-sm">{erro}</p>}
        {!conf && !erro && <p className="mt-8 text-sm text-white/60">Baixando o registro e recalculando…</p>}

        {conf && av && (
          <>
            <div className="mt-8 border border-white/20 p-5" data-testid="resumo-lastro">
              <p className="text-sm text-white/60">Registros conferidos</p>
              <p className="text-3xl font-serif mt-1">{conf.elos.length}</p>
              <p className="mt-4 text-sm" data-testid="ligacao">
                <span title="Cada registro aponta para o código do registro anterior, do primeiro ao último.">
                  Ligação de ponta a ponta: <strong>{conf.ligacaoIntegra ? 'íntegra' : 'QUEBRADA'}</strong>
                </span>
              </p>
              <p className="mt-2 text-sm" data-testid="reproduzidos">
                <span title="Quantos códigos esta página conseguiu recalcular exatamente igual ao que está escrito no registro.">
                  Códigos recalculados aqui: <strong>{conf.reproduzidos} de {conf.elos.length}</strong>
                </span>
              </p>
            </div>

            {naoReproduzidos.length > 0 && (
              <div className="mt-5 border-l-2 border-white/40 pl-4" data-testid="ressalva-lastro">
                <p className="text-sm text-white/80">
                  <strong>{naoReproduzidos.length}</strong>{' '}
                  {naoReproduzidos.length === 1 ? 'registro não foi recalculado' : 'registros não foram recalculados'}:{' '}
                  {naoReproduzidos.map(e => e.passo).join(', ')}. Esses são antigos e foram escritos
                  com uma receita diferente, antes de 13/11/2026. A ligação deles continua certa —
                  apontam para o código do registro anterior — e é isso que impede trocar um registro
                  pelo outro. Fica dito aqui em vez de escondido numa conta redonda.
                </p>
              </div>
            )}

            <h2 className="text-lg font-serif text-white mt-10 mb-3">Até onde o plano andou</h2>
            <div className="border border-white/20 p-5" data-testid="painel-avanco">
              <p className="text-sm text-white/60">Passos do plano registrados na corrente</p>
              <p className="text-3xl font-serif mt-1">{av.passos.length}</p>
              <p className="mt-3 text-sm text-white/70">
                em <strong>{av.voltas}</strong> voltas de trabalho
                {av.ultimaVolta && <> · última em {dataHoraBr(av.ultimaVolta)}</>}
              </p>
              <p className="mt-4 text-xs text-white/50">
                Este painel conta o que a corrente registra, e nada além disso. A porcentagem do
                plano vive no arquivo do plano, não aqui: um número tirado de conta própria não dá
                para o leitor conferir, e é justamente isso que esta página existe para evitar.
              </p>
            </div>

            {av.comPendencia.length > 0 && (
              <div className="mt-5" data-testid="pendencias">
                <p className="text-sm text-white/80">
                  <strong>{av.comPendencia.length}</strong>{' '}
                  {av.comPendencia.length === 1 ? 'passo registrou pendência' : 'passos registraram pendência'},
                  nas palavras do próprio registro:
                </p>
                <ul className="mt-3 space-y-3 text-sm text-white/70">
                  {av.comPendencia.map(p => (
                    <li key={p.codigo} className="border-l-2 border-white/30 pl-4">
                      <span
                        className="text-white/90"
                        title={`Registro número ${p.n} da corrente, código ${p.hash.slice(0, 12)}…`}
                      >
                        {p.titulo ?? p.passo}
                      </span>
                      <span className="block mt-1">{p.pendente}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <h2 className="text-lg font-serif text-white mt-10 mb-3">Como conferir por fora, sem acreditar em nós</h2>
            <ol className="space-y-3 text-sm text-white/80 list-decimal pl-5">
              <li>Baixe o arquivo do registro: <a href={ONDE[1]} title="Baixa o arquivo com todos os registros, um por linha, direto do repositório publicado" className="underline decoration-white/40">trilho-v4.jsonl</a>. É texto; cada linha é um registro.</li>
              <li>De cada linha, tire o campo <code>hash</code>. Escreva o resto em ordem alfabética de campo, no formato do Python <code>json.dumps(…, ensure_ascii=False, sort_keys=True)</code>.</li>
              <li>Junte o campo <code>anterior</code> (o código do registro de cima) na frente desse texto e tire o SHA-256 do resultado.</li>
              <li>O número tem de ser igual ao <code>hash</code> daquela linha. O primeiro registro aponta para a gênese do plano: <code className="break-all">{GENESE}</code>.</li>
            </ol>
            <p className="text-sm text-white/60 mt-4">
              Último código da corrente: <code className="break-all" data-testid="ultimo-hash">{conf.ultimoHash}</code>
            </p>

            <h2 className="text-lg font-serif text-white mt-10 mb-3">Carimbar a data fora do Instituto</h2>
            <p className="text-sm text-white/70">
              Dá para provar, fora daqui, a data em que este topo já existia: mandamos só o código
              (um número, nenhum dado de pessoa) a um registro de tempo público do OpenTimestamps,
              que o grava numa transação do Bitcoin. Depois, qualquer pessoa confere em
              opentimestamps.org com o selo e o arquivo de prova, sem acreditar em nós.
            </p>

            <div className="mt-5 border border-white/20 p-5" data-testid="carimbo-plano">
              {ancora ? (
                <>
                  <p className="text-sm text-white/80">
                    Carimbado em <strong>{dataHoraBr(ancora.em)}</strong> · {ancora.registros} registros
                    <span className="block text-white/50 mt-1">calendário: {ancora.calendario}</span>
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => baixarArquivo('selo-plano.txt', ancora.selo, 'text/plain')}
                      title="Baixa o selo: o textinho cujo código (SHA-256) foi carimbado"
                      className="min-h-[44px] px-4 py-2 border border-white/40 text-sm text-white hover:bg-white hover:text-black transition"
                    >
                      Baixar o selo
                    </button>
                    <button
                      type="button"
                      onClick={() => baixarArquivo('selo-plano.txt.ots', montarOtsPlano(ancora) as BlobPart)}
                      title="Baixa o arquivo de prova (.ots), para conferir em opentimestamps.org junto com o selo"
                      className="min-h-[44px] px-4 py-2 border border-white/40 text-sm text-white hover:bg-white hover:text-black transition"
                    >
                      Baixar a prova (.ots)
                    </button>
                  </div>
                  <p className="mt-4 text-xs text-white/50">
                    A confirmação no Bitcoin leva algumas horas; depois disso a prova fica completa.
                    Carimbar de novo, quando a corrente crescer, prova a data do novo topo.
                  </p>
                  <button
                    type="button"
                    onClick={carimbar}
                    disabled={carimbando}
                    title="Carimba o topo de agora e baixa uma prova nova"
                    className="mt-4 text-sm text-white/60 underline decoration-white/30 hover:text-white disabled:opacity-50"
                  >
                    {carimbando ? 'Carimbando…' : 'Carimbar de novo o topo de agora'}
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm text-white/80">
                    Autorizado pelo dono. Aperte para carimbar o topo de agora; a prova (.ots) baixa
                    para você guardar.
                  </p>
                  <button
                    type="button"
                    onClick={carimbar}
                    disabled={carimbando}
                    data-testid="botao-carimbar"
                    title="Manda o código do topo a um registro de tempo público e baixa a prova"
                    className="mt-4 min-h-[48px] px-6 py-3 border border-white bg-white text-black text-sm uppercase tracking-[0.12em] hover:bg-transparent hover:text-white transition disabled:opacity-50"
                  >
                    {carimbando ? 'Carimbando…' : 'Carimbar agora'}
                  </button>
                </>
              )}
              {erroCarimbo && <p role="alert" className="mt-4 text-sm text-white/80 border-l-2 border-white/40 pl-3">{erroCarimbo}</p>}
            </div>

            <details className="mt-10 border-t border-white/10 pt-5">
              <summary className="text-sm text-white/60 cursor-pointer" title="Abre a lista com cada registro, na ordem, e o resultado da conferência">Ver registro por registro</summary>
              <ul className="mt-4 space-y-1 text-xs" data-testid="lista-elos">
                {conf.elos.map(e => (
                  <li key={e.n} className="flex gap-3">
                    <span className="text-neutral-400 w-8 shrink-0 text-right">{e.n}</span>
                    <span className="flex-1">{e.passo}</span>
                    <span className={e.ligado ? 'text-white/50' : 'text-white'} title={e.ligado ? 'Aponta para o código do registro anterior' : 'NÃO aponta para o código do registro anterior'}>{e.ligado ? 'ligado' : 'solto'}</span>
                    <span className={e.reproduzido ? 'text-white/50' : 'text-white/80'} title={e.reproduzido ? 'Código recalculado igual ao escrito' : 'Receita antiga: não foi recalculado'}>{e.reproduzido ? 'recalculado' : 'receita antiga'}</span>
                  </li>
                ))}
              </ul>
            </details>

            <p className="mt-10 pt-6 border-t border-white/10 text-sm">
              <Link to="/portais" title="Lista de todas as portas do Instituto, com o estado de cada uma" className="text-white/60 hover:text-white underline decoration-white/20">Portas do Instituto</Link>
            </p>
          </>
        )}
      </div>
    </div>
  )
}
