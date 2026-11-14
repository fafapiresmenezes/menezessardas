import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, X, Search, ThumbsUp, ThumbsDown } from 'lucide-react'
import { procurar, registrarPergunta, lerAprendizado, maisPerguntadas, exemplosDePergunta, type Resposta, type Aprendido } from '@/lib/ajudante'

// Ajudante "como faço" (pedido de M, 13/11/2026). Botão flutuante em todas as telas.
// A resposta sai do que a plataforma já diz de si mesma; quando não acha, diz que não achou.
// O "resolveu / não resolveu" não é enfeite: é o que monta a fila do que falta explicar.

export default function Ajudante() {
  const [aberto, setAberto] = useState(false)
  const [pergunta, setPergunta] = useState('')
  const [perguntada, setPerguntada] = useState('')
  const [respostas, setRespostas] = useState<Resposta[] | null>(null)
  const [avaliada, setAvaliada] = useState(false)
  const [aprendido, setAprendido] = useState<Aprendido[]>([])
  const navigate = useNavigate()
  const exemplos = useMemo(() => exemplosDePergunta().slice(0, 3), [])

  useEffect(() => { if (aberto) lerAprendizado().then(setAprendido).catch(() => undefined) }, [aberto])

  const perguntar = (texto: string) => {
    const achadas = procurar(texto)
    setPergunta(texto)
    setPerguntada(texto)
    setRespostas(achadas)
    setAvaliada(false)
    registrarPergunta(texto, achadas.length > 0).then(setAprendido).catch(() => undefined)
  }

  const avaliar = (resolveu: boolean) => {
    setAvaliada(true)
    registrarPergunta(perguntada, (respostas?.length ?? 0) > 0, resolveu).then(setAprendido).catch(() => undefined)
  }

  const ir = (rota?: string) => { if (!rota) return; setAberto(false); navigate(rota) }

  if (!aberto) return (
    <button type="button" onClick={() => setAberto(true)} data-testid="abrir-ajudante"
      title="Abre o ajudante: pergunte com suas palavras como se faz alguma coisa na plataforma"
      className="fixed bottom-5 right-5 z-40 min-h-[44px] px-4 bg-navy text-white text-sm shadow-lg inline-flex items-center gap-2 print:hidden">
      <HelpCircle size={18} aria-hidden="true" /> Como faço?
    </button>
  )

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="ajudante-titulo" data-testid="ajudante"
      className="fixed bottom-0 right-0 sm:bottom-5 sm:right-5 z-40 w-full sm:w-[28rem] max-h-[85vh] overflow-y-auto bg-white shadow-2xl border-t-2 border-dourado print:hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id="ajudante-titulo" className="font-serif text-xl">Como faço?</h2>
          <button type="button" onClick={() => setAberto(false)} data-testid="fechar-ajudante"
            title="Fecha o ajudante e volta para a tela" className="min-h-[44px] px-2 text-grafite">
            <X size={20} aria-hidden="true" /><span className="sr-only">Fechar</span>
          </button>
        </div>

        <form onSubmit={e => { e.preventDefault(); perguntar(pergunta) }} className="flex gap-2">
          <input value={pergunta} onChange={e => setPergunta(e.target.value)} data-testid="pergunta-ajudante"
            aria-label="Escreva a sua pergunta" placeholder="ex.: como lanço as horas trabalhadas?"
            className="border w-full px-3 py-2 min-h-[44px] text-sm" />
          <button type="submit" data-testid="perguntar" title="Procura a resposta no que a plataforma já explica sobre cada tela"
            className="min-h-[44px] px-4 bg-navy text-white inline-flex items-center gap-2 text-sm">
            <Search size={16} aria-hidden="true" />Procurar
          </button>
        </form>

        {respostas === null && (
          <div className="text-sm text-grafite-claro space-y-2">
            <p>Escreva com as suas palavras. A resposta sai do que a plataforma já explica sobre cada tela, então nada aqui é inventado.</p>
            <ul className="space-y-1">
              {exemplos.map(e => (
                <li key={e}><button type="button" onClick={() => perguntar(e)} title={`Pergunta: ${e}`} className="underline text-navy text-left min-h-[44px]">{e}</button></li>
              ))}
            </ul>
          </div>
        )}

        {respostas !== null && respostas.length === 0 && (
          <div className="text-sm space-y-2" data-testid="ajudante-sem-resposta">
            <p className="font-medium">Não achei isso no que a plataforma explica hoje.</p>
            <p className="text-grafite-claro">Guardei a sua pergunta: ela entra na lista do que falta explicar, que a administração do escritório vê. Enquanto isso, o Assistente jurídico responde pergunta de direito.</p>
            <button type="button" onClick={() => ir('/assistente')} title="Abre o Assistente jurídico, que responde pergunta de direito e redige peças" className="underline text-navy min-h-[44px]">Abrir o Assistente jurídico</button>
          </div>
        )}

        {respostas !== null && respostas.length > 0 && (
          <div className="space-y-3" data-testid="ajudante-respostas">
            {respostas.map(r => (
              <div key={`${r.origem}-${r.titulo}`} className="border-l-2 border-dourado pl-3">
                <p className="font-medium text-sm">{r.titulo}</p>
                <p className="text-sm text-grafite-claro">{r.texto}</p>
                {r.rota && (
                  <button type="button" onClick={() => ir(r.rota)} title={`Abre a tela ${r.titulo} para fazer isso agora`} className="underline text-navy text-sm min-h-[44px]">Abrir esta tela</button>
                )}
              </div>
            ))}
            {!avaliada ? (
              <div className="flex items-center gap-3 text-sm pt-1">
                <span className="text-grafite-claro">Isto resolveu?</span>
                <button type="button" onClick={() => avaliar(true)} data-testid="resolveu" title="Diz que a resposta resolveu; ajuda a plataforma a saber o que explica bem" className="min-h-[44px] px-3 border inline-flex items-center gap-1"><ThumbsUp size={14} aria-hidden="true" />Sim</button>
                <button type="button" onClick={() => avaliar(false)} data-testid="nao-resolveu" title="Diz que a resposta não resolveu; a pergunta entra na fila do que falta explicar" className="min-h-[44px] px-3 border inline-flex items-center gap-1"><ThumbsDown size={14} aria-hidden="true" />Não</button>
              </div>
            ) : <p className="text-sm text-grafite-claro" data-testid="ajudante-obrigado">Anotado. Isso melhora o ajudante para a equipe inteira.</p>}
          </div>
        )}

        {maisPerguntadas(aprendido).length > 0 && (
          <div className="pt-2 border-t" data-testid="mais-perguntadas">
            <p className="text-xs uppercase tracking-wider text-grafite-claro">O que a equipe mais pergunta</p>
            <ul className="mt-2 space-y-1">
              {maisPerguntadas(aprendido).map(a => (
                <li key={a.pergunta}>
                  <button type="button" onClick={() => perguntar(a.pergunta)} title={`Faz de novo a pergunta: ${a.pergunta}`} className="underline text-navy text-sm text-left min-h-[44px]">{a.pergunta}</button>
                  <span className="text-xs text-grafite-claro"> · {a.vezes}×</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
