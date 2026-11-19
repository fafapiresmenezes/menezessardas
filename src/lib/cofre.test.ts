import { describe, expect, it, vi } from 'vitest'
vi.mock('@/lib/supabase', () => ({ supabase: {} }))
import { abrirCofre, cifrar, decifrar } from './cofre'

const item = { nome: 'Tribunal', usuario: 'fulana', senha: 'S3gredo!çã', observacao: 'token no celular' }

describe('banco de senhas', () => {
  it('o que vai para o banco não traz a senha, o usuário nem o nome em claro', async () => {
    const c = await cifrar(item, 'frase longa do escritório')
    const tudo = JSON.stringify(c)
    for (const v of Object.values(item)) expect(tudo).not.toContain(v)
    expect(atob(c.cifra)).not.toContain('Tribunal')
  })
  it('a frase certa abre e devolve o item igual', async () => {
    const c = await cifrar(item, 'frase longa do escritório')
    expect(await decifrar(c, 'frase longa do escritório')).toEqual(item)
  })
  it('a frase errada não abre', async () => {
    const c = await cifrar(item, 'frase longa do escritório')
    expect(await decifrar(c, 'outra frase qualquer')).toBeNull()
  })
  it('duas cifras do mesmo item saem diferentes', async () => {
    const a = await cifrar(item, 'frase longa do escritório'); const b = await cifrar(item, 'frase longa do escritório')
    expect(a.cifra).not.toBe(b.cifra); expect(a.sal).not.toBe(b.sal)
  })
  it('abrir o cofre conta as linhas que a frase não abriu', async () => {
    const a = { id: '1', ...(await cifrar(item, 'frase longa do escritório')) }
    const b = { id: '2', ...(await cifrar(item, 'frase antiga do escritório')) }
    const r = await abrirCofre([a, b], 'frase longa do escritório')
    expect(r.itens.map(i => i.id)).toEqual(['1']); expect(r.fechadas).toBe(1)
  })
})
