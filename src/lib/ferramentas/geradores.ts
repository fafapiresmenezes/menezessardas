// Theye Suporte Jurídico — modelos prontos (texto para copiar) e listas de verificação do dia a dia.
import { br } from './base'
import { dataPorExtenso, inteiroPorExtenso, reaisPorExtenso } from './textos'
import { validarCnpj, validarCpf } from './documentos'

const v = (s: string | undefined, marcador: string) => (s && s.trim() ? s.trim() : `[${marcador}]`)

export function enderecamento(tipo: string, vara: string, comarca: string) {
  const juizo = ({
    civel: `JUÍZO DE DIREITO DA ${v(vara, 'Nª').toUpperCase()} VARA CÍVEL DA COMARCA DE ${v(comarca, 'COMARCA').toUpperCase()}`,
    familia: `JUÍZO DE DIREITO DA ${v(vara, 'Nª').toUpperCase()} VARA DE FAMÍLIA DA COMARCA DE ${v(comarca, 'COMARCA').toUpperCase()}`,
    jec: `JUIZADO ESPECIAL CÍVEL DA COMARCA DE ${v(comarca, 'COMARCA').toUpperCase()}`,
    federal: `JUÍZO FEDERAL DA ${v(vara, 'Nª').toUpperCase()} VARA FEDERAL DA SEÇÃO JUDICIÁRIA DE ${v(comarca, 'SEÇÃO').toUpperCase()}`,
    trabalho: `JUÍZO DA ${v(vara, 'Nª').toUpperCase()} VARA DO TRABALHO DE ${v(comarca, 'CIDADE').toUpperCase()}`,
    tribunal: `TRIBUNAL DE JUSTIÇA DO ESTADO ${v(comarca, 'DO ESTADO').toUpperCase()}`,
  } as Record<string, string>)[tipo] ?? ''
  const pronome = tipo === 'tribunal' ? 'EXCELENTÍSSIMO(A) SENHOR(A) DESEMBARGADOR(A) PRESIDENTE DO' : tipo === 'jec' ? 'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DE DIREITO DO' : 'EXCELENTÍSSIMO(A) SENHOR(A) JUIZ(A) DO'
  return `${pronome} ${juizo}`
}

export type Parte = { nome?: string; nacionalidade?: string; estadoCivil?: string; profissao?: string; documento?: string; email?: string; endereco?: string }
/** Qualificação (CPC, art. 319, II). Documento com 14 posições é tratado como CNPJ. */
export function qualificacao(p: Parte) {
  const doc = (p.documento ?? '').replace(/[^0-9A-Za-z]/g, '')
  const pj = doc.length === 14
  const avisos: string[] = []
  let docTxt = v(p.documento, 'CPF')
  if (doc) {
    const r = pj ? validarCnpj(doc) : validarCpf(doc)
    docTxt = r.formatado
    if (!r.valido) avisos.push(`${pj ? 'CNPJ' : 'CPF'} informado não é válido: ${r.motivo}`)
  }
  const texto = pj
    ? `${v(p.nome, 'RAZÃO SOCIAL').toUpperCase()}, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº ${docTxt}, endereço eletrônico ${v(p.email, 'e-mail')}, com sede em ${v(p.endereco, 'endereço completo com CEP')}`
    : `${v(p.nome, 'NOME COMPLETO').toUpperCase()}, ${v(p.nacionalidade, 'nacionalidade')}, ${v(p.estadoCivil, 'estado civil / existência de união estável')}, ${v(p.profissao, 'profissão')}, inscrito(a) no CPF sob o nº ${docTxt}, endereço eletrônico ${v(p.email, 'e-mail')}, residente e domiciliado(a) em ${v(p.endereco, 'endereço completo com CEP')}`
  return { texto, avisos }
}

