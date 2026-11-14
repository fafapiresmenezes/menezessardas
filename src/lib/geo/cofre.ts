// G1 e G7: guarda cifrada no próprio aparelho, corrente de hash e registro de acesso.
// Os dados nunca saem do aparelho sem o titular apertar "Exportar". A chave nasce da senha do titular
// (PBKDF2, 250 mil voltas) e cifra com AES-GCM; sem a senha, nem a plataforma consegue ler.
import type { Lugar, Ponto } from './calculo'

export interface Consentimento {
  titular: string
  aceitoEm: string        // ISO
  versao: string
  hash: string            // sha256 do texto do termo + titular + data
}

export interface Cena {
  t: number
  lat?: number
  lon?: number
  ambiente: string        // sala, rua, carro, escritório...
  pessoas: number         // quantas pessoas na cena, sem identificar quem
  objetos: string[]
  codigos: string[]       // QR e códigos impressos lidos (para confirmar o lugar)
  hash?: string
}

export interface Acesso { t: number; acao: string; detalhe?: string; hash?: string }

export interface DadosGeo {
  consentimento: Consentimento | null
  pontos: Ponto[]
  lugares: Lugar[]        // só os que o titular nomeou (os demais são recalculados)
  cenas: Cena[]
  acessos: Acesso[]
  intervaloSeg: number
}

export const VERSAO_TERMO = 'G1-v1 (12/11/2026)'

export const TERMO = `Termo de consentimento do titular (LGPD, art. 7º, I, e art. 8º)

Eu, titular destes dados, autorizo a plataforma THEYE a coletar, neste aparelho e só enquanto eu deixar ligado:
• a posição do aparelho (latitude, longitude), o horário, a margem de erro e, se o aparelho informar, a velocidade e a bateria;
• o resultado da leitura da câmera para dizer ONDE estou (tipo de ambiente, se há pessoa na cena, placas e códigos impressos).

Não entra, em nenhuma hipótese: rosto, identidade de quem aparece, emoção, mentira, saúde, perfil psicológico. A imagem da câmera não é guardada, só o resultado.

Para quê: MVP de geolocalização e geomapeamento do THEYE Institute, para aprender o que funciona antes de oferecer a terceiros.
Onde fica: cifrado (AES-GCM) só neste aparelho; a chave nasce da minha senha. Nada vai para servidor sem eu exportar.
Por quanto tempo: até eu apagar. O botão "Apagar tudo" apaga de verdade e não tem volta.
Posso revogar a qualquer momento (art. 8º, § 5º) e pedir tudo em arquivo aberto (art. 18).`

const CHAVE = 'theye-geo-cofre-v1'
/** Âncora fixa de todas as correntes do MVP (pontos, cenas, acessos). */
export const GENESE = 'THEYE-G1-genese'
const enc = new TextEncoder()
const dec = new TextDecoder()

