import json, collections, datetime, sys
BASE = "/mnt/project-files/engenharia/plano-agentes/atlas/"
MAPA = {
 "estruturas de betão": "estruturas-betao",
 "estruturas metálicas": "estruturas-aco",
 "geotecnia": "geotecnia",
 "hidráulica/recursos hídricos": "hidraulica-recursos-hidricos",
 "saneamento": "saneamento",
 "transportes/pavimentos": "transportes-pavimentos",
 "ambiental/licenciamento": "ambiental-licenciamento",
 "electrotecnia/energia": "electrotecnia-energia",
 "mecânica/instalações": "mecanica-instalacoes",
 "materiais": "materiais-betao",
 "gestão da construção/custos": "gestao-construcao-custos",
 "petróleo e gás": "petroleo-gas",
 "minas/barragens de rejeitos": "minas-barragens",
 "sistemas/dados/IA na construção": "sistemas-dados-construcao",
}
velho = json.load(open(BASE + "atlas-resumo-v1.json", encoding="utf-8"))

def so_referencia(lic):
    s = (lic or "").strip().lower()
    if not s or s == "não informada":
        return True
    # NC/ND não podem ser guardados/redistribuídos pelo Instituto
    return ("-nc" in s) or ("nc-" in s) or ("-nd" in s) or ("nd-" in s) or s.endswith("-nd") or "noderiv" in s or "noncommercial" in s

fontes = collections.Counter(); licencas = collections.Counter()
por = {k: collections.Counter() for k in MAPA.values()}
externos = 0
for l in open(BASE + "atlas-itens-v1.jsonl", encoding="utf-8"):
    l = l.strip()
    if not l: continue
    d = json.loads(l)
    externos += 1
    fontes[d.get("fonte") or "?"] += 1
    lic = d.get("licenca") or "não informada"
    licencas[lic] += 1
    slug = MAPA.get(d.get("especialidade"))
    if not slug:
        print("especialidade desconhecida:", d.get("especialidade")); sys.exit(1)
    c = por[slug]
    c["externos"] += 1
    if so_referencia(lic): c["so_referencia"] += 1
    else: c["guardaveis"] += 1
    t = (d.get("tipo") or "").lower()
    if t in ("tese", "dissertacao", "dissertação"): c["teses"] += 1
    if t == "software": c["software"] += 1

internos = sum(1 for l in open(BASE + "atlas-itens-internos-v1.jsonl", encoding="utf-8") if l.strip())
guardaveis = sum(por[s]["guardaveis"] for s in por)
soref = sum(por[s]["so_referencia"] for s in por)

novo = dict(velho)
novo["medido_em"] = datetime.date.today().isoformat()
novo["itens_externos"] = externos
novo["itens_internos"] = internos
novo["total"] = externos + internos
novo["guardaveis"] = guardaveis
novo["so_referencia"] = soref
novo["fontes"] = dict(fontes.most_common())
novo["licencas"] = dict(licencas.most_common(12))
pe = {}
for slug, antigo in velho["por_especialidade"].items():
    c = por[slug]
    pe[slug] = {
        "nome": antigo["nome"],
        "externos": c["externos"],
        "guardaveis": c["guardaveis"],
        "so_referencia": c["so_referencia"],
        "internos": antigo.get("internos", 0),
        "teses": c["teses"],
        "software": c["software"],
        "universidades_com_programa": antigo["universidades_com_programa"],
        "programas_verificados": antigo["programas_verificados"],
    }
novo["por_especialidade"] = pe
with open(BASE + "atlas-resumo-v1.json", "w", encoding="utf-8") as f:
    json.dump(novo, f, ensure_ascii=False, indent=1)
print("externos", externos, "internos", internos, "total", externos+internos)
print("guardaveis", guardaveis, "so_referencia", soref)
print("fontes", dict(fontes))
print("min por especialidade", min(por[s]["externos"] for s in por))
