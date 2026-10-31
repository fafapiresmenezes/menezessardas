import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import SeloSituacao from '@/components/SeloSituacao'
import { Escolha, Campo, classeCampo } from '@/components/Assistente'
import { useImoveis } from '@/hooks/useImoveis'
import {
  CATEGORIAS,
  alertasFornecedores,
  cnpjValido,
  formatarCnpj,
  listarFornecedores,
  novoIdLocal,
  resumoKyc,
  salvarFornecedor,
  statusSla,
  type CategoriaFornecedor,
  type Fornecedor,
  slaCumprido,
} from '@/lib/fornecedores'
import { Plus, AlertOctagon, AlertTriangle, ShieldCheck, Gauge } from 'lucide-react'

const rotuloCategoria = Object.fromEntries(CATEGORIAS.map(c => [c.valor, c.rotulo])) as Record<CategoriaFornecedor, string>

export default function FornecedoresPage() {
  const navigate = useNavigate()
  const { imoveis } = useImoveis()
  const [lista, setLista] = useState<Fornecedor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [novo, setNovo] = useState(false)

  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [categoria, setCategoria] = useState<CategoriaFornecedor | null>(null)
  const [imovelIds, setImovelIds] = useState<string[]>([])
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    setLista(await listarFornecedores())
    setCarregando(false)
  }, [])
  useEffect(() => {
    carregar()
  }, [carregar])

  const alertas = alertasFornecedores(lista)

  const cadastrar = async () => {
    if (!nome.trim()) return setErro('Informe o nome do fornecedor.')
    if (!cnpjValido(cnpj)) return setErro('O CNPJ informado não é válido. Confira os 14 dígitos.')
    if (!categoria) return setErro('Escolha o tipo de serviço.')
    const f: Fornecedor = {
      id: novoIdLocal(),
      nome: nome.trim(),
      cnpj: cnpj.replace(/\D/g, ''),
      categoria,
      imovelIds,
      kyc: { ceis: 'nao_verificado', cnep: 'nao_verificado' },
      certidoes: [],
      slas: [],
      notas: '',
    }
    await salvarFornecedor(f, `Fornecedor cadastrado: ${f.nome}`)
    navigate(`/fornecedor/${f.id}`)
  }

  const alternarImovel = (id: string) =>
    setImovelIds(atual => (atual.includes(id) ? atual.filter(x => x !== id) : [...atual, id]))

  // Passo 70: ranking de fornecedores por SLA cumprido (sem medição vai para o fim) e por metas descumpridas.
  const [ordem, setOrdem] = useState<'nome' | 'sla' | 'descumpridas'>('nome')
  const nDesc = (f: (typeof lista)[number]) => f.slas.filter(x => statusSla(x).status === 'descumprido').length
  const ordenados = [...lista].sort((a, b) => ordem === 'sla' ? (slaCumprido(b).pct ?? -1) - (slaCumprido(a).pct ?? -1) || nDesc(a) - nDesc(b) : ordem === 'descumpridas' ? nDesc(b) - nDesc(a) : a.nome.localeCompare(b.nome, 'pt-BR'))
  return (
    <Layout title="Fornecedores">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-grafite-claro max-w-2xl">
            Prestadores de serviço dos imóveis, com verificação cadastral (KYC) e metas de nível de serviço (SLA).
          </p>
          <button
            onClick={() => setNovo(v => !v)}
            className="inline-flex items-center gap-2 min-h-[44px] bg-navy hover:bg-navy-700 text-white px-5 rounded-sm uppercase tracking-wider text-sm"
          >
            <Plus size={16} aria-hidden="true" /> Novo fornecedor
          </button>
        </div>

        {novo && (
          <section className="bg-white border-t-2 border-dourado shadow-sm p-6 space-y-5" aria-label="Cadastrar fornecedor">
            <div className="grid md:grid-cols-2 gap-4">
              <Campo id="f-nome" rotulo="Nome do fornecedor">
                <input id="f-nome" className={classeCampo} value={nome} onChange={e => setNome(e.target.value)} />
              </Campo>
              <Campo id="f-cnpj" rotulo="CNPJ" ajuda="Só números ou com pontuação; o sistema confere os dígitos.">
                <input
                  id="f-cnpj"
                  className={classeCampo}
                  inputMode="numeric"
                  value={cnpj}
                  onChange={e => setCnpj(e.target.value)}
                  aria-describedby="f-cnpj-ajuda"
                />
              </Campo>
            </div>
            <div>
              <p className="block text-xs uppercase tracking-wider text-grafite mb-2">Tipo de serviço</p>
              <Escolha
                nome="Tipo de serviço"
                opcoes={CATEGORIAS.map(c => ({ valor: c.valor, rotulo: c.rotulo }))}
                valor={categoria}
                onChange={setCategoria}
                colunas={3}
              />
            </div>
            <fieldset>
              <legend className="block text-xs uppercase tracking-wider text-grafite mb-2">Atende quais imóveis?</legend>
              <div className="grid sm:grid-cols-2 gap-2 max-h-48 overflow-auto">
                {imoveis.map(i => (
                  <label key={i.id} className="flex items-center gap-3 min-h-[44px] px-3 border border-navy/10 bg-white cursor-pointer">
                    <input type="checkbox" checked={imovelIds.includes(i.id)} onChange={() => alternarImovel(i.id)} />
                    <span className="text-sm">{i.endereco}, {i.cidade}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {erro && <p role="alert" className="text-sm text-critico">{erro}</p>}
            <button
              onClick={cadastrar}
              className="min-h-[44px] bg-navy hover:bg-navy-700 text-white px-6 rounded-sm uppercase tracking-wider text-sm"
            >
              Cadastrar e abrir
            </button>
          </section>
        )}

        {alertas.length > 0 && (
          <section className="bg-white shadow-sm p-6 border-l-4 border-atencao" aria-label="Alertas de fornecedores">
            <h2 className="text-lg mb-1 flex items-center gap-2">
              <AlertTriangle size={18} className="text-atencao" aria-hidden="true" />
              Atenção agora
            </h2>
            <p className="text-sm text-grafite-claro mb-4">Fornecedores com alertas de KYC ou SLA. Clique para gerenciar.</p>
            <ul className="space-y-2">
              {alertas.slice(0, 8).map((a, i) => (
                <li key={i}>
                  <button
                    onClick={() => navigate(`/fornecedor/${a.fornecedorId}`)}
                    className="w-full text-left min-h-[44px] flex items-start gap-3 px-3 py-2 hover:bg-pergaminho transition"
                  >
                    {a.gravidade === 'critico' ? (
                      <AlertOctagon size={18} className="text-critico flex-shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle size={18} className="text-atencao flex-shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <span className="text-sm">
                      <strong className="font-medium">{a.fornecedor}</strong> — {a.texto}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="titulo-lista-fornecedores">
          <h2 id="titulo-lista-fornecedores" className="text-xl mb-1">
            Fornecedores
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <p className="text-sm text-grafite-claro">Clique em um fornecedor para gerenciar KYC, certificados e metas de serviço.</p>
            <label className="text-sm flex items-center gap-2">Ordenar por
              <select value={ordem} onChange={e => setOrdem(e.target.value as typeof ordem)} className="border px-2 py-2 min-h-[44px]" data-testid="ordem-fornecedores">
                <option value="nome">Nome</option>
                <option value="sla">Ranking de SLA (melhor primeiro)</option>
                <option value="descumpridas">Mais metas descumpridas</option>
              </select>
            </label>
          </div>
          {carregando ? (
            <p className="text-grafite-claro">Carregando…</p>
          ) : lista.length === 0 ? (
            <div className="bg-white p-12 text-center shadow-sm border-l-4 border-grafite-claro/30">
              <p className="text-grafite-claro font-medium mb-2">Nenhum fornecedor cadastrado</p>
              <p className="text-sm text-grafite-claro">Comece adicionando um prestador de serviço para rastrear sua conformidade.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {ordenados.map((f, pos) => {
                const kyc = resumoKyc(f)
                const descumpridos = f.slas.filter(s => statusSla(s).status === 'descumprido').length
                const sla = slaCumprido(f)
                return (
                  <button
                    key={f.id}
                    onClick={() => navigate(`/fornecedor/${f.id}`)}
                    className="text-left bg-white shadow-sm border-t-2 border-transparent hover:border-dourado p-5 transition min-h-[140px]"
                    aria-label={`${f.nome} - ${rotuloCategoria[f.categoria]}`}
                  >
                    <p className="text-xs uppercase tracking-wider text-dourado-escuro">{ordem === 'sla' && slaCumprido(f).pct !== null && <span data-testid="posicao-sla">{pos + 1}º · </span>}{rotuloCategoria[f.categoria]}</p>
                    <h3 className="text-lg mt-1">{f.nome}</h3>
                    <p className="text-xs text-grafite-claro mt-0.5 font-mono">{formatarCnpj(f.cnpj)}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                      <span className="inline-flex items-center gap-1 text-xs text-grafite-claro">
                        <ShieldCheck size={14} aria-hidden="true" /> KYC
                      </span>
                      <SeloSituacao
                        situacao={kyc.nivel === 'critico' ? 'critico' : kyc.nivel === 'atencao' ? 'atencao' : 'regular'}
                        texto={kyc.nivel === 'critico' ? 'Irregular' : kyc.nivel === 'atencao' ? 'Com pendências' : 'Em dia'}
                      />
                      <span className="inline-flex items-center gap-1 text-xs text-grafite-claro ml-2">
                        <Gauge size={14} aria-hidden="true" /> SLA
                      </span>
                      {f.slas.length === 0 ? (
                        <SeloSituacao situacao="sem_prazo" texto="Sem metas" />
                      ) : sla.pct === null ? (
                        <SeloSituacao situacao="sem_prazo" texto="Sem medição" />
                      ) : (
                        <span data-testid={`sla-${f.id}`}><SeloSituacao situacao={sla.nivel} texto={`${sla.pct}% cumprido`} /></span>
                      )}
                      {descumpridos > 0 && <span className="text-xs text-critico">{descumpridos} meta(s) descumprida(s)</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </Layout>
  )
}
