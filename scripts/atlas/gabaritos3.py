import json, datetime
P = "/mnt/project-files/engenharia/plano-agentes/provas/gabaritos-calculo-v1.json"
d = json.load(open(P, encoding="utf-8"))
Q = d["questoes"]
if not any(x["id"] == "BET-06" for x in Q):
    Q.append({"id": "BET-06", "agente": "AGE-ESP-ESTRUTURAS-BETAO",
      "enunciado": "Laje maciça de betão armado com 0,20 m de espessura, massa volúmica 25 kN/m³. Qual o peso próprio por metro quadrado?",
      "dados": {"h_m": 0.20, "gama_kN_m3": 25.0},
      "fonte_citada": "EN 1991-1-1 quadro A.1 (betão armado, 25 kN/m³)",
      "formula": "g = γ·h", "resposta": 5.0, "unidade": "kN/m²", "tolerancia_relativa": 0.01,
      "passos": ["g = 25·0,20 = 5,0 kN/m²"]})
# conferência do ficheiro
faltas = []
for x in Q:
    for campo in ("id", "agente", "enunciado", "dados", "fonte_citada", "formula", "resposta", "unidade", "tolerancia_relativa", "passos"):
        if x.get(campo) in (None, "", [], {}): faltas.append((x["id"], campo))
    if not isinstance(x["resposta"], (int, float)): faltas.append((x["id"], "resposta não numérica"))
ids = [x["id"] for x in Q]
assert len(ids) == len(set(ids)), "id repetido"
d["questoes"] = Q; d["total"] = len(Q); d["emitido"] = datetime.date.today().isoformat()
d["por_agente"] = {a: sum(1 for x in Q if x["agente"] == a) for a in sorted({x["agente"] for x in Q})}
json.dump(d, open(P, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("total", len(Q), "| faltas:", faltas or "nenhuma")
print({a: n for a, n in d["por_agente"].items()})
# provas cegas (sem gabarito) para aplicar
import os
dest = "/tmp/claude-0/-home-user/11d6d019-a4aa-5248-bef5-e2fbd243d37f/scratchpad/atlas/provas-cegas"
os.makedirs(dest, exist_ok=True)
for a in d["por_agente"]:
    qs = [{"id": x["id"], "enunciado": x["enunciado"], "dados": x["dados"], "unidade_esperada": x["unidade"]}
          for x in Q if x["agente"] == a]
    json.dump(qs, open(f"{dest}/{a}.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("provas cegas escritas em", dest)
