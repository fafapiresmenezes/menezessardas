import { enviarArquivo } from '@/lib/arquivos'
import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Passo, Escolha, Campo, classeCampo } from '@/components/Assistente'
import { SkeletonForm } from '@/components/Skeleton'
import ZonaArrastar from '@/components/ZonaArrastar'
import ChecklistExigencias from '@/components/ChecklistExigencias'
import { funcaoDoImovel } from '@/lib/exigencias'
import type { TipoContrato } from '@/lib/dominio'
import { TIPOS_CONTRATO, GARANTIAS, INDICES_REAJUSTE, PERIODICIDADES, tiposContratoParaUso, type UsoImovel } from '@/lib/dominio'
import { repositorio, type Imovel } from '@/lib/repositorio'
import { emDias, formatarData } from '@/lib/datas'

const ETAPAS = 5

export default function NovoContratoPage() {
  const navigate = useNavigate()
  const [sp] = useSearchParams()
  const imovelId = sp.get('imovelId')
  const paiId = sp.get('paiId')
  const natureza = (sp.get('natureza') as 'aditivo' | 'subcontrato' | null) ?? null
  const [etapa, setEtapa] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [imovel, setImovel] = useState<Imovel | null>(null)

  const [tipo, setTipo] = useState('')
  const [parte, setParte] = useState('')
  const [dataInicio, setDataInicio] = useState(emDias(0))
  const [dataVencimento, setDataVencimento] = useState(emDias(365))
  const [valor, setValor] = useState('')
  const [periodicidade, setPeriodicidade] = useState('mensal')
  const [indice, setIndice] = useState('ipca')
  const [garantia, setGarantia] = useState('sem_garantia')
  const [notas] = useState('')
  const [arquivo, setArquivo] = useState<{ nome: string; tamanho: number; arquivo: File } | null>(null)
  const [textoExtraido, setTextoExtraido] = useState<string>('')
  const [lendoPdf, setLendoPdf] = useState(false)

  // Passo D23 (usabilidade): sem imóvel na URL, a tela oferece a escolha aqui mesmo, em vez de voltar à lista sem explicar.
  const [imoveis, setImoveis] = useState<Imovel[] | null>(null)
  const [escolhido, setEscolhido] = useState('')
  useEffect(() => {
    if (!imovelId) {
      repositorio.listarImoveis().then(l => { setImoveis(l); if (l[0]) setEscolhido(l[0].id) }).catch(() => setImoveis([]))
      return
    }
    repositorio.obterImovel(imovelId).then(i => {
      if (i) setImovel(i)
      else navigate('/imoveis')
    })
  }, [imovelId, navigate])

  const tiposDisponiveis = imovel ? tiposContratoParaUso(imovel.uso as UsoImovel) : []
  const podeAvancando = (): boolean => {
    switch (etapa) {
      case 1:
        return !!(tipo && tiposDisponiveis.includes(tipo as any))
      case 2:
        return !!(parte.trim() && dataInicio && dataVencimento)
      case 3:
        return !!(valor && Number(valor) >= 0 && periodicidade && indice)
      case 4:
        return !!garantia
      case 5:
        return true
      default:
        return false
    }
  }

  const salvar = async () => {
    if (!imovelId || !tipo) return
    setSalvando(true)
    try {
      await repositorio.criarContrato({
        imovelId,
        contratoPaiId: paiId ?? undefined,
        natureza: natureza ?? 'principal',
        tipo: tipo as any,
        parte,
        dataInicio,
        dataVencimento: dataVencimento || null,
        valor: Number(valor) || 0,
        periodicidade: periodicidade as any,
        indice: indice as any,
        garantia: garantia as any,
        dataUltimoReajuste: null,
        notas,
        textoExtraido: textoExtraido || undefined,
        arquivo: arquivo ? { nome: arquivo.nome, tamanho: arquivo.tamanho, caminhoStorage: await enviarArquivo(arquivo.arquivo, `contratos/${imovelId}`) } : undefined,
      })
      navigate(`/contrato/${imovelId}${textoExtraido && (natureza ?? 'principal') === 'principal' ? '?analisar=1' : ''}`)
    } catch (err) {
      alert('Erro ao criar contrato: ' + (err instanceof Error ? err.message : 'desconhecido'))
      setSalvando(false)
    }
  }

  const avancar = () => {
    if (etapa < ETAPAS) setEtapa(etapa + 1)
    else salvar()
  }

  const voltar = () => {
    if (etapa > 1) setEtapa(etapa - 1)
    else navigate('/imoveis')
  }

  if (!imovelId) return (
    <Layout title="Novo contrato">
      <div className="max-w-2xl mx-auto bg-white shadow-sm p-6 border-t-2 border-dourado" data-testid="escolher-imovel">
        <h2 className="font-serif text-xl text-navy">Para qual imóvel é este contrato?</h2>
        <p className="text-sm text-grafite-claro mt-1 mb-4">Todo contrato fica ligado a um imóvel da carteira. Escolha abaixo ou cadastre o imóvel primeiro.</p>
        {imoveis === null ? <SkeletonForm /> : imoveis.length === 0 ? (
          <button type="button" onClick={() => navigate('/imoveis/novo')} className="min-h-[44px] px-4 bg-navy text-white text-sm">Cadastrar o primeiro imóvel</button>
        ) : (
          <div className="flex flex-wrap gap-2 items-end">
            <label className="text-sm flex-1 min-w-[240px]">Imóvel
              <select data-testid="imovel-escolha" className={classeCampo} value={escolhido} onChange={e => setEscolhido(e.target.value)}>
                {imoveis.map(i => <option key={i.id} value={i.id}>{i.endereco} · {i.proprietario}</option>)}
              </select>
            </label>
            <button type="button" data-testid="imovel-continuar" onClick={() => navigate(`/contrato/novo?imovelId=${escolhido}`)} className="min-h-[44px] px-4 bg-navy text-white text-sm">Continuar</button>
            <button type="button" onClick={() => navigate('/imoveis/novo')} className="min-h-[44px] px-4 border border-navy text-navy text-sm">Novo imóvel</button>
          </div>
        )}
      </div>
    </Layout>
  )
  if (!imovel) return <Layout title="Novo contrato"><div className="max-w-2xl mx-auto"><SkeletonForm /></div></Layout>

  return (
    <Layout title={`${natureza === 'aditivo' ? 'Novo aditivo' : natureza === 'subcontrato' ? 'Novo subcontrato' : 'Novo contrato'} — ${imovel.endereco}`}>
      <div className="max-w-2xl mx-auto">
        {etapa === 1 && (
          <Passo
            numero={1}
            total={ETAPAS}
            titulo="Qual é o tipo de contrato?"
            podeAvancar={podeAvancando()}
            onVoltar={voltar}
            onAvancar={avancar}
          >
            <Escolha nome="tipo" opcoes={TIPOS_CONTRATO.filter(t => tiposDisponiveis.includes(t.valor as any))} valor={tipo} onChange={setTipo} colunas={1} />
          </Passo>
        )}

        {etapa === 2 && (
          <Passo numero={2} total={ETAPAS} titulo="Datas e partes" podeAvancar={podeAvancando()} onVoltar={voltar} onAvancar={avancar}>
            <div className="space-y-5">
              <Campo id="parte" rotulo="Locatário / Fornecedor / Comodatário">
                <input id="parte" type="text" value={parte} onChange={e => setParte(e.target.value)} className={classeCampo} />
              </Campo>
              <Campo id="dataInicio" rotulo="Data de início">
                <input id="dataInicio" type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className={classeCampo} />
              </Campo>
              <Campo id="dataVencimento" rotulo="Data de vencimento (deixar vazio = indefinido)">
                <input id="dataVencimento" type="date" value={dataVencimento} onChange={e => setDataVencimento(e.target.value)} className={classeCampo} />
              </Campo>
            </div>
          </Passo>
        )}

        {etapa === 3 && (
          <Passo numero={3} total={ETAPAS} titulo="Valor e periodicidade" podeAvancar={podeAvancando()} onVoltar={voltar} onAvancar={avancar}>
            <div className="space-y-5">
              <Campo id="valor" rotulo="Valor" ajuda="deixar 0 para comodato ou sem contraprestação">
                <input
                  id="valor"
                  type="number"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  step="0.01"
                  min="0"
                  className={classeCampo}
                />
              </Campo>
              <Campo id="periodicidade" rotulo="Periodicidade de pagamento">
                <select id="periodicidade" value={periodicidade} onChange={e => setPeriodicidade(e.target.value)} className={classeCampo}>
                  {PERIODICIDADES.map(p => (
                    <option key={p.valor} value={p.valor}>
                      {p.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo id="indice" rotulo="Índice de reajuste">
                <select id="indice" value={indice} onChange={e => setIndice(e.target.value)} className={classeCampo}>
                  {INDICES_REAJUSTE.map(i => (
                    <option key={i.valor} value={i.valor}>
                      {i.rotulo}
                    </option>
                  ))}
                </select>
              </Campo>
            </div>
          </Passo>
        )}

        {etapa === 4 && (
          <Passo numero={4} total={ETAPAS} titulo="Garantia" podeAvancar={podeAvancando()} onVoltar={voltar} onAvancar={avancar}>
            <Escolha nome="garantia" opcoes={GARANTIAS} valor={garantia} onChange={setGarantia} colunas={1} />
          </Passo>
        )}

        {etapa === 5 && (
          <Passo
            numero={5}
            total={ETAPAS}
            titulo="Confirmação"
            ultimo
            podeAvancar={true}
            onVoltar={voltar}
            onAvancar={avancar}
            rotuloAvancar={salvando ? 'Salvando…' : 'Concluir'}
          >
            <div className="space-y-4">
              <ZonaArrastar
                rotulo="Arraste o PDF do contrato assinado para cá ou"
                tipoFixo="contrato"
                onArquivo={async arq => {
                  setArquivo({ nome: arq.name, tamanho: arq.size, arquivo: arq })
                  if (arq.type.includes('pdf') || arq.name.toLowerCase().endsWith('.pdf')) {
                    setLendoPdf(true)
                    try {
                      const { extrairTextoPdf } = await import('@/lib/pdf')
                      setTextoExtraido(await extrairTextoPdf(arq))
                    } catch {
                      setTextoExtraido('')
                    } finally {
                      setLendoPdf(false)
                    }
                  }
                }}
              />
              {arquivo && (
                <p className="text-sm text-grafite">
                  Anexado: {arquivo.nome}
                  {lendoPdf && ' — lendo o conteúdo…'}
                  {!lendoPdf && textoExtraido && ' — conteúdo lido para a análise'}
                </p>
              )}
              {arquivo && (
                <ChecklistExigencias key={tipo} funcaoInicial={funcaoDoImovel(imovel.tipo, (tipo || undefined) as TipoContrato | undefined)} anexos={[arquivo.nome]} imovel={{ id: imovel.id, nome: `${imovel.endereco}, ${imovel.cidade}` }} />
              )}
              <dl className="grid gap-3">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Imóvel</dt>
                  <dd className="font-medium text-navy">{imovel.endereco}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Tipo</dt>
                  <dd className="font-medium text-navy">{TIPOS_CONTRATO.find(t => t.valor === tipo)?.rotulo}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Locatário</dt>
                  <dd className="font-medium text-navy">{parte}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Período</dt>
                  <dd className="font-medium text-navy">
                    {formatarData(dataInicio)} a {dataVencimento ? formatarData(dataVencimento) : 'indefinido'}
                  </dd>
                </div>
                {valor && (
                  <div>
                    <dt className="text-xs uppercase tracking-wider text-grafite-claro">Valor</dt>
                    <dd className="font-medium text-navy">
                      R$ {Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} {periodicidade}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </Passo>
        )}
      </div>
    </Layout>
  )
}
