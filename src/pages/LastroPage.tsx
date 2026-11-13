import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Marca from '@/components/Marca'
import { avanco, conferirCorrente, lerElos, GENESE, type Avanco, type Conferencia } from '@/lib/trilho'

/**
 * Passo T2, tarefa 3: a tela "Conferir o lastro", escrita para leigo.
 *
 * Por que ela existe: o registro do que foi feito na plataforma é uma corrente de hashes, e uma
 * corrente só vale alguma coisa se qualquer pessoa puder conferir. Esta tela baixa o arquivo do
 * trilho e recalcula TODOS os hashes aqui, no navegador de quem está lendo. Nada é conferido no
 * nosso servidor: se o número bate, bate na máquina de quem duvida.
 *
 * O que esta tela ainda NÃO faz, e está dito nela mesma: gravar o hash final numa blockchain
 * pública (Bitcoin, por OpenTimestamps). Isso manda um dado para fora do projeto, e mandar coisa
 * para fora depende do sim do dono. O caminho já existe na plataforma (a função ancorar-hash); o
 * que falta é a autorização, não o programa.
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
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-300">Instituto DI</p>
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

            <h2 className="text-lg font-serif text-white mt-10 mb-3">O que ainda falta</h2>
            <p className="text-sm text-white/70">
              Falta gravar esse último código numa blockchain pública, para a data ficar provada por
              fora da nossa casa. O programa para isso já existe aqui; o que falta é a autorização do
              dono, porque mandar qualquer coisa para fora do projeto depende do sim dele. Enquanto
              não houver, esta página não finge que há.
            </p>

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
