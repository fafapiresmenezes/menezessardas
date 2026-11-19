// Prova de segurança do cofre (elo R3, OWASP MASVS v2.1 — grupos CRYPTO e STORAGE).
// Três coisas que precisam ser verdade, sempre:
//  1. cofre novo nasce com os parâmetros fortes (310 mil voltas, sal de 32 bytes);
//  2. senha errada NÃO decifra (prova negativa);
//  3. cofre antigo (250 mil voltas, sal de 16 bytes) continua abrindo com a senha de sempre,
//     e é reforçado sozinho — ninguém perde o que já gravou.
import { describe, it, expect, beforeEach } from 'vitest'
import { Cofre } from './cofre'

const CHAVE = 'theye-geo-cofre-v1'
const SENHA = 'senha-de-teste-123'
const enc = new TextEncoder()
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))

const registro = () => JSON.parse(localStorage.getItem(CHAVE)!) as { sal: string; iv: string; dados: string; voltas?: number }

// Monta à mão um cofre no formato ANTIGO: 250 mil voltas, sal de 16 bytes e sem o campo `voltas`.
async function cofreAntigo(senha: string, dados: unknown) {
  const sal = crypto.getRandomValues(new Uint8Array(16))
  const base = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveKey'])
  const k = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal, iterations: 250000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const cifrado = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(dados))))
  localStorage.setItem(CHAVE, JSON.stringify({ sal: b64(sal), iv: b64(iv), dados: b64(cifrado) }))
}

describe('Cofre do geo (MASVS-CRYPTO / MASVS-STORAGE)', () => {
  beforeEach(() => localStorage.clear())

  it('cofre novo nasce com 310 mil voltas e sal de 32 bytes', async () => {
    await Cofre.abrir(SENHA)
    const r = registro()
    expect(r.voltas).toBe(310000)
    expect(atob(r.sal).length).toBe(32)
  })

  it('não guarda nada em claro: o que fica no aparelho é só o bloco cifrado', async () => {
    const c = await Cofre.abrir(SENHA)
    c.dados.pontos.push({ t: 1, lat: -22.78, lon: -43.31, precisao: 10 } as never)
    await c.salvar()
    const cru = localStorage.getItem(CHAVE)!
    expect(cru).not.toContain('-22.78')
    expect(cru).not.toContain('-43.31')
    expect(cru).not.toContain(SENHA)
  })

  it('senha errada não decifra (prova negativa)', async () => {
    const c = await Cofre.abrir(SENHA)
    c.dados.intervaloSeg = 30
    await c.salvar()
    await expect(Cofre.abrir('senha-errada-999')).rejects.toThrow(/Senha errada/)
  })

  it('cofre antigo abre com a senha de sempre e é reforçado sozinho', async () => {
    await cofreAntigo(SENHA, { ...{ consentimento: null, pontos: [], lugares: [], cenas: [], acessos: [] }, intervaloSeg: 120 })
    expect(registro().voltas).toBeUndefined() // formato antigo

    const c = await Cofre.abrir(SENHA)
    expect(c.dados.intervaloSeg).toBe(120) // os dados de antes continuam lá

    const r = registro()
    expect(r.voltas).toBe(310000) // reforçado
    expect(atob(r.sal).length).toBe(32)

    // e continua abrindo depois do reforço, com a MESMA senha
    const c2 = await Cofre.abrir(SENHA)
    expect(c2.dados.intervaloSeg).toBe(120)
  })
})
