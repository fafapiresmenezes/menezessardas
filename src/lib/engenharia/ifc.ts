// Leitor e validador de arquivos IFC (formato STEP, ISO 10303-21) no navegador, sem enviar o arquivo a lugar nenhum.
// Ferramenta P1 do Plano Master de Engenharia ("Gerenciador IFC"), versão 1: lê, valida e extrai a lista de materiais.
// Não desenha a geometria 3D nem edita o modelo (fases seguintes).

export interface EntidadeIFC { id: number; tipo: string; args: string; refs: number[]; strings: string[] }
export interface ProblemaIFC { gravidade: 'erro' | 'aviso'; codigo: string; texto: string; ids: number[] }
export interface LinhaBOM { tipo: string; nome: string; quantidade: number; comprimento: number; area: number; volume: number }
export interface ResultadoIFC {
  esquema: string
  totalEntidades: number
  porTipo: { tipo: string; n: number }[]
  elementos: { id: number; tipo: string; guid: string; nome: string; quantidades: Record<string, number> }[]
  bom: LinhaBOM[]
  problemas: ProblemaIFC[]
}

/** tipos de elemento físico (subtipos usuais de IfcElement) que entram na lista de materiais */
export const TIPOS_ELEMENTO = new Set([
  'IFCWALL', 'IFCWALLSTANDARDCASE', 'IFCSLAB', 'IFCBEAM', 'IFCCOLUMN', 'IFCDOOR', 'IFCWINDOW', 'IFCSTAIR', 'IFCSTAIRFLIGHT',
  'IFCROOF', 'IFCFOOTING', 'IFCPILE', 'IFCMEMBER', 'IFCPLATE', 'IFCRAILING', 'IFCRAMP', 'IFCCOVERING', 'IFCCURTAINWALL',
  'IFCBUILDINGELEMENTPROXY', 'IFCFLOWSEGMENT', 'IFCPIPESEGMENT', 'IFCDUCTSEGMENT', 'IFCCABLESEGMENT', 'IFCCABLECARRIERSEGMENT',
  'IFCFLOWFITTING', 'IFCPIPEFITTING', 'IFCDUCTFITTING', 'IFCFLOWTERMINAL', 'IFCSANITARYTERMINAL', 'IFCLIGHTFIXTURE',
  'IFCREINFORCINGBAR', 'IFCREINFORCINGMESH', 'IFCTENDON', 'IFCFURNISHINGELEMENT', 'IFCEARTHWORKSFILL', 'IFCEARTHWORKSCUT',
  'IFCPAVEMENT', 'IFCCOURSE', 'IFCKERB', 'IFCBEARING', 'IFCDISCRETEACCESSORY', 'IFCFASTENER', 'IFCMECHANICALFASTENER',
])

const NOMES_TIPO: Record<string, string> = {
  IFCWALL: 'Parede', IFCWALLSTANDARDCASE: 'Parede', IFCSLAB: 'Laje', IFCBEAM: 'Viga', IFCCOLUMN: 'Pilar', IFCDOOR: 'Porta',
  IFCWINDOW: 'Janela', IFCSTAIR: 'Escada', IFCSTAIRFLIGHT: 'Lance de escada', IFCROOF: 'Cobertura', IFCFOOTING: 'Sapata/bloco',
  IFCPILE: 'Estaca', IFCMEMBER: 'Barra', IFCPLATE: 'Chapa', IFCRAILING: 'Guarda-corpo', IFCRAMP: 'Rampa', IFCCOVERING: 'Revestimento',
  IFCCURTAINWALL: 'Fachada-cortina', IFCBUILDINGELEMENTPROXY: 'Elemento genérico', IFCFLOWSEGMENT: 'Trecho de rede',
  IFCPIPESEGMENT: 'Tubo', IFCDUCTSEGMENT: 'Duto', IFCCABLESEGMENT: 'Cabo', IFCCABLECARRIERSEGMENT: 'Eletrocalha/leito',
  IFCFLOWFITTING: 'Conexão', IFCPIPEFITTING: 'Conexão de tubo', IFCDUCTFITTING: 'Conexão de duto', IFCFLOWTERMINAL: 'Terminal',
  IFCSANITARYTERMINAL: 'Louça sanitária', IFCLIGHTFIXTURE: 'Luminária', IFCREINFORCINGBAR: 'Barra de armadura',
  IFCREINFORCINGMESH: 'Tela de armadura', IFCTENDON: 'Cabo de protensão', IFCFURNISHINGELEMENT: 'Mobiliário',
  IFCEARTHWORKSFILL: 'Aterro', IFCEARTHWORKSCUT: 'Corte', IFCPAVEMENT: 'Pavimento', IFCCOURSE: 'Camada', IFCKERB: 'Meio-fio',
  IFCBEARING: 'Aparelho de apoio', IFCDISCRETEACCESSORY: 'Acessório', IFCFASTENER: 'Fixador', IFCMECHANICALFASTENER: 'Fixador mecânico',
}
export const nomeTipo = (t: string) => NOMES_TIPO[t] ?? t

