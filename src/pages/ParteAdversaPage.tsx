import { FunctionRegion } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Layout from '@/components/Layout'
import Vazio from '@/components/Vazio'
import { supabase } from '@/lib/supabase'
import { registrarEvento } from '@/lib/trilha'
import { guardarNaBiblioteca } from '@/lib/biblioteca'
import { ExternalLink, FileSearch } from 'lucide-react'
import { irParaCampo } from '@/lib/foco'

// Bloco B03: ficha da parte adversa montada só com fontes públicas e oficiais, com finalidade e caso obrigatórios.
// Reaproveita as funções buscar-partes (Comunica PJe e Querido Diário) e kyc (Receita, sanções e conflito).
type Comunicacao = { data: string; tribunal: string; orgao: string; tipo: string; classe: string; numero: string; trecho: string; link?: string }
type Diario = { data: string; municipio: string; trecho: string; link?: string }
type Ficha = {
  comunica?: { ok: boolean; total?: number; itens?: Comunicacao[]; erro?: string }
  diarios?: { ok: boolean; total?: number; itens?: Diario[]; erro?: string }
  empresa?: { risco?: string; alertas?: string[]; receita?: { nome?: string; situacao?: string }; erro?: string }
}
type Salva = { id: number; parte: string; caso: string; finalidade: string; consultado_em: string; fontes: string[] }

export const REGRAS = 'Use só para preparar ou conduzir um processo, negociação ou contrato (LGPD, art. 7º, VI). A ficha junta apenas fontes públicas e oficiais. Não consulta redes sociais pessoais, não monta perfil psicológico, não usa imagem e não monitora a pessoa. Cada consulta fica registrada na Trilha com quem consultou, o caso e a finalidade.'

