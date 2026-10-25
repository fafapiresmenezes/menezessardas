import { supabase, supabaseConfigurado } from './supabase'
import { diasAte, emDias } from './datas'
import { registrarEvento } from './trilha'
import type {
  Garantia,
  IndiceReajuste,
  Periodicidade,
  TipoContrato,
  TipoDocumento,
  TipoImovel,
  UF,
  UsoImovel,
} from './dominio'

export interface Documento {
  id: string
  tipo: TipoDocumento
  nome: string
  enviadoEm: string
  dataVencimento?: string
  tamanho?: number
  caminhoStorage?: string
}

export interface Imovel {
  id: string
  endereco: string
  cidade: string
  uf: UF
  tipo: TipoImovel
  uso: UsoImovel
  proprietario: string
  matricula: string
  areaM2?: number
  notas: string
  documentos: Documento[]
}

export type NaturezaContrato = 'principal' | 'aditivo' | 'subcontrato'

export interface Contrato {
  id: string
  imovelId: string
  /** Vazio no contrato principal; aponta para o contrato-mãe em aditivos e subcontratos. */
  contratoPaiId?: string
  natureza?: NaturezaContrato
  tipo: TipoContrato
  parte: string
  dataInicio: string
  dataVencimento: string | null
  valor: number
  periodicidade: Periodicidade
  indice: IndiceReajuste
  garantia: Garantia
  dataUltimoReajuste: string | null
  notas: string
  criadoEm: string
  /** Texto extraído do PDF do contrato, para o agente analisar o conteúdo real. */
  textoExtraido?: string
  /** Data em que o contrato foi encerrado; contrato encerrado sai de alertas e indicadores. */
  encerradoEm?: string
  motivoEncerramento?: string
  arquivo?: { nome: string; tamanho: number; caminhoStorage?: string }
  documentos: Documento[]
}

export type NovoImovel = Omit<Imovel, 'id' | 'documentos'> & { documentos?: Omit<Documento, 'id' | 'enviadoEm'>[] }
export type NovoContrato = Omit<Contrato, 'id' | 'criadoEm' | 'documentos'>
export type EdicaoContrato = Partial<
  Pick<Contrato, 'parte' | 'dataVencimento' | 'valor' | 'periodicidade' | 'indice' | 'garantia' | 'notas'>
>

export interface Repositorio {
  listarImoveis(): Promise<Imovel[]>
  obterImovel(id: string): Promise<Imovel | null>
  criarImovel(dados: NovoImovel): Promise<Imovel>
  listarContratos(): Promise<Contrato[]>
  obterContratoPorImovel(imovelId: string): Promise<Contrato | null>
  obterContrato(id: string): Promise<Contrato | null>
  listarVinculados(contratoId: string): Promise<Contrato[]>
  criarContrato(dados: NovoContrato): Promise<Contrato>
  atualizarTextoContrato(contratoId: string, texto: string): Promise<void>
  atualizarContrato(contratoId: string, dados: EdicaoContrato): Promise<void>
  encerrarContrato(contratoId: string, motivo: string): Promise<void>
  anexarDocumento(alvo: { contratoId: string } | { imovelId: string }, doc: Omit<Documento, 'id' | 'enviadoEm'>): Promise<Documento>
  removerDocumento(docId: string): Promise<void>
  limparTudo(): Promise<void>
}

const CHAVE = 'lsm-dados-v1'

/* ------------------------------------------------------------------ */
/* Modo fictício: tudo no navegador, semeado com a carteira de exemplo. */
/* ------------------------------------------------------------------ */

interface Estado {
  imoveis: Imovel[]
  contratos: Contrato[]
}

async function carregarSeed(): Promise<Estado> {
  const { IMOVEIS_SEED, CONTRATOS_SEED } = await import('@/data/seed')
  return { imoveis: IMOVEIS_SEED, contratos: CONTRATOS_SEED }
}

function ler(): Estado | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Estado) : null
  } catch {
    return null
  }
}

function gravar(estado: Estado) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(estado))
  } catch {
    // Navegador sem armazenamento: a sessão segue só em memória.
  }
}

const novoId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

class RepositorioLocal implements Repositorio {
  private estado: Estado | null = null

  private async carregar(): Promise<Estado> {
    if (this.estado) return this.estado
    this.estado = ler() ?? (await carregarSeed())
    gravar(this.estado)
    return this.estado
  }

  private salvar() {
    if (this.estado) gravar(this.estado)
  }

  async listarImoveis() {
    return [...(await this.carregar()).imoveis]
  }

