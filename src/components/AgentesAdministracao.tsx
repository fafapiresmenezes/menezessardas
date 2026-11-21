import { useMemo, useState } from 'react'
import { AGENTES_ADMINISTRACAO, AREAS_ADMINISTRACAO, type AgenteAdministracao } from '@/data/agentesAdministracao'

/**
 * Fase F3 do plano v2: os 20 agentes da área administrativa em cartão clicável.
 *
 * Cada cartão abre a ficha inteira: o que o agente sabe, que fontes ele consulta, as três
 * perguntas-tipo que ele resolve e o que ele NÃO faz. Esse último campo é o que impede o
 * agente de extrapolar, e por isso aparece na tela, não só no arquivo.
 *
 * Nenhum agente decide nem assina: quem decide é sempre uma pessoa.
 *
 * Fica num componente solto, e não dentro da página, de propósito: a página /gestao-instituto
 * vai ser reescrita no passo F1-03 pela frente da plataforma jurídica. Assim aquela reescrita
 * monta este componente em vez de apagar este trabalho.
 */

function Lista({ titulo, itens }: { titulo: string; itens: string[] }) {
  if (!itens.length) return null
  return (
    <div className="mt-4">
      <h4 className="text-xs uppercase tracking-wider text-grafite-claro">{titulo}</h4>
      <ul className="mt-1 list-disc pl-5 text-sm text-navy/90">
        {itens.map(i => <li key={i}>{i}</li>)}
      </ul>
    </div>
  )
}

function Ficha({ a, fechar }: { a: AgenteAdministracao; fechar: () => void }) {
  return (
    <div className="border border-dourado/40 bg-white p-6 shadow-sm" data-testid="ficha-agente">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-grafite-claro">{a.area}</p>
          <h3 className="font-serif text-2xl text-navy">{a.nome}</h3>
          <p className="mt-2 max-w-2xl text-sm text-navy/90">{a.descricao}</p>
        </div>
        <button
          type="button"
          onClick={fechar}
          className="shrink-0 border border-navy/20 px-3 py-1 text-sm text-navy hover:border-dourado"
        >
          Fechar
        </button>
      </div>

      <Lista titulo="Três perguntas que ele resolve" itens={a.perguntas_tipo} />
      <Lista titulo="O que ele NÃO faz" itens={a.o_que_nao_faz} />
      <Lista titulo="Bancos de dados que consulta" itens={a.bancos_de_dados} />
      <Lista titulo="Fontes de leitura" itens={a.fontes_de_leitura} />
      <Lista titulo="Ferramentas grátis" itens={a.ferramentas_gratis} />

      <details className="mt-5 border-t border-navy/10 pt-4">
        <summary className="cursor-pointer text-sm text-navy">Ver por dentro: o roteiro do agente</summary>
        <p className="mt-2 text-xs text-grafite-claro">
          É com este texto que a conversa com o agente começa. Passo {a.passo_da_corrente} da
          corrente do plano.
        </p>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap bg-navy/5 p-3 text-xs text-navy">
          {a.prompt_base}
        </pre>
      </details>
    </div>
  )
}

export default function AgentesAdministracao() {
  const [area, setArea] = useState('')
  const [busca, setBusca] = useState('')
  const [aberto, setAberto] = useState<string | null>(null)

  const visiveis = useMemo(() => {
    const t = busca.trim().toLowerCase()
    return AGENTES_ADMINISTRACAO.filter(a =>
      (!area || a.area === area) &&
      (!t || `${a.nome} ${a.area} ${a.descricao}`.toLowerCase().includes(t)))
  }, [area, busca])

  const agenteAberto = AGENTES_ADMINISTRACAO.find(a => a.id === aberto) ?? null

  return (
    <section className="space-y-5" data-testid="agentes-administracao">
      <div>
        <h2 className="font-serif text-xl text-navy">Agentes da administração</h2>
        <p className="mt-1 max-w-3xl text-sm text-grafite-claro">
          {AGENTES_ADMINISTRACAO.length} agentes, um por especialidade. Clique num cartão para ver
          a ficha: o que ele sabe, de onde ele tira o que diz, três perguntas que ele resolve e o
          que ele não faz. Nenhum agente decide nem assina — quem decide é sempre uma pessoa.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm text-grafite-claro">
          Procurar
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="nome ou assunto"
            className="ml-2 border border-navy/20 px-2 py-1 text-sm text-navy"
          />
        </label>
        <label className="text-sm text-grafite-claro">
          Área
          <select
            value={area}
            onChange={e => setArea(e.target.value)}
            className="ml-2 border border-navy/20 px-2 py-1 text-sm text-navy"
          >
            <option value="">todas</option>
            {AREAS_ADMINISTRACAO.map(x => <option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <p className="text-sm text-grafite-claro" data-testid="contagem-agentes">
          {visiveis.length} de {AGENTES_ADMINISTRACAO.length}
        </p>
      </div>

      {agenteAberto && <Ficha a={agenteAberto} fechar={() => setAberto(null)} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visiveis.map(a => (
          <button
            key={a.id}
            type="button"
            onClick={() => setAberto(a.id === aberto ? null : a.id)}
            aria-expanded={a.id === aberto}
            title={`Abre a ficha de ${a.nome}`}
            className={`border p-4 text-left transition ${
              a.id === aberto
                ? 'border-dourado bg-dourado/5'
                : 'border-navy/10 bg-white hover:border-dourado hover:bg-dourado/5'
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-grafite-claro">{a.area}</p>
            <p className="mt-1 font-medium text-navy">{a.nome}</p>
            <p className="mt-1 line-clamp-3 text-sm text-grafite-claro">{a.descricao}</p>
          </button>
        ))}
      </div>

      {!visiveis.length && (
        <p className="text-sm text-grafite-claro">Nenhum agente com esse filtro.</p>
      )}
    </section>
  )
}
