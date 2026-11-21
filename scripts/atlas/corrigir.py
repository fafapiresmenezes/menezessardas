import json, os, datetime
G = json.load(open("/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-calculo-v1.json", encoding="utf-8"))
gab = {q["id"]: q for q in G["questoes"]}
base = "/tmp/claude-0/-home-user/11d6d019-a4aa-5248-bef5-e2fbd243d37f/scratchpad/atlas/provas-cegas/respostas"
res = {}
for f in sorted(os.listdir(base)):
    if not f.endswith(".json"): continue
    aid = f[:-5]
    try: dados = json.load(open(os.path.join(base, f), encoding="utf-8"))
    except Exception as e:
        res[aid] = {"erro": f"resposta ilegível: {e}"}; continue
    if isinstance(dados, dict): dados = dados.get("respostas") or list(dados.values())
    itens = []
    for r in dados:
        qid = r.get("id")
        g = gab.get(qid)
        if not g: itens.append({"id": qid, "estado": "fora da bateria"}); continue
        try: v = float(str(r.get("resposta")).replace(",", "."))
        except Exception: itens.append({"id": qid, "estado": "resposta não numérica", "dada": r.get("resposta")}); continue
        esp = float(g["resposta"]); tol = float(g["tolerancia_relativa"])
        erro = abs(v - esp)/abs(esp) if esp else abs(v - esp)
        itens.append({"id": qid, "esperado": esp, "dada": v, "unidade": g["unidade"],
                      "erro_relativo": round(erro, 5), "tolerancia": tol,
                      "estado": "certo" if erro <= tol else "errado"})
    da_bateria = [q for q in G["questoes"] if q["agente"] == aid]
    certos = sum(1 for i in itens if i.get("estado") == "certo")
    n = len(da_bateria)
    nota = round(10*certos/n, 2) if n else 0
    res[aid] = {"questoes": n, "respondidas": len([i for i in itens if "dada" in i]), "certos": certos,
                "nota": nota, "veredito": "aprovado" if nota >= 8 else ("com supervisão" if nota >= 6 else "reprovado"),
                "itens": itens}
saida = {"corrigido_em": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
         "regra": "nota = 10 × acertos/questões; tolerância relativa por questão; ≥8 aprovado, 6 a 8 só com supervisão, <6 reprovado",
         "aviso": "Prova só da parte calculável, com gabarito gerado por programa. Não substitui revisão de engenheiro habilitado.",
         "agentes": res}
p = "/mnt/project-files/engenharia/plano-agentes/provas/resultado-provas-v1.json"
json.dump(saida, open(p, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for a, v in sorted(res.items()):
    if "erro" in v: print(a, v["erro"]); continue
    print(f"{v['nota']:5.2f}  {v['veredito']:15s} {a}  ({v['certos']}/{v['questoes']})")
    for i in v["itens"]:
        if i.get("estado") != "certo": print("      ✗", i)