const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))
const deB64 = (s: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export async function sha256(texto: string): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', enc.encode(texto))
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Encadeia: hash = sha256(hash anterior + conteúdo sem o hash). Mexer em um item quebra todos os seguintes. */
export async function encadear<T extends { hash?: string }>(anterior: string, item: T): Promise<T> {
  const { hash: _h, ...resto } = item
  return { ...item, hash: await sha256(anterior + JSON.stringify(resto)) }
}

export async function conferirCorrente<T extends { hash?: string }>(itens: T[], genese = GENESE): Promise<{ ok: boolean; quebraEm: number | null }> {
  let ant = genese
  for (let i = 0; i < itens.length; i++) {
    const { hash, ...resto } = itens[i]
    if ((await sha256(ant + JSON.stringify(resto))) !== hash) return { ok: false, quebraEm: i }
    ant = hash!
  }
  return { ok: true, quebraEm: null }
}

async function chaveDe(senha: string, sal: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export const vazio = (): DadosGeo => ({ consentimento: null, pontos: [], lugares: [], cenas: [], acessos: [], intervaloSeg: 60 })

export const cofreExiste = () => { try { return !!localStorage.getItem(CHAVE) } catch { return false } }

export class Cofre {
  private constructor(private chave: CryptoKey, private sal: Uint8Array<ArrayBuffer>, public dados: DadosGeo) {}

  static async abrir(senha: string): Promise<Cofre> {
    const bruto = localStorage.getItem(CHAVE)
    if (!bruto) {
      const sal = crypto.getRandomValues(new Uint8Array(16))
      const c = new Cofre(await chaveDe(senha, sal), sal, vazio())
      await c.salvar()
      return c
    }
    const { sal, iv, dados } = JSON.parse(bruto) as { sal: string; iv: string; dados: string }
    const s = deB64(sal)
    const k = await chaveDe(senha, s)
    let claro: ArrayBuffer
    try {
      claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(iv) }, k, deB64(dados))
    } catch {
      throw new Error('Senha errada. Sem a senha certa ninguém lê estes dados, nem a plataforma.')
    }
    return new Cofre(k, s, { ...vazio(), ...JSON.parse(dec.decode(claro)) })
  }

  async salvar() {
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, this.chave, enc.encode(JSON.stringify(this.dados))))
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ sal: b64(this.sal), iv: b64(iv), dados: b64(cifrado) }))
    } catch {
      throw new Error('O espaço do navegador encheu. Exporte e apague os dias mais antigos.')
    }
  }

  private ultimo<T extends { hash?: string }>(l: T[]) { return l.length ? l[l.length - 1].hash ?? GENESE : GENESE }

  async anotarAcesso(acao: string, detalhe?: string) {
    this.dados.acessos.push(await encadear<Acesso>(this.ultimo(this.dados.acessos), { t: Date.now(), acao, detalhe }))
    await this.salvar()
  }

  async consentir(titular: string) {
    const aceitoEm = new Date().toISOString()
    this.dados.consentimento = { titular, aceitoEm, versao: VERSAO_TERMO, hash: await sha256(TERMO + '|' + titular + '|' + aceitoEm) }
    await this.anotarAcesso('consentimento', `${titular} aceitou o termo ${VERSAO_TERMO}`)
  }

  async revogar() {
    this.dados.consentimento = null
    await this.anotarAcesso('revogacao', 'Titular revogou o consentimento; a gravação parou')
  }

  async gravarPonto(p: Ponto) {
    if (!this.dados.consentimento) throw new Error('Sem consentimento, nada é gravado.')
    this.dados.pontos.push(await encadear(this.ultimo(this.dados.pontos), p))
    await this.salvar()
  }

  async gravarCena(c: Cena) {
    if (!this.dados.consentimento) throw new Error('Sem consentimento, nada é gravado.')
    this.dados.cenas.push(await encadear(this.ultimo(this.dados.cenas), c))
    await this.salvar()
  }

  async nomearLugar(l: Lugar) {
    this.dados.lugares = [...this.dados.lugares.filter(x => x.id !== l.id), { ...l, visitas: 0, minutos: 0 }]
    await this.salvar()
  }

  /** Apagar por dia (AAAA-MM-DD, horário local), por lugar (raio em metros) ou tudo. A corrente é refeita sobre o que restou. */
  async apagar(filtro: { dia?: string; perto?: { lat: number; lon: number; raio: number } } | 'tudo', dist?: (a: { lat: number; lon: number }, b: { lat: number; lon: number }) => number) {
    if (filtro === 'tudo') {
      localStorage.removeItem(CHAVE)
      this.dados = vazio()
      return
    }
    const fica = (x: { t: number; lat?: number; lon?: number }) => {
      if (filtro.dia) {
        const d = new Date(x.t); const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        if (iso === filtro.dia) return false
      }
      if (filtro.perto && dist && x.lat != null && x.lon != null && dist({ lat: x.lat, lon: x.lon }, filtro.perto) <= filtro.perto.raio) return false
      return true
    }
    const antes = this.dados.pontos.length + this.dados.cenas.length
    const pontos = this.dados.pontos.filter(fica)
    const cenas = this.dados.cenas.filter(fica)
    const genese = GENESE
    const refazer = async <T extends { hash?: string }>(l: T[]) => { const out: T[] = []; let a = genese; for (const x of l) { const n = await encadear(a, x); out.push(n); a = n.hash! } return out }
    this.dados.pontos = await refazer(pontos)
    this.dados.cenas = await refazer(cenas)
    await this.anotarAcesso('apagar', `${antes - pontos.length - cenas.length} registros apagados (${filtro.dia ? 'dia ' + filtro.dia : 'lugar'})`)
  }
}
