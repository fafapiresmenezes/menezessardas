import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ShieldCheck } from 'lucide-react'

// Auditoria instantânea: recalcula o SHA-256 do arquivo guardado e compara com o registrado;
// se o arquivo já foi selado, oferece a prova OpenTimestamps (Bitcoin) e o manifesto para conferência.
export default function BotaoAuditar({ tabela, id }: { tabela: 'documentos' | 'contratos'; id: string }) {
  const [r, setR] = useState<{ ok: boolean; texto: string; ots?: string; manifesto?: string; seloId?: number } | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const auditar = async () => {
    setOcupado(true)
    const { data, error } = await supabase.functions.invoke('selar-documentos', { body: { auditar: { tabela, id } } })
    setOcupado(false)
    const d = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
    if (!d || d.erro) return setR({ ok: false, texto: d?.erro ?? 'Não foi possível auditar agora.' })
    if (!d.hashRegistrado) return setR({ ok: false, texto: 'Arquivo ainda sem impressão digital: o selo é feito toda madrugada.' })
    if (!d.integro) return setR({ ok: false, texto: 'ALERTA: o arquivo guardado é diferente do registrado.' })
    setR({
      ok: true,
      texto: d.selo ? `Íntegro. Selado no Bitcoin (lote ${d.selo.id}, ${new Date(d.selo.criado_em).toLocaleString('pt-BR')}).` : 'Íntegro. O selo no Bitcoin sai na próxima madrugada.',
      ots: d.selo?.prova_ots, manifesto: d.selo?.manifesto, seloId: d.selo?.id,
    })
  }
  const baixar = (nome: string, conteudo: BlobPart, tipo: string) => {
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([conteudo], { type: tipo })); a.download = nome; a.click()
  }
  return (
    <span className="inline-flex flex-col items-end">
      <button onClick={auditar} disabled={ocupado} title="Auditar integridade" aria-label="Auditar integridade"
        className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-sm text-navy hover:bg-pergaminho disabled:opacity-50">
        <ShieldCheck size={17} aria-hidden="true" />
      </button>
      {r && (
        <span role="status" className={`text-xs max-w-xs text-right ${r.ok ? 'text-regular' : 'text-critico'}`}>
          {r.texto}
          {r.ots && r.manifesto && (
            <>
              {' '}<button className="underline" onClick={() => baixar(`lote-${r.seloId}.txt`, r.manifesto!, 'text/plain')}>manifesto</button>
              {' · '}<button className="underline" onClick={() => baixar(`lote-${r.seloId}.txt.ots`, Uint8Array.from(atob(r.ots!), c => c.charCodeAt(0)), 'application/octet-stream')}>prova .ots</button>
            </>
          )}
        </span>
      )}
    </span>
  )
}
