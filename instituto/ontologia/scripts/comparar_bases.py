"""Família 1: conferência ENTRE bases. O multiplicador de produção do Brasil (soma da coluna de L, só fornecedores
brasileiros) pelo IBGE 2015 contra o mesmo multiplicador pelo FIGARO 2023.

Critério escrito ANTES de rodar (21/11/2026, ~11h05 UTC), publicado seja qual for o resultado:
  Spearman entre os multiplicadores das atividades comparáveis ≥ 0,6  E  mediana da diferença relativa ≤ 25%.
Por que não se espera igualdade: anos diferentes (2015 e 2023), classificações diferentes, e no FIGARO a parte
"brasileira" de L ainda carrega o vaivém por outros países (o que tende a deixar o FIGARO um pouco maior).

Só entram pares com correspondência um para um. Ficam de fora, com o motivo:
  B (o IBGE separa petróleo e gás de mineração), E36 e E37-39 (o IBGE junta água, esgoto e resíduos),
  G46 e G47 (o IBGE junta atacado e varejo), M72 (o IBGE junta P&D com arquitetura e engenharia),
  P85 e Q86 (o IBGE separa público e privado).
"""
import json
from pathlib import Path

import numpy as np
from scipy import stats

AQUI = Path(__file__).resolve().parent.parent / "saida"
PARES = {"A01": "0191", "C19": "1991", "D35": "3500", "F": "4180", "H49": "4900", "J61": "6100",
         "J62_63": "6280", "K64": "6480", "M69_70": "6980", "O84": "8400"}
CRITERIO = {"spearman_minimo": 0.6, "mediana_dif_relativa_maxima": 0.25}

z = np.load(AQUI / "ibge_2015_intermediarios.npz", allow_pickle=True)
cod = [str(c) for c in z["cod"]]
mult_ibge = z["L"].sum(axis=0)
fg = json.loads((AQUI / "figaro_2023.json").read_text())
br = fg["por_regiao"]["BR"]
linhas = []
for f, i in PARES.items():
    a = mult_ibge[cod.index(i)]
    b = br["soma_coluna_L_dentro"][fg["codigos_nichos"].index(f)]
    linhas.append({"figaro": f, "nome_figaro": fg["nichos"][f]["nome"], "ibge": i, "mult_ibge_2015": round(float(a), 6),
                   "mult_figaro_2023_dentro_do_brasil": b, "dif_relativa": round(float((b - a) / a), 6)})
x = np.array([l["mult_ibge_2015"] for l in linhas]); y = np.array([l["mult_figaro_2023_dentro_do_brasil"] for l in linhas])
rho = float(stats.spearmanr(x, y).statistic)
med = float(np.median(np.abs((y - x) / x)))
saida = {"familia": 1, "nome": "Conferência entre bases: IBGE 2015 contra FIGARO 2023, Brasil",
         "formula": "multiplicador = Σ_i L[i, j] (soma da coluna j de L, só fornecedores do Brasil); dif. relativa = (FIGARO − IBGE) / IBGE",
         "criterio": CRITERIO, "pares": linhas, "spearman": rho, "mediana_dif_relativa_absoluta": med,
         "aprovado": bool(rho >= CRITERIO["spearman_minimo"] and med <= CRITERIO["mediana_dif_relativa_maxima"]),
         "fora": ["B", "E36", "E37-39", "G46", "G47", "M72", "P85", "Q86"]}
(AQUI / "comparacao_bases.json").write_text(json.dumps(saida, ensure_ascii=False, indent=1))
for l in linhas:
    print(f"{l['figaro']:7s} {l['ibge']} IBGE {l['mult_ibge_2015']:.3f}  FIGARO {l['mult_figaro_2023_dentro_do_brasil']:.3f}  {100 * l['dif_relativa']:+.1f}%")
print("Spearman", round(rho, 3), "mediana", round(med, 3), "APROVADO" if saida["aprovado"] else "REPROVADO")