  async obterImovel(id: string) {
    return (await this.carregar()).imoveis.find(i => i.id === id) ?? null
  }

  async criarImovel(dados: NovoImovel) {
    const estado = await this.carregar()
    const imovel: Imovel = {
      ...dados,
      id: novoId(),
      documentos: (dados.documentos ?? []).map(d => ({ ...d, id: novoId(), enviadoEm: emDias(0) })),
    }
    estado.imoveis.push(imovel)
    this.salvar()
    await registrarEvento({ tipo: 'imovel_criado', entidade: imovel.id, resumo: `Imóvel cadastrado: ${imovel.endereco}, ${imovel.cidade}` })
    return imovel
  }

  async listarContratos() {
    return [...(await this.carregar()).contratos]
  }

  async obterContratoPorImovel(imovelId: string) {
    // O contrato principal do imóvel (aditivos e subcontratos ficam vinculados a ele).
    const contratos = (await this.carregar()).contratos.filter(c => c.imovelId === imovelId && !c.contratoPaiId)
    return contratos.sort((a, b) => b.criadoEm.localeCompare(a.criadoEm))[0] ?? null
  }

  async obterContrato(id: string) {
    return (await this.carregar()).contratos.find(c => c.id === id) ?? null
  }

  async listarVinculados(contratoId: string) {
    return (await this.carregar()).contratos.filter(c => c.contratoPaiId === contratoId)
  }

  async criarContrato(dados: NovoContrato) {
    const estado = await this.carregar()
    const contrato: Contrato = { ...dados, id: novoId(), criadoEm: emDias(0), documentos: [] }
    estado.contratos.push(contrato)
    this.salvar()
    await registrarEvento({ tipo: 'contrato_criado', entidade: contrato.id, resumo: `Contrato (${contrato.natureza ?? 'principal'}) com ${contrato.parte}` })
    return contrato
  }

  async atualizarTextoContrato(contratoId: string, texto: string) {
    const estado = await this.carregar()
    const c = estado.contratos.find(x => x.id === contratoId)
    if (c) {
      c.textoExtraido = texto
      this.salvar()
    }
  }

  async atualizarContrato(contratoId: string, dados: EdicaoContrato) {
    const estado = await this.carregar()
    const c = estado.contratos.find(x => x.id === contratoId)
    if (!c) throw new Error('Contrato não encontrado.')
    Object.assign(c, dados)
    this.salvar()
    await registrarEvento({ tipo: 'contrato_editado', entidade: contratoId, resumo: `Contrato com ${c.parte} editado (${Object.keys(dados).join(', ')})` })
  }

  async encerrarContrato(contratoId: string, motivo: string) {
    const estado = await this.carregar()
    const c = estado.contratos.find(x => x.id === contratoId)
    if (!c) throw new Error('Contrato não encontrado.')
    c.encerradoEm = emDias(0)
    c.motivoEncerramento = motivo
    this.salvar()
    await registrarEvento({ tipo: 'contrato_encerrado', entidade: contratoId, resumo: `Contrato com ${c.parte} encerrado: ${motivo}` })
  }

  async anexarDocumento(alvo: { contratoId: string } | { imovelId: string }, doc: Omit<Documento, 'id' | 'enviadoEm'>) {
    const estado = await this.carregar()
    const novo: Documento = { ...doc, id: novoId(), enviadoEm: emDias(0) }
    const dono =
      'contratoId' in alvo
        ? estado.contratos.find(c => c.id === alvo.contratoId)
        : estado.imoveis.find(i => i.id === alvo.imovelId)
    if (!dono) throw new Error('Registro não encontrado para anexar o documento.')
    dono.documentos.push(novo)
    this.salvar()
    await registrarEvento({ tipo: 'documento_anexado', entidade: dono.id, resumo: `Documento anexado: ${novo.nome}` })
    return novo
  }

  async removerDocumento(docId: string) {
    const estado = await this.carregar()
    for (const lista of [...estado.contratos.map(c => c.documentos), ...estado.imoveis.map(i => i.documentos)]) {
      const idx = lista.findIndex(d => d.id === docId)
      if (idx >= 0) {
        const [removido] = lista.splice(idx, 1)
        this.salvar()
        await registrarEvento({ tipo: 'documento_removido', entidade: removido.id, resumo: `Documento removido: ${removido.nome}` })
        return
      }
    }
  }

  async limparTudo() {
    this.estado = null
    try {
      localStorage.removeItem(CHAVE)
    } catch {
      // sem armazenamento, nada a limpar
    }
  }
}

