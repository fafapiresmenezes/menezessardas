/**
 * Passo C16 — onde a predição por grafo tem chance de acertar E de dar dinheiro.
 *
 * A pergunta não é "qual mercado é grande". Mercado grande já tem fundo grande com máquina grande
 * dentro dele, e ali a nossa vantagem é zero. A pergunta é onde o dado é público e brasileiro, a
 * disputa é pequena, existe comprador identificável no Brasil, e o contexto que sabemos montar
 * (chuva, reservatório, logística, notícia, política pública) move o preço de verdade.
 *
 * A pontuação abaixo é uma OPINIÃO ESTRUTURADA, não uma medição: ela diz por que cada mercado foi
 * pontuado assim e de onde vem o dado, para que qualquer pessoa discorde item por item em vez de
 * ter de acreditar no resultado. O que ela NÃO é está em `NAO_E_RECOMENDACAO`.
 */

export const NAO_E_RECOMENDACAO = [
  'Isto não é recomendação de investimento. A plataforma não compra nem vende ativo nenhum.',
  'A nota é opinião estruturada sobre onde vale trabalhar, não previsão de preço nem de retorno.',
  'Mercado com nota alta aqui pode dar prejuízo a quem operar nele. A nota mede chance de acerto do estudo, não lucro.',
  'Nenhum número desta tela saiu de medição com dado coletado: a medição começa no passo seguinte, e o relatório dirá o erro.',
]

export type Criterio = {
  id: string
  pergunta: string
  peso: number
  /** O que vale 3 e o que vale 0, para a nota não virar gosto pessoal. */
  regua: string
}

export const CRITERIOS: Criterio[] = [
  {
    id: 'dadoPublico',
    pergunta: 'Existe série de preço pública, de graça e com histórico?',
    peso: 3,
    regua: '3 = série diária pública com anos de histórico; 1 = só boletim em PDF; 0 = dado só pago.',
  },
  {
    id: 'atualizacao',
    pergunta: 'De quanto em quanto tempo o dado sai?',
    peso: 2,
    regua: '3 = todo dia útil; 2 = toda semana; 1 = todo mês; 0 = de vez em quando.',
  },
  {
    id: 'poucoRobo',
    pergunta: 'Quão pouca é a disputa de quem já faz isso com máquina?',
    peso: 3,
    regua: '3 = quase ninguém modela; 1 = tem casa especializada; 0 = mercado dominado por fundo quantitativo.',
  },
  {
    id: 'quemPaga',
    pergunta: 'Existe comprador identificável no Brasil, com orçamento?',
    peso: 3,
    regua: '3 = comprador nomeável e já compra estudo hoje; 1 = comprador existe mas não tem o hábito; 0 = não achamos quem paga.',
  },
  {
    id: 'nossoDiferencial',
    pergunta: 'O contexto que sabemos montar move o preço?',
    peso: 2,
    regua: '3 = clima, água, logística e política pública pesam muito; 0 = preço vem de fora do Brasil e do nosso alcance.',
  },
  {
    id: 'custoDeEntrada',
    pergunta: 'Quão barato é montar a coleta e o primeiro estudo?',
    peso: 2,
    regua: '3 = semanas, só dado público; 1 = precisa comprar dado ou convênio; 0 = precisa de licença ou cadastro difícil.',
  },
]

export const PESO_TOTAL = CRITERIOS.reduce((s, c) => s + c.peso, 0)
export const NOTA_MAXIMA = PESO_TOTAL * 3

export type Candidato = {
  id: string
  nome: string
  /** Quem paga, nomeado. Vazio é proibido pelo teste: candidato sem comprador não é candidato. */
  quemPaga: string
  /** De onde viria a série, com endereço. */
  fonte: string
  fonteEndereco: string
  notas: Record<string, number>
  porque: string
  /** O que derruba este candidato. Todo candidato tem um; esconder isso é o começo do engano. */
  contra: string
}

/**
 * Os candidatos. Onde a nota de "dado público" é alta, o endereço da fonte está escrito, e é essa
 * a parte que o próximo passo (C5) vai exercitar de verdade.
 */
