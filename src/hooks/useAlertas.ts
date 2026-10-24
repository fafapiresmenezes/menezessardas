import { useState, useEffect } from 'react'
import { repositorio, calcularAlertas, type Alerta } from '@/lib/repositorio'

export { type Alerta }

export function useAlertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true)
        const imoveis = await repositorio.listarImoveis()
        const contratos = await repositorio.listarContratos()
        const todos = calcularAlertas(imoveis, contratos)
        setAlertas(todos)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao buscar alertas')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [])

  // Vencidos já contam em outro indicador; aqui só o que ainda vence.
  const getCriticos = () => alertas.filter(a => a.diasRestantes >= 0 && a.diasRestantes <= 30).length

  return { alertas, loading, error, getCriticos }
}
