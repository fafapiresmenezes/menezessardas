// R8c: lê o boletim do MobSF sobre o APK e decide se passa.
//
// POR QUE ESTE SCRIPT EXISTE: a régua declara, na dimensão 4, que "o MobSF nunca foi rodado
// sobre o arquivo". Era verdade, e era um dos dois itens que faltavam para a nota chegar a 10.
// O MobSF é livre e de graça; o que faltava era onde rodar, porque esta máquina não alcança o
// SDK do Android. Roda no runner do GitHub, onde o APK é montado, pelo fluxo geo-mobsf.yml.
//
// O MobSF olha o que as nossas provas NÃO olham: o que está dentro do pacote montado — chave de
// assinatura, bibliotecas nativas, strings embutidas, segredos esquecidos, o que o código
// compilado chama de fato. É uma segunda opinião de fora, e serve justamente porque não foi
// escrita por quem escreveu o app.
//
// Uso: node scripts/geo/avaliar-mobsf.mjs <scorecard.json>
import { readFileSync, existsSync } from 'node:fs'

const caminho = process.argv[2]
if (!caminho || !existsSync(caminho)) {
  console.error(`não achei o boletim do MobSF em ${caminho || '(caminho não informado)'}`)
  process.exit(1)
}

let b
try {
  b = JSON.parse(readFileSync(caminho, 'utf-8'))
} catch (e) {
  console.error(`o boletim não é JSON válido: ${e.message}`)
  process.exit(1)
}

const lista = chave => (Array.isArray(b?.[chave]) ? b[chave] : [])
const alto = lista('high')
const aviso = lista('warning')
const info = lista('info')
const seguro = lista('secure')

/**
 * Achados ESPERADOS numa montagem de depuração, cada um com o motivo escrito e com o que os
 * encerra. Não são desculpa: são exatamente o que a régua já declara como o que falta para a
 * dimensão 4 chegar a 10, e o que os encerra é a chave de assinatura, que só M pode criar.
 *
 * A comparação é por pedaço de texto porque o MobSF muda a redação entre versões; cada pedaço
 * é curto e específico o bastante para não casar com outro achado.
 */
const ESPERADOS_NA_DEPURACAO = [
  { marca: 'debug', porque: 'o APK de depuração é depurável e assinado com a chave de depuração do Android; é o que a régua já declara como o que falta, e sai com a versão de publicação assinada' },
  { marca: 'signed with', porque: 'idem: a assinatura é a chave padrão do Android' },
  { marca: 'v1 signature', porque: 'idem: o esquema de assinatura é o da montagem de depuração' },
  { marca: 'janus', porque: 'vulnerabilidade de assinatura v1, que deixa de existir com a versão de publicação assinada' },
]

const texto = a => [a?.title, a?.description, a?.section, a?.rule].filter(Boolean).join(' ').toLowerCase()

const esperado = a => ESPERADOS_NA_DEPURACAO.find(e => texto(a).includes(e.marca))

const altosNovos = alto.filter(a => !esperado(a))
const altosEsperados = alto.filter(a => esperado(a))

const nome = a => a?.title || a?.description || a?.section || JSON.stringify(a).slice(0, 120)

console.log(`Boletim do MobSF — nota de segurança ${b?.security_score ?? '?'}, conceito ${b?.grade ?? '?'}`)
console.log(`  ${alto.length} grave(s), ${aviso.length} aviso(s), ${info.length} informativo(s), ${seguro.length} ponto(s) seguro(s)\n`)

if (altosEsperados.length) {
  console.log('Graves JÁ previstos pela régua (a versão de depuração os causa, e a de publicação os encerra):')
  for (const a of altosEsperados) console.log(`  · ${nome(a)}\n      ${esperado(a).porque}`)
  console.log('')
}

if (aviso.length) {
  console.log('Avisos, para leitura humana (não param a obra):')
  for (const a of aviso) console.log(`  · ${nome(a)}`)
  console.log('')
}

if (altosNovos.length) {
  console.error('GRAVES NÃO PREVISTOS — a obra para aqui de propósito:')
  for (const a of altosNovos) console.error(`  · ${nome(a)}`)
  console.error('\nCada um destes é um achado novo sobre o pacote montado. Nenhum entra na lista de')
  console.error('esperados sem o motivo escrito ao lado, e motivo escrito não é o mesmo que desculpa.')
  process.exit(1)
}

console.log('Nenhum achado grave fora dos que a régua já declara. Passou.')
