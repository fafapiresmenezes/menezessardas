import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import { supabase } from '@/lib/supabase'
import { ChevronDown, ChevronRight, Save, CheckCircle2, FileText, Scale, BookOpen, Target, Layers, Pen, Info, HelpCircle, ArrowRight } from 'lucide-react'

// Parâmetros de qualidade para redação de peças jurídicas,
// calibrados nos benchmarks PMO/MIT (Project Management Office / MIT Sloan)
// e PMI/Stanford (Project Management Institute / Stanford Law School).

interface Parametro {
  chave: string
  label: string
  descricao: string
  valor: string
  tipo: 'texto' | 'multiline' | 'numero' | 'selecao'
  opcoes?: string[]
}

interface SecaoParametros {
  id: string
  titulo: string
  subtitulo: string
  icone: React.ReactNode
  parametros: Parametro[]
}

const SECOES: SecaoParametros[] = [
  {
    id: 'estrutura',
    titulo: 'Estrutura e Organização',
    subtitulo: 'PMI/Stanford: clareza hierárquica e coesão interna',
    icone: <Layers size={18} />,
    parametros: [
      {
        chave: 'estrutura_cabecalho',
        label: 'Cabeçalho padrão',
        descricao: 'Elementos obrigatórios: processo, vara, juízo, partes, tipo de peça.',
        valor: 'EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A) DE DIREITO DA {VARA} COMARCA DE {COMARCA}\n\n{TIPO_ACAO} nº {NUMERO_PROCESSO}\n\n{AUTOR}, por seu advogado,',
        tipo: 'multiline',
      },
      {
        chave: 'estrutura_secoes',
        label: 'Seções obrigatórias',
        descricao: 'Ordem padrão das seções em toda petição.',
        valor: 'I – DOS FATOS\nII – DO DIREITO\nIII – DOS PEDIDOS\nIV – DO VALOR DA CAUSA',
        tipo: 'multiline',
      },
      {
        chave: 'estrutura_comprimento_peticao',
        label: 'Comprimento máximo (páginas)',
        descricao: 'Limite recomendado pelo PMI/Stanford para peças iniciais. Peças incidentais: metade.',
        valor: '25',
        tipo: 'numero',
      },
      {
        chave: 'estrutura_comprimento_recurso',
        label: 'Comprimento máximo – recursos (páginas)',
        descricao: 'Limite para apelações, agravos e recursos especiais.',
        valor: '30',
        tipo: 'numero',
      },
    ],
  },
  {
    id: 'linguagem',
    titulo: 'Linguagem e Tom',
    subtitulo: 'PMO/MIT: comunicação eficaz, direta e sem redundância',
    icone: <Pen size={18} />,
    parametros: [
      {
        chave: 'linguagem_nivel',
        label: 'Nível de formalidade',
        descricao: 'Padrão linguístico a ser usado em todas as peças.',
        valor: 'formal-tecnico',
        tipo: 'selecao',
        opcoes: ['formal-tecnico', 'formal-simples', 'neutro'],
      },
      {
        chave: 'linguagem_voz',
        label: 'Voz preferencial',
        descricao: 'PMO/MIT recomenda voz ativa para clareza e objetividade.',
        valor: 'ativa',
        tipo: 'selecao',
        opcoes: ['ativa', 'passiva', 'mista'],
      },
      {
        chave: 'linguagem_latim',
        label: 'Uso de expressões em latim',
        descricao: 'Se ativado, expressões latinas devem ser traduzidas na primeira ocorrência.',
        valor: 'com-traducao',
        tipo: 'selecao',
        opcoes: ['com-traducao', 'evitar', 'livre'],
      },
      {
        chave: 'linguagem_comprimento_paragrafo',
        label: 'Comprimento máximo de parágrafo (linhas)',
        descricao: 'Stanford Law recomenda no máximo 8 linhas por parágrafo para leitura eficiente.',
        valor: '8',
        tipo: 'numero',
      },
      {
        chave: 'linguagem_repeticao',
        label: 'Instrução contra redundância',
        descricao: 'Regra a ser seguida para evitar repetição de argumentos.',
        valor: 'Cada argumento é apresentado uma única vez, no momento mais estratégico. Repetições são substituídas por referências cruzadas ("conforme exposto em [seção]").',
        tipo: 'multiline',
      },
    ],
  },
  {
    id: 'argumentacao',
    titulo: 'Argumentação Jurídica',
    subtitulo: 'PMI/Stanford: estrutura IRAC e hierarquia de fundamentos',
    icone: <Scale size={18} />,
    parametros: [
      {
        chave: 'arg_metodo',
        label: 'Método de argumentação',
        descricao: 'IRAC (Issue, Rule, Application, Conclusion) é o padrão Stanford/PMI para argumentação jurídica estruturada.',
        valor: 'IRAC',
        tipo: 'selecao',
        opcoes: ['IRAC', 'CREAC', 'Livre'],
      },
      {
        chave: 'arg_hierarquia_fontes',
        label: 'Hierarquia de fontes',
        descricao: 'Ordem preferencial ao citar fundamentos jurídicos.',
        valor: '1. Constituição Federal\n2. Lei federal\n3. Súmula vinculante / STF\n4. Súmula STJ\n5. Jurisprudência STF e STJ\n6. Jurisprudência TJRJ\n7. Doutrina\n8. Analogia',
        tipo: 'multiline',
      },
      {
        chave: 'arg_jurisprudencia_max',
        label: 'Máximo de citações jurisprudenciais por tese',
        descricao: 'PMO/MIT recomenda no máximo 3 julgados por tese para evitar sobrecarga.',
        valor: '3',
        tipo: 'numero',
      },
      {
        chave: 'arg_tese_min',
        label: 'Mínimo de fundamentos por pedido',
        descricao: 'Cada pedido deve ter ao menos este número de fundamentos independentes.',
        valor: '2',
        tipo: 'numero',
      },
    ],
  },
  {
    id: 'pedidos',
    titulo: 'Pedidos e Conclusão',
    subtitulo: 'PMI/Stanford: precisão, mensurabilidade e viabilidade (critérios SMART)',
    icone: <Target size={18} />,
    parametros: [
      {
        chave: 'pedidos_criterio',
        label: 'Critério para redigir pedidos',
        descricao: 'PMI/Stanford adapta os critérios SMART ao direito: Específico, Mensurável, Baseado em autoridade, Realista, Tempestivo.',
        valor: 'SMART-JUR',
        tipo: 'selecao',
        opcoes: ['SMART-JUR', 'Livre'],
      },
      {
        chave: 'pedidos_subsidiarios',
        label: 'Instrução para pedidos subsidiários',
        descricao: 'Como formular pedidos alternativos quando o principal não puder ser deferido.',
        valor: 'Pedidos subsidiários são apresentados com a expressão "subsidiariamente, caso V. Exa. não acolha o pedido anterior,". São ordenados do mais ao menos favorável ao cliente.',
        tipo: 'multiline',
      },
      {
        chave: 'pedidos_tutela',
        label: 'Tutela de urgência: padrão de justificativa',
        descricao: 'Elementos obrigatórios para fundamentar tutela antecipada ou cautelar (art. 300 CPC).',
        valor: 'a) Probabilidade do direito (fumus boni iuris): demonstrar com base em prova pré-constituída.\nb) Perigo de dano ou risco ao resultado útil do processo (periculum in mora): descrever dano concreto, atual ou iminente.\nc) Reversibilidade: confirmar ou justificar exceção ao art. 300, §3º CPC.',
        tipo: 'multiline',
      },
    ],
  },
  {
    id: 'referencias',
    titulo: 'Citações e Referências',
    subtitulo: 'PMO/MIT: rastreabilidade e verificabilidade de fontes',
    icone: <BookOpen size={18} />,
    parametros: [
      {
        chave: 'ref_formato_jurisprudencia',
        label: 'Formato de citação de julgados',
        descricao: 'Padrão para identificar decisões judiciais.',
        valor: '{Tribunal}, {Órgão Julgador}, {Tipo de Recurso} nº {Número}, Rel. Min./Des. {Nome}, j. {Data}, {DJe/DJ} {Data de Publicação}.',
        tipo: 'multiline',
      },
      {
        chave: 'ref_formato_doutrina',
        label: 'Formato de citação de doutrina',
        descricao: 'Padrão ABNT adaptado à petição jurídica.',
        valor: 'SOBRENOME, Nome. Título da obra. {ed}. ed. {Cidade}: {Editora}, {Ano}, p. {Página}.',
        tipo: 'multiline',
      },
      {
        chave: 'ref_verificar_antes',
        label: 'Instrução de verificação prévia',
        descricao: 'Regra de qualidade PMO/MIT antes de usar qualquer citação.',
        valor: 'Toda citação jurisprudencial deve ser verificada no sistema de origem (STF, STJ, TJRJ) antes de ser incluída. Nunca citar de memória ou de segunda fonte.',
        tipo: 'multiline',
      },
    ],
  },
  {
    id: 'qualidade',
    titulo: 'Revisão e Qualidade',
    subtitulo: 'PMO/MIT: checklist de entrega e controle de qualidade',
    icone: <CheckCircle2 size={18} />,
    parametros: [
      {
        chave: 'qualidade_checklist',
        label: 'Checklist de revisão final',
        descricao: 'Itens obrigatórios antes de assinar e protocolar qualquer peça.',
        valor: '☐ Número do processo e vara conferidos\n☐ Nome das partes conferido\n☐ Prazo verificado (tempestividade)\n☐ Pedidos listados e numerados\n☐ Valor da causa declarado\n☐ Documentos listados nos anexos\n☐ Citações verificadas nas fontes originais\n☐ Ortografia e gramática revisadas\n☐ Formatação ABNT e margens NBR 14724\n☐ Assinatura digital aplicada',
        tipo: 'multiline',
      },
      {
        chave: 'qualidade_formatacao',
        label: 'Formatação padrão (NBR 14724)',
        descricao: 'Especificações técnicas de formatação.',
        valor: 'Fonte: Times New Roman ou Arial, corpo 12\nEspaçamento: 1,5 entre linhas; simples entre citações longas\nMargem: superior e esquerda 3 cm; inferior e direita 2 cm\nParágrafos: recuo de 1,25 cm na primeira linha\nCitações longas (>3 linhas): recuo 4 cm, corpo 10, sem aspas',
        tipo: 'multiline',
      },
    ],
  },
  {
    id: 'tipos_pecas',
    titulo: 'Parâmetros por Tipo de Peça',
    subtitulo: 'PMI/Stanford: diferenciação por finalidade processual',
    icone: <FileText size={18} />,
    parametros: [
      {
        chave: 'tipos_peticao_inicial',
        label: 'Petição inicial',
        descricao: 'Foco e tom recomendado.',
        valor: 'Foco: clareza fática e fundamento jurídico sólido. Tom: objetivo e construtivo. Narrar fatos cronologicamente. Demonstrar direito antes do pedido. Sempre quantificar o dano quando possível.',
        tipo: 'multiline',
      },
      {
        chave: 'tipos_contestacao',
        label: 'Contestação',
        descricao: 'Foco e estratégia recomendada.',
        valor: 'Estratégia: impugnar especificamente cada fato (art. 341 CPC). Começar pelas preliminares, depois mérito. Sempre apresentar tese subsidiária. Não deixar fatos não impugnados (imputação de verdade).',
        tipo: 'multiline',
      },
      {
        chave: 'tipos_recurso',
        label: 'Recursos (apelação, agravo)',
        descricao: 'Foco e critério de seleção de matéria.',
        valor: 'PMI/Stanford: recorrer somente quando o erro for demonstrável e a perspectiva de êxito for superior a 40%. Selecionar as razões mais fortes (máx. 5 teses por recurso). Foco em questões de direito para STJ/STF.',
        tipo: 'multiline',
      },
      {
        chave: 'tipos_manifestacao',
        label: 'Manifestações e petições incidentais',
        descricao: 'Tom e comprimento.',
        valor: 'Tom: direto e econômico. Comprimento máximo: 10 páginas. Ir ao ponto sem recapitular todo o histórico. Referência cruzada às peças anteriores em vez de repetição.',
        tipo: 'multiline',
      },
    ],
  },
]

