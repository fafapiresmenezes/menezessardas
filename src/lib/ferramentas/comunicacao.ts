// Theye Suporte Jurídico — comunicação com o cliente (WhatsApp), publicidade conforme a OAB e índice de documentos.

export const MODELOS_WHATSAPP: Record<string, string> = {
  andamento: 'Olá, {nome}! Aqui é {advogado}. Passando para atualizar: {texto}. Qualquer dúvida, estou à disposição.',
  documento: 'Olá, {nome}! Aqui é {advogado}. Para seguirmos com o seu caso, preciso de: {texto}. Pode me enviar por aqui mesmo?',
  audiencia: 'Olá, {nome}! Lembrete da audiência: {texto}. Chegue com 30 minutos de antecedência e leve um documento com foto.',
  cobranca: 'Olá, {nome}! Tudo bem? Lembrando, com todo o respeito, da parcela de honorários: {texto}. Se já pagou, desconsidere.',
}
/** Link wa.me com a mensagem pronta (o advogado só confere e envia). */
export function linkWhatsapp(telefone: string, modelo: string, nome: string, advogado: string, texto: string) {
  let d = telefone.replace(/\D/g, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  if (!/^55\d{10,11}$/.test(d)) throw new Error('Informe o celular com DDD (ex.: 21 99999-0000).')
  const msg = (MODELOS_WHATSAPP[modelo] ?? MODELOS_WHATSAPP.andamento).replace('{nome}', nome.trim() || 'tudo bem').replace('{advogado}', advogado.trim() || 'seu advogado').replace('{texto}', texto.trim() || '[complete]')
  return { url: `https://wa.me/${d}?text=${encodeURIComponent(msg)}`, mensagem: msg, numero: d }
}

/** Pontos de atenção na publicidade da advocacia (Código de Ética e Disciplina da OAB, arts. 39 a 47, e Provimento 205/2021). */
export const PUBLICIDADE: [RegExp, string][] = [
  [/garant\w*\s+(?:de\s+)?(?:resultado|vit[oó]ria|ganho|êxito|exito)|resultado\s+garantid|(?:vit[oó]ria|indeniza[çc][ãa]o)\s+garantid/i, 'Promessa ou garantia de resultado'],
  [/\b100\s*%|\bsem\s+risco\b|\bcausa\s+ganha\b|\bganhe\b|\bvoc[êe]\s+vai\s+(?:ganhar|receber)/i, 'Promessa de êxito ou de valor a receber'],
  [/\b(?:o|a)\s+melhor(?:es)?\b|\bn[úu]mero\s*1\b|\bl[íi]der\b|\bimbat[íi]vel\b|\bmais\s+(?:barat|r[aá]pid)/i, 'Autoengrandecimento ou comparação com colegas'],
  [/\bgr[áa]tis\b|\bgratuit|\bdesconto|\bpromo[çc][ãa]o|\bR\$\s*\d|\bhonor[áa]rios\s+(?:a\s+partir|de\s+R)|\bparcel|\bpre[çc]o/i, 'Menção a preço, gratuidade, desconto ou forma de pagamento como captação'],
  [/\bligue\s+j[áa](?![a-z])|(?:^|[^a-zà-ú])[úu]ltim[ao]s?\s+(?:vagas|dias)\b|\bn[ãa]o\s+perca\b|\bcorra\b|\bs[óo]\s+hoje\b/i, 'Apelo de urgência ou mercantilização'],
  [/\bsorteio|\bbrinde|\bpr[êe]mio/i, 'Sorteio, brinde ou prêmio'],
  [/\bclientes?\s+(?:como|famos|conhecid)|\bganhamos\s+(?:o\s+)?caso\s+d[oea]/i, 'Divulgação de clientes ou de casos concretos'],
]
export function verificarPublicidade(texto: string) {
  const achados = PUBLICIDADE.filter(([re]) => re.test(texto)).map(([re, motivo]) => ({ motivo, trecho: (texto.match(re)?.[0] ?? '').trim() }))
  return { achados, ok: achados.length === 0 }
}

/** Índice de documentos para juntar ao processo eletrônico, com nomes de arquivo padronizados. */
export function indiceDocumentos(texto: string, prefixo = 'Doc') {
  const itens = texto.split('\n').map(l => l.trim()).filter(Boolean)
  const larg = Math.max(2, String(itens.length).length)
  return itens.map((t, i) => {
    const n = String(i + 1).padStart(larg, '0')
    const base = t.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 60)
    return { rotulo: `${prefixo}. ${n} – ${t}`, arquivo: `${prefixo}${n}_${base || 'documento'}.pdf` }
  })
}
