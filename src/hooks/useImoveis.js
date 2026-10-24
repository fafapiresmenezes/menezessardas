import { useState, useEffect } from 'react';
import { repositorio } from '@/lib/repositorio';
import { situacaoPorPrazo } from '@/lib/datas';
export function useImoveis(filtro) {
    const [imoveis, setImoveis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetch = async () => {
            try {
                setLoading(true);
                let lista = await repositorio.listarImoveis();
                if (filtro) {
                    lista = lista.filter(i => i.endereco.toLowerCase().includes(filtro.toLowerCase()) ||
                        i.proprietario.toLowerCase().includes(filtro.toLowerCase()));
                }
                setImoveis(lista);
                setError(null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Erro ao buscar imóveis');
            }
            finally {
                setLoading(false);
            }
        };
        fetch();
    }, [filtro]);
    const getStatus = (dias) => situacaoPorPrazo(dias);
    return { imoveis, loading, error, getStatus };
}
export function useImovelById(id) {
    const [imovel, setImovel] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const fetch = async () => {
            try {
                const found = await repositorio.obterImovel(id);
                setImovel(found);
            }
            finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);
    return { imovel, loading };
}
