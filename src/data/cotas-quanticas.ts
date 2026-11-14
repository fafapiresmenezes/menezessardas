/**
 * Passo D6 (pedido de M em 13/11/2026, ajustado por ele às 15h03): revender cotas de computação
 * quântica da IBM e TODA recarga da plataforma com 40% de acréscimo, explicando uma por uma para
 * que cada coisa serve.
 *
 * Os números da IBM vieram da página de preços da própria IBM, lida em 13/11/2026, e carregam a
 * data. Preço de nuvem muda sem aviso: a tela mostra a data da consulta em vez de fingir que é de
 * hoje. Nada é convertido para real aqui, porque a cotação muda todo dia; a conversão é feita na
 * fatura, pelo câmbio do dia, e a tela diz isso.
 *
 * Onde NÃO há número conferido, não há número inventado: a linha diz como é medido e que o preço
 * sai do custo do fornecedor no mês mais os 40%. É preferível uma lacuna honesta a um preço falso
 * numa tela que o cliente usa para decidir.
 */
export const FONTE_PRECO = 'https://www.ibm.com/quantum/pricing'
export const CONSULTADO_EM = '13/11/2026'

/** Um só acréscimo para tudo o que é recarregável, por decisão de M em 13/11/2026. */
export const ACRESCIMO = 0.40

export interface PlanoIBM {
  id: string
  nome: string
  comoCobra: string
  /** Dólares por minuto de processador quântico, como a IBM publica. */
  custoMinutoUSD: number | null
  minimo: string
  paraQueServe: string
}

export const PLANOS: PlanoIBM[] = [
  { id: 'aberto', nome: 'Aberto (grátis)', comoCobra: 'Sem cobrança',
    custoMinutoUSD: null, minimo: '10 minutos por mês',
    paraQueServe: 'Serve para experimentar antes de gastar: a IBM dá até 10 minutos de processamento por mês, e diz que quem usa de verdade pode pedir mais. Dá para rodar o primeiro teste do seu problema e ver se vale ir adiante.' },
  { id: 'por-uso', nome: 'Por uso', comoCobra: 'Por segundo usado',
    custoMinutoUSD: 96, minimo: '1 segundo',
    paraQueServe: 'Serve para quem vai usar de vez em quando: usa, paga o que usou, sem contrato e sem compromisso de ano. É por onde quase todo cliente começa quando o teste grátis acabou.' },
  { id: 'reservado', nome: 'Reservado', comoCobra: 'Tempo comprado adiantado',
    custoMinutoUSD: 72, minimo: '400 minutos por ano',
    paraQueServe: 'Serve para quem já sabe que vai usar o ano inteiro: o minuto sai um quarto mais barato que no "por uso", em troca de comprar 400 minutos adiantado e assinar contrato com a IBM.' },
  { id: 'anual', nome: 'Anual', comoCobra: 'Assinatura de um ano',
    custoMinutoUSD: 48, minimo: '5.200 minutos por ano',
    paraQueServe: 'Serve para centro de pesquisa ou empresa que roda quase todo dia: é o menor preço por minuto, metade do "por uso", mas exige contrato e um compromisso grande de volume.' },
]

/** Preço final com o acréscimo, em dólares por minuto. */
export const precoFinalUSD = (custoMinutoUSD: number): number =>
  Math.round(custoMinutoUSD * (1 + ACRESCIMO) * 100) / 100

export interface UsoDaCota {
  titulo: string
  paraQue: string
  exemplo: string
  tamanho: string
}

/** Para que serve uma cota quântica, em português, com exemplo. Nenhum promete vantagem sobre o computador comum. */
export const USOS: UsoDaCota[] = [
  { titulo: 'Montar rota e escala', paraQue: 'Problemas de escolher a melhor combinação entre muitas: rota de entrega, escala de plantão, alocação de equipe.',
    exemplo: 'Testar o roteiro de 20 entregas por dois caminhos, o quântico e o comum, e comparar resultado e tempo.', tamanho: '1 a 10 minutos' },
  { titulo: 'Carteira e risco', paraQue: 'Escolher uma combinação de ativos dentro de restrições, e medir risco por simulação.',
    exemplo: 'Rodar a mesma otimização de carteira nos dois caminhos e guardar a diferença.', tamanho: '5 a 30 minutos' },
  { titulo: 'Simular molécula e material', paraQue: 'Calcular a energia de moléculas pequenas, que é o uso em que a máquina quântica é mais natural.',
    exemplo: 'Energia de uma molécula de poucos átomos, comparada com o valor conhecido na literatura.', tamanho: '10 a 60 minutos' },
  { titulo: 'Pesquisa em criptografia pós-quântica', paraQue: 'Estudar o que muda para as assinaturas e os selos quando houver máquina grande o bastante.',
    exemplo: 'Rodar os exemplos didáticos e preparar a migração do selo do Instituto para assinatura pós-quântica.', tamanho: '1 a 10 minutos' },
  { titulo: 'Número aleatório com prova', paraQue: 'Gerar sorteio com prova de que o resultado não foi escolhido por ninguém.',
    exemplo: 'Sorteio de amostra em auditoria, com o comprovante guardado junto do resultado.', tamanho: 'segundos' },
  { titulo: 'Ensino e pesquisa', paraQue: 'Aula, laboratório e trabalho de pós-graduação com acesso a máquina de verdade.',
    exemplo: 'Turma de 30 alunos rodando o mesmo circuito e comparando com o simulador.', tamanho: '10 a 60 minutos' },
]