// Tooltip que aparece quando o cursor entra num campo
function DicaAtiva({ texto }: { texto: string }) {
  return (
    <div className="mt-2 flex items-start gap-2 bg-dourado/10 border border-dourado/30 rounded-md px-3 py-2 text-xs text-dourado animate-in fade-in duration-150">
      <HelpCircle size={13} className="mt-0.5 shrink-0" />
      <span>{texto}</span>
    </div>
  )
}

// Painel de boas-vindas (aparece na primeira visita, some ao clicar)
function PainelBoasVindas({ onFechar }: { onFechar: () => void }) {
  return (
    <div className="mb-6 border border-dourado/40 rounded-xl bg-dourado/5 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={18} className="text-dourado shrink-0" />
          <span className="font-semibold text-texto text-sm">O que é esta tela?</span>
        </div>
        <button
          onClick={onFechar}
          className="text-xs text-grafite/60 hover:text-grafite underline underline-offset-2 shrink-0"
        >
          Entendi, fechar
        </button>
      </div>
      <ol className="space-y-2 text-sm text-grafite">
        <li className="flex items-start gap-2">
          <ArrowRight size={14} className="text-dourado mt-0.5 shrink-0" />
          <span>Aqui ficam as <strong>regras que o robô segue</strong> quando rascunha uma petição, recurso ou contrato para você.</span>
        </li>
        <li className="flex items-start gap-2">
          <ArrowRight size={14} className="text-dourado mt-0.5 shrink-0" />
          <span>Clique no <strong>título de cada bloco</strong> (ex.: "Estrutura e Organização") para abri-lo e ver os campos.</span>
        </li>
        <li className="flex items-start gap-2">
          <ArrowRight size={14} className="text-dourado mt-0.5 shrink-0" />
          <span>Clique em qualquer campo de texto — uma <strong>dica aparece embaixo</strong> explicando o que aquele campo faz.</span>
        </li>
        <li className="flex items-start gap-2">
          <ArrowRight size={14} className="text-dourado mt-0.5 shrink-0" />
          <span>Quando terminar de ajustar, clique em <strong>"Salvar parâmetros"</strong> — só isso. O robô já usa na próxima peça.</span>
        </li>
      </ol>
    </div>
  )
}

