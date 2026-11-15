import Layout from '@/components/Layout'
import {
  CONFIANCA,
  MINIMO_DE_COMPARACOES,
  SEM_INTERVALO,
  comparar,
  emPalavras,
  ingenuo,
  sazonalIngenuo,
  sazonalMaisTendencia,
  somarDias,
  type Serie,
} from '@/lib/predicao/baseline'

/**
 * Passo C7: a régua que todo modelo de predição tem de bater antes de virar produto.
 *
 * Enquanto nenhuma coleta tiver rodado, a tela diz isso com todas as letras e mostra o formato do
 * relatório sobre uma série de demonstração, marcada como demonstração. Mostrar número inventado
 * sem esse aviso seria o oposto do que este passo existe para fazer.
 */

/** Série de demonstração, gerada por conta fechada: serve só para mostrar o formato do relatório. */
const DEMONSTRACAO: Serie = {
  id: 'demonstracao',
  nome: 'Série de demonstração (tendência mais ciclo de 7 dias)',
  unidade: 'unidades',
  periodo: 7,
  pontos: Array.from({ length: 80 }, (_, t) => ({
    quando: somarDias('2026-01-01', t),
    valor: 100 + 0.5 * t + 6 * Math.sin((2 * Math.PI * t) / 7) + Math.cos(t * 1.7) / 3,
  })),
}

const RELATORIOS = comparar(DEMONSTRACAO, [sazonalMaisTendencia(7), sazonalIngenuo(7), ingenuo], { minimoTreino: 21 })
const pct = (x: number) => `${Math.round(x * 100)}%`

export default function ReguaPage() {
  return (
    <Layout title="Régua de acerto dos modelos">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <h2 className="font-serif text-xl">Como um modelo ganha o direito de ser publicado</h2>
          <p className="text-sm text-grafite">
            Antes de acreditar em qualquer previsão, medimos quanto erraria um palpite bobo: repetir
            o último valor observado. O modelo só entra se errar menos que esse palpite, se acertar a
            direção mais vezes que cara ou coroa, e se o intervalo que ele promete for do tamanho que
            ele promete.
          </p>
          <ul className="text-sm text-grafite list-disc pl-5" data-testid="regras">
            <li>Erro medido só fora da amostra: o modelo é cobrado pelo que não viu.</li>
            <li>Pelo menos {MINIMO_DE_COMPARACOES} comparações, senão o número não significa nada.</li>
            <li>O intervalo promete {pct(CONFIANCA)} e tem de acertar perto disso.</li>
            <li>{SEM_INTERVALO}</li>
          </ul>
        </section>

        <section className="bg-white shadow-sm p-6 space-y-3" data-testid="sem-coleta">
          <h2 className="font-serif text-xl">Ainda não há série coletada para medir</h2>
          <p className="text-sm text-grafite">
            A régua roda sobre as séries que a plataforma coleta. Nenhuma coleta rodou ainda, então o
            relatório abaixo é de uma série de demonstração, feita por conta fechada, só para mostrar
            o formato. Não é dado real e não vale como previsão de nada.
          </p>
        </section>

        {RELATORIOS.map(r => (
          <section key={r.modelo} className="bg-white shadow-sm p-6 space-y-2">
            <div className="flex justify-between gap-3 items-start">
              <h2 className="font-serif text-xl">{r.modelo}</h2>
              <span
                className={`text-xs px-2 py-1 whitespace-nowrap ${r.aprovado ? 'bg-regularFundo text-regular' : 'bg-atencaoFundo text-atencao'}`}
                title={r.aprovado ? 'Este modelo bateu a régua' : 'Este modelo não bateu a régua e não é publicado'}
              >
                {r.aprovado ? 'Passou na régua' : 'Não passou'}
              </span>
            </div>
            <ul className="text-sm text-grafite list-disc pl-5">
              {emPalavras(r).map(linha => <li key={linha}>{linha}</li>)}
            </ul>
          </section>
        ))}
      </div>
    </Layout>
  )
}
