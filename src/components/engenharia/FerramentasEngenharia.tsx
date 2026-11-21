// Aba "Ferramentas": as 8 ferramentas do Plano Master de Engenharia (15/11/2026), cada uma na versão que roda no navegador.
// O que já tem conteúdo funciona aqui; o que ainda não tem fica marcado "em desenvolvimento", com o que falta escrito.
import { useMemo, useState, type ReactNode } from 'react'
import { analisar, gerarTrelica, listaMateriaisTrelica, relatorioFEM, ErroFEM, type ModeloFEM, type ResultadoFEM, type TipoTrelica } from '@/lib/engenharia/fem2d'
import { lerModeloTexto, MODELOS_EXEMPLO } from '@/lib/engenharia/modeloTexto'
import { lerIFC, bomParaCSV, nomeTipo, IFC_EXEMPLO } from '@/lib/engenharia/ifc'
import { lerCaixas, detectarConflitos, resumoConflitos, CAIXAS_EXEMPLO, ErroCaixas } from '@/lib/engenharia/conflitos'
import { calcularEstimativa, estimativaParaCSV, LINHAS_EXEMPLO, type LinhaCusto, type ParamEstimativa } from '@/lib/engenharia/estimativa'
import { CLASSES_AACE } from '@/lib/engenharia/normasEstruturais'
import { AVISO_ENGENHARIA } from '@/lib/engenharia/calculo'
import InspecaoObra from './InspecaoObra'
import CoordenacaoBIM from './CoordenacaoBIM'

type Sub = 'mapa' | 'portico' | 'trelica' | 'ifc' | 'conflitos' | 'coordenacao' | 'custo' | 'inspecao'
const SUBS: { id: Sub; nome: string; dica: string }[] = [
  { id: 'mapa', nome: 'As 8 ferramentas', dica: 'O que cada ferramenta do plano faz hoje e o que falta' },
  { id: 'portico', nome: 'Pórticos e vigas', dica: 'Elementos finitos 2D: esforços, reações, deslocamentos e memória de cálculo' },
  { id: 'trelica', nome: 'Treliça paramétrica', dica: 'Escolhe o tipo, o vão e a altura: sai o desenho, a lista de material e os esforços' },
  { id: 'ifc', nome: 'Arquivo IFC', dica: 'Lê o modelo BIM, aponta defeitos e tira a lista de materiais, sem enviar o arquivo a lugar nenhum' },
  { id: 'conflitos', nome: 'Conflitos entre disciplinas', dica: 'Onde tubo, duto e eletrocalha batem na estrutura, ou passam perto demais' },
  { id: 'coordenacao', nome: 'Mesa de coordenação', dica: 'Sala ao vivo: a equipe vê os mesmos apontamentos e quem está online' },
  { id: 'custo', nome: 'Estimativa de custo', dica: 'Quantidade × preço, BDI, contingência e faixa de precisão AACE' },
  { id: 'inspecao', nome: 'Inspeção de obra', dica: 'Lista de verificação no celular, sem internet, com fotos, local e hora' },
]

const n = (v: number, c = 2) => (Number.isFinite(v) ? (Math.abs(v) < 1e-9 ? 0 : v).toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c }) : '—')
const caixa = 'bg-white p-5 shadow-sm'
const botao = 'text-sm px-3 py-1 border border-navy/30 text-navy hover:bg-navy/5'

function baixar(nome: string, conteudo: string, tipo = 'text/plain') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: `${tipo};charset=utf-8` }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// ------------------------------------------------------------------ desenho do modelo

