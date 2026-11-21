// R8b: confere o APK MONTADO, não o código-fonte.
//
// POR QUE ESTE SCRIPT EXISTE: src/lib/geo/nativo.test.ts lê o AndroidManifest.xml do disco e
// prova que os controles estão escritos ali. Isso é bom, mas não é o bastante: o arquivo que vai
// para o celular passa por `cap sync`, pelo merge de manifesto do Gradle e pelos manifestos dos
// plugins do Capacitor. Qualquer um desses três pode acrescentar uma permissão ou reativar a
// cópia para a nuvem SEM tocar no nosso arquivo — e o teste continuaria verde.
//
// Então aqui a conferência é feita sobre o manifesto COMPILADO dentro do APK, lido com o aapt2
// do SDK do Android. É o único lugar onde "o que está no celular" pode ser afirmado.
//
// Uso: node scripts/geo/conferir-apk.mjs <caminho-do-apk> <debug|release>
// Sai com 1 e lista cada promessa quebrada. Nenhuma promessa é medida por adjetivo.
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const apk = process.argv[2]
const tipo = process.argv[3] || 'debug'

if (!apk || !existsSync(apk)) {
  console.error(`não achei o APK em ${apk || '(caminho não informado)'}`)
  process.exit(1)
}
if (tipo !== 'debug' && tipo !== 'release') {
  console.error(`tipo de montagem deve ser debug ou release, veio "${tipo}"`)
  process.exit(1)
}

// O aapt2 vem com as build-tools do SDK. Procuramos a versão mais nova instalada em vez de
// fixar um número, para o script não quebrar quando o fluxo subir de build-tools.
function acharAapt2() {
  if (process.env.AAPT2) return process.env.AAPT2
  const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  if (!sdk) throw new Error('ANDROID_HOME não está definido e AAPT2 não foi informado')
  const base = join(sdk, 'build-tools')
  if (!existsSync(base)) throw new Error(`não achei ${base}`)
  const versoes = readdirSync(base).sort().reverse()
  for (const v of versoes) {
    const caminho = join(base, v, 'aapt2')
    if (existsSync(caminho)) return caminho
  }
  throw new Error(`nenhum aapt2 dentro de ${base}`)
}

const aapt2 = acharAapt2()
const correr = (...args) => execFileSync(aapt2, args, { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })

const arvore = correr('dump', 'xmltree', '--file', 'AndroidManifest.xml', apk)
const cracha = correr('dump', 'badging', apk)

const quebrou = []
const ok = []
const prova = (promessa, condicao, detalhe) =>
  condicao ? ok.push(promessa) : quebrou.push(`${promessa}${detalhe ? ` — ${detalhe}` : ''}`)

// Como o aapt2 imprime de verdade (conferido no log da rodada 44874228071): o nome do atributo
// vem com a URI inteira do xmlns, e booleano sai como a palavra "true" ou "false".
//   A: http://schemas.android.com/apk/res/android:allowBackup(0x01010280)=false
const atributo = nome => new RegExp(`android:${nome}\\(0x[0-9a-f]+\\)=(\\S+)`)
const ler = nome => {
  const m = atributo(nome).exec(arvore)
  return m ? m[1] : null
}

// --- 1. a cópia automática do Android está desligada -------------------------------------
const allowBackup = ler('allowBackup')
prova('cópia para a nuvem desligada (allowBackup)',
  allowBackup === 'false',
  allowBackup === null ? 'o atributo não está no manifesto compilado' : `veio ${allowBackup}`)

// --- 2. nem a troca de celular leva os dados (Android 12+) --------------------------------
prova('troca de celular não leva dados (dataExtractionRules)',
  /^@0x[0-9a-f]+$/.test(ler('dataExtractionRules') || ''),
  'o atributo não está no manifesto compilado')

// --- 3. nenhuma conexão em texto claro ----------------------------------------------------
prova('nenhuma conexão em texto claro (networkSecurityConfig)',
  /^@0x[0-9a-f]+$/.test(ler('networkSecurityConfig') || ''),
  'o atributo não está no manifesto compilado')
// usesCleartextTraffic, se vier de algum plugin, não pode vir ligado.
const cleartext = ler('usesCleartextTraffic')
prova('usesCleartextTraffic não ligado por nenhum plugin',
  cleartext === null || cleartext === 'false',
  `algum manifesto ligou (veio ${cleartext})`)

// --- 4. só as permissões que este app precisa --------------------------------------------
// O cracha lista as permissões DEPOIS do merge: é aqui que a permissão de um plugin apareceria.
// Cada permissão permitida está aqui com o motivo escrito. A lista é apertada de propósito: se o
// merge do Gradle ou um plugin acrescentar outra, esta conferência FALHA e a nova tem de ser
// olhada uma por uma antes de entrar aqui. Uma lista folgada por precaução não conferiria nada.
//
// As quatro primeiras são do nosso AndroidManifest.xml. As quatro seguintes NÃO estão lá: a
// primeira rodada desta conferência mostrou que elas chegam ao APK pelo merge, e é exatamente o
// tipo de coisa que o teste que lê o arquivo-fonte nunca ia acusar.
const PERMITIDAS = new Set([
  'android.permission.INTERNET',                        // nosso: fontes abertas (satélite, IBGE)
  'android.permission.ACCESS_FINE_LOCATION',            // nosso: gravar a posição do titular
  'android.permission.ACCESS_COARSE_LOCATION',          // nosso: idem, com margem larga
  'android.permission.CAMERA',                          // nosso: a câmera como sensor de LUGAR
  // Do plugin @capacitor-community/background-geolocation, que é quem implementa gravar com a
  // tela apagada. As três juntas são o desenho honesto desse recurso no Android moderno: serviço
  // em primeiro plano com notificação permanente à vista, em vez da localização "sempre".
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_LOCATION',
  'android.permission.POST_NOTIFICATIONS',
])

