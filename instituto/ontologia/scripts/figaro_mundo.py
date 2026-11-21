"""Família 1, terceira base: FIGARO (Eurostat e Centro Comum de Pesquisa da Comissão Europeia), tabela insumo-produto
entre países, indústria x indústria, preços básicos, milhões de euros. Conjunto naio_10_fcp_ii4 (2022 a 2024).
50 regiões (27 da UE, 23 de fora, entre elas Brasil, EUA, China e África do Sul, mais o resto do mundo) x 64 indústrias.

Ano usado: 2023. O arquivo traz também 2022 e 2024; 2024 entra só como conferência de estabilidade (quanto A muda de um
ano para o outro), porque é o ano mais novo e o mais sujeito a revisão.

Conta (a mesma da EXIOBASE, scripts/exiobase_mundo.py):
  Z[(r,i),(s,j)] = compra da indústria j do país s feita à indústria i do país r (linha vende, coluna compra)
  x = produção total = soma da linha de Z + demanda final  (conferida com a soma da coluna de Z + valor adicionado)
  A = Z / x (por coluna) ; L = (I - A)^-1
Conferências: (1) produção pela linha contra produção pela coluna; (2) resíduo de (I - A)·L - I; (3) mundo agregado,
L por inversão contra L por soma de rodadas; (4) estabilidade: diferença média de A entre 2023 e 2024.
Uso: python3 scripts/figaro_mundo.py <pasta com ii4.tsv.gz>
"""
import gzip
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

P = Path(sys.argv[1]); t0 = time.time()
AQUI = Path(__file__).resolve().parent.parent
ARQ = P / "ii4.tsv.gz"
ANO, ANO_CONF = "2023", "2024"
FINAL = ["P3_S13", "P3_S14", "P3_S15", "P51G", "P5M"]
VA = ["D21X31", "D29X39", "D1", "B2A3G", "OP_RES", "OP_NRES"]

df = pd.read_csv(ARQ, sep="\t", compression="gzip")
df.columns = [c.strip() for c in df.columns]
chave = df.columns[0]
k = df[chave].str.split(",", expand=True)
df = pd.DataFrame({"use": k[1], "ava": k[2], "dest": k[3], "unit": k[4], "orig": k[5],
                   "v": pd.to_numeric(df[ANO], errors="coerce"), "v2": pd.to_numeric(df[ANO_CONF], errors="coerce")})
assert set(df["unit"]) == {"MIO_EUR"}
print("lido", len(df), "linhas", round(time.time() - t0), "s", flush=True)

ind = sorted(set(df["use"]) - set(FINAL))
assert set(ind) <= set(df["ava"]) and len(ind) == 64, len(ind)
reg = sorted(set(df["dest"]))
R, S = len(reg), len(ind); n = R * S
ri, ii = {r: a for a, r in enumerate(reg)}, {s: a for a, s in enumerate(ind)}

def montar(col):
    zz = df[df["use"].isin(ind) & df["ava"].isin(ind) & df["orig"].isin(reg)]
    Z = np.zeros((n, n))
    Z[zz["orig"].map(ri).to_numpy() * S + zz["ava"].map(ii).to_numpy(),
      zz["dest"].map(ri).to_numpy() * S + zz["use"].map(ii).to_numpy()] = zz[col].fillna(0).to_numpy()
    ff = df[df["use"].isin(FINAL) & df["ava"].isin(ind) & df["orig"].isin(reg)]
    fd = np.zeros(n)
    np.add.at(fd, ff["orig"].map(ri).to_numpy() * S + ff["ava"].map(ii).to_numpy(), ff[col].fillna(0).to_numpy())
    vv = df[df["use"].isin(ind) & df["ava"].isin(VA)]
    va = np.zeros(n)
    np.add.at(va, vv["dest"].map(ri).to_numpy() * S + vv["use"].map(ii).to_numpy(), vv[col].fillna(0).to_numpy())
    return Z, fd, va

Z, fd, va = montar("v")
x = Z.sum(1) + fd; xc = Z.sum(0) + va
dif_rel = float(np.max(np.abs(x - xc) / np.maximum(1.0, np.abs(x))))
A = np.divide(Z, x[None, :], out=np.zeros_like(Z), where=x[None, :] > 0)
I = np.eye(n); L = np.linalg.solve(I - A, I); res = float(np.abs((I - A) @ L - I).max()); del I
print("L ok, resíduo", res, "balanço", dif_rel, round(time.time() - t0), "s", flush=True)

Z2, fd2, _ = montar("v2"); x2 = Z2.sum(1) + fd2
A2 = np.divide(Z2, x2[None, :], out=np.zeros_like(Z2), where=x2[None, :] > 0)
m = (A > 1e-6) | (A2 > 1e-6)
estab = {"dif_media_absoluta_A_2023_2024": float(np.abs(A - A2)[m].mean()), "celulas_comparadas": int(m.sum()),
         "correlacao_A_2023_2024": float(np.corrcoef(A[m], A2[m])[0, 1])}
del Z2, A2

Zw = Z.reshape(R, S, R, S).sum(axis=(0, 2)); xw = x.reshape(R, S).sum(axis=0)
Aw = np.divide(Zw, xw[None, :], out=np.zeros_like(Zw), where=xw[None, :] > 0)
Iw = np.eye(S); Lw = np.linalg.inv(Iw - Aw); Ls, t, kk = Iw.copy(), Iw.copy(), 0
while np.abs(t).max() > 1e-14 and kk < 5000: t = t @ Aw; Ls += t; kk += 1
difW = float(np.abs(Lw - Ls).max())

