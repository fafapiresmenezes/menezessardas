import { useState, useEffect } from 'react'
import { repositorio } from '@/lib/repositorio'
import { situacaoPorPrazo, type Situacao } from '@/lib/datas'
import type { Imovel } from '@/lib/repositorio'

export { type Imovel }

export function useImoveis(filtro?: string) {
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        let lista = await repositorio.listarImoveis()
        if (filtro) {
          lista = lista.filter(i =>
            i.endereco.toLowerCase().includes(filtro.toLowerCase()) ||
            i.proprietario.toLowerCase().includes(filtro.toLowerCase())
          )
        }
        setImoveis(lista)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar imóveis')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [filtro])

  const getStatus = (dias: number | null): Situacao => situacaoPorPrazo(dias)
  return { imoveis, loading, error, getStatus }
}

export function useImovelById(id: string) {
  const [imovel, setImovel] = useState<Imovel | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      try {
        const found = await repositorio.obterImovel(id)
        setImovel(found)
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [id])

  return { imovel, loading }
}
