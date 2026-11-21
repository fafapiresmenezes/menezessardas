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

// --- 1. a cópia automática do Android está desligada -------------------------------------
// No manifesto compilado o booleano aparece como (type 0x12)0x0 (falso) ou 0xffffffff (verdadeiro).
const allowBackup = /android:allowBackup\(0x[0-9a-f]+\)=\(type 0x12\)(0x[0-9a-f]+)/.exec(arvore)
prova('cópia para a nuvem desligada (allowBackup)',
  allowBackup !== null && allowBackup[1] === '0x0',
  allowBackup === null ? 'o atributo não está no manifesto compilado' : `veio ${allowBackup[1]}`)

// --- 2. nem a troca de celular leva os dados (Android 12+) --------------------------------
prova('troca de celular não leva dados (dataExtractionRules)',
  /android:dataExtractionRules\(0x[0-9a-f]+\)=@0x[0-9a-f]+/.test(arvore),
  'o atributo não está no manifesto compilado')

// --- 3. nenhuma conexão em texto claro ----------------------------------------------------
prova('nenhuma conexão em texto claro (networkSecurityConfig)',
  /android:networkSecurityConfig\(0x[0-9a-f]+\)=@0x[0-9a-f]+/.test(arvore),
  'o atributo não está no manifesto compilado')
// usesCleartextTraffic, se vier de algum plugin, não pode vir ligado.
const cleartext = /android:usesCleartextTraffic\(0x[0-9a-f]+\)=\(type 0x12\)(0x[0-9a-f]+)/.exec(arvore)
prova('usesCleartextTraffic não ligado por nenhum plugin',
  cleartext === null || cleartext[1] === '0x0',
  cleartext ? `algum manifesto ligou (veio ${cleartext[1]})` : '')

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

// --- 5. só a tela de abrir é alcançável de fora do app -----------------------------------
const exportados = (arvore.match(/android:exported\(0x[0-9a-f]+\)=\(type 0x12\)0xffffffff/g) || []).length
prova('só um componente alcançável de fora do app',
  exportados === 1,
  `o APK tem ${exportados} componentes exportados`)

// --- 6. depurável: o estado tem de casar com o tipo de montagem --------------------------
// Numa montagem de publicação, depurável é reprovação de nível 1 do MASVS. Numa de depuração é
// esperado, e é exatamente o que a régua declara como o que falta para a dimensão 4 chegar a 10.
const depuravel = /^application-debuggable$/m.test(cracha)
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
  console.error('\n--- manifesto compilado dentro do APK (elemento application e permissões) ---')
  for (const linha of arvore.split('\n')) {
    if (/E: (application|activity|service|provider|receiver|uses-permission)|A: (android:(allowBackup|dataExtractionRules|networkSecurityConfig|usesCleartextTraffic|exported|name)|name)/.test(linha)) {
      console.error(linha.replace(/\s+$/, ''))
    }
  }
  console.error('\nO APK montado não cumpre o que o manifesto promete. A obra para aqui de propósito.')
  process.exit(1)
}
