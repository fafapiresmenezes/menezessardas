import { useState, useEffect } from 'react';
import { repositorio, calcularAlertas } from '@/lib/repositorio';
export function useAlertas() {
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                const imoveis = await repositorio.listarImoveis();
                const contratos = await repositorio.listarContratos();
                const todos = calcularAlertas(imoveis, contratos);
                setAlertas(todos);
                setError(null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao buscar alertas');
            }
            finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);
    const getNaoLidos = () => 0;
    const getCriticos = () => alertas.filter(a => a.diasRestantes <= 30).length;
    const marcarComoLido = async (_id) => { };
    return { alertas, loading, error, getNaoLidos, getCriticos, marcarComoLido };
}
