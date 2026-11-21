import json, re, collections, datetime
BASE = "/mnt/project-files/engenharia/plano-agentes/atlas/"
MAPA = {
 "estruturas de betão": ("estruturas-betao", "AGE-ESP-ESTRUTURAS-BETAO"),
 "estruturas metálicas": ("estruturas-aco", "AGE-ESP-ESTRUTURAS-ACO"),
 "geotecnia": ("geotecnia", "AGE-ESP-GEOTECNIA"),
 "hidráulica/recursos hídricos": ("hidraulica-recursos-hidricos", "AGE-ESP-HIDRAULICA-RECURSOS-HIDRICOS"),
 "saneamento": ("saneamento", "AGE-ESP-SANEAMENTO"),
 "transportes/pavimentos": ("transportes-pavimentos", "AGE-ESP-TRANSPORTES-PAVIMENTOS"),
 "ambiental/licenciamento": ("ambiental-licenciamento", "AGE-ESP-AMBIENTAL-LICENCIAMENTO"),
 "electrotecnia/energia": ("electrotecnia-energia", "AGE-ESP-ELECTROTECNIA-ENERGIA"),
 "mecânica/instalações": ("mecanica-instalacoes", "AGE-ESP-MECANICA-INSTALACOES"),
 "materiais": ("materiais-betao", "AGE-ESP-MATERIAIS-BETAO"),
 "gestão da construção/custos": ("gestao-construcao-custos", "AGE-ESP-GESTAO-CONSTRUCAO-CUSTOS"),
 "petróleo e gás": ("petroleo-gas", "AGE-ESP-PETROLEO-GAS"),
 "minas/barragens de rejeitos": ("minas-barragens", "AGE-ESP-MINAS-BARRAGENS"),
 "sistemas/dados/IA na construção": ("sistemas-dados-construcao", "AGE-ESP-SISTEMAS-DADOS-CONSTRUCAO"),
}
# produtos que se alimentam de temas transversais
REGRAS_PRODUTO = [
 ("AGE-PROD-MEDICAO-AUDITAVEL", r"quantity survey|measurement|as-?built|progress monitoring|earned value|bill of quantities"),
 ("AGE-PROD-REVISOR-PROJECTOS", r"design code|eurocode|design check|verification|finite element|structural analysis|peer review"),
 ("AGE-PROD-CLAIMS-FIDIC", r"fidic|claim|delay analysis|dispute|contract administration|extension of time"),
 ("AGE-PROD-HSE-FINANCIADOR", r"safeguard|resettlement|environmental and social|occupational (health|safety)|\bhse\b|impact assessment"),
 ("AGE-PROD-MATERIAIS-LOCAIS", r"local (aggregate|material)|laterit|pozzolan|supplementary cementitious|recycled aggregate|stabili[sz]ed soil"),
 ("AGE-PROD-GEMEO-OBRA", r"digital twin|\bbim\b|point cloud|photogrammetr|drone|\buav\b|computer vision|lidar"),
 ("AGE-PROD-ESTUDO-PND", r"master ?plan|national plan|sector (plan|study)|infrastructure gap|development plan|policy"),
 ("AGE-PROD-TRANSPARENCIA-OBRA", r"transparen|open data|accountab|public procurement|corruption"),
 ("AGE-PROD-RADAR-CONCURSOS", r"procurement|tender|bidding|contract award"),
]
AFRICA = re.compile(r"angola|namibia|namíbia|africa|áfrica|sub-?saharan|mozambiq|moçambiq|tropical|laterit|developing countr|lusophone", re.I)

def so_referencia(lic):
    s = (lic or "").strip().lower()
    if not s or s == "não informada": return True
    return any(x in s for x in ("-nc", "nc-", "-nd", "nd-", "noderiv", "noncommercial"))

saida = open(BASE + "atlas-classificado-v1.jsonl", "w", encoding="utf-8")
por_agente = collections.Counter(); por_agente_guard = collections.Counter()
estante = collections.defaultdict(list)
tipos = collections.Counter(); decadas =.0 if False else collections.Counter()
africa_n = 0; total = 0
for l in open(BASE + "atlas-itens-v1.jsonl", encoding="utf-8"):
    l = l.strip()
    if not l: continue
    d = json.loads(l); total += 1
    slug, agente = MAPA[d["especialidade"]]
    texto = (d.get("titulo") or "") + " " + (d.get("resumo_original") or "") + " " + (d.get("termo_busca") or "")
    guard = not so_referencia(d.get("licenca"))
    tipo = (d.get("tipo") or "outro").lower()
    try: ano = int(str(d.get("ano") or "")[:4])
    except Exception: ano = 0
    afr = bool(AFRICA.search(texto))
    if afr: africa_n += 1
    destinos = [agente]
    for pid, pat in REGRAS_PRODUTO:
        if re.search(pat, texto, re.I): destinos.append(pid)
    nota = 0
    if guard: nota += 1
    if len(d.get("resumo_original") or "") >= 200: nota += 1
    if ano >= 2015: nota += 1
    if afr: nota += 1
    if tipo in ("tese", "software", "dados"): nota += 1
    rec = {
        "id": d["id"], "titulo": d.get("titulo"), "ano": ano or None, "fonte": d.get("fonte"),
        "especialidade": slug, "tema": d.get("termo_busca"), "tipo": tipo,
        "licenca": d.get("licenca"), "guardavel": guard, "contexto_africa": afr,
        "nota_utilidade": nota, "agentes": destinos, "url": d.get("url"), "doi": d.get("doi"),
    }
    saida.write(json.dumps(rec, ensure_ascii=False) + "\n")
    tipos[tipo] += 1
    decadas[(ano // 10 * 10) if ano else 0] += 1
    for a in destinos:
        por_agente[a] += 1
        if guard: por_agente_guard[a] += 1
        estante[a].append((nota, ano, rec["id"], rec["titulo"], rec["url"], rec["tipo"], guard))
saida.close()

top = {}
for a, lst in estante.items():
    lst.sort(key=lambda x: (-x[0], -(x[1] or 0)))
    top[a] = [{"nota": n, "ano": y or None, "id": i, "titulo": t, "url": u, "tipo": tp, "guardavel": g}
              for n, y, i, t, u, tp, g in lst[:25]]

resumo = {
    "medido_em": datetime.date.today().isoformat(),
    "itens_classificados": total,
    "com_contexto_africano": africa_n,
    "tipos": dict(tipos.most_common()),
    "por_decada": {str(k) if k else "sem ano": v for k, v in sorted(decadas.items(), reverse=True)},
    "por_agente": {a: {"itens": por_agente[a], "guardaveis": por_agente_guard[a]} for a in sorted(por_agente)},
    "estante_por_agente": top,
}
json.dump(resumo, open(BASE + "atlas-classificacao-v1.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("classificados", total, "| África", africa_n)
print("tipos", dict(tipos))
print("agentes com estante", len(por_agente))
for a in sorted(por_agente): print("  ", a, por_agente[a], "/", por_agente_guard[a])