function DesenhoModelo({ m, r, mostrar }: { m: ModeloFEM; r?: ResultadoFEM | null; mostrar: 'deformada' | 'momento' | 'normal' }) {
  const W = 640, H = 300, pad = 40
  const xs = m.nos.map(p => p.x), ys = m.nos.map(p => p.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
  const esc = Math.min((W - 2 * pad) / Math.max(maxX - minX, 1e-6), (H - 2 * pad) / Math.max(maxY - minY, 1e-6), 400)
  const cx = (W - (maxX - minX) * esc) / 2, cy = (H + (maxY - minY) * esc) / 2
  const P = (x: number, y: number) => [cx + (x - minX) * esc, cy - (y - minY) * esc] as const
  const no = new Map(m.nos.map(p => [p.id, p]))
  const Lmax = Math.max(...m.elementos.map(e => { const a = no.get(e.i)!, b = no.get(e.j)!; return Math.hypot(b.x - a.x, b.y - a.y) }))
  let extra: ReactNode = null
  if (r && mostrar === 'deformada') {
    const umax = Math.max(1e-12, ...Object.values(r.deslocamentos).map(d => Math.hypot(d.ux, d.uy)))
    const f = (0.08 * Lmax) / umax
    extra = m.elementos.map(e => {
      const a = no.get(e.i)!, b = no.get(e.j)!, da = r.deslocamentos[e.i], db = r.deslocamentos[e.j]
      const [x1, y1] = P(a.x + da.ux * f, a.y + da.uy * f), [x2, y2] = P(b.x + db.ux * f, b.y + db.uy * f)
      return <line key={`d${e.id}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#c2410c" strokeDasharray="5 3" strokeWidth={2} />
    })
  }
  if (r && mostrar === 'momento') {
    const mmax = Math.max(1e-9, ...r.elementos.flatMap(e => e.diagramaM.map(p => Math.abs(p.M))))
    const f = (0.12 * Lmax) / mmax
    extra = r.elementos.map(er => {
      const e = m.elementos.find(x => x.id === er.id)!, a = no.get(e.i)!, b = no.get(e.j)!
      const c = (b.x - a.x) / er.L, s = (b.y - a.y) / er.L
      // momento positivo (traciona embaixo) desenhado do lado de baixo da barra (−y local)
      const pts = er.diagramaM.map(p => P(a.x + c * p.x + s * p.M * f, a.y + s * p.x - c * p.M * f).join(','))
      const [x1, y1] = P(a.x, a.y), [x2, y2] = P(b.x, b.y)
      return <polygon key={`m${er.id}`} points={`${x1},${y1} ${pts.join(' ')} ${x2},${y2}`} fill="rgba(30,64,175,.18)" stroke="#1e40af" strokeWidth={1} />
    })
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full border border-navy/10 bg-[#fbfbfa]" role="img" aria-label="Desenho do modelo estrutural">
      {extra}
      {m.elementos.map(e => {
        const a = no.get(e.i), b = no.get(e.j)
        if (!a || !b) return null
        const [x1, y1] = P(a.x, a.y), [x2, y2] = P(b.x, b.y)
        let cor = '#1f2937'
        if (r && mostrar === 'normal') { const N = r.elementos.find(x => x.id === e.id)?.N ?? 0; cor = Math.abs(N) < 1e-6 ? '#6b7280' : N > 0 ? '#1d4ed8' : '#b91c1c' }
        return <g key={e.id}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={cor} strokeWidth={3} /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} fontSize={10} fill="#374151" textAnchor="middle">{e.id}</text></g>
      })}
      {m.apoios.map(ap => {
        const p = no.get(ap.no); if (!p) return null
        const [x, y] = P(p.x, p.y)
        return ap.rz ? <rect key={`a${ap.no}`} x={x - 9} y={y} width={18} height={6} fill="#374151" /> : <polygon key={`a${ap.no}`} points={`${x},${y} ${x - 8},${y + 12} ${x + 8},${y + 12}`} fill={ap.ux ? '#374151' : 'none'} stroke="#374151" />
      })}
      {m.cargas.map((c, k) => {
        const p = no.get(c.no); if (!p) return null
        const [x, y] = P(p.x, p.y)
        const fx = c.fx ?? 0, fy = c.fy ?? 0, L = Math.hypot(fx, fy); if (L === 0) return null
        const dx = (fx / L) * 28, dy = (-fy / L) * 28
        return <g key={`c${k}`}><line x1={x - dx} y1={y - dy} x2={x} y2={y} stroke="#059669" strokeWidth={2} /><circle cx={x} cy={y} r={3} fill="#059669" /></g>
      })}
      {m.nos.map(p => { const [x, y] = P(p.x, p.y); return <text key={p.id} x={x + 5} y={y + 14} fontSize={10} fill="#6b7280">{p.id}</text> })}
    </svg>
  )
}

function Avisos({ itens }: { itens: string[] }) {
  if (!itens.length) return null
  return <ul className="text-xs text-amber-800 bg-amber-50 border border-amber-200 p-3 space-y-1">{itens.map(a => <li key={a}>{a}</li>)}</ul>
}

function TabelaResultados({ r }: { r: ResultadoFEM }) {
  return (
    <div className="grid lg:grid-cols-2 gap-4 text-sm">
      <div className="overflow-x-auto">
        <h4 className="text-navy font-medium mb-1">Reações de apoio</h4>
        <table className="w-full" data-testid="fem-reacoes"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-3">Nó</th><th className="pr-3">Rx (kN)</th><th className="pr-3">Ry (kN)</th><th>Mz (kN·m)</th></tr></thead>
          <tbody>{Object.entries(r.reacoes).map(([k, v]) => <tr key={k} className="border-t border-navy/10"><td className="pr-3">{k}</td><td className="pr-3">{n(v.fx)}</td><td className="pr-3">{n(v.fy)}</td><td>{n(v.mz)}</td></tr>)}</tbody></table>
        <p className="text-xs text-grafite-claro mt-1">Equilíbrio global: ΣFx = {n(r.equilibrio.somaFx, 4)} · ΣFy = {n(r.equilibrio.somaFy, 4)} → {r.equilibrio.ok ? 'fecha' : 'não fecha'}</p>
      </div>
      <div className="overflow-x-auto">
        <h4 className="text-navy font-medium mb-1">Esforços por barra</h4>
        <table className="w-full" data-testid="fem-esforcos"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-3">Barra</th><th className="pr-3">N (kN)</th><th className="pr-3">M+ (kN·m)</th><th className="pr-3">M− (kN·m)</th><th>|V| (kN)</th></tr></thead>
          <tbody>{r.elementos.map(e => <tr key={e.id} className="border-t border-navy/10"><td className="pr-3">{e.id}</td><td className="pr-3">{n(e.N)}</td><td className="pr-3">{n(Math.max(0, e.Mmax))}</td><td className="pr-3">{n(Math.min(0, e.Mmin))}</td><td>{n(e.Vmax)}</td></tr>)}</tbody></table>
      </div>
    </div>
  )
}

function Memoria({ titulo, m, r }: { titulo: string; m: ModeloFEM; r: ResultadoFEM }) {
  const [aberta, setAberta] = useState(false)
  const txt = useMemo(() => relatorioFEM(titulo, m, r), [titulo, m, r])
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={botao} onClick={() => setAberta(!aberta)}>{aberta ? 'Esconder' : 'Ver'} memória de cálculo</button>
        <button type="button" className={botao} onClick={() => baixar(`memoria-${titulo.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.txt`, txt)}>Baixar memória (.txt)</button>
      </div>
      {aberta && <pre className="text-xs whitespace-pre-wrap bg-[#fbfbfa] border border-navy/10 p-3 max-h-96 overflow-auto" data-testid="fem-memoria">{txt}</pre>}
    </div>
  )
}

// ------------------------------------------------------------------ 1. pórticos e vigas

function Portico() {
  const [texto, setTexto] = useState(MODELOS_EXEMPLO[0].texto)
  const [mostrar, setMostrar] = useState<'deformada' | 'momento' | 'normal'>('momento')
  const calc = useMemo(() => {
    try { const m = lerModeloTexto(texto); return { m, r: analisar(m), erro: '' } }
    catch (e) { return { m: null, r: null, erro: e instanceof ErroFEM ? e.message : 'Não foi possível ler o modelo.' } }
  }, [texto])
  return (
    <div className="space-y-4">
      <div className={`${caixa} space-y-3`}>
        <p className="text-sm text-grafite-claro">Descreva a estrutura linha a linha (unidades kN e m) ou parta de um exemplo. O cálculo refaz sozinho a cada mudança.</p>
        <div className="flex flex-wrap gap-2">{MODELOS_EXEMPLO.map(x => <button key={x.id} type="button" className={botao} onClick={() => setTexto(x.texto)}>{x.nome}</button>)}</div>
        <textarea aria-label="Modelo da estrutura" className="w-full font-mono text-xs border border-navy/20 p-2 h-48" value={texto} onChange={e => setTexto(e.target.value)} spellCheck={false} data-testid="fem-texto" />
        <p className="text-xs text-grafite-claro">NO id x y · BARRA id i j E A I [w=kN/m] [trelica] · APOIO nó ux uy rz · CARGA nó fx fy [mz]. Carga w negativa puxa para baixo numa barra desenhada da esquerda para a direita.</p>
      </div>
      {calc.erro && <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3" role="alert">{calc.erro}</p>}
      {calc.m && calc.r && (
        <div className={`${caixa} space-y-3`}>
          <div className="flex flex-wrap gap-2" role="tablist">
            {(['momento', 'deformada', 'normal'] as const).map(k => <button key={k} type="button" role="tab" aria-selected={mostrar === k} className={`text-sm px-3 py-1 border ${mostrar === k ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy'}`} onClick={() => setMostrar(k)}>{k === 'momento' ? 'Diagrama de momento' : k === 'deformada' ? 'Deformada (ampliada)' : 'Tração e compressão'}</button>)}
          </div>
          <DesenhoModelo m={calc.m} r={calc.r} mostrar={mostrar} />
          <TabelaResultados r={calc.r} />
          <Avisos itens={calc.r.avisos} />
          <Memoria titulo="Pórtico" m={calc.m} r={calc.r} />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ 2. treliça paramétrica

function Trelica() {
  const [p, setP] = useState({ tipo: 'pratt' as TipoTrelica, vao: 18, altura: 2.5, paineis: 6, cargaNo: 12, E: 200e6, A: 0.0025, fy: 250, preco: 18 })
  const calc = useMemo(() => {
    try {
      const { modelo, barras } = gerarTrelica(p)
      const r = analisar(modelo)
      return { modelo, barras, r, lm: listaMateriaisTrelica(barras, p.A), erro: '' }
    } catch (e) { return { erro: e instanceof ErroFEM ? e.message : 'Parâmetros inválidos.' } as const }
  }, [p])
  const campo = (k: keyof typeof p, rot: string, un: string, dica: string) => (
    <label className="text-sm flex flex-col" title={dica}><span>{rot} <span className="text-grafite-claro">({un})</span></span>
      <input type="number" step="any" className="border border-navy/20 px-2 py-1" value={p[k] as number} onChange={e => setP({ ...p, [k]: Number(e.target.value) || 0 })} data-testid={`trelica-${k}`} /></label>
  )
  return (
    <div className="space-y-4">
      <form className={`${caixa} grid sm:grid-cols-4 gap-3`} onSubmit={e => e.preventDefault()} aria-label="Parâmetros da treliça">
        <label className="text-sm flex flex-col"><span>Tipo</span>
          <select className="border border-navy/20 px-2 py-1" value={p.tipo} onChange={e => setP({ ...p, tipo: e.target.value as TipoTrelica })} data-testid="trelica-tipo">
            <option value="pratt">Pratt (diagonais tracionadas)</option><option value="howe">Howe (diagonais comprimidas)</option><option value="warren">Warren (sem montantes)</option>
          </select></label>
        {campo('vao', 'Vão', 'm', 'Distância entre os apoios')}
        {campo('altura', 'Altura', 'm', 'Distância entre os banzos')}
        {campo('paineis', 'Painéis', 'nº', 'Quantos módulos ao longo do vão (par para Pratt e Howe)')}
        {campo('cargaNo', 'Carga por nó do banzo superior', 'kN', 'Carga de cálculo concentrada em cada nó de cima')}
        {campo('A', 'Área da barra', 'm²', 'Área da seção de cada barra (mesma para todas nesta versão)')}
        {campo('fy', 'Resistência do aço (fy)', 'MPa', 'Tensão de escoamento do aço')}
        {campo('preco', 'Preço do aço montado', 'por kg', 'Preço marcador para a conta, na moeda da obra')}
      </form>
      {'erro' in calc && calc.erro ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3" role="alert">{calc.erro}</p> : 'modelo' in calc && calc.modelo && (
        <div className={`${caixa} space-y-3`}>
          <p className="text-xs text-grafite-claro">Azul: tração. Vermelho: compressão. Cinza: barra sem esforço.</p>
          <DesenhoModelo m={calc.modelo} r={calc.r} mostrar="normal" />
          <div className="grid lg:grid-cols-2 gap-4 text-sm">
            <div className="overflow-x-auto">
              <h4 className="text-navy font-medium mb-1">Lista de material</h4>
              <table className="w-full" data-testid="trelica-lista"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-3">Peça</th><th className="pr-3">Qtd</th><th className="pr-3">Comprimento (m)</th><th>Aço c/ 5% perda (kg)</th></tr></thead>
                <tbody>{calc.lm.linhas.map(l => <tr key={l.papel} className="border-t border-navy/10"><td className="pr-3">{l.papel}</td><td className="pr-3">{l.qtd}</td><td className="pr-3">{n(l.comprimento)}</td><td>{n(l.massaKg, 1)}</td></tr>)}
                  <tr className="border-t border-navy/30 font-medium"><td className="pr-3">Total</td><td className="pr-3">{calc.barras.length}</td><td className="pr-3">{n(calc.lm.total.comprimento)}</td><td>{n(calc.lm.total.massaKg, 1)}</td></tr></tbody></table>
              <p className="text-xs text-grafite-claro mt-1">Custo do aço: {n(calc.lm.total.massaKg * p.preco)} (preço marcador, não cotação).</p>
            </div>
            <div className="overflow-x-auto">
              <h4 className="text-navy font-medium mb-1">Barras mais solicitadas</h4>
              <table className="w-full"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-3">Barra</th><th className="pr-3">Peça</th><th className="pr-3">N (kN)</th><th>Tensão / fy</th></tr></thead>
                <tbody>{[...calc.r.elementos].sort((a, b) => Math.abs(b.N) - Math.abs(a.N)).slice(0, 8).map(e => {
                  const b = calc.barras.find(x => x.id === e.id)!; const uso = Math.abs(e.N) / (p.A * p.fy * 1000)
                  return <tr key={e.id} className="border-t border-navy/10"><td className="pr-3">{e.id}</td><td className="pr-3">{b.papel}</td><td className="pr-3">{n(e.N)}</td><td className={uso > 1 ? 'text-red-700 font-medium' : ''}>{n(uso * 100, 0)}%</td></tr>
                })}</tbody></table>
              <p className="text-xs text-grafite-claro mt-1">Tensão / fy só compara a força com a área bruta. Flambagem das barras comprimidas, ligações e contraventamento ficam com o engenheiro.</p>
            </div>
          </div>
          <Avisos itens={calc.r.avisos} />
          <Memoria titulo={`Treliça ${p.tipo} ${p.vao} m`} m={calc.modelo} r={calc.r} />
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ 3. IFC

function ArquivoIFC() {
  const [texto, setTexto] = useState(IFC_EXEMPLO)
  const [nome, setNome] = useState('exemplo-theye.ifc')
  const r = useMemo(() => lerIFC(texto), [texto])
  const abrir = (f: File | undefined) => {
    if (!f) return
    if (f.size > 200 * 1024 * 1024) { alert('Arquivo maior que 200 MB: esta versão lê até 200 MB no navegador.'); return }
    f.text().then(t => { setTexto(t); setNome(f.name) })
  }
  const erros = r.problemas.filter(p => p.gravidade === 'erro').length
  return (
    <div className="space-y-4">
      <div className={`${caixa} space-y-2 text-sm`}>
        <p>Abra um arquivo .ifc exportado do Revit, ArchiCAD, Tekla ou outro programa. A leitura é feita no seu navegador: o arquivo não sai do computador.</p>
        <div className="flex flex-wrap gap-2 items-center">
          <label className={`${botao} cursor-pointer`}>Abrir arquivo IFC<input type="file" accept=".ifc,.IFC" className="sr-only" onChange={e => abrir(e.target.files?.[0])} data-testid="ifc-arquivo" /></label>
          <button type="button" className={botao} onClick={() => { setTexto(IFC_EXEMPLO); setNome('exemplo-theye.ifc') }}>Usar o exemplo</button>
          <span className="text-grafite-claro">Aberto: {nome}</span>
        </div>
      </div>
      <div className={`${caixa} grid sm:grid-cols-4 gap-3 text-sm`} data-testid="ifc-resumo">
        <div><div className="text-xs uppercase text-grafite-claro">Esquema</div><div className="text-navy text-lg">{r.esquema || '—'}</div></div>
        <div><div className="text-xs uppercase text-grafite-claro">Instâncias</div><div className="text-navy text-lg">{r.totalEntidades.toLocaleString('pt-BR')}</div></div>
        <div><div className="text-xs uppercase text-grafite-claro">Elementos físicos</div><div className="text-navy text-lg">{r.elementos.length.toLocaleString('pt-BR')}</div></div>
        <div><div className="text-xs uppercase text-grafite-claro">Defeitos</div><div className={`text-lg ${erros ? 'text-red-700' : 'text-navy'}`}>{erros} erro(s) · {r.problemas.length - erros} aviso(s)</div></div>
      </div>
      {r.problemas.length > 0 && (
        <div className={caixa}><h4 className="text-navy font-medium mb-2">Validação</h4>
          <ul className="text-sm space-y-1" data-testid="ifc-problemas">{r.problemas.map(p => <li key={p.codigo}><span className={`text-xs px-1.5 py-0.5 mr-2 ${p.gravidade === 'erro' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{p.gravidade}</span>{p.texto}{p.ids.length > 0 && <span className="text-grafite-claro"> Instâncias: {p.ids.slice(0, 10).map(i => `#${i}`).join(', ')}{p.ids.length > 10 ? '…' : ''}</span>}</li>)}</ul>
        </div>
      )}
      <div className={`${caixa} overflow-x-auto`}>
        <div className="flex justify-between items-center mb-2"><h4 className="text-navy font-medium">Lista de materiais</h4>
          <button type="button" className={botao} onClick={() => baixar(`${nome.replace(/\.ifc$/i, '')}-lista-materiais.csv`, bomParaCSV(r.bom), 'text/csv')}>Baixar planilha (.csv)</button></div>
        <table className="w-full text-sm" data-testid="ifc-bom"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-3">Tipo</th><th className="pr-3">Nome</th><th className="pr-3">Qtd</th><th className="pr-3">Comprimento (m)</th><th className="pr-3">Área (m²)</th><th>Volume (m³)</th></tr></thead>
          <tbody>{r.bom.slice(0, 300).map(l => <tr key={`${l.tipo}|${l.nome}`} className="border-t border-navy/10"><td className="pr-3">{nomeTipo(l.tipo)}</td><td className="pr-3">{l.nome}</td><td className="pr-3">{l.quantidade}</td><td className="pr-3">{l.comprimento ? n(l.comprimento) : ''}</td><td className="pr-3">{l.area ? n(l.area) : ''}</td><td>{l.volume ? n(l.volume, 3) : ''}</td></tr>)}</tbody></table>
        {r.bom.length > 300 && <p className="text-xs text-grafite-claro mt-1">Mostrando 300 de {r.bom.length} linhas; a planilha traz todas.</p>}
        <p className="text-xs text-grafite-claro mt-2">As quantidades vêm do próprio arquivo (IfcElementQuantity). Elemento sem quantidade aparece só na contagem. Visualização 3D e edição do modelo ficam para a fase 2.</p>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ 4. conflitos

function Conflitos() {
  const [texto, setTexto] = useState(CAIXAS_EXEMPLO)
  const [folgaCm, setFolgaCm] = useState(5)
  const [mesma, setMesma] = useState(false)
  const calc = useMemo(() => {
    try { const cs = lerCaixas(texto); return { cs, r: detectarConflitos(cs, { folga: folgaCm / 100, mesmaDisciplina: mesma }), erro: '' } }
    catch (e) { return { cs: [], r: [], erro: e instanceof ErroCaixas ? e.message : 'Não foi possível ler a lista.' } }
  }, [texto, folgaCm, mesma])
  const resumo = resumoConflitos(calc.r)
  return (
    <div className="space-y-4">
      <div className={`${caixa} space-y-2`}>
        <p className="text-sm text-grafite-claro">Uma peça por linha: id;disciplina;nome;xmin;ymin;zmin;xmax;ymax;zmax (metros). A caixa de cada peça pode vir do modelo BIM ou da planilha do projetista.</p>
        <textarea aria-label="Lista de peças" className="w-full font-mono text-xs border border-navy/20 p-2 h-40" value={texto} onChange={e => setTexto(e.target.value)} spellCheck={false} data-testid="conflitos-texto" />
        <div className="flex flex-wrap gap-4 text-sm items-center">
          <label className="flex items-center gap-2">Folga mínima <input type="number" min={0} step="1" className="border border-navy/20 px-2 py-1 w-20" value={folgaCm} onChange={e => setFolgaCm(Math.max(0, Number(e.target.value) || 0))} /> cm</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={mesma} onChange={e => setMesma(e.target.checked)} /> comparar também peças da mesma disciplina</label>
          <button type="button" className={botao} onClick={() => setTexto(CAIXAS_EXEMPLO)}>Usar o exemplo</button>
        </div>
      </div>
      {calc.erro ? <p className="text-sm text-red-700 bg-red-50 border border-red-200 p-3" role="alert">{calc.erro}</p> : (
        <div className={`${caixa} space-y-3 text-sm`}>
          <p data-testid="conflitos-total"><strong>{calc.r.filter(c => c.tipo === 'duro').length}</strong> cruzamento(s) e <strong>{calc.r.filter(c => c.tipo === 'folga').length}</strong> passagem(ns) perto demais, entre {calc.cs.length} peças.</p>
          {resumo.length > 0 && <div className="flex flex-wrap gap-2">{resumo.map(s => <span key={s.par} className="text-xs border border-navy/20 px-2 py-1">{s.par}: {s.duros} cruz. · {s.folgas} folga</span>)}</div>}
          <ol className="space-y-1 list-decimal pl-5">{calc.r.map(c => <li key={`${c.a}-${c.b}`}><span className={`text-xs px-1.5 py-0.5 mr-2 ${c.tipo === 'duro' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>{c.tipo === 'duro' ? 'cruza' : 'folga'}</span>{c.texto}</li>)}</ol>
          <p className="text-xs text-grafite-claro">Caixa envolvente é maior que a peça real (tubo inclinado, peça curva): cada conflito é candidato a conferir no modelo. Sugestão automática de novo traçado fica para a fase 2.</p>
        </div>
      )}
    </div>
  )
}

// ------------------------------------------------------------------ 5. custo

function Custo() {
  const [linhas, setLinhas] = useState<LinhaCusto[]>(LINHAS_EXEMPLO)
  const [p, setP] = useState<ParamEstimativa>({ moeda: 'BRL', bdiPct: 25, contingenciaPct: 5, classe: 3, dataBase: new Date().toISOString().slice(0, 7) })
  const r = useMemo(() => calcularEstimativa(linhas, p), [linhas, p])
  const mudar = (k: number, campo: keyof LinhaCusto, v: string) => setLinhas(ls => ls.map((l, i) => (i === k ? { ...l, [campo]: campo === 'quantidade' || campo === 'precoUnitario' ? Number(v.replace(',', '.')) : v } : l)))
  return (
    <div className="space-y-4">
      <form className={`${caixa} grid sm:grid-cols-5 gap-3 text-sm`} onSubmit={e => e.preventDefault()} aria-label="Parâmetros da estimativa">
        <label className="flex flex-col">Moeda<select className="border border-navy/20 px-2 py-1" value={p.moeda} onChange={e => setP({ ...p, moeda: e.target.value })}>{['BRL', 'AOA', 'NAD', 'EGP', 'EUR', 'AED', 'USD'].map(m => <option key={m}>{m}</option>)}</select></label>
        <label className="flex flex-col" title="Benefícios e despesas indiretas: administração central, impostos, lucro">BDI (%)<input type="number" step="any" className="border border-navy/20 px-2 py-1" value={p.bdiPct} onChange={e => setP({ ...p, bdiPct: Number(e.target.value) || 0 })} data-testid="custo-bdi" /></label>
        <label className="flex flex-col">Contingência (%)<input type="number" step="any" className="border border-navy/20 px-2 py-1" value={p.contingenciaPct} onChange={e => setP({ ...p, contingenciaPct: Number(e.target.value) || 0 })} /></label>
        <label className="flex flex-col" title="Quanto do projeto está definido: define a faixa de precisão">Classe AACE<select className="border border-navy/20 px-2 py-1" value={p.classe} onChange={e => setP({ ...p, classe: Number(e.target.value) as ParamEstimativa['classe'] })}>{([5, 4, 3, 2, 1] as const).map(c => <option key={c} value={c}>{c}: {CLASSES_AACE[c].definicao}</option>)}</select></label>
        <label className="flex flex-col">Data-base<input type="month" className="border border-navy/20 px-2 py-1" value={p.dataBase} onChange={e => setP({ ...p, dataBase: e.target.value })} /></label>
      </form>
      <div className={`${caixa} overflow-x-auto`}>
        <table className="w-full text-sm" data-testid="custo-tabela"><thead><tr className="text-left text-xs uppercase text-grafite-claro"><th className="pr-2">Código</th><th className="pr-2">Serviço</th><th className="pr-2">Un</th><th className="pr-2">Quantidade</th><th className="pr-2">Preço unit.</th><th className="pr-2">Total</th><th></th></tr></thead>
          <tbody>{linhas.map((l, k) => (
            <tr key={k} className="border-t border-navy/10">
              <td className="pr-2"><input aria-label="Código" className="w-16 border border-navy/10 px-1" value={l.codigo} onChange={e => mudar(k, 'codigo', e.target.value)} /></td>
              <td className="pr-2"><input aria-label="Serviço" className="w-full min-w-[14rem] border border-navy/10 px-1" value={l.servico} onChange={e => mudar(k, 'servico', e.target.value)} /></td>
              <td className="pr-2"><input aria-label="Unidade" className="w-12 border border-navy/10 px-1" value={l.unidade} onChange={e => mudar(k, 'unidade', e.target.value)} /></td>
              <td className="pr-2"><input aria-label="Quantidade" type="number" step="any" className="w-24 border border-navy/10 px-1" value={l.quantidade} onChange={e => mudar(k, 'quantidade', e.target.value)} /></td>
              <td className="pr-2"><input aria-label="Preço unitário" type="number" step="any" className="w-24 border border-navy/10 px-1" value={l.precoUnitario} onChange={e => mudar(k, 'precoUnitario', e.target.value)} /></td>
              <td className="pr-2 whitespace-nowrap">{n(l.quantidade * l.precoUnitario)}</td>
              <td><button type="button" className="text-xs text-red-700" aria-label={`Remover ${l.servico}`} onClick={() => setLinhas(ls => ls.filter((_, i) => i !== k))}>remover</button></td>
            </tr>))}</tbody></table>
        <div className="flex flex-wrap gap-2 mt-2">
          <button type="button" className={botao} onClick={() => setLinhas(ls => [...ls, { codigo: '', servico: 'Novo serviço', unidade: 'un', quantidade: 0, precoUnitario: 0, grupo: 'Geral' }])}>Adicionar linha</button>
          <button type="button" className={botao} onClick={() => setLinhas(LINHAS_EXEMPLO)}>Voltar ao exemplo</button>
          <button type="button" className={botao} onClick={() => baixar('estimativa-de-custo.csv', estimativaParaCSV(r, p), 'text/csv')}>Baixar planilha (.csv)</button>
        </div>
      </div>
      <div className={`${caixa} grid md:grid-cols-2 gap-4 text-sm`}>
        <div data-testid="custo-resumo">
          <table className="w-full"><tbody>
            <tr><td>Custo direto</td><td className="text-right">{p.moeda} {n(r.direto)}</td></tr>
            <tr><td>BDI ({p.bdiPct}%)</td><td className="text-right">{n(r.bdi)}</td></tr>
            <tr><td>Contingência ({p.contingenciaPct}%)</td><td className="text-right">{n(r.contingencia)}</td></tr>
            <tr className="border-t border-navy/30 font-medium"><td>Total base</td><td className="text-right">{p.moeda} {n(r.base)}</td></tr>
            <tr><td>Faixa (classe {p.classe}: {CLASSES_AACE[p.classe].baixo}% a +{CLASSES_AACE[p.classe].alto}%)</td><td className="text-right">{n(r.baixo, 0)} a {n(r.alto, 0)}</td></tr>
          </tbody></table>
          {r.descartadas > 0 && <p className="text-xs text-amber-800 mt-1">{r.descartadas} linha(s) com número inválido ficaram de fora.</p>}
        </div>
        <div>
          <h4 className="text-navy font-medium mb-1">Onde está o dinheiro (curva ABC)</h4>
          <ul className="space-y-0.5">{r.abc.filter(a => a.classe === 'A').map(a => <li key={a.codigo + a.servico}><span className="text-xs bg-navy text-white px-1 mr-1">A</span>{a.servico}: {n(a.total, 0)} (acumulado {n(a.acumuladoPct, 0)}%)</li>)}</ul>
          <p className="text-xs text-grafite-claro mt-1">Itens A concentram ~80% do custo: cotar primeiro. Preços do exemplo são marcadores, não cotação; em cada obra entram a tabela oficial (SINAPI/SICRO no Brasil) ou a cotação local, com a data-base escrita.</p>
        </div>
      </div>
    </div>
  )
}

// ------------------------------------------------------------------ mapa das 8

const OITO: { nome: string; prioridade: string; estado: 'no ar' | 'em desenvolvimento'; hoje: string; falta: string; sub?: Sub }[] = [
  { nome: 'Motor de análise estrutural (FEA)', prioridade: 'P1', estado: 'no ar', sub: 'portico', hoje: 'Pórticos e treliças planas, análise estática linear, reações, esforços, deformada, diagrama de momento e memória de cálculo. Conferido com 14 casos de livro (biapoiada, balanço, biengastada, pórtico, treliças pelo método das seções).', falta: 'Elementos de placa e casca, 3D, frequências próprias, análise térmica, fadiga e não linear.' },
  { nome: 'Modelagem paramétrica (CAD)', prioridade: 'P1', estado: 'no ar', sub: 'trelica', hoje: 'Treliça paramétrica (Pratt, Howe, Warren): muda o vão, a altura e os painéis e saem o desenho, a lista de material e os esforços.', falta: 'Outras peças (pórtico de galpão, escada, reservatório), desenho técnico com cotas em DXF e exportação STEP.' },
  { nome: 'Gerenciador IFC', prioridade: 'P1', estado: 'no ar', sub: 'ifc', hoje: 'Lê IFC2x3/IFC4 no navegador, aponta referência quebrada, GlobalId repetido, elemento sem andar e falta de quantidades, e tira a lista de materiais em planilha.', falta: 'Visualização 3D, reparo automático e exportação para outros formatos.' },
  { nome: 'Detector de conflitos', prioridade: 'P1', estado: 'no ar', sub: 'conflitos', hoje: 'Cruzamentos e folgas entre disciplinas por caixas envolventes, com relatório por par de disciplinas. Conferido contra força bruta em 200 peças.', falta: 'Geometria exata das peças, leitura direta das caixas do IFC e sugestão de novo traçado.' },
  { nome: 'Colaboração BIM em tempo real', prioridade: 'P2', estado: 'no ar', sub: 'coordenacao', hoje: 'Mesa de coordenação: quem entra na mesma sala vê ao vivo quem está online e a mesma pauta de apontamentos (elemento, disciplinas, responsável, prazo, situação), com os conflitos detectados virando itens da pauta. Funciona sem internet e sincroniza ao voltar.', falta: 'Gravar a pauta no servidor por empresa, histórico de versões do modelo e visualização 3D partilhada.' },
  { nome: 'Estimativa de custo paramétrica', prioridade: 'P2', estado: 'no ar', sub: 'custo', hoje: 'Quantidade × preço, BDI, contingência, faixa AACE 18R-97, curva ABC, 7 moedas e planilha para baixar.', falta: 'Ligar às tabelas oficiais de preço de cada país e puxar quantidades direto do IFC e da treliça.' },
  { nome: 'Gerador de relatórios', prioridade: 'P2', estado: 'no ar', sub: 'portico', hoje: 'Memória de cálculo automática do pórtico e da treliça (modelo, reações, equilíbrio, deslocamentos, esforços, avisos), para baixar.', falta: 'Relatório em PDF com logotipo e assinatura, laudos e relatórios de medição no mesmo molde.' },
  { nome: 'App de inspeção de obra', prioridade: 'P3', estado: 'no ar', sub: 'inspecao', hoje: 'Listas de verificação para 7 serviços (fôrmas e armadura, concretagem, alvenaria, impermeabilização, hidráulica, elétrica, segurança), não conformidade com descrição obrigatória, fotos com hora e local, tudo guardado no aparelho sem internet, relatório e planilha para baixar.', falta: 'Enviar ao servidor da empresa para o escritório ver na hora e assinatura digital do responsável.' },
]

function Mapa({ ir }: { ir: (s: Sub) => void }) {
  return (
    <div className="space-y-3" data-testid="ferramentas-mapa">
      <p className="text-sm text-grafite-claro bg-white p-4 shadow-sm">As 8 ferramentas do Plano Master de Engenharia, todas funcionando aqui na versão que roda no navegador. Em cada uma está escrito o que vem na fase seguinte. {AVISO_ENGENHARIA}</p>
      <div className="grid md:grid-cols-2 gap-3">
        {OITO.map(f => (
          <article key={f.nome} className={`${caixa} text-sm space-y-1`}>
            <div className="flex justify-between items-start gap-2">
              <h3 className="text-navy font-medium">{f.nome}</h3>
              <span className={`text-xs px-2 py-0.5 whitespace-nowrap ${f.estado === 'no ar' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{f.prioridade} · {f.estado}</span>
            </div>
            <p><strong>Hoje:</strong> {f.hoje}</p>
            <p className="text-grafite-claro"><strong>Falta:</strong> {f.falta}</p>
            {f.sub && <button type="button" className={botao} onClick={() => ir(f.sub!)}>Abrir</button>}
          </article>
        ))}
      </div>
    </div>
  )
}

export default function FerramentasEngenharia() {
  const [sub, setSub] = useState<Sub>('mapa')
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Ferramentas de engenharia">
        {SUBS.map(s => <button key={s.id} type="button" role="tab" aria-selected={sub === s.id} title={s.dica} className={`text-sm px-3 py-1 border ${sub === s.id ? 'bg-navy text-white border-navy' : 'border-navy/30 text-navy bg-white'}`} onClick={() => setSub(s.id)}>{s.nome}</button>)}
      </div>
      {sub === 'mapa' && <Mapa ir={setSub} />}
      {sub === 'portico' && <Portico />}
      {sub === 'trelica' && <Trelica />}
      {sub === 'ifc' && <ArquivoIFC />}
      {sub === 'conflitos' && <Conflitos />}
      {sub === 'coordenacao' && <CoordenacaoBIM />}
      {sub === 'custo' && <Custo />}
      {sub === 'inspecao' && <InspecaoObra />}
    </div>
  )
}

export { OITO as FERRAMENTAS_PLANO }
