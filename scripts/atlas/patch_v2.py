import json, collections, re
BASE = "/mnt/project-files/engenharia/plano-agentes/atlas/"
TS = "/home/user/menezessardas/src/data/agentesEngenharia.ts"
NOMES = {
 "estruturas-betao": "Estruturas de betão armado e pré-esforçado",
 "estruturas-aco": "Estruturas metálicas e mistas",
 "geotecnia": "Geotecnia e fundações",
 "hidraulica-recursos-hidricos": "Hidráulica e recursos hídricos",
 "saneamento": "Saneamento e tratamento de água",
 "transportes-pavimentos": "Transportes e pavimentos",
 "ambiental-licenciamento": "Ambiental e licenciamento",
 "electrotecnia-energia": "Electrotecnia e energia",
 "mecanica-instalacoes": "Mecânica e instalações",
 "materiais-betao": "Materiais de construção",
 "gestao-construcao-custos": "Gestão da construção e custos",
 "petroleo-gas": "Petróleo e gás",
 "minas-barragens": "Minas e barragens de rejeitos",
 "sistemas-dados-construcao": "Sistemas, dados e IA na construção",
}
# --- corpus classificado (v1 + v2, sem repetidos) ---
tot = collections.Counter(); guard = collections.Counter()
fontes = collections.Counter(); licencas = collections.Counter(); regioes = collections.Counter()
paises = collections.Counter(); tipos = collections.Counter(); decadas = collections.Counter()
porAgente = collections.Counter(); porAgenteG = collections.Counter()
n = 0; g = 0; afr = 0
for l in open(BASE + "atlas-classificado-v2.jsonl", encoding="utf-8"):
    d = json.loads(l); n += 1
    e = d["especialidade"]; tot[e] += 1
    if d["guardavel"]: g += 1; guard[e] += 1
    if d["contexto_africa"]: afr += 1
    fontes[d["fonte"]] += 1
    licencas[(d["licenca"] or "não informada").strip()] += 1
    regioes[d.get("regiao") or "não determinada"] += 1
    if d.get("pais"): paises[d["pais"]] += 1
    tipos[d["tipo"]] += 1
    ano = d.get("ano") or 0
    decadas[(ano // 10 * 10) if ano else 0] += 1
    for a in d["agentes"]:
        porAgente[a] += 1
        if d["guardavel"]: porAgenteG[a] += 1
# internos por especialidade, do resumo v1 (acervo do Instituto)
v1 = json.load(open(BASE + "atlas-resumo-v1.json", encoding="utf-8"))
internos = {e["id"]: e.get("internos", 0) for e in v1["por_especialidade"]} if isinstance(v1.get("por_especialidade"), list) else {}
if not internos:
    pe = v1["por_especialidade"]
    internos = {k: (v.get("internos", 0) if isinstance(v, dict) else 0) for k, v in pe.items()}
INTERNOS_TOTAL = v1["itens_internos"]
# --- universidades do mundo (v2) ---
U = json.load(open(BASE + "universidades-mundo-v2.json", encoding="utf-8"))
def ehurl(x): return isinstance(x, str) and x.startswith("http")
uni_esp = collections.Counter(); uni_ver = collections.Counter()
celulas = 0; celulas_ver = 0; celulas_end = 0; oai = 0
endereco = collections.Counter()
for u in U:
    if ehurl(u.get("repositorio_oai_pmh_api")) or (u.get("repositorio_oai_pmh_api") or "").startswith("respondeu"):
        oai += 1
    if u.get("repositorio_oai_pmh_respondeu") is True: oai += 0
    for slug, p in (u.get("programas") or {}).items():
        if slug not in NOMES: continue
        celulas += 1; uni_esp[slug] += 1
        if p.get("estado") == "verificado": celulas_ver += 1; uni_ver[slug] += 1
        if p.get("estado") in ("verificado", "url via pesquisa"): endereco[slug] += 1; celulas_end += 1
OAI = sum(1 for u in U if u.get("repositorio_oai_pmh_respondeu") is True) or oai
MEDIDO = "2026-11-21"
resumo = {
  "medidoEm": MEDIDO, "total": n + INTERNOS_TOTAL, "externos": n, "internos": INTERNOS_TOTAL,
  "guardaveis": g, "soReferencia": n - g,
  "universidades": len(U), "programasMapeados": celulas, "programasVerificados": celulas_ver, "programasComEndereco": celulas_end,
  "repositoriosOai": OAI,
  "fontes": [{"nome": k, "n": v} for k, v in fontes.most_common()],
  "licencas": [{"nome": k[:60], "n": v} for k, v in licencas.most_common(10)],
  "porRegiao": [{"nome": k, "n": v} for k, v in regioes.most_common()],
  "porPais": [{"nome": k, "n": v} for k, v in paises.most_common(12)],
  "porEspecialidade": [
    {"id": s, "nome": NOMES[s], "itens": tot[s] + internos.get(s, 0), "guardaveis": guard[s],
     "soReferencia": tot[s] - guard[s], "internos": internos.get(s, 0),
     "universidades": uni_esp[s], "programasVerificados": uni_ver[s]}
    for s in NOMES
  ],
}
classific = {
  "medidoEm": MEDIDO, "classificados": n, "comContextoAfricano": afr,
  "tipos": [{"nome": k, "n": v} for k, v in tipos.most_common()],
  "porDecada": [{"nome": (str(k) if k else "sem ano"), "n": v} for k, v in sorted(decadas.items(), reverse=True) if v >= 20],
  "estantes": [{"agente": a, "itens": porAgente[a], "guardaveis": porAgenteG[a]} for a in sorted(porAgente)],
}
s = open(TS, encoding="utf-8").read()
def troca(nome, obj, tipo):
    global s
    i = s.index(f"export const {nome}: {tipo} = ")
    j = s.index("\n}\n", i) + 3
    s = s[:i] + f"export const {nome}: {tipo} = " + json.dumps(obj, ensure_ascii=False, indent=1) + "\n" + s[j:]
troca("ATLAS_RESUMO", resumo, "ResumoAtlas")
troca("CLASSIFICACAO_ATLAS", classific, "ClassificacaoAtlas")
# interface: juntar porRegiao e porPais
s = s.replace("""  licencas: ContagemAtlas[]
  porEspecialidade: EspecialidadeAtlas[]""", """  licencas: ContagemAtlas[]
  /** Peças por região do mundo, pela origem da universidade ou do autor. */
  porRegiao: ContagemAtlas[]
  /** Programas onde já há endereço, confirmado ou achado por pesquisa. */
  programasComEndereco: number
  /** Os 12 países com mais peças, por sigla. */
  porPais: ContagemAtlas[]
  porEspecialidade: EspecialidadeAtlas[]""")
# fontes: números novos + MIT DSpace
s = s.replace("estado: 'inventariado', itens: 4890, url: 'https://zenodo.org/api/'", f"estado: 'inventariado', itens: {fontes['zenodo']}, url: 'https://zenodo.org/api/'")
s = s.replace("estado: 'inventariado', itens: 1011, url: 'https://export.arxiv.org/api/query'", f"estado: 'inventariado', itens: {fontes['arxiv']}, url: 'https://export.arxiv.org/api/query'")
s = s.replace("{ nome: 'DSpace@MIT, Caltech, TU Delft, ETH, Apollo', tipo: 'Repositórios de universidades', acesso: 'OAI-PMH / páginas públicas', estado: 'por-ingerir', itens: null, url: 'https://dspace.mit.edu/' },",
  f"{{ nome: 'DSpace@MIT (teses e relatórios de engenharia)', tipo: 'Repositório de universidade', acesso: 'OAI-PMH aberto', estado: 'inventariado', itens: {fontes['mit-dspace']}, url: 'https://dspace.mit.edu/oai/request' }},\n  {{ nome: 'Imperial, Edinburgh, TUM, RWTH Aachen, Ghent, Porto, Cornell, Virginia Tech, UFSC, UnB, Tec de Monterrey, Chile, UNLP, Uniandes', tipo: 'Repositórios de universidades que responderam ao OAI-PMH', acesso: 'OAI-PMH aberto, colheita por fazer', estado: 'por-ingerir', itens: null, url: 'https://spiral.imperial.ac.uk/oai/request' }},")
open(TS, "w", encoding="utf-8").write(s)
print("endereco", celulas_end)
print("total", resumo["total"], "externos", n, "guardaveis", g, "internos", INTERNOS_TOTAL)
print("universidades", len(U), "celulas", celulas, "verificadas", celulas_ver, "oai", OAI)
print("regioes", [(x['nome'], x['n']) for x in resumo['porRegiao']])
print("fontes", dict(fontes))
