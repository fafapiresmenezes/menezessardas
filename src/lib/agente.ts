/**
 * Cliente do agente de análise. Quando o Supabase está configurado, chama a
 * função no servidor (a chave da Anthropic nunca vem para o navegador). Sem
 * Supabase, devolve uma análise de exemplo para a plataforma ser demonstrada.
 */
import { supabase, supabaseConfigurado } from './supabase'
import type { Contrato, Imovel } from './repositorio'
import { formatarData } from './datas'
import { rotulosIndice, rotulosTipoContrato, rotulosGarantia } from './rotulos'
import { registrarEvento } from './trilha'

export interface AnaliseContrato {
  resumo: string
  clausulasRisco: { titulo: string; gravidade: 'alta' | 'media' | 'baixa'; observacao: string }[]
  prazos: { descricao: string; data?: string }[]
  sugestoes: string[]
  exemplo?: boolean
}

/** Texto a enviar ao agente: o conteúdo do PDF quando houver, senão os campos. */
function textoDoContrato(contrato: Contrato, imovel: Imovel): string {
  const cabecalho = resumoCampos(contrato, imovel)
  if (contrato.textoExtraido) {
    return `${cabecalho}\n\n--- Conteúdo do contrato (PDF) ---\n${contrato.textoExtraido}`
  }
  return cabecalho
}

function resumoCampos(contrato: Contrato, imovel: Imovel): string {
  return [
    `Tipo de contrato: ${rotulosTipoContrato[contrato.tipo]}`,
    `Imóvel: ${imovel.endereco}, ${imovel.cidade} - ${imovel.uf} (${imovel.tipo})`,
    `Parte: ${contrato.parte}`,
    `Início: ${formatarData(contrato.dataInicio)}`,
    `Vencimento: ${contrato.dataVencimento ? formatarData(contrato.dataVencimento) : 'indeterminado'}`,
    `Valor: R$ ${contrato.valor.toLocaleString('pt-BR')} (${contrato.periodicidade})`,
    `Índice de reajuste: ${rotulosIndice[contrato.indice]}`,
    `Garantia: ${rotulosGarantia[contrato.garantia]}`,
    `Observações: ${contrato.notas || 'nenhuma'}`,
  ].join('\n')
}

export type OrigemAnalise = 'botao' | 'anexo'

const CHAVE_LOCAL = 'lsm-analises-v1'

/** Última análise guardada do contrato, para não pagar a IA de novo ao reabrir a tela. */
export async function ultimaAnalise(contratoId: string): Promise<(AnaliseContrato & { em: string }) | null> {
  if (!supabaseConfigurado) {
    try {
      const todas = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}')
      return todas[contratoId] ?? null
    } catch { return null }
  }
  const { data } = await supabase
    .from('analises_contrato')
    .select('analise,criado_em')
    .eq('contrato_id', contratoId)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle()
  return data ? { ...(data.analise as AnaliseContrato), em: data.criado_em } : null
}

async function guardarAnalise(contratoId: string, analise: AnaliseContrato, origem: OrigemAnalise) {
  if (!supabaseConfigurado) {
    try {
      const todas = JSON.parse(localStorage.getItem(CHAVE_LOCAL) || '{}')
      todas[contratoId] = { ...analise, em: new Date().toISOString() }
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(todas))
    } catch { /* sem armazenamento */ }
    return
  }
  await supabase.from('analises_contrato').insert({ contrato_id: contratoId, analise, origem })
}

export async function analisarContrato(contrato: Contrato, imovel: Imovel, origem: OrigemAnalise = 'botao'): Promise<AnaliseContrato> {
  let analise: AnaliseContrato
  if (supabaseConfigurado) {
    const { data, error } = await supabase.functions.invoke('analisar-contrato', {
      body: { texto: textoDoContrato(contrato, imovel), contratoId: contrato.id },
    })
    if (error) throw new Error(error.message)
    if (data?.erro) throw new Error(data.erro)
    analise = data as AnaliseContrato
  } else {
    // Modo de exemplo: análise coerente com os dados, marcada como exemplo.
    await new Promise(r => setTimeout(r, 900))
    analise = analiseExemplo(contrato, imovel)
  }
  await guardarAnalise(contrato.id, analise, origem)
  await registrarEvento({
    tipo: 'contrato_analisado',
    entidade: contrato.id,
    resumo: `Análise do contrato com ${contrato.parte}: ${analise.clausulasRisco.length} ponto(s) de risco`,
  })
  return analise
}

function analiseExemplo(c: Contrato, imovel: Imovel): AnaliseContrato {
  const clausulasRisco: AnaliseContrato['clausulasRisco'] = []
  if (c.garantia === 'sem_garantia' && c.valor > 0) {
    clausulasRisco.push({
      titulo: 'Ausência de garantia',
      gravidade: 'alta',
      observacao: 'O contrato não prevê garantia locatícia (caução, fiador, seguro-fiança). Avaliar exigir uma, conforme art. 37 da Lei 8.245/91.',
    })
  }
  if (c.indice === 'sem_reajuste' && c.dataVencimento === null) {
    clausulasRisco.push({
      titulo: 'Sem reajuste e sem prazo',
      gravidade: 'media',
      observacao: 'Contrato por prazo indeterminado e sem índice de reajuste; o valor pode defasar com a inflação.',
    })
  }
  if (c.tipo === 'locacao_comercial') {
    clausulasRisco.push({
      titulo: 'Ação renovatória',
      gravidade: 'baixa',
      observacao: 'Em locação comercial, verificar o direito à renovação (art. 51 da Lei 8.245/91) e os prazos para ajuizamento.',
    })
  }

  const prazos: AnaliseContrato['prazos'] = []
  if (c.dataVencimento) prazos.push({ descricao: 'Vencimento do contrato', data: formatarData(c.dataVencimento) })
  prazos.push({ descricao: 'Reajuste anual, conforme o índice pactuado' })

  return {
    exemplo: true,
    resumo: `${rotulosTipoContrato[c.tipo]} do imóvel em ${imovel.cidade}, com ${c.parte}, valor de R$ ${c.valor.toLocaleString('pt-BR')} (${c.periodicidade}). Esta é uma análise de exemplo gerada sem a chave da Anthropic.`,
    clausulasRisco,
    prazos,
    sugestoes: [
      'Confirmar a vigência e a data-base do reajuste.',
      'Verificar a garantia e sua suficiência.',
      'Checar documentos obrigatórios do imóvel para a finalidade.',
    ],
  }
}