NOMES = {"A01": "Agricultura e pecuária", "B": "Mineração e extração de petróleo", "C19": "Refino de petróleo e coque",
         "D35": "Eletricidade e gás", "E36": "Água (captação e distribuição)", "E37-39": "Esgoto e resíduos", "F": "Construção",
         "G46": "Atacado", "G47": "Varejo", "H49": "Transporte terrestre", "J61": "Telecomunicações", "J62_63": "Informática",
         "K64": "Serviços financeiros", "M69_70": "Jurídico, contábil e consultoria", "M72": "Pesquisa e desenvolvimento",
         "O84": "Administração pública", "P85": "Educação", "Q86": "Saúde"}
NICHOS = {"A01": "Agro", "B": "Petróleo e Mineração", "C19": "Petróleo e Mineração", "D35": "Energia", "E36": "Águas e Saneamento",
          "E37-39": "Águas e Saneamento", "F": "Engenharia", "G46": "Cadeia distributiva B2B", "G47": "Cadeia distributiva B2B",
          "H49": "Cadeia distributiva B2B", "J61": "Telecom (base do Geo)", "J62_63": "Ontologia/IA e Cibersegurança",
          "K64": "Finanças", "M69_70": "Jurídica e consultoria", "M72": "Engenharia", "O84": "Contratos Públicos",
          "P85": "Educação", "Q86": "Saúde"}
idx = [ii[c] for c in NOMES]

def bloco(r):
    cols = [ri[r] * S + j for j in idx]
    tot = L[:, cols].reshape(R, S, len(idx)).sum(axis=0)
    dom = L[ri[r] * S:(ri[r] + 1) * S, cols]
    return {"L_total": tot[idx].round(6).tolist(), "L_dentro_da_regiao": dom[idx].round(6).tolist(),
            "A_dentro_da_regiao": A[ri[r] * S:(ri[r] + 1) * S, cols][idx].round(6).tolist(),
            "parte_da_cadeia_fora_da_regiao": [round(float(1 - dom[:, c].sum() / tot[:, c].sum()), 4) for c in range(len(idx))],
            "parte_dos_insumos_fora_da_regiao": [round(float(1 - (dom[:, c].sum() - 1) / (tot[:, c].sum() - 1)), 4) for c in range(len(idx))],
            "soma_coluna_L_total": [round(float(tot[:, c].sum()), 6) for c in range(len(idx))],
            "soma_coluna_L_dentro": [round(float(dom[:, c].sum()), 6) for c in range(len(idx))],
            "producao_milhoes_eur": [round(float(x[ri[r] * S + j]), 1) for j in idx]}

saida = {
    "familia": 1, "base": "FIGARO", "nome": "Dependência econômica, terceira base (FIGARO, Eurostat)", "selo": "calculado por nós",
    "fonte": "Eurostat e Centro Comum de Pesquisa da Comissão Europeia, FIGARO, conjunto naio_10_fcp_ii4 (indústria x indústria, preços básicos)",
    "url": "https://ec.europa.eu/eurostat/api/dissemination/sdmx/2.1/data/naio_10_fcp_ii4?format=TSV&compressed=true",
    "sha256_arquivo": hashlib.sha256(ARQ.read_bytes()).hexdigest(), "baixado_em": "2026-11-21", "ano": int(ANO),
    "unidade": "milhões de euros, preços básicos", "regioes": reg, "industrias": ind,
    "formula": "A = Z / x ; L = (I - A)^-1 (50 regiões x 64 indústrias = 3.200 linhas); x = soma da linha de Z + demanda final",
    "aviso": "Angola não tem tabela própria no FIGARO: está no resto do mundo (WRL_REST), junto com toda a África menos a África do Sul.",
    "conferencia": {"max_dif_relativa_producao_linha_vs_coluna": dif_rel, "max_residuo_(I-A)L-I_completo": res,
                    "max_dif_Lw_inversao_vs_serie": difW, "termos_serie_mundo": kk, "estabilidade": estab,
                    "aprovado": bool(dif_rel < 1e-6 and res < 1e-8 and difW < 1e-10)},
    "nichos": {c: {"nome": NOMES[c], "nicho": NICHOS[c]} for c in NOMES}, "codigos_nichos": list(NOMES),
    "mundo": {"A": np.round(Aw, 6).tolist(), "L": np.round(Lw, 6).tolist(), "producao_milhoes_eur": xw.round(1).tolist(),
              "Z_nichos_milhoes_eur": Zw[np.ix_(idx, idx)].round(2).tolist()},
    "por_regiao": {r: bloco(r) for r in ("BR", "US", "CN", "ZA", "WRL_REST")},
}
(AQUI / "saida" / "figaro_2023.json").write_text(json.dumps(saida, ensure_ascii=False))
print(json.dumps(saida["conferencia"]), round(time.time() - t0), "s")
for c, f, g in zip(NOMES, saida["por_regiao"]["BR"]["parte_dos_insumos_fora_da_regiao"], saida["por_regiao"]["BR"]["soma_coluna_L_total"]):
    print(f"{c:8s} {NOMES[c]:34s} insumos de fora {100 * f:5.1f}%  multiplicador {g:.3f}")
