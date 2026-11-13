import { useEffect, useState } from 'react'
import Layout from '@/components/Layout'
import Vazio from '@/components/Vazio'
import { supabase } from '@/lib/supabase'
import { PERGUNTAS, avaliarPerfil, type Respostas, type ResultadoPerfil } from '@/lib/perfilCliente'
import { filtrarPorCriador, meuAlcance, type Cargo } from '@/lib/hierarquia'
import { ClipboardList, Trash2 } from 'lucide-react'
import { irParaCampo } from '@/lib/foco'

// Bloco B02: perfil de atendimento do cliente, preenchido com o cliente e só com o consentimento dele (termo B01).
// Privacidade (pedido do M, 12/11/2026): cada pessoa só vê os perfis que ela mesma cadastrou; sócio(a) e gestor(a) veem tudo.
type Salvo = { id: number; cliente_nome: string; criado_em: string; apagar_em: string; resultado: ResultadoPerfil; criado_por?: string | null }

export const TERMO = 'O cliente leu e aceitou o termo "Perfil de atendimento" (versão B01-2026-11-06): as respostas servem só para adaptar a comunicação e o atendimento; nada de gravação, imagem, rosto ou voz; nenhuma pergunta sensível; pode ver, corrigir ou apagar a qualquer momento; recusar não muda o serviço.'