/* ------------------------------------------------------------------ */
/* Modo real: Supabase. Mesma interface; o resto do app não muda.        */
/* ------------------------------------------------------------------ */

class RepositorioSupabase implements Repositorio {
  private mapDoc = (d: Record<string, unknown>): Documento => ({
    id: String(d.id),
    tipo: d.tipo_documento as TipoDocumento,
    nome: String(d.nome_arquivo),
    enviadoEm: String(d.criado_em).slice(0, 10),
    dataVencimento: d.data_vencimento ? String(d.data_vencimento) : undefined,
    caminhoStorage: d.caminho_storage ? String(d.caminho_storage) : undefined,
  })

  private mapImovel = (r: Record<string, unknown>, docs: Documento[]): Imovel => ({
    id: String(r.id),
    endereco: String(r.endereco),
    cidade: String(r.cidade ?? ''),
    uf: (r.uf as UF) ?? 'OUTRA',
    tipo: r.tipo as TipoImovel,
    uso: r.uso_atual as UsoImovel,
    proprietario: String(r.proprietario_nome),
    matricula: String(r.matricula_rgi ?? ''),
    areaM2: r.area_m2 ? Number(r.area_m2) : undefined,
    notas: String(r.notas ?? ''),
    documentos: docs,
  })

  private mapContrato = (r: Record<string, unknown>, docs: Documento[]): Contrato => ({
    id: String(r.id),
    imovelId: String(r.imovel_id),
    contratoPaiId: r.contrato_pai_id ? String(r.contrato_pai_id) : undefined,
    natureza: (r.natureza as NaturezaContrato) ?? 'principal',
    tipo: r.tipo as TipoContrato,
    parte: String(r.locatario_fornecedor),
    dataInicio: String(r.data_inicio),
    dataVencimento: r.data_vencimento ? String(r.data_vencimento) : null,
    valor: Number(r.valor_periodico ?? 0),
    periodicidade: (r.periodicidade as Periodicidade) ?? 'mensal',
    indice: r.indice_reajuste as IndiceReajuste,
    garantia: (r.garantia as Garantia) ?? 'sem_garantia',
    dataUltimoReajuste: r.data_ultimo_reajuste ? String(r.data_ultimo_reajuste) : null,
    notas: String(r.notas ?? ''),
    criadoEm: String(r.criado_em).slice(0, 10),
    textoExtraido: r.texto_extraido ? String(r.texto_extraido) : undefined,
    encerradoEm: r.encerrado_em ? String(r.encerrado_em) : undefined,
    motivoEncerramento: r.motivo_encerramento ? String(r.motivo_encerramento) : undefined,
    arquivo: r.caminho_arquivo ? { nome: String(r.caminho_arquivo).split('/').pop() ?? '', tamanho: 0, caminhoStorage: String(r.caminho_arquivo) } : undefined,
    documentos: docs,
  })

  private async docsDe(coluna: 'imovel_id' | 'contrato_id', id: string) {
    const { data } = await supabase.from('documentos').select('*').eq(coluna, id)
    return (data ?? []).map(this.mapDoc)
  }

  async listarImoveis() {
    const { data, error } = await supabase.from('imoveis').select('*').order('endereco')
    if (error) throw error
    const { data: docs } = await supabase.from('documentos').select('*').is('contrato_id', null)
    const porImovel = new Map<string, Documento[]>()
    ;(docs ?? []).forEach(d => {
      const lista = porImovel.get(String(d.imovel_id)) ?? []
      lista.push(this.mapDoc(d))
      porImovel.set(String(d.imovel_id), lista)
    })
    return (data ?? []).map(r => this.mapImovel(r, porImovel.get(String(r.id)) ?? []))
  }

  async obterImovel(id: string) {
    const { data } = await supabase.from('imoveis').select('*').eq('id', id).maybeSingle()
    return data ? this.mapImovel(data, await this.docsDe('imovel_id', id)) : null
  }

  async criarImovel(dados: NovoImovel) {
    const { data, error } = await supabase
      .from('imoveis')
      .insert({
        endereco: dados.endereco,
        cidade: dados.cidade,
        uf: dados.uf,
        tipo: dados.tipo,
        uso_atual: dados.uso,
        proprietario_nome: dados.proprietario,
        matricula_rgi: dados.matricula || null,
        area_m2: dados.areaM2 ?? null,
        notas: dados.notas,
      })
      .select()
      .single()
    if (error) throw error
    const imovel = this.mapImovel(data, [])
    await registrarEvento({ tipo: 'imovel_criado', entidade: imovel.id, resumo: `Imóvel cadastrado: ${imovel.endereco}, ${imovel.cidade}` })
    return imovel
  }