/** separa argumentos de primeiro nível, respeitando strings ('...' com '' como escape) e parênteses */
export function separarArgs(s: string): string[] {
  const out: string[] = []
  let nivel = 0, atual = '', emString = false
  for (let k = 0; k < s.length; k++) {
    const ch = s[k]
    if (emString) {
      atual += ch
      if (ch === "'") { if (s[k + 1] === "'") { atual += "'"; k++ } else emString = false }
      continue
    }
    if (ch === "'") { emString = true; atual += ch; continue }
    if (ch === '(') nivel++
    if (ch === ')') nivel--
    if (ch === ',' && nivel === 0) { out.push(atual.trim()); atual = ''; continue }
    atual += ch
  }
  if (atual.trim() !== '' || out.length) out.push(atual.trim())
  return out
}

/** separa a seção DATA em instâncias pelo ; que fica fora de string ('' é aspa escapada) */
export function cortarInstancias(dados: string): string[] {
  const out: string[] = []
  let ini = 0, emString = false
  for (let k = 0; k < dados.length; k++) {
    const ch = dados[k]
    if (ch === "'") { if (emString && dados[k + 1] === "'") { k++; continue } emString = !emString; continue }
    if (ch === ';' && !emString) { out.push(dados.slice(ini, k)); ini = k + 1 }
  }
  return out
}

/** referências #n fora de string e conteúdo das strings, numa só passada linear */
export function varrerArgs(args: string): { refs: number[]; strings: string[] } {
  const refs: number[] = [], strings: string[] = []
  let k = 0
  while (k < args.length) {
    const ch = args[k]
    if (ch === "'") {
      let txt = ''; k++
      while (k < args.length) {
        if (args[k] === "'") { if (args[k + 1] === "'") { txt += "'"; k += 2; continue } k++; break }
        txt += args[k++]
      }
      strings.push(txt); continue
    }
    if (ch === '#') {
      let j = k + 1
      while (j < args.length && args[j] >= '0' && args[j] <= '9') j++
      if (j > k + 1) refs.push(Number(args.slice(k + 1, j)))
      k = j; continue
    }
    k++
  }
  return { refs, strings }
}

const tirarAspas = (a: string | undefined) => (a && a.startsWith("'") && a.endsWith("'") ? a.slice(1, -1).replace(/''/g, "'") : '')
const numero = (a: string | undefined) => { const v = Number(a); return Number.isFinite(v) ? v : NaN }

