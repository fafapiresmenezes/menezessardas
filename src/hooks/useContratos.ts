import { useState, useEffect } from 'react'

export interface Contrato {
  id: string
  imovelId: string
  imovel: string
  tipo: string
  locatario: string
  dataInicio: string
  dataVencimento: string
  valorMensal: number
  indiceReajuste: string
  status: 'ativo' | 'vencido' | 'a_renovar'
}

// Mock data para desenvolvimento
const MOCK_CONTRATOS: Contrato[] = [
  {
    id: '1',
    imovelId: 'imovel-1',
    imovel: 'Av. Paulista 1000, São Paulo, SP',
    tipo: 'Locação Comercial',
    locatario: 'Empresa Tech Brasil Ltda',
    dataInicio: '2023-06-15',
    dataVencimento: '2025-12-15',
    valorMensal: 15000,
    indiceReajuste: 'IPCA',
    status: 'ativo',
  },
  {
    id: '2',
    imovelId: 'imovel-3',
    imovel: 'Lagoa Rodrigo de Freitas 200, Rio de Janeiro, RJ',
    tipo: 'Locação Residencial',
    locatario: 'Empresa Consultoria RJ',
    dataInicio: '2022-03-01',
    dataVencimento: '2025-08-31',
    valorMensal: 4500,
    indiceReajuste: 'IGPM',
    status: 'ativo',
  },
  {
    id: '3',
    imovelId: 'imovel-4',
    imovel: 'Copacabana Praia 100, Rio de Janeiro, RJ',
    tipo: 'Locação Comercial',
    locatario: 'Grupo Hoteleiro América',
    dataInicio: '2021-01-10',
    dataVencimento: '2025-06-30',
    valorMensal: 50000,
    indiceReajuste: 'Fixo',
    status: 'ativo',
  },
]

export function useContratos() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // TODO: Substituir por supabase.from('contratos').select() quando Supabase estiver configurado
    const fetchContratos = async () => {
      try {
        setLoading(true)
        // Simular delay de rede
        await new Promise(resolve => setTimeout(resolve, 500))
        setContratos(MOCK_CONTRATOS)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar contratos')
      } finally {
        setLoading(false)
      }
    }

    fetchContratos()
  }, [])

  return { contratos, loading, error }
}

export function useContratoById(id: string) {
  const [contrato, setContrato] = useState<Contrato | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // TODO: Substituir por supabase.from('contratos').select().eq('id', id).single()
    const fetchContrato = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 300))
        const found = MOCK_CONTRATOS.find(c => c.id === id)
        setContrato(found || null)
      } finally {
        setLoading(false)
      }
    }

    fetchContrato()
  }, [id])

  return { contrato, loading }
}