  async listarContratos() {
    const { data, error } = await supabase.from('contratos').select('*')
    if (error) throw error
    const { data: docs } = await supabase.from('documentos').select('*').not('contrato_id', 'is', null)
    const porContrato = new Map<string, Documento[]>()
    ;(docs ?? []).forEach(d => {
      const lista = porContrato.get(String(d.contrato_id)) ?? []
      lista.push(this.mapDoc(d))
      porContrato.set(String(d.contrato_id), lista)
    })
    return (data ?? []).map(r => this.mapContrato(r, porContrato.get(String(r.id)) ?? []))
  }

  async obterContratoPorImovel(imovelId: string) {
    const { data } = await supabase
      .from('contratos')
      .select('*')
      .eq('imovel_id', imovelId)
      .is('contrato_pai_id', null)
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
    return data ? this.mapContrato(data, await this.docsDe('contrato_id', String(data.id))) : null
  }

  async obterContrato(id: string) {
    const { data } = await supabase.from('contratos').select('*').eq('id', id).maybeSingle()
    return data ? this.mapContrato(data, await this.docsDe('contrato_id', id)) : null
  }

  async listarVinculados(contratoId: string) {
    const { data } = await supabase.from('contratos').select('*').eq('contrato_pai_id', contratoId)
    return (data ?? []).map(r => this.mapContrato(r, []))
  }

  async criarContrato(dados: NovoContrato) {
    const { data, error } = await supabase
      .from('contratos')
      .insert({
        imovel_id: dados.imovelId,
        contrato_pai_id: dados.contratoPaiId ?? null,
        natureza: dados.natureza ?? 'principal',
        tipo: dados.tipo,
        locatario_fornecedor: dados.parte,
        data_inicio: dados.dataInicio,
        data_vencimento: dados.dataVencimento,
        valor_periodico: dados.valor,
        periodicidade: dados.periodicidade,
        indice_reajuste: dados.indice,
        garantia: dados.garantia,
        data_ultimo_reajuste: dados.dataUltimoReajuste,
        notas: dados.notas,
        texto_extraido: dados.textoExtraido ?? null,
        caminho_arquivo: dados.arquivo?.caminhoStorage ?? null,
      })
      .select()
      .single()
    if (error) throw error
    const contrato = this.mapContrato(data, [])
    await registrarEvento({ tipo: 'contrato_criado', entidade: contrato.id, resumo: `Contrato (${contrato.natureza ?? 'principal'}) com ${contrato.parte}` })
    return contrato
  }

  async atualizarTextoContrato(contratoId: string, texto: string) {
    await supabase.from('contratos').update({ texto_extraido: texto }).eq('id', contratoId)
  }

  async atualizarContrato(contratoId: string, dados: EdicaoContrato) {
    const linha: Record<string, unknown> = {}
    if (dados.parte !== undefined) linha.locatario_fornecedor = dados.parte
    if (dados.dataVencimento !== undefined) linha.data_vencimento = dados.dataVencimento
    if (dados.valor !== undefined) linha.valor_periodico = dados.valor
    if (dados.periodicidade !== undefined) linha.periodicidade = dados.periodicidade
    if (dados.indice !== undefined) linha.indice_reajuste = dados.indice
    if (dados.garantia !== undefined) linha.garantia = dados.garantia
    if (dados.notas !== undefined) linha.notas = dados.notas
    const { error } = await supabase.from('contratos').update(linha).eq('id', contratoId)
    if (error) throw error
    await registrarEvento({ tipo: 'contrato_editado', entidade: contratoId, resumo: `Contrato editado (${Object.keys(dados).join(', ')})` })
  }

  async encerrarContrato(contratoId: string, motivo: string) {
    const { error } = await supabase
      .from('contratos')
      .update({ encerrado_em: emDias(0), motivo_encerramento: motivo })
      .eq('id', contratoId)
    if (error) throw error
    await registrarEvento({ tipo: 'contrato_encerrado', entidade: contratoId, resumo: `Contrato encerrado: ${motivo}` })
  }

