import { useState } from 'react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { Gavel, ExternalLink } from 'lucide-react'

interface Perfil {
  resumo: string
  tendencias: string[]
  temas: string[]
  comoArgumentar: string[]
  cuidados: string[]
  confianca: 'alta' | 'media' | 'baixa'
  estatisticas: null | {
    processos: number
    classes: { nome: string; total: number }[]
    assuntos: { nome: string; total: number }[]
    resultados: { nome: string; total: number }[]
    porAno: { ano: string; total: number }[]
  }
  noticias: { titulo: string; link: string; fonte: string; data: string }[]
  tribunal: string
  orgao: string
  nome: string
  geradoEm: string
}

const TRIBUNAIS = [
  { valor: 'tjrj', rotulo: 'TJRJ' }, { valor: 'tjsp', rotulo: 'TJSP' }, { valor: 'tjmg', rotulo: 'TJMG' },
  { valor: 'tjes', rotulo: 'TJES' }, { valor: 'stj', rotulo: 'STJ' }, { valor: 'trf2', rotulo: 'TRF2' },
]

const EXEMPLO: Perfil = {
  resumo: 'Exemplo da demonstração. O órgão julga sobretudo procedimentos comuns cíveis e execuções, com volume estável nos últimos anos; nas sentenças com resultado registrado, a procedência parcial é frequente.',
  tendencias: ['Procedência parcial em cerca de 40% das sentenças com resultado registrado.', 'Execuções de título extrajudicial são a segunda classe mais comum.'],
  temas: ['Locação de imóvel', 'Despejo por falta de pagamento', 'Condomínio em edifício'],
  comoArgumentar: ['Pedidos escalonados (principal e subsidiário) aproveitam a tendência de procedência parcial.', 'Instruir desde a inicial com planilha de débito e comprovantes.'],
  cuidados: ['Os dados do DataJud não identificam o magistrado, só o órgão.', 'Manchetes não substituem a leitura das decisões.'],
  confianca: 'media',
  estatisticas: { processos: 18240, classes: [{ nome: 'Procedimento Comum Cível', total: 9100 }, { nome: 'Execução de Título Extrajudicial', total: 4200 }, { nome: 'Despejo por Falta de Pagamento', total: 1800 }], assuntos: [{ nome: 'Locação de Imóvel', total: 2600 }, { nome: 'Despesas Condominiais', total: 1900 }], resultados: [{ nome: 'Procedência', total: 2100 }, { nome: 'Procedência em parte', total: 2400 }, { nome: 'Improcedência', total: 1500 }], porAno: [{ ano: '2022', total: 3100 }, { ano: '2023', total: 3300 }, { ano: '2024', total: 3400 }, { ano: '2025', total: 3600 }] },
  noticias: [], tribunal: 'TJRJ', orgao: '10ª Vara Cível da Comarca da Capital', nome: '', geradoEm: new Date().toISOString(),
}

const ROTULO_CONFIANCA = { alta: 'Dados sólidos', media: 'Dados parciais', baixa: 'Dados escassos' }