export function lerIFC(texto: string): ResultadoIFC {
  const problemas: ProblemaIFC[] = []
  const t = texto.replace(/\/\*[\s\S]*?\*\//g, '')
  if (!/ISO-10303-21/.test(t)) problemas.push({ gravidade: 'erro', codigo: 'cabecalho', texto: 'Falta a marca ISO-10303-21 no início: não parece um arquivo IFC em formato STEP.', ids: [] })
  const esquema = (t.match(/FILE_SCHEMA\s*\(\s*\(\s*'([^']+)'/i)?.[1] ?? '').toUpperCase()
  if (!esquema) problemas.push({ gravidade: 'erro', codigo: 'esquema', texto: 'O cabeçalho não diz o esquema (FILE_SCHEMA).', ids: [] })
  else if (!/^IFC(2X3|4|4X1|4X2|4X3)/.test(esquema)) problemas.push({ gravidade: 'aviso', codigo: 'esquema', texto: `Esquema ${esquema} fora dos conferidos (IFC2X3, IFC4, IFC4X3).`, ids: [] })

  const dados = t.split(/\bDATA\s*;/i)[1] ?? ''
  const ents = new Map<number, EntidadeIFC>()
  const duplicadosId: number[] = []
  // uma instância: #123 = TIPO( ... );   — corta no ; fora de string com um leitor linear (sem regex que retrocede)
  for (const inst of cortarInstancias(dados)) {
    const m = /^\s*#(\d+)\s*=\s*([A-Za-z0-9_]+)\s*\(([\s\S]*)\)\s*$/.exec(inst)
    if (!m) continue
    const id = Number(m[1]); const tipo = m[2].toUpperCase(); const args = m[3]
    if (ents.has(id)) duplicadosId.push(id)
    const { refs, strings } = varrerArgs(args)
    ents.set(id, { id, tipo, args, refs, strings })
  }
  if (ents.size === 0) problemas.push({ gravidade: 'erro', codigo: 'vazio', texto: 'Nenhuma instância encontrada na seção DATA.', ids: [] })
  if (duplicadosId.length) problemas.push({ gravidade: 'erro', codigo: 'id-duplicado', texto: `${duplicadosId.length} número(s) de instância repetido(s).`, ids: duplicadosId })

  // referências quebradas
  const quebradas: number[] = []
  for (const e of ents.values()) for (const r of e.refs) if (!ents.has(r)) { quebradas.push(e.id); break }
  if (quebradas.length) problemas.push({ gravidade: 'erro', codigo: 'ref-quebrada', texto: `${quebradas.length} instância(s) apontam para números que não existem no arquivo.`, ids: quebradas.slice(0, 50) })

  // GlobalId (IfcRoot): 22 caracteres, únicos
  const guids = new Map<string, number[]>()
  const guidInvalido: number[] = []
  const ehRoot = (e: EntidadeIFC) => /^'[^']*'/.test(e.args.trim()) && (TIPOS_ELEMENTO.has(e.tipo) || /^IFC(REL|PROJECT|SITE|BUILDING|BUILDINGSTOREY|SPACE|ELEMENTQUANTITY|PROPERTYSET|.*TYPE$)/.test(e.tipo))
  for (const e of ents.values()) {
    if (!ehRoot(e)) continue
    const g = tirarAspas(separarArgs(e.args)[0])
    if (!/^[0-9A-Za-z_$]{22}$/.test(g)) guidInvalido.push(e.id)
    guids.set(g, [...(guids.get(g) ?? []), e.id])
  }
  const guidRep = [...guids.values()].filter(v => v.length > 1).flat()
  if (guidRep.length) problemas.push({ gravidade: 'erro', codigo: 'guid-duplicado', texto: `${guidRep.length} objeto(s) com GlobalId repetido: as ferramentas BIM confundem um com o outro.`, ids: guidRep.slice(0, 50) })
  if (guidInvalido.length) problemas.push({ gravidade: 'aviso', codigo: 'guid-invalido', texto: `${guidInvalido.length} GlobalId fora do formato de 22 caracteres.`, ids: guidInvalido.slice(0, 50) })

  if (![...ents.values()].some(e => e.tipo === 'IFCPROJECT')) problemas.push({ gravidade: 'erro', codigo: 'sem-projeto', texto: 'Falta o IfcProject (raiz obrigatória do modelo).', ids: [] })

  // elementos e onde estão
  const contidos = new Set<number>()
  for (const e of ents.values()) {
    if (e.tipo === 'IFCRELCONTAINEDINSPATIALSTRUCTURE' || e.tipo === 'IFCRELAGGREGATES' || e.tipo === 'IFCRELNESTS') {
      const a = separarArgs(e.args)
      const lista = e.tipo === 'IFCRELCONTAINEDINSPATIALSTRUCTURE' ? a[4] : a[5]
      for (const r of (lista ?? '').matchAll(/#(\d+)/g)) contidos.add(Number(r[1]))
    }
  }
  const elementosBrutos = [...ents.values()].filter(e => TIPOS_ELEMENTO.has(e.tipo))
  const soltos = elementosBrutos.filter(e => !contidos.has(e.id)).map(e => e.id)
  if (soltos.length) problemas.push({ gravidade: 'aviso', codigo: 'sem-local', texto: `${soltos.length} elemento(s) sem andar ou local (IfcRelContainedInSpatialStructure): não aparecem na árvore do modelo.`, ids: soltos.slice(0, 50) })

  // quantidades: IfcRelDefinesByProperties(…, (elementos), #IfcElementQuantity) → IfcQuantityLength/Area/Volume/Count
  const qtdPorElemento = new Map<number, Record<string, number>>()
  for (const rel of ents.values()) {
    if (rel.tipo !== 'IFCRELDEFINESBYPROPERTIES') continue
    const a = separarArgs(rel.args)
    const defId = Number(a[5]?.replace('#', ''))
    const def = ents.get(defId)
    if (!def || def.tipo !== 'IFCELEMENTQUANTITY') continue
    const da = separarArgs(def.args)
    const qs = [...(da[5] ?? '').matchAll(/#(\d+)/g)].map(r => ents.get(Number(r[1]))).filter(Boolean) as EntidadeIFC[]
    const alvo = [...(a[4] ?? '').matchAll(/#(\d+)/g)].map(r => Number(r[1]))
    for (const el of alvo) {
      const acc = qtdPorElemento.get(el) ?? {}
      for (const q of qs) {
        const qa = separarArgs(q.args)
        const v = numero(qa[3])
        if (!Number.isFinite(v)) continue
        const chave = q.tipo === 'IFCQUANTITYLENGTH' ? 'comprimento' : q.tipo === 'IFCQUANTITYAREA' ? 'area' : q.tipo === 'IFCQUANTITYVOLUME' ? 'volume' : q.tipo === 'IFCQUANTITYCOUNT' ? 'contagem' : q.tipo === 'IFCQUANTITYWEIGHT' ? 'peso' : ''
        if (!chave) continue
        // várias áreas (lateral, bruta, líquida) no mesmo conjunto: fica a maior, para não somar a mesma face duas vezes
        acc[chave] = Math.max(acc[chave] ?? 0, v)
        acc[`${chave}:${tirarAspas(qa[0])}`] = v
      }
      qtdPorElemento.set(el, acc)
    }
  }

  const elementos = elementosBrutos.map(e => {
    const a = separarArgs(e.args)
    return { id: e.id, tipo: e.tipo, guid: tirarAspas(a[0]), nome: tirarAspas(a[2]) || '(sem nome)', quantidades: qtdPorElemento.get(e.id) ?? {} }
  })
  const semQtd = elementos.filter(e => Object.keys(e.quantidades).length === 0).length
  if (elementos.length && semQtd === elementos.length) problemas.push({ gravidade: 'aviso', codigo: 'sem-quantidades', texto: 'Nenhum elemento traz quantidades (IfcElementQuantity). Peça ao projetista para exportar as quantidades base.', ids: [] })

  const bomMap = new Map<string, LinhaBOM>()
  for (const el of elementos) {
    const chave = `${el.tipo}|${el.nome.replace(/[:#]\d+$/, '').trim()}`
    const l = bomMap.get(chave) ?? { tipo: el.tipo, nome: el.nome.replace(/[:#]\d+$/, '').trim(), quantidade: 0, comprimento: 0, area: 0, volume: 0 }
    l.quantidade += 1
    l.comprimento += el.quantidades.comprimento ?? 0
    l.area += el.quantidades.area ?? 0
    l.volume += el.quantidades.volume ?? 0
    bomMap.set(chave, l)
  }
  const porTipoMap = new Map<string, number>()
  for (const e of ents.values()) porTipoMap.set(e.tipo, (porTipoMap.get(e.tipo) ?? 0) + 1)

  return {
    esquema,
    totalEntidades: ents.size,
    porTipo: [...porTipoMap].map(([tipo, n]) => ({ tipo, n })).sort((a, b) => b.n - a.n),
    elementos,
    bom: [...bomMap.values()].sort((a, b) => a.tipo.localeCompare(b.tipo) || a.nome.localeCompare(b.nome)),
    problemas,
  }
}

export function bomParaCSV(bom: LinhaBOM[]): string {
  const f = (v: number) => (v ? v.toFixed(3).replace('.', ',') : '')
  return ['Tipo;Nome;Quantidade;Comprimento (m);Área (m²);Volume (m³)', ...bom.map(l => [nomeTipo(l.tipo), l.nome.replace(/;/g, ','), l.quantidade, f(l.comprimento), f(l.area), f(l.volume)].join(';'))].join('\n')
}

/** arquivo pequeno de exemplo (escrito à mão para a demonstração; não é de obra real) */
export const IFC_EXEMPLO = `ISO-10303-21;
HEADER;
FILE_DESCRIPTION(('ViewDefinition [ReferenceView]'),'2;1');
FILE_NAME('exemplo-theye.ifc','2026-11-21T00:00:00',('THEYE'),('Instituto THEYE'),'','THEYE Engenharia','');
FILE_SCHEMA(('IFC4'));
ENDSEC;
DATA;
#1=IFCPROJECT('0YvctVUKr0kugbFTf53O9L',$,'Galpão exemplo',$,$,$,$,$,$);
#2=IFCSITE('1hqIFTRjfV6AWq_bMtnZwI',$,'Terreno',$,$,$,$,$,.ELEMENT.,$,$,$,$,$);
#3=IFCBUILDING('2hQBAVPOr5VxhS3Jl0O47h',$,'Galpão',$,$,$,$,$,.ELEMENT.,$,$,$);
#4=IFCBUILDINGSTOREY('0C87kaqBXF$xpGmTZ7zxN$',$,'Térreo',$,$,$,$,$,.ELEMENT.,0.);
#5=IFCRELAGGREGATES('3QbZgFzC90HhVUo8cV$k1t',$,$,$,#1,(#2));
#6=IFCRELAGGREGATES('1aLzXyHk5BjOxe1uHn3d2R',$,$,$,#2,(#3));
#7=IFCRELAGGREGATES('0nmS2V1dP4dRj9MQpH_Gxa',$,$,$,#3,(#4));
#10=IFCCOLUMN('2O2Fr$t4X7Zf8NOew3FLOH',$,'Pilar P1 30x30',$,$,$,$,$,.COLUMN.);
#11=IFCCOLUMN('1kTvXnbbzCWw8lcMd1dR4o',$,'Pilar P2 30x30',$,$,$,$,$,.COLUMN.);
#12=IFCBEAM('0uUpbDCWv2oQ1nPm7zxh3X',$,'Viga V1 20x50',$,$,$,$,$,.BEAM.);
#13=IFCSLAB('3Xr2UiMwj9nOAfKTqDg7Pk',$,'Laje L1 e=12',$,$,$,$,$,.FLOOR.);
#14=IFCPIPESEGMENT('2pYwZlq0r1Eh0R9XKJmqnB',$,'Tubo PVC DN100',$,$,$,$,$,.RIGIDSEGMENT.);
#15=IFCWALL('1ZrO8tv6P4ve6JK$c8vRlm',$,'Parede bloco 14',$,$,$,$,$,.STANDARD.);
#20=IFCRELCONTAINEDINSPATIALSTRUCTURE('2Fp$7yU8L0F9VBlk5tWsMr',$,$,$,(#10,#11,#12,#13,#14),#4);
#30=IFCQUANTITYLENGTH('Length',$,$,3.0,$);
#31=IFCQUANTITYVOLUME('NetVolume',$,$,0.27,$);
#32=IFCELEMENTQUANTITY('0lN3aYQzP6HA0qT4mEUhXk',$,'Qto_ColumnBaseQuantities',$,$,(#30,#31));
#33=IFCRELDEFINESBYPROPERTIES('3wQqeFIBn8xA7o$e2kLzd5',$,$,$,(#10,#11),#32);
#34=IFCQUANTITYLENGTH('Length',$,$,6.0,$);
#35=IFCQUANTITYVOLUME('NetVolume',$,$,0.6,$);
#36=IFCELEMENTQUANTITY('1TqG4Zp7f2xBw8nJmV3aRc',$,'Qto_BeamBaseQuantities',$,$,(#34,#35));
#37=IFCRELDEFINESBYPROPERTIES('2bX9eLmP0r4Hk7wQ1sZt8u',$,$,$,(#12),#36);
#38=IFCQUANTITYAREA('NetArea',$,$,36.0,$);
#39=IFCQUANTITYVOLUME('NetVolume',$,$,4.32,$);
#40=IFCELEMENTQUANTITY('0dF6hJ2kL9mN3pQ5rS7tUv',$,'Qto_SlabBaseQuantities',$,$,(#38,#39));
#41=IFCRELDEFINESBYPROPERTIES('3aB4cD5eF6gH7iJ8kL9mN0',$,$,$,(#13),#40);
#42=IFCQUANTITYLENGTH('Length',$,$,12.5,$);
#43=IFCELEMENTQUANTITY('1oP2qR3sT4uV5wX6yZ7aB8',$,'Qto_PipeSegmentBaseQuantities',$,$,(#42));
#44=IFCRELDEFINESBYPROPERTIES('2cD3eF4gH5iJ6kL7mN8oP9',$,$,$,(#14,#99),#43);
ENDSEC;
END-ISO-10303-21;
`
