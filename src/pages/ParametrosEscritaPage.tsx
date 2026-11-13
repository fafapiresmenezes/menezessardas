import { useState, useEffect, useRef } from 'react'
import Layout from '@/components/Layout'
import { lerConfigPrefixo, gravarConfig } from '@/lib/config'
import { BANCA, NARRATIVA, RATING, ESCRITORIOS, JURISTAS_POR_SETOR } from '@/lib/estiloPecas'
import { ChevronDown, ChevronRight, Save, CheckCircle2, FileText, Scale, BookOpen, Target, Layers, Pen, Info, HelpCircle, ArrowRight } from 'lucide-react'

// ─── Tooltip universal ────────────────────────────────────────────────────────
// Aparece ao passar o cursor por cima de qualquer elemento filho.
// Usa posicionamento fixo via portal inline para não ser cortado por overflow:hidden.
function Tooltip({ texto, children, posicao = 'top' }: {
  texto: string
  children: React.ReactNode
  posicao?: 'top' | 'bottom' | 'right'
}) {
  const [visivel, setVisivel] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const ref = useRef<HTMLSpanElement>(null)

  function mostrar() {
    if (!ref.current) return
    const r = ref.current.getBoundingClientRect()
    if (posicao === 'top') setCoords({ x: r.left + r.width / 2, y: r.top - 8 })
    else if (posicao === 'bottom') setCoords({ x: r.left + r.width / 2, y: r.bottom + 8 })
    else setCoords({ x: r.right + 8, y: r.top + r.height / 2 })
    setVisivel(true)
  }

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={mostrar}
        onMouseLeave={() => setVisivel(false)}
        className="inline-flex"
      >
        {children}
      </span>
      {visivel && (
        <div
          style={{
            position: 'fixed',
            left: posicao === 'right' ? coords.x : coords.x,
            top: posicao === 'top' ? coords.y : posicao === 'bottom' ? coords.y : coords.y,
            transform: posicao === 'top'
              ? 'translate(-50%, -100%)'
              : posicao === 'bottom'
              ? 'translate(-50%, 0)'
              : 'translate(0, -50%)',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
          className="max-w-xs bg-texto text-fundo text-xs rounded-lg px-3 py-2 shadow-lg leading-snug"
        >
          {texto}
        </div>
      )}
    </>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

// Parâmetros de qualidade para redação de peças jurídicas,
// calibrados nos benchmarks PMO/MIT (Project Management Office / MIT Sloan)
// e PMI/Stanford (Project Management Institute / Stanford Law School).

interface Parametro {
  chave: string
  label: string
  descricao: string   // aparece quando o campo recebe foco
  dica: string        // aparece quando o cursor passa por cima do label
  valor: string
  tipo: 'texto' | 'multiline' | 'numero' | 'selecao'
  opcoes?: string[]
}

interface SecaoParametros {
  id: string
  titulo: string
  subtitulo: string
  dica: string        // aparece quando o cursor passa pelo cabeçalho
  icone: React.ReactNode
  parametros: Parametro[]
}

const SECOES: SecaoParametros[] = [
  {
    id: 'estrutura',
    titulo: 'Estrutura e Organização',
    subtitulo: 'PMI/Stanford: clareza hierárquica e coesão interna',
    dica: 'Define como o robô monta o esqueleto de cada peça: qual é o cabeçalho, em que ordem vêm as seções e qual o tamanho máximo. Clique para abrir.',
    icone: <Layers size={18} />,
    parametros: [
      {
        chave: 'estrutura_cabecalho',
        label: 'Cabeçalho padrão',
        dica: 'Como o robô deve endereçar e abrir a peça: a quem dirigir (juiz, relator), o tratamento e o que vem logo depois.',
        descricao: 'Escreva a regra em palavras, não um modelo com lacunas: o robô decide o endereçamento pela fase do processo (vara ou tribunal).',
        valor: 'Endereçar a quem vai decidir a peça: ao juízo de primeiro grau quando o processo está na vara; ao desembargador relator ou ao presidente do órgão quando está no tribunal (embargos de declaração contra acórdão, memoriais, contrarrazões já distribuídas). Usar o tratamento no gênero correto quando o nome constar da publicação; quando não constar, usar a forma por extenso ("Excelentíssimo Senhor Doutor Juiz de Direito"), nunca "(A)". Em seguida: classe e número do processo, e a qualificação das partes.',
        tipo: 'multiline',
      },
      {
        chave: 'estrutura_secoes',
        label: 'Seções obrigatórias',
        dica: 'Lista as seções que toda petição deve ter, nessa ordem. O robô usa essa sequência como espinha dorsal do texto.',
        descricao: 'Ordem padrão das seções em toda petição. Uma por linha.',
        valor: 'I – DOS FATOS\nII – DO DIREITO\nIII – DOS PEDIDOS\nIV – DO VALOR DA CAUSA',
        tipo: 'multiline',
      },
      {
        chave: 'estrutura_comprimento_peticao',
        label: 'Comprimento máximo (páginas)',
        dica: 'O robô avisa quando a peça ultrapassar esse número de páginas. PMI/Stanford recomenda 25 para petições iniciais.',
        descricao: 'Limite recomendado pelo PMI/Stanford para peças iniciais. Peças incidentais: metade.',
        valor: '25',
        tipo: 'numero',
      },
      {
        chave: 'estrutura_minimo_palavras',
        label: 'Tamanho mínimo da peça (palavras)',
        dica: 'A peça nunca sai curta: se ficar abaixo disso, o robô refaz. Vale para recursos, contestação, réplica, memoriais e embargos; manifestações simples têm a metade.',
        descricao: 'Piso de extensão. Os 10 juristas da banca desenvolvem a peça por inteiro; resumo ou esquema não é aceito.',
        valor: '1600',
        tipo: 'numero',
      },
      {
        chave: 'estrutura_comprimento_recurso',
        label: 'Comprimento máximo – recursos (páginas)',
        dica: 'Limite específico para apelações, agravos e recursos especiais, que costumam ser mais detalhados que petições iniciais.',
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
    dica: 'Controla como o robô escreve: nível de formalidade, se usa voz ativa ou passiva, se traduz o latim e qual o tamanho máximo de cada parágrafo.',
    icone: <Pen size={18} />,
    parametros: [
      {
        chave: 'linguagem_nivel',
        label: 'Nível de formalidade',
        dica: 'formal-técnico = linguagem jurídica densa; formal-simples = jurídico mas mais direto; neutro = sem termos muito técnicos.',
        descricao: 'Padrão linguístico a ser usado em todas as peças. "formal-tecnico" é o padrão para tribunais.',
        valor: 'formal-tecnico',
        tipo: 'selecao',
        opcoes: ['formal-tecnico', 'formal-simples', 'neutro'],
      },
      {
        chave: 'linguagem_voz',
        label: 'Voz preferencial',
        dica: 'Voz ativa = "O réu causou o dano". Voz passiva = "O dano foi causado pelo réu". PMO/MIT recomenda ativa por ser mais clara.',
        descricao: 'PMO/MIT recomenda voz ativa para clareza e objetividade.',
        valor: 'ativa',
        tipo: 'selecao',
        opcoes: ['ativa', 'passiva', 'mista'],
      },
      {
        chave: 'linguagem_latim',
        label: 'Uso de expressões em latim',
        dica: '"com-traducao" = usa mas traduz na primeira vez. "evitar" = substitui por português. "livre" = usa sem restrição.',
        descricao: 'Se ativado, expressões latinas devem ser traduzidas na primeira ocorrência.',
        valor: 'com-traducao',
        tipo: 'selecao',
        opcoes: ['com-traducao', 'evitar', 'livre'],
      },
      {
        chave: 'linguagem_comprimento_paragrafo',
        label: 'Comprimento máximo de parágrafo (linhas)',
        dica: 'O robô quebra parágrafos que ultrapassem esse número de linhas. Stanford Law recomenda 8 para facilitar a leitura pelo juiz.',
        descricao: 'Stanford Law recomenda no máximo 8 linhas por parágrafo para leitura eficiente.',
        valor: '8',
        tipo: 'numero',
      },
      {
        chave: 'linguagem_repeticao',
        label: 'Instrução contra redundância',
        dica: 'Regra que o robô segue para não repetir o mesmo argumento em vários lugares da mesma peça.',
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
    dica: 'Define o método que o robô usa para montar cada argumento: qual fonte citar primeiro (CF, lei, STF…) e quantos julgados incluir por tese.',
    icone: <Scale size={18} />,
    parametros: [
      {
        chave: 'arg_metodo',
        label: 'Método de argumentação',
        dica: 'IRAC = Issue (questão) → Rule (norma) → Application (aplicação ao caso) → Conclusion. É o método Stanford/PMI. CREAC adiciona uma Counter-argument antes da Conclusion.',
        descricao: 'IRAC (Issue, Rule, Application, Conclusion) é o padrão Stanford/PMI para argumentação jurídica estruturada.',
        valor: 'IRAC',
        tipo: 'selecao',
        opcoes: ['IRAC', 'CREAC', 'Livre'],
      },
      {
        chave: 'arg_hierarquia_fontes',
        label: 'Hierarquia de fontes',
        dica: 'Quando houver mais de uma fonte disponível, o robô escolhe pela ordem desta lista. Uma por linha.',
        descricao: 'Ordem preferencial ao citar fundamentos jurídicos. Uma fonte por linha.',
        valor: '1. Constituição Federal\n2. Lei federal\n3. Súmula vinculante / STF\n4. Súmula STJ\n5. Jurisprudência STF e STJ\n6. Jurisprudência TJRJ\n7. Doutrina\n8. Analogia',
        tipo: 'multiline',
      },
      {
        chave: 'arg_jurisprudencia_max',
        label: 'Máximo de citações jurisprudenciais por tese',
        dica: 'O robô para de adicionar julgados quando atingir esse número por tese. PMO/MIT recomenda 3 para não sobrecarregar a peça.',
        descricao: 'PMO/MIT recomenda no máximo 3 julgados por tese para evitar sobrecarga.',
        valor: '3',
        tipo: 'numero',
      },
      {
        chave: 'arg_tese_min',
        label: 'Mínimo de fundamentos por pedido',
        dica: 'O robô avisa se um pedido tiver menos fundamentos do que esse número. Garante que todo pedido tenha apoio jurídico suficiente.',
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
    dica: 'Controla como o robô redige a seção de pedidos: qual critério usar, como formular pedidos alternativos e o que incluir em tutela de urgência.',
    icone: <Target size={18} />,
    parametros: [
      {
        chave: 'pedidos_criterio',
        label: 'Critério para redigir pedidos',
        dica: 'SMART-JUR = Específico, Mensurável, Baseado em autoridade, Realista, Tempestivo. "Livre" = sem critério fixo.',
        descricao: 'PMI/Stanford adapta os critérios SMART ao direito: Específico, Mensurável, Baseado em autoridade, Realista, Tempestivo.',
        valor: 'SMART-JUR',
        tipo: 'selecao',
        opcoes: ['SMART-JUR', 'Livre'],
      },
      {
        chave: 'pedidos_subsidiarios',
        label: 'Instrução para pedidos subsidiários',
        dica: 'Texto que o robô usa como guia para formular pedidos alternativos — os que valem se o principal não for aceito.',
        descricao: 'Como formular pedidos alternativos quando o principal não puder ser deferido.',
        valor: 'Pedidos subsidiários são apresentados com a expressão "subsidiariamente, caso V. Exa. não acolha o pedido anterior,". São ordenados do mais ao menos favorável ao cliente.',
        tipo: 'multiline',
      },
      {
        chave: 'pedidos_tutela',
        label: 'Tutela de urgência: padrão de justificativa',
        dica: 'Sempre que a peça pedir tutela antecipada ou cautelar, o robô usa esse template para justificar. Inclui os três requisitos do art. 300 CPC.',
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
    dica: 'Define o formato exato que o robô usa para citar julgados e doutrina, e a regra de nunca citar de memória.',
    icone: <BookOpen size={18} />,
    parametros: [
      {
        chave: 'ref_formato_jurisprudencia',
        label: 'Formato de citação de julgados',
        dica: 'Template para citar decisões judiciais. Os campos entre chaves {Tribunal}, {Data} etc. são preenchidos pelo robô.',
        descricao: 'Padrão para identificar decisões judiciais. Campos entre chaves são preenchidos automaticamente.',
        valor: '{Tribunal}, {Órgão Julgador}, {Tipo de Recurso} nº {Número}, Rel. Min./Des. {Nome}, j. {Data}, {DJe/DJ} {Data de Publicação}.',
        tipo: 'multiline',
      },
      {
        chave: 'ref_formato_doutrina',
        label: 'Formato de citação de doutrina',
        dica: 'Template ABNT adaptado. O robô preenche SOBRENOME, Nome, Título, edição, cidade, editora, ano e página.',
        descricao: 'Padrão ABNT adaptado à petição jurídica.',
        valor: 'SOBRENOME, Nome. Título da obra. {ed}. ed. {Cidade}: {Editora}, {Ano}, p. {Página}.',
        tipo: 'multiline',
      },
      {
        chave: 'ref_verificar_antes',
        label: 'Instrução de verificação prévia',
        dica: 'Regra que o robô recebe antes de usar qualquer citação: sempre conferir na fonte original antes de incluir.',
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
    dica: 'O checklist que o robô apresenta antes de protocolar qualquer peça, e as especificações de formatação (margens, fonte, espaçamento).',
    icone: <CheckCircle2 size={18} />,
    parametros: [
      {
        chave: 'qualidade_checklist',
        label: 'Checklist de revisão final',
        dica: 'Lista de verificação que aparece antes de assinar. Um item por linha, começando com ☐. O advogado confirma cada um manualmente.',
        descricao: 'Itens obrigatórios antes de assinar e protocolar qualquer peça. Um item por linha.',
        valor: '☐ Número do processo e vara conferidos\n☐ Nome das partes conferido\n☐ Prazo verificado (tempestividade)\n☐ Pedidos listados e numerados\n☐ Valor da causa declarado\n☐ Documentos listados nos anexos\n☐ Citações verificadas nas fontes originais\n☐ Ortografia e gramática revisadas\n☐ Formatação ABNT e margens NBR 14724\n☐ Assinatura digital aplicada',
        tipo: 'multiline',
      },
      {
        chave: 'qualidade_formatacao',
        label: 'Formatação padrão (NBR 14724)',
        dica: 'Especificações técnicas que o robô aplica ao gerar o documento: fonte, espaçamento, margens e recuos conforme a ABNT.',
        descricao: 'Especificações técnicas de formatação conforme NBR 14724.',
        valor: 'Fonte: Times New Roman ou Arial, corpo 12\nEspaçamento: 1,5 entre linhas; simples entre citações longas\nMargem: superior e esquerda 3 cm; inferior e direita 2 cm\nParágrafos: recuo de 1,25 cm na primeira linha\nCitações longas (>3 linhas): recuo 4 cm, corpo 10, sem aspas',
        tipo: 'multiline',
      },
    ],
  },
  {
    id: 'tipos_pecas',
    titulo: 'Parâmetros por Tipo de Peça',
    subtitulo: 'PMI/Stanford: diferenciação por finalidade processual',
    dica: 'Instruções específicas para cada tipo de peça: como o robô aborda uma petição inicial é diferente de uma contestação ou recurso.',
    icone: <FileText size={18} />,
    parametros: [
      {
        chave: 'tipos_peticao_inicial',
        label: 'Petição inicial',
        dica: 'Instruções de foco e tom para quando o robô rascunha uma petição inicial — a peça que abre o processo.',
        descricao: 'Foco e tom recomendado para petições iniciais.',
        valor: 'Foco: clareza fática e fundamento jurídico sólido. Tom: objetivo e construtivo. Narrar fatos cronologicamente. Demonstrar direito antes do pedido. Sempre quantificar o dano quando possível.',
        tipo: 'multiline',
      },
      {
        chave: 'tipos_contestacao',
        label: 'Contestação',
        dica: 'Estratégia padrão para contestações: como impugnar fatos, onde colocar preliminares e por que sempre ter tese subsidiária.',
        descricao: 'Foco e estratégia recomendada para contestações.',
        valor: 'Estratégia: impugnar especificamente cada fato (art. 341 CPC). Começar pelas preliminares, depois mérito. Sempre apresentar tese subsidiária. Não deixar fatos não impugnados (imputação de verdade).',
        tipo: 'multiline',
      },
      {
        chave: 'tipos_recurso',
        label: 'Recursos (apelação, agravo)',
        dica: 'Critério de quando recorrer e como selecionar os melhores argumentos. PMI/Stanford: só recorrer quando a chance de êxito superar 40%.',
        descricao: 'Foco e critério de seleção de matéria para recursos.',
        valor: 'PMI/Stanford: recorrer somente quando o erro for demonstrável e a perspectiva de êxito for superior a 40%. Selecionar as razões mais fortes (máx. 5 teses por recurso). Foco em questões de direito para STJ/STF.',
        tipo: 'multiline',
      },
      {
        chave: 'tipos_manifestacao',
        label: 'Manifestações e petições incidentais',
        dica: 'Instruções para peças menores (impugnações, réplicas, petições simples): ir ao ponto, não repetir histórico, máx. 10 páginas.',
        descricao: 'Tom e comprimento para manifestações e petições incidentais.',
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
        <Tooltip texto="Fecha este painel de ajuda. Você pode reabri-lo clicando em 'Como usar' no topo da página." posicao="bottom">
          <button
            onClick={onFechar}
            className="text-xs text-grafite/60 hover:text-grafite underline underline-offset-2 shrink-0"
          >
            Entendi, fechar
          </button>
        </Tooltip>
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
  const [erroSalvar, setErroSalvar] = useState(false)
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
        const lido = await lerConfigPrefixo('escrita_')
        const mapa: Record<string, string> = {}
        for (const [chave, valor] of Object.entries(lido)) mapa[chave.replace(/^escrita_/, '')] = valor
        if (Object.keys(mapa).length) setValores(mapa)
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
      const itens: Record<string, string> = {}
      for (const s of SECOES) for (const p of s.parametros) itens[`escrita_${p.chave}`] = getValor(p)
      await gravarConfig(itens)
      setErroSalvar(false)
      setSalvo(true)
      setTimeout(() => setSalvo(false), 3000)
    } catch { setErroSalvar(true) }
    setSalvando(false)
  }

  if (carregando) {
    return (
      <Layout title="Parâmetros de escrita">
        <p className="text-grafite text-sm">Carregando parâmetros…</p>
      </Layout>
    )
  }

  return (
    <Layout title="Parâmetros de escrita">
      <div className="max-w-3xl">

        {/* Painel de boas-vindas */}
        {mostrarBoas && <PainelBoasVindas onFechar={fecharBoas} />}

        {/* Cabeçalho compacto */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-grafite/70">
            Regras que o robô segue ao rascunhar peças — calibradas nos benchmarks <strong>PMO/MIT</strong> e <strong>PMI/Stanford</strong>.
            {!mostrarBoas && (
              <Tooltip texto="Abre o painel explicativo com instruções de uso desta tela — como editar, salvar e aplicar os parâmetros." posicao="bottom">
                <button
                  onClick={() => setMostrarBoas(true)}
                  className="ml-2 inline-flex items-center gap-1 text-dourado underline underline-offset-2"
                >
                  <Info size={11} /> Como usar
                </button>
              </Tooltip>
            )}
          </p>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            <Tooltip texto="Grava todas as alterações feitas nesta tela. As regras entram em vigor na próxima peça que o robô rascunhar." posicao="bottom">
              <button
                onClick={salvar}
                disabled={salvando}
                className="flex items-center gap-1.5 bg-dourado text-white text-sm font-medium px-4 py-2 rounded hover:opacity-90 disabled:opacity-50 transition"
              >
                <Save size={14} />
                {salvando ? 'Salvando…' : 'Salvar'}
              </button>
            </Tooltip>
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
              <Tooltip texto={secao.dica} posicao="bottom">
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
              </Tooltip>

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
                        <Tooltip texto={p.dica} posicao="right">
                          <label className="block text-sm font-medium text-texto mb-0.5 cursor-help">
                            {p.label}
                          </label>
                        </Tooltip>

                        {p.tipo === 'selecao' && (
                          <select
                            title={p.dica}
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
                            aria-label={p.label} title={p.dica} type="number"
                            value={getValor(p)}
                            onChange={e => setValor(p.chave, e.target.value)}
                            onFocus={() => setCampoAtivo(p.chave)}
                            onBlur={() => setCampoAtivo(null)}
                            className="mt-1 w-24 border border-borda rounded-lg px-3 py-1.5 text-sm bg-fundo text-texto focus:outline-none focus:ring-2 focus:ring-dourado/50 focus:border-dourado"
                          />
                        )}

                        {p.tipo === 'texto' && (
                          <input
                            aria-label={p.label} title={p.dica} type="text"
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
                            aria-label={p.label} title={p.dica} rows={Math.max(3, getValor(p).split('\n').length + 1)}
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

        {/* Banca dos dez redatores */}
        <section className="mt-6 border border-borda rounded-xl overflow-hidden" aria-labelledby="banca-titulo">
          <div className="px-4 py-3.5 bg-fundo-alt">
            <Tooltip texto="Os modos de escrever que o robô usa. Cada setor do direito tem o seu redator titular; o robô escolhe sozinho, pela área do processo e pelo tipo da peça, e faz rodízio para duas peças seguidas não saírem iguais." posicao="bottom">
              <h2 id="banca-titulo" className="font-semibold text-sm text-texto cursor-help">Banca de redatores: os {BANCA.length} juristas de referência</h2>
            </Tooltip>
            <p className="text-xs text-grafite/70 mt-1">
              Cada peça automática é escrita no método de um destes juristas, escolhido pela área e pelo tipo da peça. O robô mantém as forças de cada tradição e é proibido de repetir as fraquezas. São referências de estilo: nenhuma peça é escrita, revisada ou endossada por essas pessoas, e toda peça sai como rascunho para revisão do advogado.
            </p>
            <p className="text-xs text-grafite/70 mt-1">
              <strong>Rating adotado</strong> — juristas: {RATING.juristas}. Escritórios: {RATING.escritorios}.
            </p>
          </div>
          <ol className="divide-y divide-borda">
            {BANCA.map((b, i) => (
              <li key={b.id} className="px-4 py-3">
                <Tooltip texto={`Como escreve: ${b.metodo}`} posicao="bottom">
                  <p className="text-sm font-medium text-texto cursor-help">{i + 1}. {b.referencia} <span className="font-normal text-grafite/70">· {b.especialidade}</span></p>
                </Tooltip>
                <p className="text-xs text-grafite mt-1"><strong className="text-green-700 dark:text-green-400">Mantém:</strong> {b.forcas}.</p>
                <p className="text-xs text-grafite mt-0.5"><strong className="text-red-700 dark:text-red-400">Proibido:</strong> {b.evitar}.</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Juristas por setor e escritórios de referência (pedido de M, 12/11/2026) */}
        <section className="bg-superficie border border-borda rounded-xl mt-6" aria-labelledby="setores-titulo" data-testid="juristas-por-setor">
          <div className="px-4 py-3 border-b border-borda">
            <Tooltip texto="Para cada setor do direito há um robô redator e dez juristas de referência. O robô do setor escreve a peça no método deles, sem copiar texto de ninguém." posicao="bottom">
              <h2 id="setores-titulo" className="font-semibold text-sm text-texto cursor-help">Os 10 juristas de referência de cada setor</h2>
            </Tooltip>
            <p className="text-xs text-grafite/70 mt-1">Critério: {RATING.juristas.toLowerCase()}.</p>
          </div>
          <ul className="divide-y divide-borda">
            {JURISTAS_POR_SETOR.map(s => (
              <li key={s.setor} className="px-4 py-2.5 text-xs text-grafite">
                <strong className="text-texto">{s.setor}:</strong> {s.nomes.join(', ')}.
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-borda">
            <Tooltip texto="O padrão de formatação das peças (fonte, margens, numeração, pedidos em alíneas) segue a prática comum destes escritórios. Nenhum manual interno é copiado." posicao="top">
              <h3 className="font-semibold text-xs text-texto cursor-help">Os 10 escritórios de referência de formatação</h3>
            </Tooltip>
            <p className="text-xs text-grafite/70 mt-1">{ESCRITORIOS.join(' · ')}</p>
            <p className="text-xs text-grafite/50 mt-1">Fonte: {RATING.escritorios}.</p>
          </div>
        </section>

        <section className="bg-superficie border border-borda rounded-xl mt-6" aria-labelledby="narrativa-titulo">
          <div className="px-4 py-3 border-b border-borda">
            <Tooltip texto="Técnicas que o robô aplica ao contar os fatos de toda peça. Não dá para editar aqui." posicao="bottom">
              <h2 id="narrativa-titulo" className="font-semibold text-sm text-texto cursor-help">Narrativa dos fatos: as 10 técnicas</h2>
            </Tooltip>
            <p className="text-xs text-grafite/70 mt-1">
              Toda peça conta a história do cliente com estas técnicas. O robô nunca cria fato: o que não estiver nos dados do caso vai entre colchetes para o advogado preencher.
            </p>
          </div>
          <ol className="divide-y divide-borda">
            {NARRATIVA.map((n, i) => (
              <li key={n.nome} className="px-4 py-2.5 text-xs text-grafite"><strong className="text-texto">{i + 1}. {n.nome}:</strong> {n.regra}.</li>
            ))}
          </ol>
        </section>

        <section className="bg-superficie border border-borda rounded-xl mt-6" aria-labelledby="julgador-titulo">
          <div className="px-4 py-3">
            <Tooltip texto="O robô lê as decisões e despachos do juiz ou relator já publicados no processo e ajusta o tom da peça." posicao="bottom">
              <h2 id="julgador-titulo" className="font-semibold text-sm text-texto cursor-help">Tom ajustado a quem vai julgar</h2>
            </Tooltip>
            <p className="text-xs text-grafite mt-1">
              Antes de escrever, o robô lê o que o próprio julgador já publicou no processo: se escreve curto ou longo, se decide por artigo e precedente, se dá peso ao lado humano, se é rigoroso com forma e prazo, se escreve com leveza ou em tom sério. A peça acompanha esse modo. Com pouco texto do julgador, o tom fica sóbrio. Em nenhum caso há piada ou ironia contra pessoa alguma.
            </p>
          </div>
        </section>

        {/* Botão salvar no final */}
        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-borda">
          <Tooltip texto="Grava todas as alterações feitas nesta tela. As regras entram em vigor na próxima peça que o robô rascunhar." posicao="top">
            <button
              onClick={salvar}
              disabled={salvando}
              className="flex items-center gap-2 bg-dourado text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition"
            >
              <Save size={15} />
              {salvando ? 'Salvando…' : 'Salvar parâmetros'}
            </button>
          </Tooltip>
          {salvo && (
            <span className="flex items-center gap-1 text-sm text-green-700 dark:text-green-400">
              <CheckCircle2 size={15} />
              Salvo com sucesso
            </span>
          )}
          {erroSalvar && (
            <span role="alert" className="text-sm text-red-700 dark:text-red-400">
              Não foi possível salvar. Só quem administra o escritório pode alterar estas regras.
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