export const CANDIDATOS: Candidato[] = [
  {
    id: 'etanol-praca',
    nome: 'Etanol hidratado, preço por praça',
    quemPaga: 'Usinas e comercializadoras do Centro-Sul, cooperativas e distribuidoras regionais',
    fonte: 'CEPEA/Esalq (indicadores por praça) e vendas da UNICA',
    fonteEndereco: 'https://cepea.org.br/br/indicador/etanol.aspx',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 3, quemPaga: 3, nossoDiferencial: 3, custoDeEntrada: 3 },
    porque:
      'Preço diário público por praça, e praça é mercado pequeno demais para fundo grande se mexer. ' +
      'O que move é safra de cana, chuva, moagem, preço do açúcar e tributo estadual — exatamente o tipo de ' +
      'contexto que o grafo junta. Comprador tem o hábito de pagar por boletim de preço.',
    contra:
      'Preço de combustível tem interferência de política de preço e de tributo, que muda por decisão e não por ' +
      'tendência: um modelo bem calibrado pode errar feio na semana de mudança de regra.',
  },
  {
    id: 'boi-gordo',
    nome: 'Boi gordo (arroba) por praça',
    quemPaga: 'Frigoríficos médios, confinamentos, cooperativas e crédito rural',
    fonte: 'CEPEA/Esalq (indicador do boi gordo) e ajustes do contrato futuro da B3',
    fonteEndereco: 'https://cepea.org.br/br/indicador/boi-gordo.aspx',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 2, quemPaga: 3, nossoDiferencial: 3, custoDeEntrada: 3 },
    porque:
      'Indicador diário público, futuro líquido na B3 para conferir, e o preço responde a milho, pasto, chuva, ' +
      'exportação para a China e embargo sanitário — tudo noticiável, tudo no grafo. Quem compra já paga consultoria de preço.',
    contra:
      'O futuro na B3 tem casa especializada olhando, então a parte fácil já está precificada: o espaço está no ' +
      'preço da praça e no prazo curto, não no contrato de referência.',
  },
  {
    id: 'frete-graos',
    nome: 'Frete rodoviário de grãos por rota',
    quemPaga: 'Tradings, cooperativas, embarcadores e transportadoras',
    fonte: 'Piso mínimo da ANTT, pesquisa de frete do CEPEA/SIFRECA e boletins de porto',
    fonteEndereco: 'https://www.gov.br/antt/pt-br/assuntos/transporte-de-cargas/precos-minimos-do-transporte-rodoviario-de-cargas',
    notas: { dadoPublico: 2, atualizacao: 2, poucoRobo: 3, quemPaga: 3, nossoDiferencial: 3, custoDeEntrada: 2 },
    porque:
      'Quase ninguém modela frete rota a rota, e é dinheiro grande: o frete come boa parte da margem do grão. ' +
      'Depende de safra, fila de porto, chuva na estrada, diesel e piso regulado — contexto puro, que é a nossa parte.',
    contra:
      'A série pública é mais pobre e menos frequente que a de commodity, e parte do preço real é combinado em ' +
      'contrato privado que não aparece em lugar nenhum.',
  },
  {
    id: 'milho',
    nome: 'Milho por praça',
    quemPaga: 'Fábricas de ração, avicultura, suinocultura, etanol de milho e cooperativas',
    fonte: 'CEPEA/Esalq, safra da CONAB e ajustes da B3',
    fonteEndereco: 'https://cepea.org.br/br/indicador/milho.aspx',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 2, quemPaga: 3, nossoDiferencial: 2, custoDeEntrada: 3 },
    porque:
      'Dado diário público, demanda interna enorme e segunda safra muito sensível a chuva. O elo com boi e com ' +
      'frango dá para explicar com o grafo, e quem compra ração sente no caixa toda semana.',
    contra:
      'Acompanha o preço de Chicago e o dólar, que vêm de fora do nosso alcance: boa parte da variação não é ' +
      'brasileira nem explicável pelo nosso contexto.',
  },
  {
    id: 'cafe-arabica',
    nome: 'Café arábica',
    quemPaga: 'Cooperativas, exportadores e torrefadores',
    fonte: 'CEPEA/Esalq e bolsa de Nova York para referência',
    fonteEndereco: 'https://cepea.org.br/br/indicador/cafe.aspx',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 1, quemPaga: 2, nossoDiferencial: 2, custoDeEntrada: 3 },
    porque: 'Dado diário público e clima brasileiro manda no preço mundial, o que é um diferencial raro.',
    contra:
      'É o mercado agrícola brasileiro mais olhado por casa estrangeira especializada: a chance de termos ' +
      'vantagem de informação é a menor da lista.',
  },
  {
    id: 'soja',
    nome: 'Soja',
    quemPaga: 'Tradings, cooperativas e crédito rural',
    fonte: 'CEPEA/Esalq, CONAB e B3',
    fonteEndereco: 'https://cepea.org.br/br/indicador/soja.aspx',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 0, quemPaga: 3, nossoDiferencial: 1, custoDeEntrada: 3 },
    porque:
      'Dado público excelente, série longa e comprador com orçamento grande: se a vantagem viesse só de ter ' +
      'o número, seria aqui.',
    contra:
      'É o mercado mais disputado por máquina do agro: o preço se forma em Chicago, em dólar, com fundo grande ' +
      'dos dois lados. Entrar aqui é competir no terreno do adversário.',
  },
  {
    id: 'energia-livre',
    nome: 'Energia no mercado livre (preço de curto prazo)',
    quemPaga: 'Comercializadoras, indústrias eletrointensivas e geradores',
    fonte: 'CCEE (preço de liquidação), ONS (carga e reservatório) e ANA (água)',
    fonteEndereco: 'https://www.ccee.org.br/precos/painel-precos',
    notas: { dadoPublico: 2, atualizacao: 3, poucoRobo: 1, quemPaga: 3, nossoDiferencial: 3, custoDeEntrada: 1 },
    porque:
      'É o mercado onde o nosso dado de água (passo C3) vale mais: reservatório e chuva mandam no preço. ' +
      'Comprador paga caro por previsão e já contrata consultoria.',
    contra:
      'O preço é resultado de um modelo oficial com regra que muda, não de livre oferta: errar a regra é errar ' +
      'tudo, e as casas que vivem disso têm o modelo oficial rodando há anos.',
  },
  {
    id: 'carbono-regulado',
    nome: 'Crédito de carbono do mercado regulado brasileiro',
    quemPaga: 'Indústrias que vão entrar no sistema, auditoras e bancos',
    fonte: 'Sistema Brasileiro de Comércio de Emissões (Lei 15.042/2024), em regulamentação',
    fonteEndereco: 'https://www.gov.br/fazenda/pt-br/composicao/orgaos/mercado-de-carbono/sobre/sistema-brasileiro-de-comercio-de-emissoes',
    notas: { dadoPublico: 0, atualizacao: 0, poucoRobo: 3, quemPaga: 2, nossoDiferencial: 3, custoDeEntrada: 1 },
    porque:
      'Mercado que ainda não existe na prática é mercado sem concorrente: quem chegar com método pronto chega antes. ' +
      'A fase atual é de medição e relato de emissão pelos setores cobertos.',
    contra:
      'Não há série de preço para prever, porque ainda não há negociação. Hoje isto é estudo e preparação, não ' +
      'produto de predição: prometer previsão aqui seria vender o que não existe.',
  },
  {
    id: 'cfem-minerio',
    nome: 'Arrecadação mineral por município',
    quemPaga: 'Prefeituras de município minerador, mineradoras e consultorias de royalty',
    fonte: 'ANM (arrecadação da CFEM por município e substância)',
    fonteEndereco: 'https://dados.gov.br/dados/conjuntos-dados/arrecadao-cfem',
    notas: { dadoPublico: 3, atualizacao: 1, poucoRobo: 3, quemPaga: 2, nossoDiferencial: 2, custoDeEntrada: 2 },
    porque:
      'Dado aberto e quase ninguém modela. Prefeitura que depende de royalty precisa saber a receita do ano que ' +
      'vem para fazer orçamento, e hoje decide no escuro.',
    contra:
      'Atualiza devagar e a série é mensal: dá estudo anual bom, não boletim semanal. Orçamento de prefeitura é ' +
      'venda lenta, com licitação.',
  },
  {
    id: 'precatorios',
    nome: 'Precatórios no mercado secundário',
    quemPaga: 'Fundos de precatório, escritórios e credores',
    fonte: 'Orçamento da União e dos estados, listas dos tribunais',
    fonteEndereco: 'https://www.cnj.jus.br/transparencia-cnj/',
    notas: { dadoPublico: 1, atualizacao: 1, poucoRobo: 2, quemPaga: 3, nossoDiferencial: 2, custoDeEntrada: 1 },
    porque:
      'Casa com o que o Instituto já sabe de direito, e quem compra precatório paga bem por prazo estimado com ' +
      'incerteza declarada.',
    contra:
      'O que define o preço é prazo de pagamento público e risco de mudança de regra, não série de preço: é outro ' +
      'tipo de modelo. E parte do dado é processual, área congelada agora por ordem do dono.',
  },
  {
    id: 'leiloes-publicos',
    nome: 'Compras e leilões públicos (preço de referência)',
    quemPaga: 'Fornecedores do governo e órgãos que precisam de preço de referência',
    fonte: 'Portal Nacional de Contratações Públicas e Compras.gov.br',
    fonteEndereco: 'https://pncp.gov.br/',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 3, quemPaga: 2, nossoDiferencial: 2, custoDeEntrada: 2 },
    porque:
      'Dado aberto, atualizado todo dia e pouquíssimo modelado. Serve tanto para o fornecedor saber o preço de ' +
      'entrada quanto para o órgão saber se está pagando caro.',
    contra:
      'Não é mercado com preço único: cada item tem descrição própria e comparar maçã com maçã é a maior parte do ' +
      'trabalho. Vender para órgão público é lento.',
  },
  {
    id: 'agua-reservatorio',
    nome: 'Água armazenada nos reservatórios',
    quemPaga: 'Quem compra energia, saneamento e irrigação; entra como insumo de outros estudos',
    fonte: 'ANA/SNIRH (situação dos reservatórios)',
    fonteEndereco: 'https://www.ana.gov.br/sar',
    notas: { dadoPublico: 3, atualizacao: 3, poucoRobo: 2, quemPaga: 1, nossoDiferencial: 3, custoDeEntrada: 3 },
    porque:
      'Já está instalado na plataforma (passo C3) e é insumo de energia, de agro e de saneamento: vale mais como ' +
      'peça do grafo do que como produto sozinho.',
    contra: 'Quase ninguém compra "nível de reservatório": o dinheiro está no que ele explica, não nele.',
  },
]

