import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { TERMOS_TEXTO, TERMOS_VERSAO, hashTermos } from '@/lib/termos'

// Passo 09: no primeiro acesso (ou em nova versão dos termos) a pessoa precisa ler e aceitar.
// O aceite grava data, versão e hash em aceites_termos; sem aceitar, a tela fica coberta.
export default function AceiteTermos() {
  const [pendente, setPendente] = useState(false)
  const [lido, setLido] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  useEffect(() => {
    if (!supabaseConfigurado) return
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: aceite } = await supabase.from('aceites_termos').select('id').eq('usuario_id', data.user.id).eq('versao', TERMOS_VERSAO).maybeSingle()
      setPendente(!aceite)
    }).catch(() => undefined)
  }, [])
  if (!pendente) return null
  async function aceitar() {
    setSalvando(true); setErro('')
    const { error } = await supabase.rpc('aceitar_termos', { p_versao: TERMOS_VERSAO, p_hash: await hashTermos(), p_navegador: navigator.userAgent })
    setSalvando(false)
    if (error) setErro('Não deu para gravar o aceite: ' + error.message)
    else setPendente(false)
  }
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="t-termos" data-testid="aceite-termos" className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 p-4">
      <div className="max-w-2xl w-full bg-white dark:bg-grafite shadow-xl p-6 md:p-8 max-h-[90vh] flex flex-col">
        <div className="flex items-center gap-3 mb-3">
          <ShieldCheck className="text-dourado-escuro" size={28} aria-hidden="true" />
          <h2 id="t-termos" className="font-serif text-2xl">Termos de uso e privacidade</h2>
        </div>
        <p className="text-sm text-grafite-claro mb-3">Antes do primeiro uso, leia e aceite. Versão {TERMOS_VERSAO}. O aceite fica registrado com data e impressão digital do texto.</p>
        <pre className="flex-1 overflow-auto whitespace-pre-wrap text-xs leading-relaxed border border-navy/10 bg-pergaminho/60 p-4 font-sans" tabIndex={0}>{TERMOS_TEXTO}</pre>
        <label className="flex items-center gap-2 mt-4 text-sm">
          <input type="checkbox" checked={lido} onChange={e => setLido(e.target.checked)} data-testid="termos-lido" className="h-5 w-5" />
          Li e aceito os termos de uso e o aviso de privacidade.
        </label>
        {erro && <p role="alert" className="text-sm text-critico mt-2">{erro}</p>}
        <div className="flex flex-wrap gap-3 mt-4">
          <button type="button" disabled={!lido || salvando} onClick={aceitar} data-testid="aceitar-termos" className="min-h-[44px] px-5 bg-navy text-white text-sm disabled:opacity-50">{salvando ? 'Gravando…' : 'Aceitar e continuar'}</button>
          <button type="button" onClick={() => supabase.auth.signOut().then(() => window.location.assign('#/'))} className="min-h-[44px] px-5 border border-navy/30 text-sm">Não aceito (sair)</button>
        </div>
      </div>
    </div>
  )
}