export default function PerfilClientePage() {
  const [nome, setNome] = useState('')
  const [aceite, setAceite] = useState(false)
  const [respostas, setRespostas] = useState<Respostas>({})
  const [msg, setMsg] = useState<{ ok?: string; erro?: string }>({})
  const [salvos, setSalvos] = useState<Salvo[]>([])
  const [alcance, setAlcance] = useState<{ id: string; cargo: Cargo | null; admin: boolean; veTudo: boolean } | null>(null)
  const carregar = () => supabase.from('perfis_cliente').select('id,cliente_nome,criado_em,apagar_em,resultado,criado_por').order('criado_em', { ascending: false }).limit(100)
    .then(({ data }) => setSalvos((data ?? []) as Salvo[]))
  useEffect(() => { carregar(); meuAlcance().then(setAlcance) }, [])
  const visiveis = alcance ? filtrarPorCriador(salvos, alcance) : salvos
  const resultado = avaliarPerfil(respostas)
  const podeSalvar = aceite && nome.trim().length >= 2 && resultado.respondidas > 0

  const salvar = async () => {
    setMsg({})
    const { error } = await supabase.from('perfis_cliente').insert({ cliente_nome: nome.trim(), consentimento_em: new Date().toISOString(), respostas, resultado })
    if (error) return setMsg({ erro: 'Não foi possível guardar agora. O perfil continua na tela; tente de novo em instantes.' })
    setMsg({ ok: `Perfil de ${nome.trim()} guardado. Ele será apagado automaticamente em 2 anos ou antes, se o cliente pedir.` })
    setNome(''); setAceite(false); setRespostas({}); carregar()
  }
  const apagar = async (s: Salvo) => {
    if (!window.confirm(`Apagar o perfil de ${s.cliente_nome}? Isso não pode ser desfeito.`)) return
    const { error } = await supabase.from('perfis_cliente').delete().eq('id', s.id)
    if (error) return setMsg({ erro: 'Não foi possível apagar. Tente de novo.' })
    setMsg({ ok: `Perfil de ${s.cliente_nome} apagado.` }); carregar()
  }

  return (
    <Layout title="Perfil do cliente">
      <div className="space-y-6">
        <section className="bg-white shadow-sm border-t-2 border-dourado p-6 space-y-4">
          <p className="text-sm text-grafite-claro">Preencha junto com o cliente. São 12 perguntas sobre como ele prefere ser atendido. Não é avaliação de caráter, não usa câmera e não decide nada sozinho.</p>
          <label htmlFor="cliente" className="block font-medium">Nome do cliente</label>
          <input id="cliente" value={nome} onChange={e => setNome(e.target.value)} className="border px-3 py-2 min-h-[44px] w-full max-w-md" />
          <label className="flex items-start gap-2 text-sm" data-testid="perfil-aceite">
            <input type="checkbox" checked={aceite} onChange={e => setAceite(e.target.checked)} className="mt-1 w-5 h-5 shrink-0" />
            <span>{TERMO}</span>
          </label>
        </section>
        <fieldset disabled={!aceite} className="bg-white shadow-sm p-6 space-y-5 disabled:opacity-50" data-testid="perfil-perguntas">
          <legend className="font-serif text-xl flex items-center gap-2"><ClipboardList className="w-5 h-5 text-dourado" aria-hidden />Perguntas</legend>
          {!aceite && <p className="text-sm text-atencao">Marque o consentimento acima para liberar as perguntas.</p>}
          {PERGUNTAS.map((p, i) => (
            <div key={p.id} role="radiogroup" aria-label={p.texto}>
              <p className="font-medium text-sm mb-1">{i + 1}. {p.texto}</p>
              <div className="flex flex-wrap gap-2">
                {p.opcoes.map(o => (
                  <label key={o.valor} className={`min-h-[44px] px-3 py-2 border text-sm cursor-pointer inline-flex items-center gap-2 ${respostas[p.id] === o.valor ? 'border-navy bg-navy/5' : 'border-navy/20'}`}>
                    <input type="radio" name={p.id} value={o.valor} checked={respostas[p.id] === o.valor} onChange={() => setRespostas(r => ({ ...r, [p.id]: o.valor }))} />{o.rotulo}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </fieldset>
        {resultado.respondidas > 0 && (
          <section className="bg-white shadow-sm p-6 space-y-3" aria-live="polite" data-testid="perfil-resultado">
            <h2 className="font-serif text-xl">Como atender este cliente</h2>
            <p className="text-xs text-grafite-claro">{resultado.respondidas} de {PERGUNTAS.length} perguntas respondidas.</p>
            {resultado.resumo.length > 0 && <ul className="text-sm list-disc pl-5">{resultado.resumo.map(t => <li key={t}>{t}</li>)}</ul>}
            {resultado.sugestoes.length > 0 && <><h3 className="font-medium text-sm">Sugestões para a equipe</h3><ul className="text-sm list-disc pl-5" data-testid="perfil-sugestoes">{resultado.sugestoes.map(t => <li key={t}>{t}</li>)}</ul></>}
            <button type="button" onClick={salvar} disabled={!podeSalvar} title="Guarda o perfil de atendimento deste cliente; ele é apagado automaticamente em 2 anos ou antes, se o cliente pedir" className="min-h-[44px] bg-navy text-white px-5 text-sm uppercase tracking-wider disabled:opacity-50">Guardar perfil</button>
          </section>
        )}
        {msg.ok && <p role="status" className="p-3 text-sm border-l-2 border-green-700 bg-green-50">{msg.ok}</p>}
        {msg.erro && <p role="alert" className="p-3 text-sm border-l-2 bg-criticoFundo border-critico text-critico">{msg.erro}</p>}
        <section className="bg-white shadow-sm p-6" data-testid="perfil-salvos">
          <h2 className="font-serif text-xl mb-2">Perfis guardados</h2>
          {visiveis.length === 0 ? <Vazio testid="perfil-vazio" titulo="Nenhum perfil guardado ainda" texto="Com o consentimento do cliente, escreva o nome, responda as perguntas e clique em Guardar perfil." acao={{ rotulo: 'Montar o primeiro perfil', onClick: () => irParaCampo('#cliente'), dica: 'Leva o cursor ao campo do nome do cliente' }} /> : (
            <ul className="divide-y divide-navy/10 text-sm">
              {visiveis.map(s => (
                <li key={s.id} className="py-2 flex flex-wrap items-start gap-2" data-testid="perfil-item">
                  <div className="flex-1 min-w-[200px]"><strong>{s.cliente_nome}</strong> · {new Date(s.criado_em).toLocaleDateString('pt-BR')} · apaga em {new Date(s.apagar_em).toLocaleDateString('pt-BR')}
                    <p className="text-grafite-claro">{s.resultado?.sugestoes?.slice(0, 2).join(' ')}</p></div>
                  <button type="button" onClick={() => apagar(s)} className="min-h-[44px] px-3 border border-critico text-critico inline-flex items-center gap-1" aria-label={`Apagar perfil de ${s.cliente_nome}`} title={`Apaga definitivamente o perfil de ${s.cliente_nome}, após confirmação; não pode ser desfeito`}><Trash2 className="w-4 h-4" aria-hidden />Apagar</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Layout>
  )
}
