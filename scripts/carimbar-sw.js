// Executado depois do build (npm run build): carimba uma versão única no service worker
// publicado em dist/sw.js, para que cada novo deploy force o navegador a descartar o cache
// de /assets antigo em vez de continuar servindo chunks com hash que o deploy atual não tem mais.
// Sem isso, VERSAO ficava fixa ('gmenezes-v1') e nunca mudava entre deploys, então o service
// worker nunca percebia que havia um build novo e o navegador podia continuar com um index.html
// ou um chunk de /assets antigo em cache, causando o 404 e a tela em branco relatados em
// /relatorios e /settings.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const swPath = path.resolve(__dirname, '..', process.argv[2] ?? 'dist', 'sw.js')

const versao = `theye-${Date.now().toString(36)}`
const conteudo = readFileSync(swPath, 'utf8')
const atualizado = conteudo.replace(/const VERSAO = '[^']*'/, `const VERSAO = '${versao}'`)

if (atualizado === conteudo) {
  throw new Error(`carimbar-sw.js: não encontrou "const VERSAO = '...'" em ${swPath} — build do service worker pode ter mudado de formato.`)
}

writeFileSync(swPath, atualizado)
console.log(`sw.js carimbado com VERSAO=${versao}`)
