import { Link } from 'react-router-dom'
import Marca from '@/components/Marca'

// Exemplos de verdade de cada frente (passo V8): quadradinho convence menos que exemplo. Cada frente
// mostra uma coisa real que a pessoa confere. TUDO aqui é inventado e marcado como exemplo: nenhum
// dado de cliente, paciente ou processo real. Abre sem senha.
//
// Premium e legível como a porta (classe `.porta`): letra clara sobre preto, sem bg-white.

const SELO = (
  <span className="inline-block border border-neutral-400 px-2 py-0.5 text-xs uppercase tracking-[0.2em] text-neutral-200" data-testid="selo-exemplo">
    Exemplo · dados inventados
  </span>
)

function Bloco({ id, titulo, promessa, children, data, conferir }: {
  id: string; titulo: string; promessa: string; children: React.ReactNode; data: string; conferir: string
}) {
  return (
    <section id={id} data-testid={`exemplo-${id}`} className="porta border-t border-neutral-700 pt-10 mt-10 text-left">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-serif text-[#fff]">{titulo}</h2>
        {SELO}
      </div>
      <p className="text-base text-neutral-200 mt-3 max-w-3xl">{promessa}</p>
      <div className="mt-6 border border-neutral-700 bg-neutral-950 p-5 text-neutral-100 leading-relaxed">
        {children}
      </div>
      <p className="text-sm text-neutral-300 mt-3">
        <span className="text-neutral-400">Quando: </span>{data}
        <span className="mx-2 text-neutral-600">·</span>
        <span className="text-neutral-400">Como conferir: </span>{conferir}
      </p>
    </section>
  )
}

export default function ExemplosPage() {
  return (
    <div className="porta min-h-screen bg-black px-4 py-12 md:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex justify-center"><Marca tamanho="pequena" tipo="instituto" comSubtitulo={false} /></div>
        <div className="text-center mt-10">
          <h1 className="text-4xl md:text-5xl font-serif leading-tight">Exemplos de verdade</h1>
          <p className="text-lg text-neutral-100 mt-5 max-w-2xl mx-auto leading-relaxed">
            Cada frente mostra uma coisa real, que você confere. Tudo aqui é inventado e marcado como
            exemplo: nenhum dado de cliente, paciente ou processo real.
          </p>
        </div>

        {/* 1. Direito: uma peça de exemplo, com dados inventados e marcada como exemplo. */}
        <Bloco
          id="direito"
          titulo="Direito"
          promessa="Uma peça sai pronta para o advogado revisar e assinar — nunca é enviada sozinha."
          data="peça de exemplo gerada em 14/11/2026"
          conferir="a lei citada abre no site do Planalto; a peça real é rascunho que o advogado revisa e assina."
        >
          <p className="text-sm text-neutral-300 mb-3 uppercase tracking-wider">Contestação (trecho de exemplo)</p>
          <p className="font-serif text-neutral-100">
            EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA 2ª VARA CÍVEL DA COMARCA DE EXEMPLÓPOLIS
          </p>
          <p className="mt-3">
            <strong>FULANO DE TAL</strong> (exemplo), já qualificado nos autos da ação de cobrança que lhe
            move <strong>BELTRANO COMÉRCIO LTDA</strong> (exemplo), vem, respeitosamente, apresentar
            <strong> CONTESTAÇÃO</strong>, pelos fatos e fundamentos a seguir.
          </p>
          <p className="mt-3"><strong>I – DA PRESCRIÇÃO.</strong> A pretensão de cobrança de dívida líquida
            constante de instrumento particular prescreve em cinco anos (art. 206, §5º, I, do Código Civil).
            Decorridos mais de cinco anos do vencimento, impõe-se o reconhecimento da prescrição.</p>
          <p className="mt-3"><strong>II – DO PEDIDO.</strong> Requer-se o acolhimento da prescrição e a
            extinção do feito com resolução de mérito (art. 487, II, do Código de Processo Civil).</p>
          <p className="mt-4 text-sm text-neutral-300">Termos em que pede deferimento. Exemplópolis, 14 de
            novembro de 2026. — Advogado(a) · OAB/UF 000.000 (exemplo).</p>
        </Bloco>

        {/* 2. Engenharia: a conta de uma viga, passo a passo, e um boletim de medição. */}
        <Bloco
          id="engenharia"
          titulo="Engenharia"
          promessa="O cálculo aparece passo a passo, com a norma citada — o engenheiro habilitado confere e assina."
          data="conta de exemplo em 14/11/2026 (NBR 6118)"
          conferir="refaça a conta com os mesmos números; a norma NBR 6118 é a referência citada."
        >
          <p className="text-sm text-neutral-300 mb-3 uppercase tracking-wider">Viga bi-apoiada — momento máximo (exemplo)</p>
          <ul className="space-y-1">
            <li>Vão (L): 5,00 m · carga distribuída (q): 20 kN/m (valores de exemplo)</li>
            <li>Momento máximo no meio do vão: M = q·L²/8 = 20 × 5,00² / 8 = <strong>62,5 kN·m</strong></li>
            <li>Reações de apoio: R = q·L/2 = 20 × 5,00 / 2 = <strong>50 kN</strong> em cada apoio</li>
            <li>Cortante máximo nos apoios: V = R = <strong>50 kN</strong></li>
          </ul>
          <p className="mt-4 text-sm text-neutral-300 mb-2 uppercase tracking-wider">Boletim de medição (exemplo)</p>
          <ul className="space-y-1">
            <li>Serviço: alvenaria de vedação · previsto no mês: 120 m² · executado: 96 m²</li>
            <li>Medição: 96 / 120 = <strong>80%</strong> do previsto no período</li>
          </ul>
        </Bloco>

        {/* 3. Saúde: um consultor respondendo com a diretriz citada e a recusa de ato médico à vista. */}
        <Bloco
          id="saude"
          titulo="Saúde"
          promessa="O consultor cita a diretriz e recusa, à vista de todos, o que é ato médico — não substitui a consulta."
          data="resposta de exemplo em 14/11/2026"
          conferir="a diretriz citada é pública; qualquer conduta é confirmada por profissional habilitado."
        >
          <p className="text-sm text-neutral-300 mb-2 uppercase tracking-wider">Pergunta (exemplo)</p>
          <p>"Pressão 150/95 medida em casa, sem sintomas. O que a diretriz diz sobre acompanhar?"</p>
          <p className="text-sm text-neutral-300 mt-4 mb-2 uppercase tracking-wider">Resposta do consultor (exemplo)</p>
          <p>Medidas isoladas não fecham diagnóstico: a orientação geral é confirmar com medidas repetidas,
            em dias diferentes, e registrar. <strong>Não posso diagnosticar hipertensão, prescrever remédio
            nem ajustar dose</strong> — isso é ato médico e depende de avaliação presencial de um profissional
            habilitado, que lê o histórico e examina a pessoa.</p>
        </Bloco>

        {/* 4. Predição: uma previsão antiga ao lado do que aconteceu, inclusive quando errou. */}
        <Bloco
          id="predicao"
          titulo="Predição"
          promessa="Toda previsão vem com incerteza e é guardada; depois, mostramos o que aconteceu — inclusive quando erramos."
          data="previsões de exemplo registradas antes do desfecho"
          conferir="cada previsão fica registrada com data; o acerto é medido contra o desfecho real."
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-neutral-300 text-left border-b border-neutral-700">
                  <th className="py-2 pr-4 font-medium">Caso (exemplo)</th>
                  <th className="py-2 pr-4 font-medium">Previsão</th>
                  <th className="py-2 pr-4 font-medium">Aconteceu</th>
                  <th className="py-2 font-medium">Resultado</th>
                </tr>
              </thead>
              <tbody className="text-neutral-100">
                <tr className="border-b border-neutral-800"><td className="py-2 pr-4">Caso A</td><td className="py-2 pr-4">70% de acordo</td><td className="py-2 pr-4">houve acordo</td><td className="py-2 text-neutral-200">acertou</td></tr>
                <tr className="border-b border-neutral-800"><td className="py-2 pr-4">Caso B</td><td className="py-2 pr-4">60% procedente</td><td className="py-2 pr-4">improcedente</td><td className="py-2 text-neutral-200">errou</td></tr>
                <tr><td className="py-2 pr-4">Caso C</td><td className="py-2 pr-4">55% de recurso</td><td className="py-2 pr-4">houve recurso</td><td className="py-2 text-neutral-200">acertou</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-neutral-300">Mostramos o erro de propósito: previsão honesta tem incerteza, e
            o acerto se mede ao longo do tempo, não num caso só.</p>
        </Bloco>

        <div className="text-center mt-12">
          <Link to="/boas-vindas" data-testid="exemplos-voltar" title="Volta para a porta de entrada"
            className="inline-block min-h-[48px] px-7 py-3 border border-[#fff] text-[#fff] uppercase tracking-[0.15em] text-sm no-underline hover:bg-[#fff] hover:text-[#000] transition">
            Voltar à entrada
          </Link>
        </div>
      </div>
    </div>
  )
}
