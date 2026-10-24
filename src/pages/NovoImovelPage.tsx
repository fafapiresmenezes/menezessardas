import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '@/components/Layout'
import { Passo, Escolha, Campo, classeCampo } from '@/components/Assistente'
import { TIPOS_IMOVEL, USOS_IMOVEL, UFS, checklistDocumentos, type TipoImovel, type UsoImovel, type UF } from '@/lib/dominio'
import { repositorio } from '@/lib/repositorio'

const ETAPAS = 6

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
      case 5:
        return true
      case 6:
        return true
      default:
        return false
    }
  }

  const salvar = async () => {
    if (!tipo || !uso || !uf) return
    setSalvando(true)
    try {
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
      })
      navigate('/imoveis')
    } catch (err) {
      alert('Erro ao criar imóvel: ' + (err instanceof Error ? err.message : 'desconhecido'))
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

  const checklist = tipo && uso && uf ? checklistDocumentos(tipo, uso, uf) : []

  return (
    <Layout title="Novo imóvel">
      <div className="max-w-2xl mx-auto">
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
                <input
                  id="endereco"
                  type="text"
                  value={endereco}
                  onChange={e => setEndereco(e.target.value)}
                  placeholder="Rua, avenida, número..."
                  className={classeCampo}
                />
              </Campo>
              <Campo id="cidade" rotulo="Cidade">
                <input id="cidade" type="text" value={cidade} onChange={e => setCidade(e.target.value)} placeholder="São Paulo" className={classeCampo} />
              </Campo>
              <Campo id="proprietario" rotulo="Proprietário">
                <input
                  id="proprietario"
                  type="text"
                  value={proprietario}
                  onChange={e => setProprietario(e.target.value)}
                  placeholder="Nome completo"
                  className={classeCampo}
                />
              </Campo>
              <Campo id="matricula" rotulo="Matrícula RGI ou CGEM">
                <input id="matricula" type="text" value={matricula} onChange={e => setMatricula(e.target.value)} className={classeCampo} />
              </Campo>
            </div>
          </Passo>
        )}

        {etapa === 5 && (
          <Passo numero={5} total={ETAPAS} titulo="Informações adicionais" podeAvancar={true} onVoltar={voltar} onAvancar={avancar}>
            <div className="space-y-5">
              <Campo id="area" rotulo="Área (m²)">
                <input id="area" type="number" value={area} onChange={e => setArea(e.target.value)} className={classeCampo} />
              </Campo>
              <Campo id="notas" rotulo="Observações">
                <textarea
                  id="notas"
                  value={notas}
                  onChange={e => setNotas(e.target.value)}
                  rows={4}
                  className={classeCampo + ' resize-none'}
                  placeholder="Detalhes adicionais sobre o imóvel..."
                />
              </Campo>
            </div>
          </Passo>
        )}

        {etapa === 6 && (
          <Passo numero={6} total={ETAPAS} titulo="Confirmação" ultimo podeAvancar={true} onVoltar={voltar} onAvancar={avancar} rotuloAvancar={salvando ? 'Salvando…' : 'Concluir'}>
            <div className="space-y-4">
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
                  <dd className="font-medium text-navy">
                    {endereco}, {cidade} — {uf}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-grafite-claro">Proprietário</dt>
                  <dd className="font-medium text-navy">{proprietario}</dd>
                </div>
              </dl>

              {checklist.length > 0 && (
                <div className="mt-6 pt-4 border-t border-navy/10">
                  <p className="text-xs uppercase tracking-wider text-grafite-claro mb-3">Documentos recomendados</p>
                  <ul className="text-sm space-y-1 text-grafite">
                    {checklist
                      .filter(c => c.obrigatorio)
                      .slice(0, 5)
                      .map(c => (
                        <li key={c.tipo} className="flex gap-2">
                          <span className="text-dourado">✓</span>
                          <span>{c.rotulo}</span>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          </Passo>
        )}
      </div>
    </Layout>
  )
}