/** Permissão de assinatura que o próprio AndroidX gera com o nome do pacote; não dá acesso a nada
 *  de fora do app, e só o app assinado com a mesma chave a obtém. */
const PERMISSAO_INTERNA = /^[a-z0-9_.]+\.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION$/
const pedidas = [...cracha.matchAll(/^uses-permission: name='([^']+)'/gm)].map(m => m[1])
console.log(`  permissões no APK montado: ${pedidas.length ? pedidas.join(', ') : '(nenhuma)'}`)
const intrusas = pedidas.filter(p => !PERMITIDAS.has(p) && !PERMISSAO_INTERNA.test(p))
prova('nenhuma permissão além das previstas',
  intrusas.length === 0,
  `entraram ${intrusas.join(', ')}`)

// A localização "sempre" é a que o app promete nunca pedir: o serviço em primeiro plano basta.
prova('não pede a localização "sempre" (ACCESS_BACKGROUND_LOCATION)',
  !pedidas.includes('android.permission.ACCESS_BACKGROUND_LOCATION'),
  'a permissão entrou no APK')

// --- 5. quem é alcançável de fora do app, por NOME ---------------------------------------
// Contar não serve: uma contagem certa com os componentes trocados passaria igual. Então aqui
// cada componente exposto é identificado pelo nome e tem de estar no registro abaixo.
const EXPOSTOS_PERMITIDOS = new Map([
  ['club.theye.geo.MainActivity',
   'a tela de abrir; precisa ser alcançável para o ícone do app funcionar'],
  ['androidx.profileinstaller.ProfileInstallReceiver',
   'do AndroidX; exposto mas exigindo a permissão android.permission.DUMP, que só o sistema e o shell têm'],
])

function componentesExpostos(texto) {
  const achados = []
  let atual = null
  for (const linha of texto.split('\n')) {
    const abre = /E: (activity|service|receiver|provider) \(line=/.exec(linha)
    if (abre) {
      if (atual?.exposto) achados.push(atual)
      atual = { tipo: abre[1], nome: null, exposto: false, permissao: null }
      continue
    }
    if (!atual) continue
    const nome = /android:name\(0x01010003\)="([^"]+)"/.exec(linha)
    if (nome && atual.nome === null) { atual.nome = nome[1]; continue }
    const exp = /android:exported\(0x[0-9a-f]+\)=(true|false)/.exec(linha)
    if (exp) { atual.exposto = exp[1] === 'true'; continue }
    const perm = /android:permission\(0x01010006\)="([^"]+)"/.exec(linha)
    if (perm) atual.permissao = perm[1]
  }
  if (atual?.exposto) achados.push(atual)
  return achados
}

const expostos = componentesExpostos(arvore)
for (const c of expostos) {
  console.log(`  exposto: ${c.tipo} ${c.nome}${c.permissao ? ` (exige ${c.permissao})` : ''}`)
}
const expostosIntrusos = expostos.filter(c => !EXPOSTOS_PERMITIDOS.has(c.nome ?? ''))
prova('nenhum componente exposto fora do registro',
  expostosIntrusos.length === 0,
  `expostos sem motivo escrito: ${expostosIntrusos.map(c => `${c.tipo} ${c.nome}`).join(', ')}`)

// --- 6. depurável: o estado tem de casar com o tipo de montagem --------------------------
// Numa montagem de publicação, depurável é reprovação de nível 1 do MASVS. Numa de depuração é
// esperado, e é exatamente o que a régua declara como o que falta para a dimensão 4 chegar a 10.
const depuravel = /^application-debuggable$/m.test(cracha) || ler('debuggable') === 'true'
if (tipo === 'release') {
  prova('versão de publicação não é depurável', !depuravel, 'o APK de publicação saiu depurável')
} else {
  prova('versão de depuração declarada como tal', depuravel,
    'um APK de depuração que não se declara depurável indica montagem trocada')
}

for (const linha of ok) console.log(`  ok   ${linha}`)
for (const linha of quebrou) console.error(`  FALHOU  ${linha}`)

console.log(`\n${ok.length} promessas conferidas no APK montado (${tipo}), ${quebrou.length} quebradas.`)
if (quebrou.length > 0) {
  // Sem isto, um erro de leitura desta conferência e um defeito de verdade no APK dão
  // exatamente a mesma linha vermelha. Com o manifesto compilado no log, dá para dizer qual é.
  // Despejo INTEIRO, sem filtro. Um filtro escrito por quem não conhece o formato esconde
  // justamente a linha que faria falta — foi o que aconteceu na rodada anterior.
  console.error('\n--- manifesto compilado dentro do APK, como o aapt2 o imprime ---')
  const linhas = arvore.split('\n')
  for (const linha of linhas.slice(0, 400)) console.error(linha.replace(/\s+$/, ''))
  if (linhas.length > 400) console.error(`... (${linhas.length - 400} linhas a mais)`)
  console.error('\nO APK montado não cumpre o que o manifesto promete. A obra para aqui de propósito.')
  process.exit(1)
}
