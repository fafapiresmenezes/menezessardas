// Passo D21 (Diamante): pacote "administradora de locação" — vistoria com fotos, lançamentos do mês,
// repasse ao proprietário e prestação de contas em PDF. Produto vendável a imobiliárias e administradoras.
import { useEffect, useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { repositorio, type Contrato, type Imovel } from '@/lib/repositorio'
import { enviarArquivo, urlAssinada } from '@/lib/arquivos'
import { baixarArquivo } from '@/lib/ancoragem'
import { mensagemAmigavel } from '@/lib/erros'
import { formatarData, hojeLocal } from '@/lib/datas'
import { brl, competenciaDe, compararVistorias, estadoGeral, ESTADOS, lancamentosPadrao, pdfLaudo, pdfPrestacao, prestacaoContas, roteiroPadrao, rotuloCompetencia, TIPOS, TIPOS_VISTORIA, type Administracao, type FotoVistoria, type ItemVistoria, type Lancamento, type Vistoria } from '@/lib/locacao'
import { ClipboardCheck, Camera, FileDown, Coins, Plus, Receipt } from 'lucide-react'
import { lerNumero } from '@/lib/numero'
import { abrirEmNovaAba } from '@/lib/abrirAba'
import Vazio from '@/components/Vazio'

const cartao = 'bg-white shadow-sm p-5 border-t-2 border-dourado'
const botao = 'min-h-[44px] px-4 text-sm border border-navy text-navy bg-white'
const botaoCheio = 'min-h-[44px] px-4 text-sm bg-navy text-white'
const campo = 'min-h-[44px] w-full border border-navy/20 px-3 text-sm bg-white'
const mesAtual = () => new Date().toISOString().slice(0, 7)

export default function AdministracaoPage() {
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [imoveis, setImoveis] = useState<Imovel[]>([])
  const [contratoId, setContratoId] = useState('')
  const [adm, setAdm] = useState<Administracao | null>(null)
  const [mes, setMes] = useState(mesAtual)
  const [lancamentos, setLancamentos] = useState<Lancamento[]>([])
  const [vistorias, setVistorias] = useState<Vistoria[]>([])
  const [aba, setAba] = useState<'contas' | 'vistoria'>('contas')
  const [erro, setErro] = useState('')
  const [msg, setMsg] = useState('')
  const [novo, setNovo] = useState<{ tipo: Lancamento['tipo']; descricao: string; valor: string } | null>(null)
  const [nova, setNova] = useState<Vistoria | null>(null)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    Promise.all([repositorio.listarContratos(), repositorio.listarImoveis()]).then(([c, i]) => {
      const ativos = c.filter(x => !x.encerradoEm && !x.contratoPaiId)
      setContratos(ativos); setImoveis(i)
      if (ativos[0]) setContratoId(ativos[0].id)
    }).catch(e => setErro(mensagemAmigavel(e)))
  }, [])

  const contrato = contratos.find(c => c.id === contratoId) ?? null
  const imovel = imoveis.find(i => i.id === contrato?.imovelId) ?? null
  const competencia = competenciaDe(mes + '-01')

  const carregar = async (id: string) => {
    if (!supabaseConfigurado || !id) return
    const [a, l, v] = await Promise.all([
      supabase.from('administracao_contratos').select('contrato_id,taxa_pct,proprietario_email,dia_repasse,ativo').eq('contrato_id', id).maybeSingle(),
      supabase.from('lancamentos_locacao').select('id,contrato_id,competencia,tipo,descricao,valor,pago_em,comprovante').eq('contrato_id', id).order('competencia', { ascending: false }).order('id'),
      supabase.from('vistorias').select('id,imovel_id,contrato_id,tipo,data,estado_geral,itens,fotos,observacoes,responsavel').eq('contrato_id', id).order('data', { ascending: false }),
    ])
    setAdm((a.data as Administracao | null) ?? { contrato_id: id, taxa_pct: 10, proprietario_email: null, dia_repasse: 10, ativo: true })
    setLancamentos((l.data ?? []) as Lancamento[]); setVistorias((v.data ?? []) as Vistoria[])
  }
  useEffect(() => { carregar(contratoId).catch(e => setErro(mensagemAmigavel(e))) }, [contratoId])

  const prestacao = useMemo(() => prestacaoContas(lancamentos, competencia), [lancamentos, competencia])
  const taxaPct = Number(adm?.taxa_pct ?? 10)

  const salvarAdm = async (dados: Partial<Administracao>) => {
    if (!adm) return
    const atual = { ...adm, ...dados }
    setAdm(atual)
    const { error } = await supabase.from('administracao_contratos').upsert({ ...atual, atualizado_em: new Date().toISOString() })
    if (error) setErro(mensagemAmigavel(error))
  }
  const gerarMes = async () => {
    if (!contrato) return
    const novos = lancamentosPadrao(contrato.id, competencia, Number(contrato.valor), taxaPct, lancamentos)
    if (!novos.length) { setMsg('O mês já tem aluguel e taxa lançados.'); return }
    const { error } = await supabase.from('lancamentos_locacao').insert(novos)
    if (error) { setErro(mensagemAmigavel(error)); return }
    setMsg(`${novos.length} lançamento(s) criado(s) para ${rotuloCompetencia(competencia)}.`); await carregar(contrato.id)
  }
  const salvarNovo = async () => {
    if (!novo || !contrato) return
    const valor = lerNumero(novo.valor)
    if (!novo.descricao.trim() || !(valor > 0)) { setErro('Informe a descrição e um valor maior que zero.'); return }
    const { error } = await supabase.from('lancamentos_locacao').insert({ contrato_id: contrato.id, competencia, tipo: novo.tipo, descricao: novo.descricao.trim(), valor, pago_em: novo.tipo === 'despesa' ? hojeLocal() : null })
    if (error) { setErro(mensagemAmigavel(error)); return }
    setNovo(null); setErro(''); await carregar(contrato.id)
  }
  const marcarPago = async (l: Lancamento, pago: boolean) => {
    const { error } = await supabase.from('lancamentos_locacao').update({ pago_em: pago ? hojeLocal() : null }).eq('id', l.id)
    if (error) { setErro(mensagemAmigavel(error)); return }
    setLancamentos(ls => ls.map(x => x.id === l.id ? { ...x, pago_em: pago ? hojeLocal() : null } : x))
  }
  const registrarRepasse = async () => {
    if (!contrato || prestacao.saldoRepasse <= 0) return
    const { error } = await supabase.from('lancamentos_locacao').insert({ contrato_id: contrato.id, competencia, tipo: 'repasse', descricao: 'Repasse ao proprietário', valor: prestacao.saldoRepasse, pago_em: hojeLocal() })
    if (error) { setErro(mensagemAmigavel(error)); return }
    setMsg(`Repasse de ${brl(prestacao.saldoRepasse)} registrado.`); await carregar(contrato.id)
  }
  const cab = { imovel: imovel ? `${imovel.endereco}, ${imovel.cidade}/${imovel.uf}` : '—', proprietario: imovel?.proprietario ?? '—', inquilino: contrato?.parte ?? '—' }
  const baixarPrestacao = () => baixarArquivo(`prestacao-de-contas-${competencia.slice(0, 7)}.pdf`, pdfPrestacao(prestacao, cab, taxaPct), 'application/pdf')

  // Vistoria
  const iniciarVistoria = (tipo: Vistoria['tipo']) => setNova({ imovel_id: contrato?.imovelId ?? '', contrato_id: contrato?.id ?? null, tipo, data: hojeLocal(), estado_geral: 'bom', itens: roteiroPadrao(), fotos: [], observacoes: '', responsavel: '' })
  const mudarItem = (idx: number, dados: Partial<ItemVistoria>) => setNova(v => v ? { ...v, itens: v.itens.map((it, i) => i === idx ? { ...it, ...dados } : it) } : v)
  const anexarFotos = async (arquivos: FileList | null) => {
    if (!nova || !arquivos?.length) return
    setEnviando(true)
    try {
      const fotos: FotoVistoria[] = []
      for (const f of Array.from(arquivos).slice(0, 30)) {
        if (!f.type.startsWith('image/')) continue
        const caminho = await enviarArquivo(f, `vistorias/${nova.imovel_id}`)
        fotos.push({ caminho: caminho || f.name, legenda: f.name.replace(/\.[a-z0-9]+$/i, '') })
      }
      setNova(v => v ? { ...v, fotos: [...v.fotos, ...fotos] } : v)
    } catch (e) { setErro(mensagemAmigavel(e)) } finally { setEnviando(false) }
  }
  const salvarVistoria = async () => {
    if (!nova) return
    const v = { ...nova, estado_geral: estadoGeral(nova.itens), observacoes: nova.observacoes || null, responsavel: nova.responsavel || null }
    const { error } = await supabase.from('vistorias').insert(v)
    if (error) { setErro(mensagemAmigavel(error)); return }
    setNova(null); setMsg(`${TIPOS_VISTORIA[v.tipo]} registrada.`); await carregar(contratoId)
  }
  const baixarLaudo = (v: Vistoria) => baixarArquivo(`laudo-vistoria-${v.tipo}-${v.data}.pdf`, pdfLaudo(v, cab), 'application/pdf')
  const abrirFoto = async (f: FotoVistoria) => { try { await abrirEmNovaAba(() => urlAssinada(f.caminho)) } catch (e) { setErro(mensagemAmigavel(e)) } }
  const entrada = vistorias.find(v => v.tipo === 'entrada'), saida = vistorias.find(v => v.tipo === 'saida')
  const diferencas = entrada && saida ? compararVistorias(entrada.itens, saida.itens) : []

  return (
    <Layout title="Administração de locação">
      <p className="text-sm text-grafite-claro mb-4">Vistoria com fotos, lançamentos do mês, repasse ao proprietário e prestação de contas em PDF. Pacote para imobiliárias e administradoras; cada contrato tem sua taxa.</p>
      {erro && <p role="alert" className="p-3 mb-3 bg-criticoFundo border-l-2 border-critico text-critico text-sm">⚠ {erro}</p>}
      {msg && <p role="status" className="p-3 mb-3 bg-regularFundo border-l-2 border-regular text-regular text-sm">✓ {msg}</p>}
      <div className="grid gap-3 md:grid-cols-3 mb-4">
        <label className="text-sm md:col-span-2">Contrato
          <select data-testid="contrato" title="Escolhe o contrato de locação cujas contas e vistorias serão mostradas abaixo" className={campo} value={contratoId} onChange={e => setContratoId(e.target.value)}>
            {contratos.map(c => { const im = imoveis.find(i => i.id === c.imovelId); return <option key={c.id} value={c.id}>{im?.endereco ?? c.imovelId} · {c.parte} · {brl(Number(c.valor))}/mês</option> })}
          </select>
        </label>
        <label className="text-sm">Taxa de administração (%)
          <input data-testid="taxa" type="number" min={0} max={50} step={0.5} className={campo} value={adm?.taxa_pct ?? 10} onChange={e => salvarAdm({ taxa_pct: Number(e.target.value) })} />
        </label>
      </div>
      {contratos.length === 0 && <Vazio testid="administracao-vazio" titulo="Nenhum contrato de locação ativo" texto="A administração de locação trabalha sobre contratos. Cadastre o imóvel e o contrato para cobrar, repassar e reajustar aqui." acao={{ rotulo: 'Cadastrar imóvel e contrato', para: '/imoveis', dica: 'Abre a tela de Imóveis para cadastrar o imóvel e o contrato de locação' }} />}
      <div className="flex gap-2 mb-4" role="tablist">
        <button type="button" role="tab" aria-selected={aba === 'contas'} data-testid="aba-contas" title="Mostra os lançamentos do mês, o repasse e a prestação de contas deste contrato" onClick={() => setAba('contas')} className={aba === 'contas' ? botaoCheio : botao}><Receipt size={16} className="inline mr-1" aria-hidden="true" />Prestação de contas</button>
        <button type="button" role="tab" aria-selected={aba === 'vistoria'} data-testid="aba-vistoria" title="Mostra as vistorias do imóvel deste contrato e permite registrar novas" onClick={() => setAba('vistoria')} className={aba === 'vistoria' ? botaoCheio : botao}><ClipboardCheck size={16} className="inline mr-1" aria-hidden="true" />Vistorias</button>
      </div>

      {aba === 'contas' && contrato && (
        <section className="space-y-4">
          <div className={cartao}>
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-sm">Mês<input data-testid="mes" type="month" className={campo} value={mes} onChange={e => setMes(e.target.value)} /></label>
              <button type="button" onClick={gerarMes} data-testid="gerar-mes" title="Cria automaticamente os lançamentos de aluguel e taxa de administração do mês escolhido" className={botao}><Plus size={16} className="inline mr-1" aria-hidden="true" />Lançar aluguel e taxa do mês</button>
              <button type="button" onClick={() => setNovo({ tipo: 'despesa', descricao: '', valor: '' })} data-testid="novo-lancamento" title="Abre o formulário para registrar uma despesa, receita ou outro lançamento neste mês" className={botao}>Novo lançamento</button>
              <button type="button" onClick={baixarPrestacao} data-testid="baixar-prestacao" title="Baixa a prestação de contas do mês em PDF para enviar ao proprietário" className={botao}><FileDown size={16} className="inline mr-1" aria-hidden="true" />Prestação de contas (PDF)</button>
            </div>
            {novo && (
              <div className="grid gap-2 md:grid-cols-4 mt-3" data-testid="form-lancamento">
                <select className={campo} value={novo.tipo} onChange={e => setNovo({ ...novo, tipo: e.target.value as Lancamento['tipo'] })} aria-label="Tipo" title="Define o tipo do novo lançamento (despesa, receita etc.)">{(Object.keys(TIPOS) as Lancamento['tipo'][]).filter(t => t !== 'repasse').map(t => <option key={t} value={t}>{TIPOS[t]}</option>)}</select>
                <input className={campo} placeholder="Descrição" aria-label="Descrição" value={novo.descricao} onChange={e => setNovo({ ...novo, descricao: e.target.value })} />
                <input className={campo} placeholder="Valor" aria-label="Valor" inputMode="decimal" value={novo.valor} onChange={e => setNovo({ ...novo, valor: e.target.value })} />
                <div className="flex gap-2"><button type="button" onClick={salvarNovo} data-testid="salvar-lancamento" title="Grava este lançamento nas contas do mês" className={botaoCheio}>Salvar</button><button type="button" onClick={() => setNovo(null)} title="Fecha o formulário sem gravar o lançamento" className={botao}>Cancelar</button></div>
              </div>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            {[['Recebido do inquilino', prestacao.recebido], ['Despesas do imóvel', prestacao.despesas], ['Taxa de administração', prestacao.taxa], ['Repasse ao proprietário', prestacao.repasse]].map(([r, v]) => (
              <div key={String(r)} className={cartao}><p className="text-xs uppercase tracking-wide text-grafite-claro">{r}</p><p className="text-2xl font-serif mt-1">{brl(Number(v))}</p></div>
            ))}
          </div>
          <div className={cartao}>
            <h2 className="text-lg mb-2">{rotuloCompetencia(competencia)}</h2>
            {prestacao.linhas.length === 0 ? <p className="text-sm text-grafite-claro">Sem lançamentos neste mês. Use "Lançar aluguel e taxa do mês".</p> : (
              <table className="w-full text-sm" data-testid="tabela-lancamentos">
                <thead><tr className="text-left text-grafite-claro"><th className="py-1">Tipo</th><th>Descrição</th><th>Valor</th><th>Situação</th><th></th></tr></thead>
                <tbody>{prestacao.linhas.map(l => (
                  <tr key={l.id} className="border-t border-navy/10">
                    <td className="py-2">{TIPOS[l.tipo]}</td><td>{l.descricao}</td><td>{brl(l.valor)}</td>
                    <td>{l.pago_em ? `Pago em ${formatarData(l.pago_em)}` : 'Em aberto'}</td>
                    <td>{l.tipo !== 'repasse' && <button type="button" onClick={() => marcarPago(l, !l.pago_em)} title={l.pago_em ? 'Desfaz o pagamento e volta este lançamento para "em aberto"' : 'Registra este lançamento como pago na data de hoje'} className="underline text-navy">{l.pago_em ? 'Reabrir' : 'Marcar pago'}</button>}</td>
                  </tr>))}</tbody>
              </table>
            )}
            <div className="mt-3 flex flex-wrap gap-3 items-center">
              <span className="text-sm">Saldo a repassar: <b data-testid="saldo-repasse">{brl(prestacao.saldoRepasse)}</b>{prestacao.aReceber > 0 && <span className="text-grafite-claro"> · a receber do inquilino {brl(prestacao.aReceber)}</span>}</span>
              <button type="button" onClick={registrarRepasse} disabled={prestacao.saldoRepasse <= 0} data-testid="registrar-repasse" title="Registra o pagamento do saldo do mês ao proprietário do imóvel" className={`${botaoCheio} disabled:opacity-50`}><Coins size={16} className="inline mr-1" aria-hidden="true" />Registrar repasse ao proprietário</button>
            </div>
          </div>
        </section>
      )}

      {aba === 'vistoria' && contrato && (
        <section className="space-y-4">
          {!nova && <div className="flex flex-wrap gap-2">{(Object.keys(TIPOS_VISTORIA) as Vistoria['tipo'][]).map(t => <button key={t} type="button" onClick={() => iniciarVistoria(t)} data-testid={`nova-${t}`} title={`Abre o formulário para registrar uma ${TIPOS_VISTORIA[t].toLowerCase()} do imóvel, com fotos e roteiro de itens`} className={botao}><Plus size={16} className="inline mr-1" aria-hidden="true" />{TIPOS_VISTORIA[t]}</button>)}</div>}
          {nova && (
            <div className={cartao} data-testid="form-vistoria">
              <h2 className="text-lg mb-2">{TIPOS_VISTORIA[nova.tipo]} · {cab.imovel}</h2>
              <div className="grid gap-2 md:grid-cols-3 mb-3">
                <label className="text-sm">Data<input type="date" className={campo} value={nova.data} onChange={e => setNova({ ...nova, data: e.target.value })} /></label>
                <label className="text-sm">Responsável<input className={campo} value={nova.responsavel ?? ''} onChange={e => setNova({ ...nova, responsavel: e.target.value })} /></label>
                <label className="text-sm" title="Anexa fotos do imóvel à vistoria (até 30 imagens, pode usar a câmera do celular)">Fotos<input type="file" accept="image/*" multiple capture="environment" className={campo} data-testid="fotos" onChange={e => anexarFotos(e.target.files)} /></label>
              </div>
              {enviando && <p className="text-sm text-grafite-claro"><Camera size={14} className="inline mr-1" aria-hidden="true" />Guardando fotos…</p>}
              {nova.fotos.length > 0 && <p className="text-sm mb-2" data-testid="fotos-anexadas">{nova.fotos.length} foto(s) anexada(s)</p>}
              <table className="w-full text-sm" data-testid="itens-vistoria">
                <thead><tr className="text-left text-grafite-claro"><th className="py-1">Cômodo</th><th>Item</th><th>Estado</th><th>Observação</th></tr></thead>
                <tbody>{nova.itens.map((it, i) => (
                  <tr key={i} className="border-t border-navy/10">
                    <td className="py-1">{it.comodo}</td><td>{it.item}</td>
                    <td><select aria-label={`Estado de ${it.item} (${it.comodo})`} title={`Registra o estado de conservação de ${it.item} (${it.comodo}) nesta vistoria`} className="min-h-[36px] border border-navy/20 px-2 bg-white" value={it.estado} onChange={e => mudarItem(i, { estado: e.target.value as ItemVistoria['estado'] })}>{(Object.keys(ESTADOS) as ItemVistoria['estado'][]).map(k => <option key={k} value={k}>{ESTADOS[k]}</option>)}</select></td>
                    <td><input aria-label={`Observação de ${it.item}`} className="min-h-[36px] w-full border border-navy/20 px-2 bg-white" value={it.obs ?? ''} onChange={e => mudarItem(i, { obs: e.target.value })} /></td>
                  </tr>))}</tbody>
              </table>
              <label className="text-sm block mt-3">Observações gerais<textarea className={campo} rows={3} value={nova.observacoes ?? ''} onChange={e => setNova({ ...nova, observacoes: e.target.value })} /></label>
              <p className="text-sm mt-2">Estado geral: <b data-testid="estado-geral">{ESTADOS[estadoGeral(nova.itens)]}</b></p>
              <div className="flex gap-2 mt-3"><button type="button" onClick={salvarVistoria} data-testid="salvar-vistoria" title="Grava esta vistoria com os itens, fotos e observações preenchidos" className={botaoCheio}>Salvar vistoria</button><button type="button" onClick={() => setNova(null)} title="Fecha o formulário sem gravar a vistoria" className={botao}>Cancelar</button></div>
            </div>
          )}
          <div className={cartao}>
            <h2 className="text-lg mb-2">Vistorias deste contrato</h2>
            {vistorias.length === 0 ? <p className="text-sm text-grafite-claro">Nenhuma vistoria registrada.</p> : (
              <ul className="divide-y divide-navy/10" data-testid="lista-vistorias">{vistorias.map(v => (
                <li key={v.id} className="py-2 flex flex-wrap gap-3 items-center text-sm">
                  <span><b>{TIPOS_VISTORIA[v.tipo]}</b> · {formatarData(v.data)} · estado {ESTADOS[v.estado_geral].toLowerCase()} · {v.fotos.length} foto(s)</span>
                  {v.fotos.slice(0, 5).map(f => <button key={f.caminho} type="button" onClick={() => abrirFoto(f)} title="Abre esta foto da vistoria em uma nova aba" className="underline text-navy">{f.legenda}</button>)}
                  <button type="button" onClick={() => baixarLaudo(v)} title="Baixa o laudo desta vistoria em PDF, com itens e estado geral" className="underline text-navy">Laudo (PDF)</button>
                </li>))}</ul>
            )}
            {diferencas.length > 0 && (
              <div className="mt-3" data-testid="diferencas">
                <h3 className="text-sm font-semibold">Itens que pioraram entre a entrada e a saída (base para reparos, Lei 8.245/91, art. 23, III)</h3>
                <ul className="text-sm list-disc ml-5">{diferencas.map(d => <li key={d.comodo + d.item}>{d.comodo} · {d.item}: {d.antes} → {d.depois}</li>)}</ul>
              </div>
            )}
          </div>
        </section>
      )}
    </Layout>
  )
}
