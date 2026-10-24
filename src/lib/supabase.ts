import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Sem credenciais a plataforma roda com dados fictícios; createClient('') derruba o app.
export const supabaseConfigurado = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder-anon-key'
)

export type Database = {
  public: {
    Tables: {
      imoveis: {
        Row: {
          id: string
          endereco: string
          tipo: 'residencial' | 'comercial' | 'hotel' | 'garagem' | 'terreno'
          uso_atual: 'proprio' | 'locado' | 'vago' | 'em_construcao'
          proprietario_nome: string
          matricula_rgi: string | null
          iptu_valid: boolean
          habite_se: boolean
          alvara: boolean
          avcb: boolean
          notas: string | null
          criado_em: string
          atualizado_em: string
        }
      }
      contratos: {
        Row: {
          id: string
          imovel_id: string
          tipo: 'locacao_residencial' | 'locacao_comercial' | 'comodato' | 'sla'
          locatario_fornecedor: string
          data_inicio: string
          data_vencimento: string
          valor_periodico: number | null
          indice_reajuste: 'ipca' | 'igpm' | 'fixo' | 'outro'
          data_ultimo_reajuste: string | null
          status: 'ativo' | 'vencido' | 'a_renovar'
          caminho_arquivo: string | null
          notas: string | null
          criado_em: string
          atualizado_em: string
        }
      }
      alertas: {
        Row: {
          id: string
          contrato_id: string
          imovel_id: string
          tipo_alerta: 'vencimento' | 'reajuste' | 'avcb_vencimento' | 'iptu_vencimento' | 'alvara_vencimento'
          dias_restantes: number | null
          data_evento: string
          data_criacao: string
          lido: boolean
          data_leitura: string | null
        }
      }
    }
  }
}
