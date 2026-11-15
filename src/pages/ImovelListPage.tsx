import { useState } from 'react'
import { useBaixado } from '@/hooks/useBaixado'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { SkeletonTable } from '@/components/Skeleton'
import { useImoveis } from '@/hooks/useImoveis'
import { useAlertas } from '@/hooks/useAlertas'
import { situacaoPorPrazo, textoPrazo } from '@/lib/datas'
import { rotulosTipoImovel, rotulosUso, siglaDocumento } from '@/lib/rotulos'
import { Search, Plus, Upload } from 'lucide-react'
import Vazio from '@/components/Vazio'

export default function ImovelListPage() {
  const [busca, setBusca] = useState(() => { try { return localStorage.getItem('lsm-imoveis-busca') ?? '' } catch { return '' } }) // Passo 192
  const [linkCopiado, setLinkCopiado] = useState(false) // Passo 281
  const [baixado, marcarBaixado] = useBaixado() // Passo 383
  const { imoveis, loading } = useImoveis()
  const { alertas } = useAlertas()
  const navigate = useNavigate()
  // Passo 07: filtro por situação vindo do Painel (?situacao=vencido|critico|em_dia).
  const [params, setParams] = useSearchParams()
  const situacaoFiltro = params.get('situacao')
  const ROTULO_FILTRO: Record<string, string> = { vencido: 'Vencidos', critico: 'Vencem em 30 dias', em_dia: 'Em dia' }

  // Prazo de cada imóvel é o compromisso mais próximo (contrato ou documento).
  const prazoDoImovel = (imovelId: string): number | null => {
    const prazos = alertas.filter(a => a.imovelId === imovelId).map(a => a.diasRestantes)
    return prazos.length ? Math.min(...prazos) : null
  }
  const casaSituacao = (imovelId: string) => {
    if (!situacaoFiltro) return true
    const s = situacaoPorPrazo(prazoDoImovel(imovelId))
    if (situacaoFiltro === 'em_dia') return s === 'regular' || s === 'atencao' || s === 'sem_prazo'
    return s === situacaoFiltro
  }

  const termo = busca.toLowerCase()
  const filtrados = imoveis.filter(
    i => (i.endereco.toLowerCase().includes(termo) || i.proprietario.toLowerCase().includes(termo)) && casaSituacao(i.id)
  )

  if (loading) {
    return (
      <Layout title="Imóveis">
        <div className="space-y-6">
          <div className="bg-white p-4 shadow-sm rounded-sm animate-pulse">
            <div className="h-4 bg-grafite-claro/20 rounded w-40 mb-3"></div>
            <div className="h-10 bg-navy/10 rounded w-full"></div>
          </div>
          <SkeletonTable />
        </div>
      </Layout>
    )
  }

  return (
    <Layout title="Imóveis">
      <div className="space-y-6">
        {situacaoFiltro && (
          <p data-testid="filtro-situacao" className="flex items-center gap-3 text-sm bg-white border-l-4 border-dourado px-4 py-3 shadow-sm">
            <span>Mostrando só: <strong className="text-navy">{ROTULO_FILTRO[situacaoFiltro] ?? situacaoFiltro}</strong> ({filtrados.length})</span>
            <button type="button" onClick={() => setParams({})} title="Remove o filtro de situação e volta a mostrar todos os imóveis" className="underline text-navy">limpar filtro</button>
          </p>
        )}
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="bg-white p-4 shadow-sm flex-1">
            <label htmlFor="busca-imovel" className="block text-xs uppercase tracking-wider text-grafite mb-1">
              Buscar imóvel
            </label>
            <p className="text-xs text-grafite-claro mb-2">Digite o endereço, proprietário ou condomínio</p>
            <div className="flex items-center gap-2 border border-grafite-claro/40 px-3 py-2.5 rounded-sm focus-within:border-dourado focus-within:ring-1 focus-within:ring-dourado/30 transition">
              <Search size={18} className="text-grafite-claro flex-shrink-0" aria-hidden="true" />
              <input
                id="busca-imovel"
                type="search"
                placeholder="Ex: Rua das Flores 123, João Silva"
                value={busca}
                onChange={e => { setBusca(e.target.value); try { localStorage.setItem('lsm-imoveis-busca', e.target.value) } catch { /* sem memória local */ } }}
                className="flex-1 bg-transparent outline-none text-grafite"
                aria-label="Buscar imóvel por endereço ou proprietário"
              />
            </div>
            <p className="text-xs text-grafite-claro mt-2" role="status" aria-live="polite">
              {filtrados.length} {filtrados.length === 1 ? 'imóvel encontrado' : 'imóveis encontrados'}
              {/* Passo 121: lista filtrada em texto (endereço, proprietário, prazo mais próximo), para a reunião com o cliente. */}
              {/* Passo 158: imprimir a lista de imóveis filtrada. */}
              {filtrados.length > 0 && <button type="button" data-testid="imprimir-imoveis" title="Abre a janela de impressão do navegador para imprimir a lista de imóveis filtrada" onClick={() => window.print()} className="mr-3 underline text-navy print:hidden min-h-[44px] inline-flex items-center">imprimir</button>}
              {filtrados.length > 0 && <button type="button" data-testid="copiar-link-imoveis" title="Copia o endereço desta lista de imóveis para compartilhar com a equipe" onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setLinkCopiado(true)).catch(() => undefined)} className="ml-2 underline text-navy print:hidden min-h-[44px] inline-flex items-center">{linkCopiado ? 'link copiado' : 'copiar link'}</button>}{/* Passo 241 */}
              {filtrados.length > 0 && <button type="button" data-testid="baixar-imoveis" title="Baixa a planilha CSV com os imóveis filtrados (endereço, cidade, tipo, uso, proprietário e matrícula)" aria-live="polite" onClick={() => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([['endereço;cidade;UF;tipo;uso;proprietário;matrícula', ...filtrados.map(i => `${i.endereco.replace(/;/g, ',')};${i.cidade};${i.uf};${i.tipo};${i.uso};${i.proprietario};${i.matricula}`)].join('\n')], { type: 'text/plain;charset=utf-8' })); a.download = 'imoveis.csv'; a.click(); marcarBaixado(); setTimeout(() => URL.revokeObjectURL(a.href), 2000) }} className="ml-2 underline text-navy text-sm print:hidden min-h-[44px] inline-flex items-center">{baixado ? 'baixado' : 'baixar CSV'}</button>}{/* Passo 318 */}
              {filtrados.length > 0 && <button type="button" data-testid="copiar-imoveis" title="Copia a lista filtrada em texto (endereço, proprietário e prazo mais próximo) para colar na reunião com o cliente" onClick={() => navigator.clipboard?.writeText(`Imóveis · ${new Date().toLocaleDateString('pt-BR')} · ${filtrados.length}\n` + filtrados.map(i => { const d = prazoDoImovel(i.id); return `${i.endereco} · ${i.proprietario} · ${d === null ? 'sem prazo' : textoPrazo(d)}` }).join('\n')).catch(() => undefined)} className="ml-3 underline text-navy min-h-[44px] inline-flex items-center">copiar lista</button>}
            </p>
          </div>
          <Link
            to="/imoveis/novo"
            title="Abre o formulário para cadastrar um novo imóvel na carteira"
            className="inline-flex items-center justify-center gap-2 bg-navy text-white px-5 py-3 rounded-sm uppercase tracking-wider text-sm"
          >
            <Plus size={16} aria-hidden="true" /> Novo imóvel
          </Link>
          <Link to="/imoveis/importar" title="Abre a tela para importar vários imóveis de uma vez por planilha CSV" className="inline-flex items-center justify-center gap-2 border border-navy text-navy px-5 py-3 rounded-sm uppercase tracking-wider text-sm" data-testid="importar-csv">
            <Upload size={16} aria-hidden="true" /> Importar planilha
          </Link>
        </div>

        <div className="relative bg-white shadow-sm overflow-x-auto">
          <table className="w-full">
            <caption className="sr-only">Imóveis da carteira do escritório</caption>
            <thead className="bg-navy text-white">
              <tr>
                <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Endereço</th>
                <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium whitespace-nowrap">Tipo</th>
                <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium whitespace-nowrap">Uso</th>
                <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium">Proprietário</th>
                <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium whitespace-nowrap">Documentos</th>
                <th scope="col" className="px-5 py-3 text-left text-xs uppercase tracking-wider font-medium whitespace-nowrap">Situação</th>
                <th scope="col" className="px-5 py-3"><span className="sr-only">Ações</span></th>
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
                        onClick={() => navigate(`/imoveis/${imovel.id}`)}
                        title={`Abre a ficha completa do imóvel ${imovel.endereco}: contrato, documentos, compromissos e tendência`}
                        className="inline-flex items-center min-h-[44px] px-3 -mx-3 text-navy underline underline-offset-4 hover:text-dourado-escuro text-sm whitespace-nowrap"
                      >
                        <span>Ver detalhes</span>
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
          <div className="bg-white shadow-sm">
            <Vazio
              testid="imoveis-vazio"
              titulo={busca ? 'Nenhum imóvel com esse termo' : 'Nenhum imóvel cadastrado'}
              texto={busca ? 'Nenhum imóvel bate com o que você escreveu na busca. Limpe a busca para ver a carteira inteira.' : 'Cadastre o primeiro imóvel para acompanhar contratos, prazos, reajustes e documentos.'}
              acao={busca
                ? { rotulo: 'Limpar a busca', onClick: () => { setBusca(''); try { localStorage.removeItem('lsm-imoveis-busca') } catch { /* sem memória local */ } }, dica: 'Apaga o que está escrito na busca e mostra todos os imóveis' }
                : { rotulo: 'Cadastrar imóvel', para: '/imoveis/novo', dica: 'Abre o formulário para cadastrar o primeiro imóvel da carteira' }}
            />
          </div>
        )}
      </div>
    </Layout>
  )
}