export default function ParteAdversaPage() {
  // A central de pesquisa abre /parte-adversa?parte=...&cnpj=... já preenchida.
  const [params] = useSearchParams()
  const [parte, setParte] = useState(() => params.get('parte') ?? '')
  const [cnpj, setCnpj] = useState(() => params.get('cnpj') ?? '')
  const [caso, setCaso] = useState('')
  const [finalidade, setFinalidade] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [ficha, setFicha] = useState<Ficha | null>(null)
  const [erro, setErro] = useState('')
  const [salvas, setSalvas] = useState<Salva[]>([])
  const carregar = () => supabase.from('fichas_parte_adversa').select('id,parte,caso,finalidade,consultado_em,fontes').order('consultado_em', { ascending: false }).limit(50)
    .then(({ data }) => setSalvas((data ?? []) as Salva[]))
  useEffect(() => { carregar() }, [])
  const doc = cnpj.replace(/\D/g, '')
  const pode = parte.trim().length >= 4 && caso.trim().length >= 3 && finalidade.trim().length >= 10 && (doc.length === 0 || doc.length === 14) && !carregando

  const consultar = async () => {
    setCarregando(true); setErro(''); setFicha(null)
    const [b, k] = await Promise.all([
      supabase.functions.invoke('buscar-partes', { body: { termo: parte.trim() }, region: FunctionRegion.SaEast1 }),
      doc.length === 14 ? supabase.functions.invoke('kyc', { body: { cnpj: doc } }) : Promise.resolve(null),
    ])
    setCarregando(false)
    if (b.error && !k) return setErro('As fontes públicas não responderam agora. Tente de novo em alguns minutos.')
    const f: Ficha = { comunica: b.data?.comunica, diarios: b.data?.queridoDiario, empresa: k ? (k.error ? { erro: 'Receita e sanções fora do ar agora.' } : k.data) : undefined }
    setFicha(f)
    const fontes = ['Comunica PJe (CNJ)', 'Querido Diário', ...(k ? ['Receita Federal', 'CEIS/CNEP/TCU'] : [])]
    const registro = await supabase.from('fichas_parte_adversa').insert({ parte: parte.trim(), documento: doc || null, caso: caso.trim(), finalidade: finalidade.trim(), fontes, resultado: f })
    // A consulta a dados de terceiro precisa ficar registrada (LGPD): se o registro falhar, avisamos.
    if (registro.error) setErro('A ficha abaixo foi montada, mas o registro da consulta não foi gravado. Tente de novo para deixar a finalidade registrada.')
    await registrarEvento({ tipo: 'parte_adversa_consultada', entidade: caso.trim(), resumo: `Ficha pública de ${parte.trim()} · finalidade: ${finalidade.trim()}` })
    const linhas = [...(f.comunica?.itens ?? []).slice(0, 20).map(c => `${c.data} · ${c.tribunal} · ${c.classe} · ${c.numero}`), ...(f.diarios?.itens ?? []).map(d => `${d.data} · ${d.municipio} · ${d.trecho.slice(0, 160)}`)]
    await guardarNaBiblioteca({ tipo: 'parte_adversa', titulo: `Parte adversa: ${parte.trim()}`, conteudo: `Finalidade: ${finalidade.trim()}\nFontes: ${fontes.join(', ')}\n\n${linhas.join('\n') || 'Nada encontrado nas fontes públicas.'}`, caso: caso.trim(), etiquetas: ['parte adversa'] })
    carregar()
  }

  return (
    <Layout title="Parte adversa">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-3">
          <p className="text-sm p-3 bg-navy/5 border-l-2 border-navy" data-testid="adversa-regras">{REGRAS}</p>
          <div className="grid md:grid-cols-2 gap-3">
            <label className="text-sm font-medium">Nome da parte adversa<input data-testid="adversa-parte" title="O nome exatamente como está no processo ou no contrato. Nome errado traz o levantamento de outra pessoa." value={parte} onChange={e => setParte(e.target.value)} className="mt-1 block w-full border px-3 py-2 min-h-[44px] font-normal" /></label>
            <label className="text-sm font-medium">CNPJ (se for empresa, opcional)<input title="Com o CNPJ o levantamento é certeiro: evita confundir empresas de nome parecido." value={cnpj} onChange={e => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="mt-1 block w-full border px-3 py-2 min-h-[44px] font-normal" /></label>
            <label className="text-sm font-medium">Caso ou contrato<input title="A que caso esta consulta pertence. Fica registrado junto, para a consulta ter dono e motivo." value={caso} onChange={e => setCaso(e.target.value)} className="mt-1 block w-full border px-3 py-2 min-h-[44px] font-normal" /></label>
            <label className="text-sm font-medium">Finalidade da consulta<input title="Por que o escritório precisa deste levantamento. Fica registrado: é o que justifica a consulta se alguém perguntar." value={finalidade} onChange={e => setFinalidade(e.target.value)} placeholder="Ex.: verificar outras ações de despejo antes da audiência" className="mt-1 block w-full border px-3 py-2 min-h-[44px] font-normal" /></label>
          </div>
          <button type="button" onClick={consultar} disabled={!pode} title="Consulta as fontes públicas (Comunica PJe, Querido Diário e, com CNPJ, Receita e sanções) e monta a ficha da parte adversa, registrando a consulta na Trilha" className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50 inline-flex items-center gap-2"><FileSearch className="w-4 h-4" aria-hidden />{carregando ? 'Consultando fontes públicas…' : 'Montar ficha'}</button>
          {erro && <p role="alert" className="p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{erro}</p>}
        </section>
        {ficha && (
          <section className="bg-white shadow-sm p-6 space-y-4" aria-live="polite" data-testid="adversa-ficha">
            <h2 className="font-serif text-xl">Ficha pública de {parte.trim()}</h2>
            {ficha.empresa && <div><h3 className="font-medium">Empresa</h3>{ficha.empresa.erro ? <p className="text-sm">{ficha.empresa.erro}</p> : <p className="text-sm" data-testid="adversa-empresa">{ficha.empresa.receita?.nome ?? 'CNPJ'} · {ficha.empresa.receita?.situacao ?? 'situação não informada'} · risco {ficha.empresa.risco}{ficha.empresa.alertas?.length ? `: ${ficha.empresa.alertas.join(' ')}` : ''}</p>}</div>}
            <div>
              <h3 className="font-medium">Comunicações processuais no último ano (Comunica PJe)</h3>
              {!ficha.comunica?.ok ? <p className="text-sm">Fonte fora do ar agora ({ficha.comunica?.erro ?? 'sem resposta'}).</p>
                : !ficha.comunica.itens?.length ? <p className="text-sm">Nenhuma comunicação encontrada com esse nome.</p>
                : <ul className="text-sm divide-y" data-testid="adversa-comunica">{ficha.comunica.itens.slice(0, 20).map((c, i) => <li key={i} className="py-1">{new Date(c.data + 'T12:00').toLocaleDateString('pt-BR')} · {c.tribunal} · {c.classe} · {c.numero}{c.link && <a href={c.link} target="_blank" rel="noreferrer" title="Abre a comunicação original no site do tribunal, em outra aba" className="ml-1 text-navy underline inline-flex items-center gap-1">abrir<ExternalLink className="w-3 h-3" aria-hidden /></a>}</li>)}</ul>}
              {ficha.comunica?.ok && <p className="text-xs text-grafite-claro mt-1">Nomes iguais podem ser de outras pessoas: confira o número do processo antes de usar.</p>}
            </div>
            <div>
              <h3 className="font-medium">Diários oficiais municipais (Querido Diário)</h3>
              {!ficha.diarios?.ok ? <p className="text-sm">Fonte fora do ar agora.</p>
                : !ficha.diarios.itens?.length ? <p className="text-sm">Nada encontrado.</p>
                : <ul className="text-sm divide-y">{ficha.diarios.itens.map((d, i) => <li key={i} className="py-1">{d.data} · {d.municipio} · {d.trecho.slice(0, 160)}</li>)}</ul>}
            </div>
          </section>
        )}
        <section className="bg-white shadow-sm p-6" data-testid="adversa-salvas">
          <h2 className="font-serif text-xl mb-2">Consultas registradas</h2>
          {salvas.length === 0 ? <Vazio testid="adversa-vazio" titulo="Nenhuma ficha montada ainda" texto="Preencha o nome da parte contrária, o caso e a finalidade e clique em Montar ficha: ela fica guardada aqui." acao={{ rotulo: 'Montar a primeira ficha', onClick: () => irParaCampo('[data-testid="adversa-parte"]'), dica: 'Leva o cursor ao campo do nome da parte adversa' }} /> : (
            <ul className="divide-y divide-navy/10 text-sm">{salvas.map(s => <li key={s.id} className="py-2" data-testid="adversa-item"><strong>{s.parte}</strong> · {s.caso} · {new Date(s.consultado_em).toLocaleDateString('pt-BR')}<p className="text-grafite-claro">Finalidade: {s.finalidade}</p></li>)}</ul>
          )}
        </section>
      </div>
    </Layout>
  )
}