function Barras({ titulo, itens }: { titulo: string; itens: { nome: string; total: number }[] }) {
  if (!itens.length) return null
  const max = Math.max(...itens.map(i => i.total))
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">{titulo}</p>
      <ul className="space-y-1">
        {itens.slice(0, 6).map(i => (
          <li key={i.nome} className="text-xs flex items-center gap-2">
            <span className="w-44 truncate text-grafite" title={i.nome}>{i.nome}</span>
            <span className="flex-1 h-2 bg-navy/10"><span className="block h-2 bg-navy/60" style={{ width: `${(i.total / max) * 100}%` }} /></span>
            <span className="w-14 text-right text-grafite-claro">{i.total.toLocaleString('pt-BR')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Perfil decisório do órgão julgador e do magistrado, só com dados públicos (DataJud e imprensa). */
export default function PerfilJulgador() {
  const [nome, setNome] = useState('')
  const [orgao, setOrgao] = useState('')
  const [tribunal, setTribunal] = useState('tjrj')
  const [tema, setTema] = useState('')
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  const gerar = async () => {
    if (!nome.trim() && !orgao.trim()) { setErro('Informe o nome do julgador ou o órgão (vara ou câmara).'); return }
    setOcupado(true); setErro('')
    try {
      if (!supabaseConfigurado) { setPerfil({ ...EXEMPLO, nome, orgao: orgao || EXEMPLO.orgao }); return }
      const { data, error } = await supabase.functions.invoke('perfil-julgador', { body: { nome, orgao, tribunal, tema } })
      if (error) throw new Error(error.message)
      if (data?.erro) throw new Error(data.erro)
      setPerfil(data as Perfil)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível montar o perfil agora.')
    } finally { setOcupado(false) }
  }

  const campo = 'w-full min-h-[44px] border border-navy/15 px-3 text-sm focus:outline-none focus:border-dourado'

  return (
    <section className="bg-white p-6 shadow-sm" aria-labelledby="titulo-julgador">
      <h3 id="titulo-julgador" className="text-lg mb-1 flex items-center gap-2"><Gavel size={18} aria-hidden="true" /> Perfil do julgador</h3>
      <p className="text-sm text-grafite-claro mb-4">
        Padrão decisório do órgão (estatísticas públicas do DataJud/CNJ) e notícias sobre o magistrado, com sugestões de como argumentar no seu tema.
        Só dados públicos: não é perfil psicológico. A consulta ao CNJ leva de 15 a 40 segundos.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="pj-nome" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Nome do juiz ou desembargador</label>
          <input id="pj-nome" value={nome} onChange={e => setNome(e.target.value)} className={campo} placeholder="Ex.: Maria da Silva" />
        </div>
        <div>
          <label htmlFor="pj-orgao" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Órgão julgador (vara ou câmara)</label>
          <input id="pj-orgao" value={orgao} onChange={e => setOrgao(e.target.value)} className={campo} placeholder="Ex.: 10ª Vara Cível" />
        </div>
        <div>
          <label htmlFor="pj-tribunal" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Tribunal</label>
          <select id="pj-tribunal" value={tribunal} onChange={e => setTribunal(e.target.value)} className={campo}>
            {TRIBUNAIS.map(t => <option key={t.valor} value={t.valor}>{t.rotulo}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="pj-tema" className="block text-xs uppercase tracking-wider text-grafite-claro mb-1">Tema do caso (opcional)</label>
          <input id="pj-tema" value={tema} onChange={e => setTema(e.target.value)} className={campo} placeholder="Ex.: despejo por falta de pagamento" />
        </div>
      </div>
      <button onClick={gerar} disabled={ocupado} className="mt-3 inline-flex items-center gap-2 bg-navy text-white min-h-[44px] px-5 rounded-sm uppercase tracking-wider text-sm disabled:opacity-50">
        {ocupado ? 'Consultando o CNJ e a imprensa…' : 'Montar perfil'}
      </button>
      {erro && <p role="alert" className="text-sm text-critico mt-3">{erro}</p>}

      {perfil && (
        <div className="mt-6 space-y-4 border-t border-navy/10 pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-serif text-xl text-navy">{perfil.nome || perfil.orgao} · {perfil.tribunal}</p>
            <span className="text-xs uppercase tracking-wider text-grafite-claro">{ROTULO_CONFIANCA[perfil.confianca]}</span>
          </div>
          <p className="text-sm text-grafite">{perfil.resumo}</p>
          {perfil.estatisticas && (
            <div className="grid gap-4 md:grid-cols-2">
              <Barras titulo={`Classes mais comuns (${perfil.estatisticas.processos.toLocaleString('pt-BR')} processos)`} itens={perfil.estatisticas.classes} />
              <Barras titulo="Assuntos mais comuns" itens={perfil.estatisticas.assuntos} />
              <Barras titulo="Resultados de sentença registrados" itens={perfil.estatisticas.resultados} />
              <Barras titulo="Processos ajuizados por ano" itens={perfil.estatisticas.porAno.map(a => ({ nome: a.ano, total: a.total }))} />
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Tendências observadas</p>
              <ul className="list-disc pl-5 text-sm text-grafite space-y-1">{perfil.tendencias.map(t => <li key={t}>{t}</li>)}</ul>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Como argumentar</p>
              <ul className="list-disc pl-5 text-sm text-grafite space-y-1">{perfil.comoArgumentar.map(t => <li key={t}>{t}</li>)}</ul>
            </div>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Cuidados e limites dos dados</p>
            <ul className="list-disc pl-5 text-sm text-atencao space-y-1">{perfil.cuidados.map(t => <li key={t}>{t}</li>)}</ul>
          </div>
          {perfil.noticias.length > 0 && (
            <div>
              <p className="text-xs uppercase tracking-wider text-grafite-claro mb-1">Na imprensa</p>
              <ul className="space-y-1">
                {perfil.noticias.slice(0, 6).map(n => (
                  <li key={n.link} className="text-sm">
                    <a href={n.link} target="_blank" rel="noreferrer" className="text-navy underline decoration-dourado inline-flex items-center gap-1">{n.titulo} <ExternalLink size={12} aria-hidden="true" /></a>
                    <span className="text-xs text-grafite-claro"> · {n.fonte}{n.data ? ` · ${n.data}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