export const PODERES_ESPECIAIS = ['receber citação', 'confessar', 'reconhecer a procedência do pedido', 'transigir', 'desistir', 'renunciar ao direito sobre o qual se funda a ação', 'receber e dar quitação', 'firmar compromisso', 'assinar declaração de hipossuficiência econômica']
/** Procuração ad judicia et extra (CPC, art. 105): poderes especiais só valem se expressos. */
export function procuracao(outorgante: string, advogado: string, oab: string, finalidade: string, poderes: string[], cidade: string, data: string) {
  const esp = poderes.length ? ` e ainda os poderes especiais para ${poderes.join(', ')}` : ''
  return `PROCURAÇÃO AD JUDICIA ET EXTRA\n\nOUTORGANTE: ${v(outorgante, 'qualificação completa do outorgante')}.\n\nOUTORGADO(A): ${v(advogado, 'nome do(a) advogado(a)')}, inscrito(a) na OAB/${v(oab, 'UF nº')}.\n\nPODERES: amplos poderes para o foro em geral, com a cláusula ad judicia et extra, para atuar em qualquer juízo, instância ou tribunal, podendo propor ações, contestar, recorrer, requerer, substabelecer com ou sem reserva de poderes, praticar todos os atos necessários ao fiel cumprimento deste mandato (CPC, art. 105)${esp}, especialmente para ${v(finalidade, 'finalidade do mandato')}.\n\n${v(cidade, 'Cidade')}, ${data ? dataPorExtenso(data) : '[data]'}.\n\n______________________________\nOutorgante`
}

export function notificacaoLocacao(tipo: string, locador: string, locatario: string, imovel: string, valorDebito: number, prazoDias: number, cidade: string, data: string) {
  const corpo = ({
    'denuncia-vazia': `Fica V. Sa. NOTIFICADO(A) de que o(a) LOCADOR(A) não tem interesse na continuidade da locação do imóvel situado em ${v(imovel, 'endereço do imóvel')}, contratada por prazo indeterminado, concedendo-lhe o prazo de 30 (trinta) dias para a desocupação voluntária, nos termos dos arts. 46, § 2º, e 57 da Lei 8.245/1991, sob pena de ajuizamento da ação de despejo.`,
    cobranca: `Fica V. Sa. NOTIFICADO(A) a pagar, no prazo de ${prazoDias || 10} (${inteiroPorExtenso(prazoDias || 10)}) dias, o débito locatício de ${valorDebito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${reaisPorExtenso(valorDebito)}), referente ao imóvel situado em ${v(imovel, 'endereço do imóvel')}, sob pena de ajuizamento de ação de despejo por falta de pagamento cumulada com cobrança (Lei 8.245/1991, arts. 9º, III, e 62).`,
    preferencia: `Em atenção ao direito de preferência (Lei 8.245/1991, arts. 27 e 28), fica V. Sa. NOTIFICADO(A) de que o imóvel situado em ${v(imovel, 'endereço do imóvel')} será alienado pelo preço de ${valorDebito.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}, nas condições anexas, dispondo do prazo de 30 (trinta) dias para manifestar, de forma inequívoca, sua aceitação integral da proposta.`,
  } as Record<string, string>)[tipo] ?? ''
  return `NOTIFICAÇÃO EXTRAJUDICIAL\n\nNOTIFICANTE: ${v(locador, 'locador(a)')}\nNOTIFICADO(A): ${v(locatario, 'locatário(a)')}\n\n${corpo}\n\n${v(cidade, 'Cidade')}, ${data ? dataPorExtenso(data) : '[data]'}.\n\n______________________________\n${v(locador, 'locador(a)')}`
}

export function recibo(tipo: string, pagador: string, recebedor: string, documento: string, valor: number, referente: string, cidade: string, data: string) {
  const titulo = tipo === 'aluguel' ? 'RECIBO DE ALUGUEL' : 'RECIBO DE HONORÁRIOS ADVOCATÍCIOS'
  return `${titulo}\n\nValor: ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n\nRecebi(emos) de ${v(pagador, 'pagador')} a importância de ${valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} (${reaisPorExtenso(valor)}), referente a ${v(referente, 'descrição')}, pelo que dou(damos) plena e geral quitação quanto ao valor recebido.\n\n${v(cidade, 'Cidade')}, ${data ? dataPorExtenso(data) : '[data]'}.\n\n______________________________\n${v(recebedor, 'recebedor')} — ${v(documento, 'CPF/CNPJ')}`
}

