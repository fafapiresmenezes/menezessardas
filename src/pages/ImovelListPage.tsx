import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { rotulosTipoImovel, rotulosUso, siglaDocumento } from '@/lib/rotulos'
import { Search, Plus } from 'lucide-react'

export default function ImovelListPage() {
  const [busca, setBusca] = useState('')
  const { imoveis, loading } = useImoveis()
  const { alertas } = useAlertas()
  const navigate = useNavigate()

  const termo = busca.toLowerCase()
  const filtrados = imoveis.filter(
    i => i.endereco.toLowerCase().includes(termo) || i.proprietario.toLowerCase().includes(termo)
  )

  // Prazo de cada imóvel é o compromisso mais próximo (contrato ou documento).
  const prazoDoImovel = (imovelId: string): number | null => {
    const prazos = alertas.filter(a => a.imovelId === imovelId).map(a => a.diasRestantes)
    return prazos.length ? Math.min(...prazos) : null
  }

  if (loading) {
    return (
      <Layout title="Imóveis">
        <p className="text-grafite-claro">Carregando imóveis…</p>
      </Layout>
    )
  }

  return (
    <Layout title="Imóveis">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="bg-white p-4 shadow-sm flex-1">
            <label htmlFor="busca-imovel" className="block text-xs uppercase tracking-wider text-grafite mb-2">
              Buscar imóvel
            </label>
            <div className="flex items-center gap-2 border border-grafite-claro/40 px-3 py-2 rounded-sm focus-within:border-dourado">
              <Search size={18} className="text-grafite-claro flex-shrink-0" aria-hidden="true" />
              <input
                id="busca-imovel"
                type="search"
                placeholder="Endereço ou proprietário"
                value={busca}
                onChange={e => setBusca(e.target.value)}
                className="flex-1 bg-transparent outline-none text-grafite"
              />
            </div>
            <p className="text-xs text-grafite-claro mt-2" role="status">
              {filtrados.length} {filtrados.length === 1 ? 'imóvel' : 'imóveis'}
            </p>
          </div>
          <Link
            to="/imoveis/novo"
            className="inline-flex items-center justify-center gap-2 bg-navy text-white px-5 py-3 rounded-sm uppercase tracking-wider text-sm"
          >
            <Plus size={16} aria-hidden="true" /> Novo imóvel
          </Link>
        </div>

        <div className="relative bg-white shadow-sm overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Imóveis da carteira do escritório</caption>
            <thead className="bg-navy text-white">
              <tr>
                {['Endereço', 'Tipo', 'Uso', 'Proprietário', 'Documentos', 'Situação', ''].map((h, idx) => (
                  <th
                    key={h || `acoes-${idx}`}
                    scope="col"
                    className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium whitespace-nowrap"
                  >
                    {h || <span className="sr-only">Ações</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/10">
              {filtrados.map(imovel => {
                const dias = prazoDoImovel(imovel.id)
                return (
                  <tr key={imovel.id} className="hover:bg-pergaminho">
                    <td className="px-5 py-4 text-sm font-medium text-navy">{imovel.endereco}</td>
                    <td className="px-5 py-4 text-sm text-grafite-claro whitespace-nowrap">
                      {rotulosTipoImovel[imovel.tipo] ?? imovel.tipo}
                    </td>
                    <td className="px-5 py-4 text-sm text-grafite-claro whitespace-nowrap">
                      {rotulosUso[imovel.uso] ?? imovel.uso}
                    </td>
                    <td className="px-5 py-4 text-sm text-grafite-claro">{imovel.proprietario}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1">
                        {imovel.documentos.map(d => (
                          <span
                            key={d.id}
                            className="bg-regularFundo text-regular px-2 py-0.5 rounded-sm text-xs whitespace-nowrap"
                          >
                            {siglaDocumento[d.tipo] ?? d.tipo}
                          </span>
                        ))}
                        {imovel.documentos.length === 0 && (
                          <span className="text-xs text-grafite-claro">Nenhum</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <SeloSituacao situacao={situacaoPorPrazo(dias)} texto={textoPrazo(dias)} />
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/contrato/${imovel.id}`)}
                        className="text-navy underline underline-offset-4 hover:text-dourado-escuro text-sm"
                      >
                        Ver detalhes
                        <span className="sr-only"> de {imovel.endereco}</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtrados.length === 0 && (
          <div className="bg-white p-12 text-center shadow-sm">
            <p className="text-grafite-claro">Nenhum imóvel encontrado para “{busca}”.</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
