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
        const calculados = calcularAlertas(imoveis, contratos)

        // Adicionar alertas customizados (compromissos) do banco
        const compromissos = JSON.parse(localStorage.getItem('compromissos_offline') || '[]')
        const customizados = compromissos.map((c: any) => ({
          id: c.id,
          imovelId: '',
          imovel: c.imovel,
          tipo: 'compromisso',
          titulo: c.titulo,
          dataEvento: c.dataEvento,
          diasRestantes: Math.ceil((new Date(c.dataEvento).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        }))

        setAlertas([...calculados, ...customizados])
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
