import { useCallback, useEffect, useState } from 'react'
import { FunctionRegion } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { situacaoCnj } from '@/lib/escritorio/conexaoCnj'

const COR = { ok: 'border-green-600 bg-green-50', atrasada: 'border-amber-500 bg-amber-50', falha: 'border-red-600 bg-red-50', sem_dados: 'border-grafite-claro bg-pergaminho' } as const
const ROTULO = { ok: 'Conectado', atrasada: 'Atrasada', falha: 'Atenção', sem_dados: 'Sem registro' } as const

/** Painel do administrador: a conexão com o CNJ está em dia? Mostra a última consulta e permite testar na hora. */
export default function ConexaoCnj({ aoTestar }: { aoTestar?: (ok: boolean) => void }) {
  const [valor, setValor] = useState<string | null>(null)
  const [teste, setTeste] = useState<{ ok: boolean; texto: string } | null>(null)
  const [testando, setTestando] = useState(false)
  const ler = useCallback(async () => {
    try {
      const { data } = await supabase.from('configuracoes').select('valor').eq('chave', 'cnj_ultima_consulta').maybeSingle()
      setValor(data?.valor ? String(data.valor) : null)
    } catch { /* sem permissão ou sem rede: mostra "sem registro" */ }
  }, [])
  useEffect(() => { ler() }, [ler])
  const s = situacaoCnj(valor)
  const testar = async () => {
    setTestando(true); setTeste(null)
    let deu = false
    try {
      const { data, error } = await supabase.functions.invoke('intimacoes', { body: { teste: true }, region: FunctionRegion.SaEast1 })
      if (error || !data || typeof data.conexao !== 'boolean') setTeste({ ok: false, texto: 'Não consegui falar com o servidor da plataforma. A função "intimacoes" precisa estar implantada e atualizada no Supabase.' })
      else { deu = data.conexao; setTeste(data.conexao ? { ok: true, texto: 'O CNJ respondeu agora: a conexão está funcionando.' } : { ok: false, texto: `O CNJ não respondeu agora (código ${data.status ?? 'sem resposta'}). A plataforma tenta de novo sozinha a cada 4 horas.` }) }
    } catch { setTeste({ ok: false, texto: 'Não consegui falar com o servidor da plataforma agora.' }) }
    setTestando(false); aoTestar?.(deu); ler()
  }
  return (
    <div className={`border-l-4 p-3 text-sm flex flex-wrap items-center gap-3 ${COR[s.situacao]}`} data-testid="conexao-cnj" data-situacao={s.situacao}>
      <span className="font-medium">{ROTULO[s.situacao]}</span>
      <span className="flex-1 min-w-[14rem]">{s.texto}</span>
      <button type="button" onClick={testar} disabled={testando} data-testid="testar-conexao-cnj" title="Pergunta agora ao site do CNJ (DataJud) se a ligação está funcionando. Se responder, o robô consegue baixar os processos." className="min-h-[44px] px-4 border border-navy/30 text-navy text-sm disabled:opacity-50">{testando ? 'Testando…' : 'Testar conexão agora'}</button>
      {teste && <p role={teste.ok ? 'status' : 'alert'} className={`basis-full text-xs ${teste.ok ? 'text-green-800' : 'text-critico'}`} data-testid="resultado-teste-cnj">{teste.texto}</p>}
    </div>
  )
}
