import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { useImoveis } from '@/hooks/useImoveis'
import { rotulosTipoImovel, rotulosUso } from '@/lib/rotulos'
import { Search } from 'lucide-react'

export default function ImovelListPage() {
  const [busca, setBusca] = useState('')
  const { imoveis, loading } = useImoveis()
  const navigate = useNavigate()

  const termo = busca.toLowerCase()
  const filtrados = imoveis.filter(
    i => i.endereco.toLowerCase().includes(termo) || i.proprietario.toLowerCase().includes(termo)
  )

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
        <div className="bg-white p-4 shadow-sm">
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
              {filtrados.map(imovel => (
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
                    <span className="text-xs text-grafite-claro">Ver detalhes</span>
                  </td>
                  <td className="px-5 py-4">
                    <SeloSituacao situacao="regular" />
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
              ))}
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