export default function ParametrosEscritaPage() {
  const [secoesAbertas, setSecoesAbertas] = useState<Record<string, boolean>>({
    estrutura: true,
  })
  const [valores, setValores] = useState<Record<string, string>>({})
  const [salvando, setSalvando] = useState(false)
  const [salvo, setSalvo] = useState(false)
  const [carregando, setCarregando] = useState(true)
  const [campoAtivo, setCampoAtivo] = useState<string | null>(null)
  const [mostrarBoas, setMostrarBoas] = useState(() => {
    try { return localStorage.getItem('param_escrita_boas') !== 'ok' } catch { return true }
  })

  function fecharBoas() {
    try { localStorage.setItem('param_escrita_boas', 'ok') } catch {}
    setMostrarBoas(false)
  }

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .like('chave', 'escrita_%')
        if (data) {
          const mapa: Record<string, string> = {}
          data.forEach((r: { chave: string; valor: string }) => {
            mapa[r.chave] = r.valor
          })
          setValores(mapa)
        }
      } catch { /* usa defaults */ }
      setCarregando(false)
    }
    carregar()
  }, [])

  function getValor(p: Parametro) {
    return valores[p.chave] ?? p.valor
  }

  function setValor(chave: string, val: string) {
    setValores(prev => ({ ...prev, [chave]: val }))
  }

  function toggleSecao(id: string) {
    setSecoesAbertas(prev => ({ ...prev, [id]: !prev[id] }))
  }

  async function salvar() {
    setSalvando(true)
    try {
      const linhas = SECOES.flatMap(s =>
        s.parametros.map(p => ({
          chave: p.chave,
          valor: getValor(p),
        }))
      )
      await supabase.from('configuracoes').upsert(linhas, { onConflict: 'chave' })
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch { /* silencia */ }
    setSalvando(false)
  }

  if (carregando) {
    return (
      <Layout title="Parâmetros de escrita de peças">
        <p className="text-grafite text-sm">Carregando parâmetros…</p>
      </Layout>
    )
  }

  return (
    <Layout title="Parâmetros de escrita de peças">
      <div className="max-w-3xl">

        {/* Painel de boas-vindas */}
        {mostrarBoas && <PainelBoasVindas onFechar={fecharBoas} />}

        {/* Cabeçalho compacto */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-grafite/70">
            Regras que o robô segue ao rascunhar peças — calibradas nos benchmarks <strong>PMO/MIT</strong> e <strong>PMI/Stanford</strong>.
            {!mostrarBoas && (
              <button
                onClick={() => setMostrarBoas(true)}
                className="ml-2 inline-flex items-center gap-1 text-dourado underline underline-offset-2"
              >
                <Info size={11} /> Como usar
              </button>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-1.5 bg-dourado text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition"
            >
              <Save size={14} />
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            {salvo && (
              <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400 whitespace-nowrap">
                <CheckCircle2 size={14} />
                Salvo!
              </span>
            )}
          </div>
        </div>

        {/* Seções */}
        <div className="space-y-3">
          {SECOES.map(secao => (
            <div key={secao.id} className="border border-borda rounded-xl overflow-hidden">
              {/* Cabeçalho da seção — clicável */}
              <button
                onClick={() => toggleSecao(secao.id)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-fundo-alt hover:bg-borda/40 transition text-left gap-3"
              >
                <div className="flex items-center gap-3">
                  <span className="text-dourado">{secao.icone}</span>
                  <div>
                    <span className="font-semibold text-sm text-texto">{secao.titulo}</span>
                    <span className="ml-2 text-xs text-grafite/55">{secao.subtitulo}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-grafite/50">
                    {secoesAbertas[secao.id] ? 'fechar' : `${secao.parametros.length} campos`}
                  </span>
                  {secoesAbertas[secao.id]
                    ? <ChevronDown size={16} className="text-grafite" />
                    : <ChevronRight size={16} className="text-grafite" />
                  }
                </div>
              </button>

              {/* Parâmetros */}
              {secoesAbertas[secao.id] && (
                <div className="divide-y divide-borda">
                  {secao.parametros.map(p => {
                    const ativo = campoAtivo === p.chave
                    return (
                      <div
                        key={p.chave}
                        className={`px-4 py-4 transition-colors ${ativo ? 'bg-dourado/[0.03]' : ''}`}
                      >
                        <label className="block text-sm font-medium text-texto mb-0.5">
                          {p.label}
                        </label>

                        {p.tipo === 'selecao' && (
                          <select
                            value={getValor(p)}
                            onChange={e => setValor(p.chave, e.target.value)}
                            onFocus={() => setCampoAtivo(p.chave)}
                            onBlur={() => setCampoAtivo(null)}
                            className="mt-1 w-full max-w-xs border border-borda rounded-lg px-3 py-1.5 text-sm bg-fundo text-texto focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado"
                          >
                            {p.opcoes?.map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        )}

                        {p.tipo === 'numero' && (
                          <input
                            type="number"
                            value={getValor(p)}
                            onChange={e => setValor(p.chave, e.target.value)}
                            onFocus={() => setCampoAtivo(p.chave)}
                            onBlur={() => setCampoAtivo(null)}
                            className="mt-1 w-24 border border-borda rounded-lg px-3 py-1.5 text-sm bg-fundo text-texto focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado"
                          />
                        )}

                        {p.tipo === 'texto' && (
                          <input
                            type="text"
                            value={getValor(p)}
                            onChange={e => setValor(p.chave, e.target.value)}
                            onFocus={() => setCampoAtivo(p.chave)}
                            onBlur={() => setCampoAtivo(null)}
                            className="mt-1 w-full border border-borda rounded-lg px-3 py-1.5 text-sm bg-fundo text-texto focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado"
                          />
                        )}

                        {p.tipo === 'multiline' && (
                          <textarea
                            value={getValor(p)}
                            onChange={e => setValor(p.chave, e.target.value)}
                            onFocus={() => setCampoAtivo(p.chave)}
                            onBlur={() => setCampoAtivo(null)}
                            rows={Math.max(3, getValor(p).split('\n').length + 1)}
                            className="mt-1 w-full border border-borda rounded-lg px-3 py-2 text-sm bg-fundo text-texto font-mono focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado resize-y"
                          />
                        )}

                        {/* Dica aparece quando o campo está em foco */}
                        {ativo && p.descricao && (
                          <DicaAtiva texto={p.descricao} />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Botão salvar no final */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-borda">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 bg-dourado text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
          >
            <Save size={15} />
            {salvando ? 'Salvando…' : 'Salvar parâmetros'}
          </button>
          {salvo && (
            <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={15} />
              Salvo com sucesso
            </span>
          )}
          <span className="text-xs text-grafite/50 ml-auto">
            Alterações só valem após salvar
          </span>
        </div>
      </div>
    </Layout>
  )
}