export function hipossuficiencia(nome: string, cpf: string, renda: number, dependentes: number, cidade: string, data: string) {
  return `DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA\n\n${v(nome, 'NOME').toUpperCase()}, inscrito(a) no CPF sob o nº ${cpf ? validarCpf(cpf).formatado : '[CPF]'}, declara, para os fins dos arts. 98 e 99, § 3º, do Código de Processo Civil, que não possui condições de arcar com as custas e despesas processuais sem prejuízo do próprio sustento e de sua família${renda > 0 ? `, tendo renda mensal de ${renda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : ''}${dependentes > 0 ? ` e ${dependentes} dependente(s)` : ''}. Declara, ainda, estar ciente de que a falsidade desta declaração sujeita o declarante às sanções civis e penais cabíveis (CPC, art. 100, parágrafo único; CP, art. 299).\n\n${v(cidade, 'Cidade')}, ${data ? dataPorExtenso(data) : '[data]'}.\n\n______________________________\n${v(nome, 'Declarante')}`
}

/** Referência de jurisprudência no padrão ABNT NBR 6023. */
export function citacaoJulgado(tribunal: string, classe: string, numero: string, relator: string, orgao: string, julgamento: string, publicacao: string, fonte: string) {
  const t = v(tribunal, 'TRIBUNAL').toUpperCase()
  return `BRASIL. ${t === 'STF' ? 'Supremo Tribunal Federal' : t === 'STJ' ? 'Superior Tribunal de Justiça' : t}. ${v(classe, 'Classe')} ${v(numero, 'nº')}. Relator: ${v(relator, 'Min./Des.')}. ${v(orgao, 'Órgão julgador')}, julgado em ${julgamento ? br(julgamento) : '[data]'}. ${fonte ? `${fonte}, ` : ''}${publicacao ? `publicado em ${br(publicacao)}` : '[data de publicação]'}.`
}

// ---------- Listas de verificação ----------
export const CHECKLISTS: Record<string, { titulo: string; itens: string[] }> = {
  inicial: { titulo: 'Requisitos da petição inicial (CPC, arts. 319 e 320)', itens: [
    'Juízo a que é dirigida (art. 319, I)', 'Qualificação completa das partes, com CPF/CNPJ e e-mail (art. 319, II)', 'Fatos e fundamentos jurídicos do pedido (art. 319, III)', 'Pedido com suas especificações (art. 319, IV)', 'Valor da causa (art. 319, V, e art. 292)', 'Provas que pretende produzir (art. 319, VI)', 'Opção pela audiência de conciliação ou mediação (art. 319, VII)', 'Documentos indispensáveis (art. 320)', 'Procuração (art. 104) ou declaração de urgência', 'Guia de custas paga ou pedido de gratuidade (arts. 82 e 99)',
  ] },
  locacao: { titulo: 'Cláusulas essenciais do contrato de locação (Lei 8.245/1991)', itens: [
    'Qualificação de locador, locatário e garantidor', 'Descrição do imóvel e destinação (residencial/não residencial)', 'Prazo; com 30 meses ou mais, permite denúncia vazia ao final (art. 46)', 'Valor do aluguel, vencimento e forma de pagamento', 'Índice e periodicidade de reajuste (mínimo anual — Lei 10.192/2001)', 'Uma única modalidade de garantia (art. 37)', 'Multa por devolução antecipada, proporcional (art. 4º)', 'Encargos: IPTU, condomínio e despesas extraordinárias (arts. 22 e 23)', 'Benfeitorias: necessárias, úteis e voluptuárias (arts. 35 e 36)', 'Laudo de vistoria de entrada anexo (art. 22, V)', 'Cláusula de vigência em caso de alienação, averbada na matrícula (art. 8º)', 'Direito de preferência e forma de notificação (art. 27)',
  ] },
  audiencia: { titulo: 'Preparação de audiência', itens: [
    'Conferir data, hora, sala ou link da audiência e o fuso', 'Rol de testemunhas no prazo fixado (até 15 dias — CPC, art. 357, § 4º)', 'No máximo 10 testemunhas, 3 por fato (art. 357, § 6º)', 'Intimação das testemunhas pelo advogado, com AR juntado (art. 455)', 'Carta de preposição e atos constitutivos (pessoa jurídica)', 'Documentos originais e cópias organizados por tese', 'Roteiro de perguntas e contraditas', 'Proposta de acordo com limites autorizados pelo cliente por escrito', 'Cliente orientado sobre roupa, horário e comportamento', 'Teste de câmera, áudio e internet (audiência virtual)',
  ] },
}
export function avaliarChecklist(id: string, marcados: string[]) {
  const c = CHECKLISTS[id]
  if (!c) throw new Error('Lista não encontrada')
  const feitos = c.itens.filter(i => marcados.includes(i))
  return { titulo: c.titulo, feitos: feitos.length, total: c.itens.length, pct: Math.round(100 * feitos.length / c.itens.length), pendentes: c.itens.filter(i => !marcados.includes(i)) }
}

export const ROTEIROS_ENTREVISTA: Record<string, string[]> = {
  locacao: ['Quem é o locador e quem é o locatário? Há fiador ou outra garantia?', 'Existe contrato escrito? Qual o prazo e quando vence?', 'Qual o valor atual do aluguel e o índice de reajuste?', 'Há aluguéis ou encargos em atraso? Desde quando?', 'Houve vistoria de entrada com fotos?', 'Já houve notificação por escrito? Guarde os comprovantes.'],
  familia: ['Qual a composição familiar (filhos, idades)?', 'Há regime de bens e data do casamento/união?', 'Quais as despesas mensais dos filhos (escola, saúde, alimentação)?', 'Qual a renda das partes e como se comprova?', 'Há risco de violência ou medida protetiva necessária?', 'Qual o melhor resultado para o cliente, e para as crianças?'],
  consumidor: ['O que foi comprado/contratado, quando e de quem?', 'Qual o problema e quando foi percebido? (CDC, art. 26)', 'Há protocolo de reclamação no SAC ou consumidor.gov.br?', 'Quais documentos: nota fiscal, prints, conversas, laudos?', 'Houve dano material comprovável? E abalo além do mero aborrecimento?', 'O cliente aceita solução amigável? Qual o valor mínimo?'],
  trabalhista: ['Datas de admissão e desligamento; houve registro em carteira?', 'Função, salário e jornada reais (horas extras, intervalo)', 'Como foi o desligamento: pedido, justa causa, sem justa causa?', 'Verbas recebidas na rescisão e documentos assinados', 'Testemunhas disponíveis e provas digitais', 'Lembrar: ajuizar em até 2 anos após o fim do contrato (CF, art. 7º, XXIX)'],
}
export const ESCUTA_ATIVA = ['Comece pelo relato livre do cliente, sem interromper nos primeiros minutos.', 'Repita com suas palavras o que entendeu ("Se entendi bem, o senhor...").', 'Nomeie a emoção percebida ("Imagino que isso tenha sido muito desgastante").', 'Explique os próximos passos e prazos em linguagem simples e por escrito.', 'Combine o canal e a frequência de contato (gerencia a ansiedade e evita cobranças).']

/** Notícia difícil ao cliente, adaptada do protocolo SPIKES (Baile et al., 2000). */
export function noticiaDificil(cliente: string, noticia: string, proximos: string, canal: string) {
  return [
    `1. Preparar o ambiente (Setting): ${canal === 'presencial' ? 'sala reservada, sem interrupções, celular em silêncio' : canal === 'video' ? 'videochamada agendada, câmera ligada, sem pressa' : 'ligação em horário combinado; evite dar a notícia por mensagem'}.`,
    `2. Entender o que ${v(cliente, 'o cliente')} já sabe (Perception): "O que o(a) senhor(a) já sabe sobre como o processo está?"`,
    '3. Perguntar quanto quer saber (Invitation): "Prefere que eu explique todos os detalhes ou vamos direto ao resultado e ao que fazer agora?"',
    `4. Dar a informação (Knowledge): avise antes ("Infelizmente não tenho uma boa notícia") e diga de forma direta e simples: ${v(noticia, 'a notícia')}.`,
    '5. Acolher a emoção (Emotions): pare, faça silêncio, reconheça o sentimento ("Entendo que é frustrante"), não minimize nem culpe.',
    `6. Plano e resumo (Strategy/Summary): ${v(proximos, 'próximos passos, prazos e custos')}. Confirme o entendimento e envie um resumo por escrito.`,
  ]
}
