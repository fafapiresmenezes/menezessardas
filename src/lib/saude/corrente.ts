// Confere no navegador a corrente SHA-256 que lastreia os prompts dos consultores de saúde.
// Mesma regra do gerador (saude/ferramentas/gerar_saude.py) e do trilho do plano mestre:
// hash = sha256(anterior + json.dumps({n, id, sha256_instrucao, anterior}, ensure_ascii=False, sort_keys=True))
export interface ConsultorSaude { id: string; tipo: string; nome: string; especialidade: string | null; instrucao: string; elo: number; hash_elo: string }

async function sha256(txt: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt))
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
}

// json.dumps do Python com sort_keys e separadores padrão (", " e ": ").
export function eloComoPython(n: number, id: string, shaInstrucao: string, anterior: string): string {
  return `{"anterior": ${JSON.stringify(anterior)}, "id": ${JSON.stringify(id)}, "n": ${n}, "sha256_instrucao": ${JSON.stringify(shaInstrucao)}}`
}

export interface ResultadoCorrente { ok: boolean; conferidos: number; quebraEm: number | null; hashFinal: string }

export async function conferirCorrente(genese: string, consultores: ConsultorSaude[], hashFinalEsperado: string): Promise<ResultadoCorrente> {
  let anterior = genese
  for (let i = 0; i < consultores.length; i++) {
    const c = consultores[i]
    const shaInstr = await sha256(c.instrucao)
    const h = await sha256(anterior + eloComoPython(i + 1, c.id, shaInstr, anterior))
    if (h !== c.hash_elo) return { ok: false, conferidos: i, quebraEm: i + 1, hashFinal: anterior }
    anterior = h
  }
  return { ok: anterior === hashFinalEsperado, conferidos: consultores.length, quebraEm: null, hashFinal: anterior }
}
