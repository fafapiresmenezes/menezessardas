import { describe, it, expect } from 'vitest'
import { supabase, supabaseConfigurado } from './supabase'

describe('cliente Supabase', () => {
  it('sem credenciais no ambiente a plataforma roda em modo fictício, sem derrubar o app', () => {
    expect(supabaseConfigurado).toBe(false)
    expect(supabase).toBeTruthy()
    expect(typeof supabase.from).toBe('function')
    expect(typeof supabase.rpc).toBe('function')
    expect(typeof supabase.functions.invoke).toBe('function')
  })

  it('o cliente aponta para o endereço reserva e não para o projeto real', () => {
    const url = (supabase as unknown as { supabaseUrl: string }).supabaseUrl
    expect(url).toBe('https://placeholder.supabase.co')
  })
})
