import { supabase } from './supabase'

/**
 * Leitura da casa de Águas (fase 3, 19/11/2026): o último número medido de rios, outorgas e
 * barragens, já somado no servidor (função agua-leitura). Nada de previsão.
 * O Postgres devolve número decimal como texto; aqui tudo vira number ou null.
 */
export interface Rio { estacao: string; uf: string | null; municipio: string | null; nome: string; dia: string; chuva_mm: number | null; nivel_cm: number | null; vazao_m3s: number | null }
export interface LeituraAguas {
  rios: { estacoes: number; linhas: Rio[]; fonte: string }
  outorgas: { dia: string; porFinalidade: { finalidade: string; n: number; volume_m3: number | null }[]; porUf: { uf: string | null; n: number }[]; fonte: string } | null
  barragens: { dia: string; porClasse: { risco: string | null; dano: string | null; n: number }[]; porUf: { uf: string | null; n: number; alto_alto: number | null }[]; fonte: string } | null
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

export function normalizar(d: Record<string, any>): LeituraAguas {
  return {
    rios: {
      estacoes: num(d?.rios?.estacoes) ?? 0,
      fonte: String(d?.rios?.fonte ?? ''),
      linhas: (d?.rios?.linhas ?? []).map((r: Record<string, unknown>) => ({
        estacao: String(r.estacao), uf: (r.uf as string) ?? null, municipio: (r.municipio as string) ?? null,
        nome: String(r.nome ?? r.estacao), dia: String(r.dia), chuva_mm: num(r.chuva_mm), nivel_cm: num(r.nivel_cm), vazao_m3s: num(r.vazao_m3s),
      })),
    },
    outorgas: d?.outorgas ? {
      dia: String(d.outorgas.dia), fonte: String(d.outorgas.fonte ?? ''),
      porFinalidade: (d.outorgas.porFinalidade ?? []).map((x: Record<string, unknown>) => ({ finalidade: String(x.finalidade), n: num(x.n) ?? 0, volume_m3: num(x.volume_m3) })),
      porUf: (d.outorgas.porUf ?? []).map((x: Record<string, unknown>) => ({ uf: (x.uf as string) ?? null, n: num(x.n) ?? 0 })),
    } : null,
    barragens: d?.barragens ? {
      dia: String(d.barragens.dia), fonte: String(d.barragens.fonte ?? ''),
      porClasse: (d.barragens.porClasse ?? []).map((x: Record<string, unknown>) => ({ risco: (x.risco as string) ?? null, dano: (x.dano as string) ?? null, n: num(x.n) ?? 0 })),
      porUf: (d.barragens.porUf ?? []).map((x: Record<string, unknown>) => ({ uf: (x.uf as string) ?? null, n: num(x.n) ?? 0, alto_alto: num(x.alto_alto) })),
    } : null,
  }
}

export async function lerAguas(): Promise<LeituraAguas> {
  const { data, error } = await supabase.functions.invoke('agua-leitura', { body: {} })
  if (error || data?.erro) throw new Error('Não consegui buscar os números de Águas agora.')
  return normalizar(data)
}

export const total = (l: { n: number }[]) => l.reduce((s, x) => s + x.n, 0)
export const numeroBr = (n: number | null, casas = 0) => n === null ? '—' : n.toLocaleString('pt-BR', { maximumFractionDigits: casas, minimumFractionDigits: casas })
export const dataBr = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`
