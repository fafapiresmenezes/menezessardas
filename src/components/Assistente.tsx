import type { ReactNode } from 'react'
import type { Opcao } from '@/lib/dominio'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'

interface PassoProps {
  numero: number
  total: number
  titulo: string
  ajuda?: string
  children: ReactNode
  podeAvancar: boolean
  ultimo?: boolean
  onVoltar?: () => void
  onAvancar: () => void
  rotuloAvancar?: string
}

/** Moldura de cada passo: uma pergunta por tela, progresso visível, botões grandes. */
export function Passo({ numero, total, titulo, ajuda, children, podeAvancar, ultimo, onVoltar, onAvancar, rotuloAvancar }: PassoProps) {
  return (
    <section className="bg-gradient-to-br from-white to-pergaminho border-t-2 border-dourado shadow-lg p-6 md:p-8 max-w-3xl animate-slide-up" aria-labelledby="titulo-passo">
      <p className="text-xs uppercase tracking-wider text-grafite-claro">
        Passo {numero} de {total}
      </p>
      <div className="flex gap-1 mt-2 mb-6" aria-hidden="true">
        {Array.from({ length: total }).map((_, i) => (
          <span key={i} className={`h-1 flex-1 ${i < numero ? 'bg-dourado' : 'bg-navy/10'}`} />
        ))}
      </div>
      <h2 id="titulo-passo" className="text-2xl">
        {titulo}
      </h2>
      {ajuda && <p className="text-sm text-grafite-claro mt-2">{ajuda}</p>}
      <div className="mt-6">{children}</div>
      <div className="flex items-center justify-between mt-8 pt-5 border-t border-navy/10">
        {onVoltar ? (
          <button type="button" onClick={onVoltar} className="inline-flex items-center gap-2 text-navy underline underline-offset-4">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={onAvancar}
          disabled={!podeAvancar}
          className="inline-flex items-center gap-2 bg-navy hover:bg-navy-700 disabled:bg-grafite-claro/40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-sm uppercase tracking-wider text-sm"
        >
          {rotuloAvancar ?? (ultimo ? 'Concluir' : 'Continuar')}
          {ultimo ? <Check size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
        </button>
      </div>
    </section>
  )
}

interface EscolhaProps<T extends string> {
  nome: string
  opcoes: Opcao<T>[]
  valor: T | null
  onChange: (v: T) => void
  colunas?: 1 | 2 | 3
}

/** Múltipla escolha com cartões grandes: um clique, sem digitar. */
export function Escolha<T extends string>({ nome, opcoes, valor, onChange, colunas = 2 }: EscolhaProps<T>) {
  const grade = colunas === 1 ? 'grid-cols-1' : colunas === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'
  return (
    <div role="radiogroup" aria-label={nome} className={`grid ${grade} gap-3`}>
      {opcoes.map(o => {
        const marcada = valor === o.valor
        return (
          <label
            key={o.valor}
            className={`cursor-pointer border-l-4 p-4 transition duration-200 rounded-sm ${
              marcada ? 'border-dourado bg-gradient-to-r from-dourado/5 to-transparent shadow-md scale-105' : 'border-navy/10 bg-white hover:bg-gradient-to-r hover:from-dourado/3 hover:to-transparent hover:shadow-sm'
            }`}
          >
            <input
              type="radio"
              name={nome}
              value={o.valor}
              checked={marcada}
              onChange={() => onChange(o.valor)}
              className="sr-only"
            />
            <span className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className={`mt-0.5 h-4 w-4 rounded-full border flex-shrink-0 ${
                  marcada ? 'border-dourado bg-dourado' : 'border-grafite-claro'
                }`}
              />
              <span>
                <span className="block font-medium text-navy">{o.rotulo}</span>
                {o.descricao && <span className="block text-sm text-grafite-claro mt-0.5">{o.descricao}</span>}
              </span>
            </span>
          </label>
        )
      })}
    </div>
  )
}

interface CampoProps {
  id: string
  rotulo: string
  ajuda?: string
  children: ReactNode
}

export function Campo({ id, rotulo, ajuda, children }: CampoProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs uppercase tracking-wider text-grafite mb-2">
        {rotulo}
      </label>
      {children}
      {ajuda && (
        <p id={`${id}-ajuda`} className="text-xs text-grafite-claro mt-1.5">
          {ajuda}
        </p>
      )}
    </div>
  )
}

export const classeCampo =
  'w-full px-3 py-2.5 border border-grafite-claro/30 rounded-sm focus:border-dourado focus:ring-1 focus:ring-dourado/40 bg-white text-grafite transition duration-200 hover:border-dourado/30'

interface ToastProps {
  tipo: 'sucesso' | 'erro' | 'aviso' | 'info'
  mensagem: string
}

/** Toast de feedback: mensagem temporária no canto superior. */
export function Toast({ tipo, mensagem }: ToastProps) {
  const cores: Record<typeof tipo, string> = {
    sucesso: 'bg-regularFundo border-regular text-regular',
    erro: 'bg-criticoFundo border-critico text-critico',
    aviso: 'bg-atencaoFundo border-atencao text-atencao',
    info: 'bg-pergaminho border-navy/10 text-navy',
  }
  return (
    <div className={`fixed top-4 right-4 px-4 py-3 rounded border-l-2 text-sm ${cores[tipo]} z-50 animate-in fade-in slide-in-from-top-2 duration-300`} role="status">
      {mensagem}
    </div>
  )
}