  async anexarDocumento(alvo: { contratoId: string } | { imovelId: string }, doc: Omit<Documento, 'id' | 'enviadoEm'>) {
    const base = 'contratoId' in alvo
      ? { contrato_id: alvo.contratoId, imovel_id: (await supabase.from('contratos').select('imovel_id').eq('id', alvo.contratoId).single()).data?.imovel_id }
      : { imovel_id: alvo.imovelId, contrato_id: null }
    const { data, error } = await supabase
      .from('documentos')
      .insert({
        ...base,
        tipo_documento: doc.tipo,
        nome_arquivo: doc.nome,
        caminho_storage: doc.caminhoStorage ?? '',
        data_vencimento: doc.dataVencimento ?? null,
      })
      .select()
      .single()
    if (error) throw error
    const novo = this.mapDoc(data)
    await registrarEvento({ tipo: 'documento_anexado', entidade: novo.id, resumo: `Documento anexado: ${novo.nome}` })
    return novo
  }

  async removerDocumento(docId: string) {
    const { error } = await supabase.from('documentos').delete().eq('id', docId)
    if (error) throw error
    await registrarEvento({ tipo: 'documento_removido', entidade: docId, resumo: 'Documento removido' })
  }

  async limparTudo() {
    // Em produção nunca se apaga a carteira pela interface.
  }
}

export const repositorio: Repositorio = supabaseConfigurado ? new RepositorioSupabase() : new RepositorioLocal()
export const modoFicticio = !supabaseConfigurado

/* ------------------------------------------------------------------ */
/* Alertas são sempre calculados, nunca guardados.                      */
/* ------------------------------------------------------------------ */

export type TipoAlerta = 'vencimento' | 'reajuste' | 'documento'

export interface Alerta {
  id: string
  imovelId: string
  contratoId?: string
  imovel: string
  tipo: TipoAlerta
  titulo: string
  dataEvento: string
  diasRestantes: number
}

const JANELA_DIAS = 400

export function calcularAlertas(imoveis: Imovel[], contratos: Contrato[]): Alerta[] {
  const alertas: Alerta[] = []
  const nomeImovel = (id: string) => {
    const i = imoveis.find(x => x.id === id)
    return i ? `${i.endereco}, ${i.cidade}` : 'Imóvel'
  }

  const docAlerta = (d: Documento, imovelId: string, contratoId?: string) => {
    if (!d.dataVencimento) return
    const dias = diasAte(d.dataVencimento)
    if (dias === null || dias > JANELA_DIAS) return
    alertas.push({
      id: `doc-${d.id}`,
      imovelId,
      contratoId,
      imovel: nomeImovel(imovelId),
      tipo: 'documento',
      titulo: `Vencimento de documento: ${d.nome}`,
      dataEvento: d.dataVencimento,
      diasRestantes: dias,
    })
  }

  contratos.forEach(c => {
    if (c.encerradoEm) {
      // Contrato encerrado não gera vencimento nem reajuste; seus documentos ainda valem.
      c.documentos.forEach(d => docAlerta(d, c.imovelId, c.id))
      return
    }
    if (c.dataVencimento) {
      const dias = diasAte(c.dataVencimento)
      if (dias !== null && dias <= JANELA_DIAS) {
        alertas.push({
          id: `venc-${c.id}`,
          imovelId: c.imovelId,
          contratoId: c.id,
          imovel: nomeImovel(c.imovelId),
          tipo: 'vencimento',
          titulo: 'Vencimento de contrato',
          dataEvento: c.dataVencimento,
          diasRestantes: dias,
        })
      }
    }
    if (c.indice !== 'sem_reajuste' && c.indice !== 'fixo') {
      const base = c.dataUltimoReajuste ?? c.dataInicio
      const proximo = new Date(base + 'T00:00:00')
      proximo.setFullYear(proximo.getFullYear() + 1)
      while (proximo.getTime() < Date.now() - 86400000) proximo.setFullYear(proximo.getFullYear() + 1)
      const iso = proximo.toISOString().slice(0, 10)
      const dias = diasAte(iso)
      if (dias !== null && dias <= JANELA_DIAS && (!c.dataVencimento || iso <= c.dataVencimento)) {
        alertas.push({
          id: `reaj-${c.id}`,
          imovelId: c.imovelId,
          contratoId: c.id,
          imovel: nomeImovel(c.imovelId),
          tipo: 'reajuste',
          titulo: `Reajuste anual (${c.indice.toUpperCase().replace('IGPM', 'IGP-M')})`,
          dataEvento: iso,
          diasRestantes: dias,
        })
      }
    }
    c.documentos.forEach(d => docAlerta(d, c.imovelId, c.id))
  })

  imoveis.forEach(i => i.documentos.forEach(d => docAlerta(d, i.id)))

  return alertas.sort((a, b) => a.diasRestantes - b.diasRestantes)
}