/**
 * O que a máquina quântica de hoje NÃO faz melhor. Isto fica na tela de propósito: vender cota
 * prometendo vantagem que não existe é o jeito mais rápido de perder o cliente e a razão.
 */
export const NAO_FAZ: string[] = [
  'Não quebra a criptografia que os bancos usam hoje: as máquinas atuais são pequenas e ruidosas demais para isso.',
  'Não roda planilha, banco de dados, site nem inteligência artificial mais rápido.',
  'Não substitui o computador comum em quase nada: na maior parte dos problemas ele ganha, e com folga.',
  'O resultado vem com ruído, então quase todo uso precisa repetir muitas vezes e tratar o erro.',
  'Vantagem comprovada sobre o melhor método comum ainda é exceção, e cada caso precisa ser medido, não suposto.',
]

export interface Recarga {
  id: string
  nome: string
  /** O serviço de fora que é consumido. */
  fornecedor: string
  paraQueServe: string
  /** O que acontece na prática quando esta recarga acaba. */
  seAcabar: string
  comoEMedido: string
  /** Número conferido, quando existe; null quando o custo só se sabe na fatura do mês. */
  custoConhecido: string | null
}

/**
 * TODA recarga da plataforma, cada uma explicada. Todas levam o mesmo acréscimo de 40%.
 * Quem recarrega vê, no extrato, o custo do fornecedor e o acréscimo em linhas separadas.
 */
export const RECARGAS: Recarga[] = [
  {
    id: 'quantica', nome: 'Minutos de computador quântico', fornecedor: 'IBM Quantum',
    paraQueServe: 'Rodar na máquina quântica de verdade os problemas da lista acima: rota, escala, carteira, molécula, sorteio com prova, aula.',
    seAcabar: 'O trabalho na fila para de rodar e fica esperando a próxima recarga. Nada é perdido.',
    comoEMedido: 'Por segundo de processador, convertido para minuto no extrato.',
    custoConhecido: `US$ 96,00 a US$ 48,00 por minuto conforme o plano (IBM, ${CONSULTADO_EM})`,
  },
  {
    id: 'escrita', nome: 'Escrita e leitura por inteligência artificial', fornecedor: 'Anthropic',
    paraQueServe: 'É o que escreve o rascunho da peça, resume o processo, compara depoimento, lê contrato e responde o assistente. É a recarga que o escritório mais consome.',
    seAcabar: 'A plataforma continua inteira — prazos, agenda, processos, arquivos — mas para de gerar texto novo até recarregar.',
    comoEMedido: 'Por tamanho de texto lido e escrito, somado por escritório e mostrado na tela Consumo.',
    custoConhecido: null,
  },
  {
    id: 'tribunais', nome: 'Consulta a tribunal', fornecedor: 'CNJ e tribunais',
    paraQueServe: 'É o robô que busca movimentação e intimação nos tribunais e transforma isso em prazo na agenda, de quatro em quatro horas.',
    seAcabar: 'Os prazos já na agenda continuam, mas param de chegar prazos novos — é a recarga mais perigosa de deixar acabar.',
    comoEMedido: 'Por consulta feita, por processo acompanhado.',
    custoConhecido: null,
  },
  {
    id: 'email', nome: 'Envio de e-mail', fornecedor: 'Brevo',
    paraQueServe: 'Manda o aviso de prazo, a peça pronta para revisão, o resumo da semana e o convite de quem entra no escritório.',
    seAcabar: 'Os avisos deixam de sair. O que estava para ser mandado fica guardado e sai quando recarregar.',
    comoEMedido: 'Por e-mail enviado.',
    custoConhecido: null,
  },
  {
    id: 'kyc', nome: 'Checagem de empresa e de pessoa', fornecedor: 'Bases públicas e de cadastro',
    paraQueServe: 'Confere CNPJ, sócios, situação e risco antes de o escritório assinar com um cliente novo ou um fornecedor.',
    seAcabar: 'A checagem fica pendente e o cadastro segue sem o parecer de risco.',
    comoEMedido: 'Por empresa ou pessoa consultada.',
    custoConhecido: null,
  },
  {
    id: 'arquivos', nome: 'Guarda de arquivo', fornecedor: 'Supabase',
    paraQueServe: 'Guarda contrato, peça, documento do processo e fatura, separados por escritório.',
    seAcabar: 'O que está guardado continua lá e continua sendo lido; para de aceitar arquivo novo.',
    comoEMedido: 'Por espaço ocupado no mês.',
    custoConhecido: null,
  },
  {
    id: 'selo', nome: 'Selo de data em blockchain', fornecedor: 'OpenTimestamps e Bitcoin',
    paraQueServe: 'Prova que um documento existia numa data, sem depender da palavra do Instituto nem da nossa.',
    seAcabar: 'O documento continua guardado, só não ganha o selo até recarregar.',
    comoEMedido: 'Por selo emitido.',
    custoConhecido: null,
  },
]
