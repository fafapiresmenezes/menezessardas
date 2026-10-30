import { useEffect, useState } from 'react'
import { ClipboardCheck } from 'lucide-react'
import { supabase, supabaseConfigurado } from '../lib/supabase'

// System Usability Scale (Brooke, 1986): 10 afirmações, escala 1–5; nota de 0 a 100. Média de 68 é o ponto de corte do mercado.
const ITENS = [
  'Eu usaria este sistema com frequência.',
  'Achei o sistema desnecessariamente complexo.',
  'Achei o sistema fácil de usar.',
  'Eu precisaria do apoio de uma pessoa técnica para usar este sistema.',
  'As funções do sistema estão bem integradas.',
  'Há muita inconsistência no sistema.',
  'A maioria das pessoas aprenderia a usar este sistema rapidamente.',
  'Achei o sistema muito complicado de usar.',
  'Senti-me confiante usando o sistema.',
  'Precisei aprender muitas coisas antes de conseguir usar o sistema.',
]
export function notaSUS(r: number[]): number {
  return r.reduce((s, v, i) => s + (i % 2 === 0 ? v - 1 : 5 - v), 0) * 2.5
}

export default function AvaliacaoSUS() {
  const [r, setR] = useState<number[]>(Array(10).fill(0))
  const [msg, setMsg] = useState('')
  const [media, setMedia] = useState<{ media: number; n: number } | null>(null)

  const carregar = async () => {
    if (!supabaseConfigurado) return
    const { data } = await supabase.rpc('media_sus')
    const d = Array.isArray(data) ? data[0] : data
    if (d && Number(d.n) > 0) setMedia({ media: Number(d.media), n: Number(d.n) })
  }
  useEffect(() => { carregar() }, [])

  const enviar = async () => {
    if (r.some(v => !v)) { setMsg('Responda as 10 afirmações.'); return }
    const nota = notaSUS(r)
    if (supabaseConfigurado) {
      const { error } = await supabase.from('avaliacoes_sus').insert({ respostas: r, nota })
      if (error) { setMsg('Não foi possível guardar: ' + error.message); return }
    }
    setMsg(`Obrigado. Sua nota: ${nota} de 100.`); setR(Array(10).fill(0)); await carregar()
  }

  return (
    <section aria-labelledby="sus" className="max-w-2xl mt-6 bg-white p-6 shadow-sm border-t-2 border-dourado" data-testid="avaliacao-sus">
      <h2 id="sus" className="text-lg mb-1 flex items-center gap-2"><ClipboardCheck size={18} className="text-dourado" aria-hidden="true" /> Avalie a plataforma (2 minutos)</h2>
      <p className="text-sm text-grafite-claro mb-3">Questionário padrão de usabilidade (SUS). 1 = discordo totalmente, 5 = concordo totalmente. Anônimo para a equipe; só a média aparece.
        {media && <> Média atual do escritório: <strong data-testid="media-sus">{media.media.toFixed(0)}</strong> de 100 ({media.n} {media.n === 1 ? 'resposta' : 'respostas'}; mercado: 68).</>}</p>
      <ol className="space-y-2">
        {ITENS.map((t, i) => (
          <li key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
            <span className="flex-1">{i + 1}. {t}</span>
            <div role="radiogroup" aria-label={`Afirmação ${i + 1}`} className="flex gap-1">
              {[1, 2, 3, 4, 5].map(v => (
                <button key={v} type="button" role="radio" aria-checked={r[i] === v} aria-label={`${v}`} onClick={() => setR(r.map((x, j) => (j === i ? v : x)))}
                  className={`min-w-[40px] min-h-[40px] border text-sm ${r[i] === v ? 'bg-navy text-white' : 'bg-white'}`}>{v}</button>
              ))}
            </div>
          </li>
        ))}
      </ol>
      <button data-testid="enviar-sus" onClick={enviar} className="mt-4 bg-navy text-white px-5 py-2.5 rounded-sm uppercase tracking-wider text-sm">Enviar avaliação</button>
      {msg && <p role="status" className="text-sm mt-3">{msg}</p>}
    </section>
  )
}
