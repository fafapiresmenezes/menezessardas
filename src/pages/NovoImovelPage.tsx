import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import ZonaArrastar from '@/components/ZonaArrastar'
import { Passo, Escolha, Campo, classeCampo } from '@/components/Assistente'
import { TIPOS_IMOVEL, USOS_IMOVEL, UFS, checklistDocumentos, type TipoImovel, type UsoImovel, type UF, type TipoDocumento } from '@/lib/dominio'
import { repositorio } from '@/lib/repositorio'

const ETAPAS = 6

interface DocAnexado {
  tipo: TipoDocumento
  nome: string
}

export default function NovoImovelPage() {
  const navigate = useNavigate()
  const [etapa, setEtapa] = useState(1)
  const [salvando, setSalvando] = useState(false)
  const [tipo, setTipo] = useState<TipoImovel | null>(null)
  const [uso, setUso] = useState<UsoImovel | null>(null)
  const [uf, setUf] = useState<UF | null>(null)
  const [endereco, setEndereco] = useState('')
  const [cidade, setCidade] = useState('')
  const [proprietario, setProprietario] = useState('')
  const [matricula, setMatricula] = useState('')
  const [area, setArea] = useState('')
  const [notas, setNotas] = useState('')
  // Checklist: quais itens o escritório já tem (tipo de documento => true).
  const [tem, setTem] = useState<Partial<Record<TipoDocumento, boolean>>>({})
  const [extras, setExtras] = useState<DocAnexado[]>([])
  const [erro, setErro] = useState('')

  const checklist = tipo && uso && uf ? checklistDocumentos(tipo, uso, uf) : []

  const podeContinuar = (): boolean => {
    switch (etapa) {
      case 1:
        return tipo !== null
      case 2:
        return uso !== null
      case 3:
        return uf !== null
      case 4:
        return !!(endereco.trim() && proprietario.trim() && matricula.trim() && cidade.trim())
      default:
        return true
    }
  }

  const salvar = async () => {
    if (!tipo || !uso || !uf) return
    setSalvando(true)
    try {
      const documentos = [
        ...checklist
          .filter(item => tem[item.tipo])
          .map(item => ({ tipo: item.tipo, nome: item.rotulo })),
        ...extras,
      ]
      await repositorio.criarImovel({
        endereco,
        cidade,
        uf,
        tipo,
        uso,
        proprietario,
        matricula,
        areaM2: area ? Number(area) : undefined,
        notas,
        documentos,
      })
      navigate('/imoveis')
    } catch (err) {
      setErro('Erro ao criar imóvel: ' + (err instanceof Error ? err.message : 'desconhecido'))
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

  return (
    <Layout title="Novo imóvel">
      <div className="max-w-2xl mx-auto">
        {erro && (
          <p role="alert" className="mb-4 p-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">{erro}</p>
        )}

        {etapa === 1 && (
          <Passo numero={1} total={ETAPAS} titulo="Qual é o tipo de imóvel?" podeAvancar={podeContinuar()} onVoltar={voltar} onAvancar={avancar}>
            <Escolha nome="tipo" opcoes={TIPOS_IMOVEL} valor={tipo} onChange={setTipo} colunas={2} />
          </Passo>
        )}

        {etapa === 2 && (
          <Passo numero={2} total={ETAPAS} titulo="Como o imóvel é ocupado?" podeAvancar={podeContinuar()} onVoltar={voltar} onAvancar={avancar}>
            <Escolha nome="uso" opcoes={USOS_IMOVEL} valor={uso} onChange={setUso} colunas={1} />
          </Passo>
        )}

        {etapa === 3 && (
          <Passo numero={3} total={ETAPAS} titulo="Onde fica o imóvel?" podeAvancar={podeContinuar()} onVoltar={voltar} onAvancar={avancar}>
            <Escolha nome="uf" opcoes={UFS} valor={uf} onChange={setUf} colunas={3} />
          </Passo>
        )}

        {etapa === 4 && (
          <Passo numero={4} total={ETAPAS} titulo="Dados principais" podeAvancar={podeContinuar()} onVoltar={voltar} onAvancar={avancar}>
            <div className="space-y-5">
              <Campo id="endereco" rotulo="Endereço completo">
                <input id="endereco" type="text" value={endereco} onChange={e => setEndereco(e.target.value)} placeholder="Rua, avenida, número..." className={classeCampo} />
              </Campo>
              <Campo id="cidade" rotulo="Cidade">
                <input id="cidade" type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo" className={classeCampo} />
              </Campo>
              <Campo id="proprietario" rotulo="Proprietário">
                <input id="proprietario" type="text" value={proprietario} onChange={e => setProprietario(e.target.value)} placeholder="Nome completo" className={classeCampo} />
              </Campo>
              <Campo id="matricula" rotulo="Matrícula RGI ou CGEM">
                <input id="matricula" type="text" value={matricula} onChange={e => setMatricula(e.target.value)} className={classeCampo} />
              </Campo>
              <Campo id="area" rotulo="Área (m²)">
                <input id="area" type="number" value={area} onChange={e => setArea(e.target.value)} className={classeCampo} />
              </Campo>
              <Campo id="notas" rotulo="Observações">
                <textarea id="notas" rows={3} value={notas} onChange={e => setNotas(e.target.value)} className={classeCampo + ' resize-none'} />
              </Campo>
            </div>
          </Passo>
        )}

        {etapa === 5 && (
          <Passo
            numero={5}
            total={ETAPAS}
            titulo="Documentos do imóvel"
            ajuda="Marque o que o escritório já tem. O que faltar fica pendente na página do imóvel."
            podeAvancar={true}
            onVoltar={voltar}
            onAvancar={avancar}
          >
            <fieldset className="space-y-3">
              <legend className="sr-only">Documentos necessários para este imóvel</legend>
              {checklist.map(item => (
                <label key={item.tipo} className="flex items-start gap-3 p-3 border-l-2 border-navy/10 bg-white cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!tem[item.tipo]}
                    onChange={e => setTem({ ...tem, [item.tipo]: e.target.checked })}
                    className="mt-1 h-4 w-4 accent-navy"
                  />
                  <span>
                    <span className="block font-medium text-navy">
                      {item.rotulo}
                      {item.obrigatorio && <span className="ml-2 text-xs text-critico">obrigatório</span>}
                    </span>
                    <span className="block text-sm text-grafite-claro">{item.motivo}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <div className="mt-6">
              <ZonaArrastar
                rotulo="Arraste outros documentos para cá ou"
                onArquivo={arq => setExtras([...extras, { tipo: 'outro', nome: arq.name }])}
              />
              {extras.length > 0 && (
                <ul className="mt-3 text-sm text-grafite space-y-1">
                  {extras.map((d, i) => (
                    <li key={`${d.nome}-${i}`}>{d.nome}</li>
                  ))}
                </ul>
              )}
            </div>
          </Passo>
        )}

        {etapa === 6 && (
          <Passo numero={6} total={ETAPAS} titulo="Confirmação" ultimo podeAvancar={true} onVoltar={voltar} onAvancar={avancar} rotuloAvancar={salvando ? 'Salvando…' : 'Concluir'}>
            <dl className="grid gap-3">
              <div>
                <dt className="text-xs uppercase tracking-wider text-grafite-claro">Tipo</dt>
                <dd className="font-medium text-navy">{TIPOS_IMOVEL.find(t => t.valor === tipo)?.rotulo}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-grafite-claro">Uso</dt>
                <dd className="font-medium text-navy">{USOS_IMOVEL.find(u => u.valor === uso)?.rotulo}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-grafite-claro">Localização</dt>
                <dd className="font-medium text-navy">{endereco}, {cidade} — {uf}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-grafite-claro">Proprietário</dt>
                <dd className="font-medium text-navy">{proprietario}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-grafite-claro">Documentos</dt>
                <dd className="font-medium text-navy">
                  {checklist.filter(i => tem[i.tipo]).length} de {checklist.length} necessários + {extras.length} extras
                </dd>
              </div>
            </dl>
          </Passo>
        )}
      </div>
    </Layout>
  )
}