export type Pontuado = Candidato & { nota: number; porCriterio: Record<string, number> }

export function pontuar(c: Candidato): Pontuado {
  const porCriterio: Record<string, number> = {}
  let nota = 0
  for (const crit of CRITERIOS) {
    const n = c.notas[crit.id] ?? 0
    porCriterio[crit.id] = n * crit.peso
    nota += n * crit.peso
  }
  return { ...c, nota, porCriterio }
}

/** Do melhor para o pior; empate desfeito pelo nome, para a ordem não depender da sorte. */
export function ranking(candidatos: Candidato[] = CANDIDATOS): Pontuado[] {
  return candidatos.map(pontuar).sort((a, b) => b.nota - a.nota || a.nome.localeCompare(b.nome))
}

/**
 * Os três finalistas propostos. Saem do ranking, não da minha opinião solta: se alguém mudar uma
 * nota, os finalistas mudam com ela. A escolha final é de M — o critério de aceite do passo diz
 * isso, e o texto abaixo não finge que já foi feita.
 */
export function finalistas(candidatos: Candidato[] = CANDIDATOS): Pontuado[] {
  return ranking(candidatos).slice(0, 3)
}

export const ESCOLHA_PENDENTE =
  'Os três finalistas acima são proposta. Quem escolhe é o dono do Instituto, e até a escolha nenhum ' +
  'deles vira produto: o passo seguinte só começa depois do toque dele.'

export const DECIDIDO_EM: string | null = null
